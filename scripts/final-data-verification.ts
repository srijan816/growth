#!/usr/bin/env tsx

import { db } from '../src/lib/database/connection';

async function finalDataVerification() {
  console.log('✅ Final Data Verification\n');
  
  try {
    // 1. Summary statistics
    console.log('1️⃣ Database Summary:');
    
    const stats = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM students) as total_students,
        (SELECT COUNT(*) FROM courses) as total_courses,
        (SELECT COUNT(*) FROM enrollments) as total_enrollments,
        (SELECT COUNT(*) FROM courses WHERE day_of_week IS NOT NULL) as courses_with_schedule,
        (SELECT COUNT(*) FROM users WHERE role = 'instructor') as total_instructors
    `);
    
    const s = stats.rows[0];
    console.log(`   Total Students: ${s.total_students}`);
    console.log(`   Total Courses: ${s.total_courses}`);
    console.log(`   Total Enrollments: ${s.total_enrollments}`);
    console.log(`   Courses with Schedules: ${s.courses_with_schedule}/${s.total_courses}`);
    console.log(`   Total Instructors: ${s.total_instructors}`);
    
    // 2. Courses by day
    console.log('\n2️⃣ Courses by Day of Week:');
    
    const coursesByDay = await db.query(`
      SELECT 
        day_of_week,
        COUNT(*) as course_count,
        STRING_AGG(code || ' (' || start_time || ')', ', ' ORDER BY start_time) as courses
      FROM courses
      WHERE day_of_week IS NOT NULL
      GROUP BY day_of_week
      ORDER BY 
        CASE day_of_week 
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
          WHEN 'Sunday' THEN 7
        END
    `);
    
    for (const day of coursesByDay.rows) {
      console.log(`   ${day.day_of_week}: ${day.course_count} courses`);
      console.log(`      ${day.courses}`);
    }
    
    // 3. Enrollment distribution
    console.log('\n3️⃣ Enrollment Distribution:');
    
    const enrollmentDist = await db.query(`
      SELECT 
        c.code,
        c.name,
        COUNT(e.id) as enrollment_count
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      GROUP BY c.id, c.code, c.name
      ORDER BY COUNT(e.id) DESC
      LIMIT 10
    `);
    
    console.log('   Top 10 courses by enrollment:');
    for (const course of enrollmentDist.rows) {
      console.log(`   ${course.code}: ${course.enrollment_count} students`);
    }
    
    // 4. Check for data issues
    console.log('\n4️⃣ Data Quality Checks:');
    
    // Duplicate students
    const duplicates = await db.query(`
      SELECT student_number, COUNT(*) as count
      FROM students
      GROUP BY student_number
      HAVING COUNT(*) > 1
    `);
    
    if (duplicates.rows.length > 0) {
      console.log('   ⚠️  Found duplicate student IDs:');
      for (const dup of duplicates.rows) {
        console.log(`      ${dup.student_number}: ${dup.count} occurrences`);
      }
    } else {
      console.log('   ✅ No duplicate students');
    }
    
    // Students without enrollments
    const unenrolledStudents = await db.query(`
      SELECT COUNT(*) as count
      FROM students s
      LEFT JOIN enrollments e ON s.id = e.student_id
      WHERE e.id IS NULL
    `);
    
    console.log(`   Students without enrollments: ${unenrolledStudents.rows[0].count}`);
    
    // Courses without enrollments
    const emptyCourses = await db.query(`
      SELECT c.code, c.name
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE e.id IS NULL
      ORDER BY c.code
    `);
    
    if (emptyCourses.rows.length > 0) {
      console.log('   ⚠️  Courses without students:');
      for (const course of emptyCourses.rows) {
        console.log(`      ${course.code}: ${course.name}`);
      }
    } else {
      console.log('   ✅ All courses have enrollments');
    }
    
    // 5. Sample data
    console.log('\n5️⃣ Sample Data:');
    
    // Sample students with enrollments
    const sampleStudents = await db.query(`
      SELECT 
        s.student_number,
        u.name,
        s.grade_level,
        s.school,
        COUNT(e.id) as course_count,
        STRING_AGG(c.code, ', ' ORDER BY c.code) as courses
      FROM students s
      JOIN users u ON s.id = u.id
      JOIN enrollments e ON s.id = e.student_id
      JOIN courses c ON e.course_id = c.id
      GROUP BY s.id, s.student_number, u.name, s.grade_level, s.school
      ORDER BY RANDOM()
      LIMIT 5
    `);
    
    console.log('   Sample enrolled students:');
    for (const student of sampleStudents.rows) {
      console.log(`   ${student.student_number}: ${student.name} (${student.grade_level || 'No grade'})`);
      console.log(`      School: ${student.school || 'No school'}`);
      console.log(`      Courses: ${student.courses}`);
    }
    
    console.log('\n🎉 Data verification complete!');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await db.close();
    process.exit(0);
  }
}

// Run verification
finalDataVerification().catch(console.error);