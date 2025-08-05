#!/usr/bin/env tsx

import { db } from '../src/lib/postgres';

async function testStudentAttendance() {
  try {
    console.log('🔍 Testing student attendance data fetch...');
    
    // Get a student with attendance data
    const studentQuery = `
      SELECT DISTINCT u.id, u.name, COUNT(a.id) as attendance_count
      FROM users u
      JOIN attendances a ON a.student_id = u.id
      WHERE a.import_source = 'excel_import'
      GROUP BY u.id, u.name
      ORDER BY attendance_count DESC
      LIMIT 1
    `;
    
    const studentResult = await db.query(studentQuery);
    if (studentResult.rows.length === 0) {
      console.log('❌ No students with attendance data found');
      return;
    }
    
    const student = studentResult.rows[0];
    console.log(`📚 Testing with student: ${student.name} (ID: ${student.id})`);
    console.log(`   Has ${student.attendance_count} attendance records`);
    
    // Fetch attendance data like the student profile page does
    const attendanceQuery = `
      SELECT 
        a.*,
        cs.session_date as date,
        c.code as course_code,
        c.name as course_name,
        cs.unit_number,
        cs.lesson_number
      FROM attendances a
      LEFT JOIN class_sessions cs ON cs.id = a.session_id
      LEFT JOIN courses c ON c.id = cs.course_id
      WHERE a.student_id = $1 AND a.import_source = 'excel_import'
      ORDER BY cs.session_date DESC
      LIMIT 5
    `;
    
    const attendanceResult = await db.query(attendanceQuery, [student.id]);
    
    console.log(`\n📊 Sample attendance records for ${student.name}:`);
    attendanceResult.rows.forEach((record, index) => {
      console.log(`  ${index + 1}. ${record.course_code} Unit ${record.unit_number} Lesson ${record.lesson_number}`);
      console.log(`     Attitude: ${record.attitude_efforts}, Questions: ${record.asking_questions}`);
      console.log(`     Skills: ${record.application_skills}, Feedback: ${record.application_feedback}`);
      console.log(`     Status: ${record.status}, Date: ${record.date}`);
    });
    
    console.log('\n✅ Student attendance data is properly accessible!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing student attendance:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testStudentAttendance();
}
