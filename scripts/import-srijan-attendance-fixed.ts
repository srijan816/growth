#!/usr/bin/env tsx

import * as XLSX from 'xlsx';
import { db } from '../src/lib/postgres';
import { v4 as uuidv4 } from 'uuid';

interface AttendanceRecord {
  student_name: string;
  unit_number: number;
  lesson_number: number;
  attitude_efforts?: number;
  asking_questions?: number;
  application_skills?: number;
  application_feedback?: number;
}

interface ParsedSheetData {
  course_code: string;
  attendance_records: AttendanceRecord[];
}

// Extract course code from sheet name
function extractCourseCode(sheetName: string): string {
  const match = sheetName.match(/^([A-Z0-9]+)/);
  return match ? match[1] : sheetName;
}

// Parse unit and lesson from column header
function parseUnitLesson(header: string | undefined): { unit: number; lesson: number } | null {
  if (!header || typeof header !== 'string') return null;
  
  const match = header.match(/Unit\s+(\d+)\s+Lesson\s+(\d+)/);
  if (match) {
    return {
      unit: parseInt(match[1]),
      lesson: parseInt(match[2])
    };
  }
  return null;
}

// Parse a single sheet and extract attendance data - FIXED VERSION
function parseSheet(sheet: XLSX.WorkSheet, sheetName: string): ParsedSheetData {
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
  
  if (data.length < 3) {
    console.warn(`Sheet ${sheetName} has insufficient data`);
    return { course_code: extractCourseCode(sheetName), attendance_records: [] };
  }

  const courseCode = extractCourseCode(sheetName);
  const attendance_records: AttendanceRecord[] = [];

  // Row 0 has unit/lesson headers
  const unitLessonHeaders = data[0];
  // Row 1 has rating categories
  const categoryHeaders = data[1];

  // Find all unit/lesson columns (they appear every 4 columns)
  const lessonColumns: { col: number; unit: number; lesson: number }[] = [];
  
  for (let col = 1; col < unitLessonHeaders.length; col++) {
    const unitLesson = parseUnitLesson(unitLessonHeaders[col]);
    if (unitLesson) {
      lessonColumns.push({
        col: col,
        unit: unitLesson.unit,
        lesson: unitLesson.lesson
      });
    }
  }

  console.log(`Found ${lessonColumns.length} unit/lesson combinations in sheet ${sheetName}`);

  // Process student rows (starting from row 2)
  for (let row = 2; row < data.length; row++) {
    const studentName = data[row][0]?.toString().trim();
    if (!studentName) continue;

    // For each unit/lesson, collect all 4 category scores
    for (const lessonCol of lessonColumns) {
      const record: AttendanceRecord = {
        student_name: studentName,
        unit_number: lessonCol.unit,
        lesson_number: lessonCol.lesson
      };

      let hasData = false;

      // The 4 categories are in consecutive columns starting from the lesson column
      for (let offset = 0; offset < 4; offset++) {
        const colIndex = lessonCol.col + offset;
        if (colIndex < categoryHeaders.length && colIndex < data[row].length) {
          const category = categoryHeaders[colIndex]?.toString().trim();
          const value = data[row][colIndex];
          
          if (value && !isNaN(parseFloat(value))) {
            hasData = true;
            const numValue = parseFloat(value);
            
            switch (category) {
              case 'Attitude & Efforts':
                record.attitude_efforts = numValue;
                break;
              case 'Asking Questions':
                record.asking_questions = numValue;
                break;
              case 'Application of Skills/Content':
                record.application_skills = numValue;
                break;
              case 'Application of Feedback':
                record.application_feedback = numValue;
                break;
            }
          }
        }
      }

      // Only add the record if it has at least one score
      if (hasData) {
        attendance_records.push(record);
      }
    }
  }

  return { course_code: courseCode, attendance_records };
}

// Main import function
async function importAttendanceData() {
  console.log('Starting attendance data import (FIXED version with all 4 categories)...');
  
  try {
    // First, delete existing attendance records for Srijan's courses
    console.log('Cleaning up existing attendance records...');
    await db.query(`
      DELETE FROM attendances 
      WHERE session_id IN (
        SELECT cs.id FROM class_sessions cs
        JOIN courses c ON cs.course_id = c.id
        WHERE c.instructor_id = '550e8400-e29b-41d4-a716-446655440002'
      )
    `);

    // Get Srijan's instructor ID
    const { rows: instructors } = await db.query(`
      SELECT id FROM users WHERE name = 'Srijan' AND role = 'instructor'
    `);

    if (instructors.length === 0) {
      throw new Error('Instructor Srijan not found');
    }

    const instructorId = instructors[0].id;
    console.log(`Found instructor: Srijan (${instructorId})`);

    // Read Excel file
    const workbook = XLSX.readFile('attendance_report.xlsx');
    console.log(`\nProcessing ${workbook.SheetNames.length} sheets...`);

    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      console.log(`\n=== Processing sheet: ${sheetName} ===`);
      
      const sheet = workbook.Sheets[sheetName];
      const { course_code, attendance_records } = parseSheet(sheet, sheetName);

      if (attendance_records.length === 0) {
        console.log(`No attendance records found in sheet ${sheetName}`);
        continue;
      }

      // Find the course
      const { rows: courses } = await db.query(`
        SELECT id FROM courses 
        WHERE code = $1 AND instructor_id = $2
      `, [course_code, instructorId]);

      if (courses.length === 0) {
        console.warn(`Course ${course_code} not found for instructor Srijan`);
        totalSkipped += attendance_records.length;
        continue;
      }

      const courseId = courses[0].id;
      console.log(`Found course: ${course_code} (${courseId})`);
      console.log(`Processing ${attendance_records.length} attendance records...`);

      // Get course details for session creation
      const { rows: courseData } = await db.query(`
        SELECT start_time FROM courses WHERE id = $1
      `, [courseId]);
      
      const startTime = courseData[0].start_time;
      // Calculate end time as 1.5 hours after start time
      const [hours, minutes] = startTime.split(':').map(Number);
      let endHours = hours + 1;
      let endMinutes = minutes + 30;
      
      // Handle minute overflow
      if (endMinutes >= 60) {
        endMinutes -= 60;
        endHours += 1;
      }
      
      const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:00`;

      let courseImported = 0;
      let courseSkipped = 0;

      // Process attendance records
      for (const record of attendance_records) {
        try {
          // Find student by name (using flexible matching)
          const { rows: students } = await db.query(`
            SELECT s.id 
            FROM students s
            JOIN users u ON s.id = u.id
            WHERE u.name = $1
               OR LOWER(u.name) = LOWER($1)
               OR LOWER(TRIM(u.name)) = LOWER(TRIM($1))
          `, [record.student_name]);

          if (students.length === 0) {
            console.warn(`Student not found: ${record.student_name}`);
            courseSkipped++;
            totalSkipped++;
            continue;
          }

          const studentId = students[0].id;

          // Find or create session
          const { rows: sessions } = await db.query(`
            SELECT id FROM class_sessions 
            WHERE course_id = $1 AND unit_number = $2 AND lesson_number = $3
          `, [courseId, record.unit_number, record.lesson_number]);

          let sessionId;
          if (sessions.length === 0) {
            // Create new session
            const sessionDate = new Date();
            sessionDate.setDate(sessionDate.getDate() - (10 - record.unit_number) * 7 - record.lesson_number);
            
            const { rows: newSessions } = await db.query(`
              INSERT INTO class_sessions 
              (id, course_id, session_date, start_time, end_time, unit_number, lesson_number, status)
              VALUES ($1, $2, $3, $4, $5, $6, $7, 'completed')
              RETURNING id
            `, [uuidv4(), courseId, sessionDate, startTime, endTime, record.unit_number, record.lesson_number]);
            
            sessionId = newSessions[0].id;
            console.log(`Created session: Unit ${record.unit_number} Lesson ${record.lesson_number}`);
          } else {
            sessionId = sessions[0].id;
          }

          // Insert new attendance record with all 4 categories
          await db.query(`
            INSERT INTO attendances 
            (id, student_id, session_id, status, 
             attitude_efforts, asking_questions, application_skills, application_feedback)
            VALUES ($1, $2, $3, 'present', $4, $5, $6, $7)
            ON CONFLICT (student_id, session_id) DO UPDATE SET
              attitude_efforts = EXCLUDED.attitude_efforts,
              asking_questions = EXCLUDED.asking_questions,
              application_skills = EXCLUDED.application_skills,
              application_feedback = EXCLUDED.application_feedback,
              status = EXCLUDED.status,
              updated_at = NOW()
          `, [
            uuidv4(),
            studentId,
            sessionId,
            record.attitude_efforts,
            record.asking_questions,
            record.application_skills,
            record.application_feedback
          ]);

          courseImported++;
          totalImported++;
        } catch (error) {
          console.error(`Error processing record for ${record.student_name}:`, error);
          courseSkipped++;
          totalErrors++;
        }
      }
      
      console.log(`  Course summary: ${courseImported} imported, ${courseSkipped} skipped`);
    }

    console.log('\n=== Import Summary ===');
    console.log(`Total records imported: ${totalImported}`);
    console.log(`Total records skipped: ${totalSkipped}`);
    console.log(`Total errors: ${totalErrors}`);

    // Verify the import
    const { rows: verify } = await db.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(attitude_efforts) as has_ae,
        COUNT(asking_questions) as has_aq,
        COUNT(application_skills) as has_as,
        COUNT(application_feedback) as has_af
      FROM attendances a
      JOIN class_sessions cs ON a.session_id = cs.id
      JOIN courses c ON cs.course_id = c.id
      WHERE c.instructor_id = $1
    `, [instructorId]);
    
    console.log('\n=== Verification ===');
    console.log('Total records:', verify[0].total);
    console.log('Records with Attitude & Efforts:', verify[0].has_ae);
    console.log('Records with Asking Questions:', verify[0].has_aq);
    console.log('Records with Application Skills:', verify[0].has_as);
    console.log('Records with Application Feedback:', verify[0].has_af);

  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await db.close();
  }
}

// Run the import
importAttendanceData();