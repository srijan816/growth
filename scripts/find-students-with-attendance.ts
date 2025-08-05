#!/usr/bin/env tsx

import { db } from '../src/lib/postgres';

async function findStudentWithAttendance() {
  try {
    console.log('🔍 Finding students with attendance data...');
    
    // Get students with attendance data and their student numbers
    const query = `
      SELECT 
        u.id, 
        u.name, 
        s.student_number,
        COUNT(a.id) as attendance_count
      FROM users u
      JOIN students s ON s.id = u.id
      JOIN attendances a ON a.student_id = u.id
      WHERE a.import_source = 'excel_import'
      GROUP BY u.id, u.name, s.student_number
      ORDER BY attendance_count DESC
      LIMIT 5
    `;
    
    const result = await db.query(query);
    
    console.log('Students with attendance data:');
    result.rows.forEach((student, index) => {
      console.log(`${index + 1}. ${student.name}`);
      console.log(`   Student Number: ${student.student_number}`);
      console.log(`   Database ID: ${student.id}`);
      console.log(`   Attendance Records: ${student.attendance_count}`);
      console.log(`   Profile URL: http://localhost:3002/dashboard/students/${student.student_number}`);
      console.log('');
    });
    
    console.log('✅ Use any of the above URLs to test the attendance view!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  findStudentWithAttendance();
}
