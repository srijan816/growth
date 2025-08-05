#!/usr/bin/env tsx

import { db } from '../src/lib/postgres';

async function testStudentPageQuery() {
  try {
    console.log('🔍 Testing student page attendance query...');
    
    // Get a student with attendance data
    const studentQuery = `
      SELECT DISTINCT u.id, u.name
      FROM users u
      JOIN attendances a ON a.student_id = u.id
      WHERE a.import_source = 'excel_import'
      LIMIT 1
    `;
    
    const studentResult = await db.query(studentQuery);
    if (studentResult.rows.length === 0) {
      console.log('❌ No students with attendance data found');
      return;
    }
    
    const student = studentResult.rows[0];
    console.log(`📚 Testing with student: ${student.name} (ID: ${student.id})`);
    
    // Use the exact query from the student page
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
      LIMIT 5
    `;
    
    const attendanceResult = await db.query(attendanceQuery, [student.id]);
    
    console.log(`\n📊 Attendance data structure (what React component receives):`);
    console.log(`Total records: ${attendanceResult.rows.length}`);
    
    if (attendanceResult.rows.length > 0) {
      const sample = attendanceResult.rows[0];
      console.log('\nSample record structure:');
      console.log('Keys:', Object.keys(sample));
      console.log('Sample values:');
      console.log(`  id: ${sample.id}`);
      console.log(`  status: ${sample.status}`);
      console.log(`  attitude_efforts: ${sample.attitude_efforts}`);
      console.log(`  asking_questions: ${sample.asking_questions}`);
      console.log(`  application_skills: ${sample.application_skills}`);
      console.log(`  application_feedback: ${sample.application_feedback}`);
      console.log(`  course_code: ${sample.course_code}`);
      console.log(`  course_name: ${sample.course_name}`);
      console.log(`  unit_number: ${sample.unit_number}`);
      console.log(`  lesson_number: ${sample.lesson_number}`);
      console.log(`  date: ${sample.date}`);
    }
    
    console.log('\n✅ Query test completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error testing query:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  testStudentPageQuery();
}
