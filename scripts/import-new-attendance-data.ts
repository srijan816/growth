#!/usr/bin/env tsx

import * as XLSX from 'xlsx';
import { db } from '../src/lib/postgres';

interface AttendanceRecord {
  student_id: string;
  session_id: string;
  status: 'present' | 'absent' | 'makeup';
  attitude_efforts?: number;
  asking_questions?: number;
  application_skills?: number;
  application_feedback?: number;
  import_source: string;
}

async function examineExcelFiles() {
  console.log('🔍 Examining new Excel files...\n');

  // Examine G3-4 file
  console.log('📊 G3-4 File (attendance_report_g34.xlsx):');
  try {
    const g34Workbook = XLSX.readFile('attendance_report_g34.xlsx');
    console.log(`  Sheets: ${g34Workbook.SheetNames.join(', ')}`);
    
    const g34Sheet = g34Workbook.Sheets[g34Workbook.SheetNames[0]];
    const g34Data = XLSX.utils.sheet_to_json(g34Sheet, { header: 1 });
    
    console.log(`  Total rows: ${g34Data.length}`);
    console.log(`  Headers (first 3 rows):`);
    g34Data.slice(0, 3).forEach((row, i) => {
      console.log(`    Row ${i + 1}: ${JSON.stringify(row)}`);
    });
    
    // Look for student data
    console.log(`  Sample student rows (rows 4-6):`);
    g34Data.slice(3, 6).forEach((row, i) => {
      console.log(`    Row ${i + 4}: ${JSON.stringify(row)}`);
    });
  } catch (error) {
    console.error(`  ❌ Error reading G3-4 file: ${error}`);
  }

  console.log('\n📊 G5-6 File (attendance_report_g56.xlsx):');
  try {
    const g56Workbook = XLSX.readFile('attendance_report_g56.xlsx');
    console.log(`  Sheets: ${g56Workbook.SheetNames.join(', ')}`);

    const g56Sheet = g56Workbook.Sheets[g56Workbook.SheetNames[0]];
    const g56Data = XLSX.utils.sheet_to_json(g56Sheet, { header: 1 });

    console.log(`  Total rows: ${g56Data.length}`);
    console.log(`  Headers (first 3 rows):`);
    g56Data.slice(0, 3).forEach((row, i) => {
      console.log(`    Row ${i + 1}: ${JSON.stringify(row)}`);
    });

    // Look for student data
    console.log(`  Sample student rows (rows 4-6):`);
    g56Data.slice(3, 6).forEach((row, i) => {
      console.log(`    Row ${i + 4}: ${JSON.stringify(row)}`);
    });
  } catch (error) {
    console.log(`  ⚠️  File not found - please upload attendance_report_g56.xlsx`);
  }
}

async function checkExistingCourses() {
  console.log('\n🔍 Checking existing courses...');

  const coursesQuery = `
    SELECT id, code, name
    FROM courses
    WHERE code IN ('02IPDEB2401', '02IPDEC2402')
    ORDER BY code
  `;

  const result = await db.query(coursesQuery);

  if (result.rows.length > 0) {
    console.log('📚 Found courses:');
    result.rows.forEach(course => {
      console.log(`  ${course.code}: ${course.name}`);
    });
  } else {
    console.log('❌ No courses found with codes 02IPDEB2401 or 02IPDEC2402');
  }

  return result.rows;
}

async function checkExistingAttendance() {
  console.log('\n🔍 Checking existing attendance for these courses...');
  
  const attendanceQuery = `
    SELECT 
      c.code as course_code,
      c.name as course_name,
      COUNT(a.id) as attendance_count,
      COUNT(DISTINCT a.student_id) as unique_students
    FROM courses c
    LEFT JOIN class_sessions cs ON c.id = cs.course_id
    LEFT JOIN attendances a ON cs.id = a.session_id
    WHERE c.code IN ('02IPDEB2401', '02IPDEC2402')
    GROUP BY c.id, c.code, c.name
    ORDER BY c.code
  `;
  
  const result = await db.query(attendanceQuery);
  
  if (result.rows.length > 0) {
    console.log('📊 Existing attendance data:');
    result.rows.forEach(row => {
      console.log(`  ${row.course_code}: ${row.attendance_count} records, ${row.unique_students} students`);
    });
  } else {
    console.log('❌ No existing attendance data found');
  }
  
  return result.rows;
}

async function main() {
  try {
    console.log('🚀 Starting examination of new attendance files...\n');
    
    await examineExcelFiles();
    await checkExistingCourses();
    await checkExistingAttendance();
    
    console.log('\n✅ Examination complete!');
    console.log('\nNext steps:');
    console.log('1. Verify the Excel file structure matches expected format');
    console.log('2. Remove existing attendance records for these courses');
    console.log('3. Import new attendance data');
    console.log('4. Verify the import was successful');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
