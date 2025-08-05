#!/usr/bin/env tsx

import * as XLSX from 'xlsx';
import { db } from '../src/lib/postgres';
import { v4 as uuidv4 } from 'uuid';

interface AttendanceRecord {
  student_name: string;
  course_code: string;
  unit_number: string;
  lesson_number: string;
  attitude_efforts?: number;
  asking_questions?: number;
  application_skills?: number;
  application_feedback?: number;
}

interface StudentMapping {
  id: string;
  name: string;
  normalized_name: string;
}

interface CourseMapping {
  id: string;
  code: string;
  instructor_id: string;
}

interface SessionMapping {
  id: string;
  course_id: string;
  unit_number: string;
  lesson_number: string;
}

// Normalize student names for matching
function normalizeStudentName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Extract course code from sheet name
function extractCourseCode(sheetName: string): string {
  // Sheet names like "02IPDEB2401 - G3-4 Public Speak"
  const match = sheetName.match(/^([A-Z0-9]+)/);
  return match ? match[1] : sheetName;
}

// Parse unit and lesson from header
function parseUnitLesson(header: string): { unit: string; lesson: string } {
  // Headers like "Unit 2 Lesson 1", "Unit 10 Lesson 5"
  const match = header.match(/Unit\s+(\d+)\s+Lesson\s+(\d+)/i);
  if (match) {
    return { unit: match[1], lesson: match[2] };
  }
  return { unit: '', lesson: '' };
}

// Map rating category names to database column names
function mapRatingCategory(category: string): string {
  const categoryMap: { [key: string]: string } = {
    'Application of Feedback': 'application_feedback',
    'Application of Skills/Content': 'application_skills',
    'Asking Questions': 'asking_questions',
    'Attitude & Efforts': 'attitude_efforts'
  };
  return categoryMap[category] || category.toLowerCase().replace(/[^a-z]/g, '_');
}

async function loadStudentMappings(): Promise<Map<string, StudentMapping>> {
  const query = `
    SELECT u.id, u.name
    FROM users u
    JOIN students s ON u.id = s.id
    WHERE u.role = 'student'
  `;
  
  const result = await db.query(query);
  const mappings = new Map<string, StudentMapping>();
  
  for (const row of result.rows) {
    const normalized = normalizeStudentName(row.name);
    mappings.set(normalized, {
      id: row.id,
      name: row.name,
      normalized_name: normalized
    });
  }
  
  console.log(`Loaded ${mappings.size} student mappings`);
  return mappings;
}

async function loadCourseMappings(): Promise<Map<string, CourseMapping>> {
  const query = `
    SELECT id, code, instructor_id
    FROM courses
    WHERE status = 'active'
  `;
  
  const result = await db.query(query);
  const mappings = new Map<string, CourseMapping>();
  
  for (const row of result.rows) {
    mappings.set(row.code, {
      id: row.id,
      code: row.code,
      instructor_id: row.instructor_id
    });
  }
  
  console.log(`Loaded ${mappings.size} course mappings`);
  return mappings;
}

async function getOrCreateSession(
  courseId: string, 
  unitNumber: string, 
  lessonNumber: string,
  instructorId: string
): Promise<string> {
  // First try to find existing session
  const findQuery = `
    SELECT id FROM class_sessions
    WHERE course_id = $1 AND unit_number = $2 AND lesson_number = $3
  `;
  
  const findResult = await db.query(findQuery, [courseId, unitNumber, lessonNumber]);
  
  if (findResult.rows.length > 0) {
    return findResult.rows[0].id;
  }
  
  // Create new session
  const sessionId = uuidv4();
  const insertQuery = `
    INSERT INTO class_sessions (
      id, course_id, session_date, start_time, end_time, 
      unit_number, lesson_number, status, topic
    ) VALUES (
      $1, $2, CURRENT_DATE, '10:00:00', '11:00:00',
      $3, $4, 'completed', $5
    )
  `;
  
  const topic = `Unit ${unitNumber} Lesson ${lessonNumber}`;
  await db.query(insertQuery, [sessionId, courseId, unitNumber, lessonNumber, topic]);
  
  console.log(`Created session for Unit ${unitNumber} Lesson ${lessonNumber}`);
  return sessionId;
}

async function parseAttendanceSheet(
  sheetName: string,
  worksheet: XLSX.WorkSheet,
  studentMappings: Map<string, StudentMapping>,
  courseMappings: Map<string, CourseMapping>
): Promise<AttendanceRecord[]> {
  const courseCode = extractCourseCode(sheetName);
  console.log(`\nProcessing sheet: ${sheetName} (Course: ${courseCode})`);

  if (!courseMappings.has(courseCode)) {
    console.log(`⚠️  Course ${courseCode} not found in database, skipping...`);
    return [];
  }

  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];

  if (data.length < 3) {
    console.log(`⚠️  Sheet ${sheetName} has insufficient data, skipping...`);
    return [];
  }

  // Parse headers - Row 0 has lesson headers, Row 1 has category headers
  const lessonHeaders = data[0]; // Unit X Lesson Y headers
  const categoryHeaders = data[1]; // Category names for each column

  console.log(`  Found ${lessonHeaders.length} columns, ${categoryHeaders.length} category headers`);

  const records: AttendanceRecord[] = [];

  // Process each student row (starting from row 3, index 2)
  for (let rowIndex = 2; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    const studentName = row[0];

    if (!studentName || typeof studentName !== 'string' || studentName.trim() === '') {
      continue; // Skip empty rows
    }

    const normalizedName = normalizeStudentName(studentName);
    const studentMapping = studentMappings.get(normalizedName);

    if (!studentMapping) {
      console.log(`⚠️  Student "${studentName}" not found in database`);
      continue;
    }

    // Find lesson boundaries by looking for "Unit X Lesson Y" patterns
    const lessonBoundaries: Array<{unit: string, lesson: string, startCol: number, endCol: number}> = [];

    for (let colIndex = 1; colIndex < lessonHeaders.length; colIndex++) {
      const header = lessonHeaders[colIndex];
      if (header && typeof header === 'string' && header.trim() !== '') {
        const unitLesson = parseUnitLesson(header);
        if (unitLesson.unit && unitLesson.lesson) {
          // Find the end of this lesson (next lesson start or end of data)
          let endCol = colIndex + 4; // Default to 4 categories
          for (let nextCol = colIndex + 1; nextCol < lessonHeaders.length; nextCol++) {
            const nextHeader = lessonHeaders[nextCol];
            if (nextHeader && typeof nextHeader === 'string' && nextHeader.trim() !== '') {
              endCol = nextCol;
              break;
            }
          }

          lessonBoundaries.push({
            unit: unitLesson.unit,
            lesson: unitLesson.lesson,
            startCol: colIndex,
            endCol: Math.min(endCol, colIndex + 4) // Ensure we don't go beyond 4 categories
          });
        }
      }
    }

    console.log(`  Student ${studentName}: Found ${lessonBoundaries.length} lessons`);

    // Process each lesson
    for (const lesson of lessonBoundaries) {
      const record: AttendanceRecord = {
        student_name: studentMapping.name,
        course_code: courseCode,
        unit_number: lesson.unit,
        lesson_number: lesson.lesson
      };

      // Extract ratings for this lesson (4 categories starting from startCol)
      const expectedCategories = ['Application of Feedback', 'Application of Skills/Content', 'Asking Questions', 'Attitude & Efforts'];
      const ratings: any = {};

      for (let catIndex = 0; catIndex < 4; catIndex++) {
        const colIndex = lesson.startCol + catIndex;
        if (colIndex < row.length) {
          const value = row[colIndex];
          const categoryName = categoryHeaders[colIndex];

          // Map category name to database field
          let dbField = '';
          if (categoryName === 'Application of Feedback') dbField = 'application_feedback';
          else if (categoryName === 'Application of Skills/Content') dbField = 'application_skills';
          else if (categoryName === 'Asking Questions') dbField = 'asking_questions';
          else if (categoryName === 'Attitude & Efforts') dbField = 'attitude_efforts';

          if (dbField && typeof value === 'number' && value >= 0 && value <= 4) {
            ratings[dbField] = value;
          }
        }
      }

      // Assign ratings to record
      Object.assign(record, ratings);

      // Only add record if it has at least one rating
      if (Object.keys(ratings).length > 0) {
        records.push(record);
        console.log(`    Added record: Unit ${lesson.unit} Lesson ${lesson.lesson} with ${Object.keys(ratings).length} ratings`);
      }
    }
  }

  console.log(`Parsed ${records.length} attendance records from ${sheetName}`);
  return records;
}

async function importAttendanceRecords(records: AttendanceRecord[], batchId: string): Promise<void> {
  const courseMappings = await loadCourseMappings();
  const studentMappings = await loadStudentMappings();
  
  let imported = 0;
  let skipped = 0;
  
  for (const record of records) {
    try {
      const courseMapping = courseMappings.get(record.course_code);
      if (!courseMapping) {
        skipped++;
        continue;
      }
      
      const normalizedName = normalizeStudentName(record.student_name);
      const studentMapping = studentMappings.get(normalizedName);
      if (!studentMapping) {
        skipped++;
        continue;
      }
      
      // Get or create session
      const sessionId = await getOrCreateSession(
        courseMapping.id,
        record.unit_number,
        record.lesson_number,
        courseMapping.instructor_id
      );
      
      // Check if attendance record already exists
      const existingQuery = `
        SELECT id FROM attendances
        WHERE student_id = $1 AND session_id = $2
      `;
      const existingResult = await db.query(existingQuery, [studentMapping.id, sessionId]);
      
      if (existingResult.rows.length > 0) {
        // Update existing record
        const updateQuery = `
          UPDATE attendances SET
            attitude_efforts = $3,
            asking_questions = $4,
            application_skills = $5,
            application_feedback = $6,
            import_source = 'excel_import',
            import_batch_id = $7,
            updated_at = CURRENT_TIMESTAMP
          WHERE student_id = $1 AND session_id = $2
        `;
        
        await db.query(updateQuery, [
          studentMapping.id, sessionId,
          record.attitude_efforts, record.asking_questions,
          record.application_skills, record.application_feedback,
          batchId
        ]);
      } else {
        // Insert new record
        const insertQuery = `
          INSERT INTO attendances (
            id, student_id, session_id, status,
            attitude_efforts, asking_questions, application_skills, application_feedback,
            import_source, import_batch_id, marked_at, created_at, updated_at
          ) VALUES (
            $1, $2, $3, 'present',
            $4, $5, $6, $7,
            'excel_import', $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `;
        
        await db.query(insertQuery, [
          uuidv4(), studentMapping.id, sessionId,
          record.attitude_efforts, record.asking_questions,
          record.application_skills, record.application_feedback,
          batchId
        ]);
      }
      
      imported++;
    } catch (error) {
      console.error(`Error importing record for ${record.student_name}:`, error);
      skipped++;
    }
  }
  
  console.log(`\n✅ Import completed: ${imported} records imported, ${skipped} skipped`);
}

async function main() {
  try {
    console.log('🚀 Starting attendance data import...');
    
    // Load Excel file
    const workbook = XLSX.readFile('attendance_report.xlsx');
    console.log(`Found ${workbook.SheetNames.length} sheets`);
    
    // Load mappings
    const studentMappings = await loadStudentMappings();
    const courseMappings = await loadCourseMappings();
    
    const batchId = uuidv4();
    console.log(`Import batch ID: ${batchId}`);
    
    let allRecords: AttendanceRecord[] = [];
    
    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const records = await parseAttendanceSheet(sheetName, worksheet, studentMappings, courseMappings);
      allRecords = allRecords.concat(records);
    }
    
    console.log(`\nTotal records to import: ${allRecords.length}`);
    
    if (allRecords.length > 0) {
      await importAttendanceRecords(allRecords, batchId);
    }
    
    console.log('\n🎉 Attendance import completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during import:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
