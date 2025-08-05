#!/usr/bin/env tsx

import * as XLSX from 'xlsx';
import { db } from '../src/lib/postgres';

interface LessonInfo {
  unit: number;
  lesson: number;
  startCol: number;
}

interface StudentAttendance {
  studentName: string;
  courseCode: string;
  unit: number;
  lesson: number;
  attitude_efforts?: number;
  asking_questions?: number;
  application_skills?: number;
  application_feedback?: number;
}

async function parseG34File(): Promise<StudentAttendance[]> {
  console.log('📊 Parsing G3-4 attendance file...');
  
  const workbook = XLSX.readFile('attendance_report_g34.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  
  // Parse lesson headers from row 1
  const lessonHeaders = data[0];
  const categoryHeaders = data[1];
  
  // Find lesson boundaries
  const lessons: LessonInfo[] = [];
  for (let i = 1; i < lessonHeaders.length; i++) {
    const header = lessonHeaders[i];
    if (header && typeof header === 'string' && header.includes('Unit') && header.includes('Lesson')) {
      const match = header.match(/Unit (\d+) Lesson (\d+)/);
      if (match) {
        lessons.push({
          unit: parseInt(match[1]),
          lesson: parseInt(match[2]),
          startCol: i
        });
      }
    }
  }
  
  console.log(`  Found ${lessons.length} lessons`);
  
  // Parse student data (starting from row 3, index 2)
  const attendanceRecords: StudentAttendance[] = [];
  
  for (let rowIndex = 2; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    const studentName = row[0];
    
    if (!studentName || typeof studentName !== 'string') continue;
    
    console.log(`  Processing student: ${studentName}`);
    
    for (const lesson of lessons) {
      // Each lesson has 4 columns: Application of Feedback, Application of Skills/Content, Asking Questions, Attitude & Efforts
      const ratings = {
        application_feedback: row[lesson.startCol],
        application_skills: row[lesson.startCol + 1],
        asking_questions: row[lesson.startCol + 2],
        attitude_efforts: row[lesson.startCol + 3]
      };
      
      // Only create record if at least one rating exists
      const hasData = Object.values(ratings).some(val => val !== null && val !== undefined && val !== '');
      
      if (hasData) {
        attendanceRecords.push({
          studentName,
          courseCode: '02IPDEB2401',
          unit: lesson.unit,
          lesson: lesson.lesson,
          attitude_efforts: typeof ratings.attitude_efforts === 'number' ? ratings.attitude_efforts : undefined,
          asking_questions: typeof ratings.asking_questions === 'number' ? ratings.asking_questions : undefined,
          application_skills: typeof ratings.application_skills === 'number' ? ratings.application_skills : undefined,
          application_feedback: typeof ratings.application_feedback === 'number' ? ratings.application_feedback : undefined
        });
      }
    }
  }
  
  console.log(`  Parsed ${attendanceRecords.length} attendance records`);
  return attendanceRecords;
}

async function clearExistingAttendance(courseCode: string) {
  console.log(`🗑️  Clearing existing attendance for course ${courseCode}...`);
  
  const deleteQuery = `
    DELETE FROM attendances 
    WHERE session_id IN (
      SELECT cs.id 
      FROM class_sessions cs 
      JOIN courses c ON cs.course_id = c.id 
      WHERE c.code = $1
    )
  `;
  
  const result = await db.query(deleteQuery, [courseCode]);
  console.log(`  Deleted ${result.rowCount} existing attendance records`);
}

async function findOrCreateStudent(studentName: string): Promise<string> {
  // First try to find existing student
  const findQuery = `
    SELECT s.id 
    FROM students s 
    JOIN users u ON s.id = u.id 
    WHERE u.name = $1
  `;
  
  const findResult = await db.query(findQuery, [studentName]);
  
  if (findResult.rows.length > 0) {
    return findResult.rows[0].id;
  }
  
  // Create new student if not found
  console.log(`  Creating new student: ${studentName}`);
  
  const userInsertQuery = `
    INSERT INTO users (name, email, role) 
    VALUES ($1, $2, 'student') 
    RETURNING id
  `;
  
  const email = `${studentName.toLowerCase().replace(/\s+/g, '.')}@student.example.com`;
  const userResult = await db.query(userInsertQuery, [studentName, email]);
  const userId = userResult.rows[0].id;
  
  const studentInsertQuery = `
    INSERT INTO students (id, student_number) 
    VALUES ($1, $2) 
    RETURNING id
  `;
  
  const studentNumber = `STU${Date.now()}${Math.floor(Math.random() * 1000)}`;
  await db.query(studentInsertQuery, [userId, studentNumber]);
  
  return userId;
}

async function findOrCreateSession(courseCode: string, unit: number, lesson: number): Promise<string> {
  // First try to find existing session
  const findQuery = `
    SELECT cs.id 
    FROM class_sessions cs 
    JOIN courses c ON cs.course_id = c.id 
    WHERE c.code = $1 AND cs.unit_number = $2 AND cs.lesson_number = $3
  `;
  
  const findResult = await db.query(findQuery, [courseCode, unit, lesson]);
  
  if (findResult.rows.length > 0) {
    return findResult.rows[0].id;
  }
  
  // Create new session if not found
  console.log(`  Creating session: ${courseCode} Unit ${unit} Lesson ${lesson}`);
  
  const courseQuery = `SELECT id FROM courses WHERE code = $1`;
  const courseResult = await db.query(courseQuery, [courseCode]);
  const courseId = courseResult.rows[0].id;
  
  const sessionInsertQuery = `
    INSERT INTO class_sessions (course_id, session_date, start_time, end_time, unit_number, lesson_number)
    VALUES ($1, CURRENT_DATE, '10:00:00', '11:00:00', $2, $3)
    RETURNING id
  `;

  const sessionResult = await db.query(sessionInsertQuery, [courseId, unit, lesson]);
  return sessionResult.rows[0].id;
}

async function importAttendanceRecords(records: StudentAttendance[]) {
  console.log(`📥 Importing ${records.length} attendance records...`);
  
  let imported = 0;
  
  for (const record of records) {
    try {
      const studentId = await findOrCreateStudent(record.studentName);
      const sessionId = await findOrCreateSession(record.courseCode, record.unit, record.lesson);
      
      const insertQuery = `
        INSERT INTO attendances (
          student_id, session_id, status,
          attitude_efforts, asking_questions, application_skills, application_feedback,
          import_source
        ) VALUES ($1, $2, 'present', $3, $4, $5, $6, 'excel_g34_import')
        ON CONFLICT (student_id, session_id) DO UPDATE SET
          attitude_efforts = EXCLUDED.attitude_efforts,
          asking_questions = EXCLUDED.asking_questions,
          application_skills = EXCLUDED.application_skills,
          application_feedback = EXCLUDED.application_feedback,
          import_source = EXCLUDED.import_source
      `;
      
      await db.query(insertQuery, [
        studentId,
        sessionId,
        record.attitude_efforts,
        record.asking_questions,
        record.application_skills,
        record.application_feedback
      ]);
      
      imported++;
      
      if (imported % 50 === 0) {
        console.log(`  Imported ${imported}/${records.length} records...`);
      }
    } catch (error) {
      console.error(`  ❌ Error importing record for ${record.studentName}: ${error}`);
    }
  }
  
  console.log(`✅ Successfully imported ${imported} attendance records`);
}

async function main() {
  try {
    console.log('🚀 Starting G3-4 and G5-6 attendance import...\n');
    
    // Process G3-4 file
    const g34Records = await parseG34File();
    
    if (g34Records.length > 0) {
      await clearExistingAttendance('02IPDEB2401');
      await importAttendanceRecords(g34Records);
    }
    
    // TODO: Process G5-6 file when available
    console.log('\n⚠️  G5-6 file (attendance_report_g56.xlsx) not found - skipping G5-6 import');
    
    console.log('\n✅ Import complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
