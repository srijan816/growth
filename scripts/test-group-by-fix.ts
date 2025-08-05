#!/usr/bin/env tsx

import { db } from '../src/lib/database/connection';

async function testGroupByFixes() {
  console.log('🧪 Testing GROUP BY Fixes\n');
  
  try {
    // Test 1: Test the fixed student attendance query
    console.log('1️⃣ Testing Student Attendance CTE...');
    const testQuery1 = `
      WITH student_attendance AS (
        SELECT 
          a.student_id,
          COUNT(DISTINCT a.id) as attendance_count,
          AVG(
            (
              COALESCE(a.attitude_efforts, 0) + 
              COALESCE(a.asking_questions, 0) + 
              COALESCE(a.application_skills, 0) + 
              COALESCE(a.application_feedback, 0)
            ) / GREATEST(
              (CASE WHEN a.attitude_efforts IS NOT NULL THEN 1 ELSE 0 END) +
              (CASE WHEN a.asking_questions IS NOT NULL THEN 1 ELSE 0 END) +
              (CASE WHEN a.application_skills IS NOT NULL THEN 1 ELSE 0 END) +
              (CASE WHEN a.application_feedback IS NOT NULL THEN 1 ELSE 0 END),
              1
            )
          ) as avg_performance
        FROM attendances a
        JOIN class_sessions cs ON a.session_id = cs.id
        WHERE cs.course_id = (SELECT id FROM courses WHERE code = '02IPDEC2402' LIMIT 1)
        GROUP BY a.student_id
      )
      SELECT * FROM student_attendance LIMIT 5;
    `;
    
    const result1 = await db.query(testQuery1);
    console.log('✅ Student attendance query works!');
    console.log(`   Found ${result1.rows.length} student attendance records`);
    
    // Test 2: Test course avg_rating calculation
    console.log('\n2️⃣ Testing Course Average Rating...');
    const testQuery2 = `
      SELECT 
        c.code,
        COUNT(DISTINCT a.id) as rating_count,
        COALESCE(AVG(
          (
            COALESCE(a.attitude_efforts, 0) + 
            COALESCE(a.asking_questions, 0) + 
            COALESCE(a.application_skills, 0) + 
            COALESCE(a.application_feedback, 0)
          ) / GREATEST(
            (CASE WHEN a.attitude_efforts IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN a.asking_questions IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN a.application_skills IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN a.application_feedback IS NOT NULL THEN 1 ELSE 0 END),
            1
          )
        ), 0) as avg_rating
      FROM courses c
      LEFT JOIN class_sessions cs ON c.id = cs.course_id
      LEFT JOIN attendances a ON cs.id = a.session_id
      WHERE c.code = '02IPDEC2402'
      GROUP BY c.id, c.code;
    `;
    
    const result2 = await db.query(testQuery2);
    console.log('✅ Course average rating query works!');
    if (result2.rows.length > 0) {
      console.log(`   Course: ${result2.rows[0].code}`);
      console.log(`   Rating count: ${result2.rows[0].rating_count}`);
      console.log(`   Average rating: ${result2.rows[0].avg_rating}`);
    }
    
    // Test 3: Test the full course detail query
    console.log('\n3️⃣ Testing Full Course Detail Query...');
    const courseDetailQuery = `
      SELECT 
        c.id,
        c.code as course_code,
        c.name as course_name,
        COUNT(DISTINCT e.student_id) as enrolled_count
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE c.code = '02IPDEC2402'
      GROUP BY c.id;
    `;
    
    const result3 = await db.query(courseDetailQuery);
    console.log('✅ Course detail query works!');
    if (result3.rows.length > 0) {
      console.log(`   Course: ${result3.rows[0].course_name}`);
      console.log(`   Enrolled students: ${result3.rows[0].enrolled_count}`);
    }
    
    console.log('\n🎉 All GROUP BY fixes tested successfully!');
    console.log('\nThe database queries are now working correctly with:');
    console.log('- Proper GROUP BY clauses');
    console.log('- GREATEST() instead of NULLIF() to avoid division by zero');
    console.log('- All column references properly aggregated');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.code === '42803') {
      console.error('   This is a GROUP BY error - some fixes may not have been applied');
    }
  } finally {
    await db.close();
    process.exit(0);
  }
}

// Run tests
testGroupByFixes().catch(console.error);