#!/usr/bin/env tsx

import { db } from '../src/lib/postgres';

async function verifyImport() {
  console.log('🔍 Verifying G3-4 attendance import...\n');
  
  // Check total records
  const totalQuery = `
    SELECT COUNT(*) as total_records
    FROM attendances a
    JOIN class_sessions cs ON a.session_id = cs.id
    JOIN courses c ON cs.course_id = c.id
    WHERE c.code = '02IPDEB2401'
  `;
  
  const totalResult = await db.query(totalQuery);
  console.log(`📊 Total attendance records for G3-4: ${totalResult.rows[0].total_records}`);
  
  // Check students
  const studentsQuery = `
    SELECT DISTINCT u.name, COUNT(a.id) as attendance_count
    FROM attendances a
    JOIN class_sessions cs ON a.session_id = cs.id
    JOIN courses c ON cs.course_id = c.id
    JOIN users u ON a.student_id = u.id
    WHERE c.code = '02IPDEB2401'
    GROUP BY u.id, u.name
    ORDER BY u.name
  `;
  
  const studentsResult = await db.query(studentsQuery);
  console.log('\n👥 Students and their attendance counts:');
  studentsResult.rows.forEach(row => {
    console.log(`  ${row.name}: ${row.attendance_count} sessions`);
  });
  
  // Check units and lessons
  const unitsQuery = `
    SELECT cs.unit_number, cs.lesson_number, COUNT(a.id) as attendance_count
    FROM attendances a
    JOIN class_sessions cs ON a.session_id = cs.id
    JOIN courses c ON cs.course_id = c.id
    WHERE c.code = '02IPDEB2401'
    GROUP BY cs.unit_number, cs.lesson_number
    ORDER BY CAST(cs.unit_number AS INTEGER), CAST(cs.lesson_number AS INTEGER)
  `;
  
  const unitsResult = await db.query(unitsQuery);
  console.log('\n📚 Units and lessons with attendance:');
  unitsResult.rows.forEach(row => {
    console.log(`  Unit ${row.unit_number} Lesson ${row.lesson_number}: ${row.attendance_count} records`);
  });
  
  // Check sample ratings
  const ratingsQuery = `
    SELECT 
      u.name,
      cs.unit_number,
      cs.lesson_number,
      a.attitude_efforts,
      a.asking_questions,
      a.application_skills,
      a.application_feedback
    FROM attendances a
    JOIN class_sessions cs ON a.session_id = cs.id
    JOIN courses c ON cs.course_id = c.id
    JOIN users u ON a.student_id = u.id
    WHERE c.code = '02IPDEB2401'
    ORDER BY u.name, CAST(cs.unit_number AS INTEGER), CAST(cs.lesson_number AS INTEGER)
    LIMIT 10
  `;
  
  const ratingsResult = await db.query(ratingsQuery);
  console.log('\n⭐ Sample ratings (first 10 records):');
  ratingsResult.rows.forEach(row => {
    console.log(`  ${row.name} - Unit ${row.unit_number}.${row.lesson_number}: AE=${row.attitude_efforts}, AQ=${row.asking_questions}, AS=${row.application_skills}, AF=${row.application_feedback}`);
  });
  
  process.exit(0);
}

if (require.main === module) {
  verifyImport();
}
