#!/usr/bin/env tsx

import { db } from '../src/lib/postgres';

async function testSpecificStudent() {
  try {
    const studentNumber = 'LAMAST2201'; // Astrea Lam
    console.log(`🔍 Testing student: ${studentNumber}`);
    
    // First, get the student info like the page does
    const studentQuery = `
      SELECT 
        s.*,
        u.name,
        u.email as user_email,
        s.student_number as student_id_external
      FROM students s
      INNER JOIN users u ON s.id = u.id
      WHERE s.student_number = $1
    `;
    
    const studentResult = await db.query(studentQuery, [studentNumber]);
    if (studentResult.rows.length === 0) {
      console.log('❌ Student not found');
      return;
    }
    
    const student = studentResult.rows[0];
    console.log(`📚 Found student: ${student.name} (ID: ${student.id})`);
    
    // Now get attendance data like the page does
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
      WHERE a.student_id = $1
      ORDER BY cs.session_date DESC
      LIMIT 10
    `;
    
    const attendanceResult = await db.query(attendanceQuery, [student.id]);
    
    console.log(`\n📊 Attendance data for ${student.name}:`);
    console.log(`Total records: ${attendanceResult.rows.length}`);
    
    if (attendanceResult.rows.length > 0) {
      console.log('\nFirst 3 records:');
      attendanceResult.rows.slice(0, 3).forEach((record, index) => {
        console.log(`${index + 1}. ${record.course_code} Unit ${record.unit_number} Lesson ${record.lesson_number}`);
        console.log(`   Status: ${record.status}`);
        console.log(`   Ratings: A=${record.attitude_efforts}, Q=${record.asking_questions}, S=${record.application_skills}, F=${record.application_feedback}`);
        console.log(`   Date: ${record.date}`);
      });
    } else {
      console.log('❌ No attendance records found!');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testSpecificStudent();
}
