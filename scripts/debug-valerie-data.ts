#!/usr/bin/env tsx

import { db } from '../src/lib/postgres';

async function debugValerieData() {
  try {
    console.log('🔍 Debugging Valerie Poon attendance data...');
    
    // Get Valerie's data exactly as the page does
    const studentQuery = `
      SELECT s.*, u.name
      FROM students s
      INNER JOIN users u ON s.id = u.id
      WHERE s.student_number = 'POOVAL2402'
    `;
    
    const studentResult = await db.query(studentQuery);
    const student = studentResult.rows[0];
    console.log(`📚 Student: ${student.name} (ID: ${student.id})`);
    
    // Get attendance data with exact query from page
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
    
    console.log(`\nTotal attendance records: ${attendanceResult.rows.length}`);
    
    if (attendanceResult.rows.length > 0) {
      console.log('\nDetailed analysis of first record:');
      const record = attendanceResult.rows[0];
      
      console.log('Raw record data:');
      console.log(`  attitude_efforts: ${record.attitude_efforts} (type: ${typeof record.attitude_efforts})`);
      console.log(`  asking_questions: ${record.asking_questions} (type: ${typeof record.asking_questions})`);
      console.log(`  application_skills: ${record.application_skills} (type: ${typeof record.application_skills})`);
      console.log(`  application_feedback: ${record.application_feedback} (type: ${typeof record.application_feedback})`);
      console.log(`  status: ${record.status}`);
      console.log(`  course_code: ${record.course_code}`);
      console.log(`  unit_number: ${record.unit_number} (type: ${typeof record.unit_number})`);
      console.log(`  lesson_number: ${record.lesson_number} (type: ${typeof record.lesson_number})`);
      
      // Test the filtering logic
      const ratings = [
        record.attitude_efforts,
        record.asking_questions,
        record.application_skills,
        record.application_feedback
      ];
      
      console.log('\nRating analysis:');
      ratings.forEach((rating, index) => {
        const categories = ['attitude_efforts', 'asking_questions', 'application_skills', 'application_feedback'];
        console.log(`  ${categories[index]}: ${rating}`);
        console.log(`    - undefined? ${rating === undefined}`);
        console.log(`    - null? ${rating === null}`);
        console.log(`    - typeof number? ${typeof rating === 'number'}`);
        console.log(`    - passes filter? ${rating !== undefined && rating !== null && typeof rating === 'number'}`);
      });
      
      // Test the NEW filtering logic (like the component now does)
      const validRatings = ratings
        .filter(r => r !== undefined && r !== null)
        .map(r => typeof r === 'string' ? parseFloat(r) : r)
        .filter(r => !isNaN(r) && typeof r === 'number');

      console.log(`\nValid ratings count (NEW logic): ${validRatings.length}`);
      console.log(`Valid ratings (NEW logic): ${validRatings}`);

      if (validRatings.length > 0) {
        const average = validRatings.reduce((sum, r) => sum + r, 0) / validRatings.length;
        console.log(`Average (NEW logic): ${average}`);
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  debugValerieData();
}
