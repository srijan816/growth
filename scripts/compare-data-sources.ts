#!/usr/bin/env tsx

import { db } from '../src/lib/database/connection';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

async function compareDataSources() {
  console.log('📊 Comparing Database with Source Files\n');
  
  try {
    // 1. Check current database state
    console.log('1️⃣ Current Database State:');
    
    // Count students
    const studentCount = await db.query('SELECT COUNT(*) as count FROM students');
    console.log(`   Students in DB: ${studentCount.rows[0].count}`);
    
    // Count courses
    const courseCount = await db.query('SELECT COUNT(*) as count FROM courses');
    console.log(`   Courses in DB: ${courseCount.rows[0].count}`);
    
    // Count enrollments
    const enrollmentCount = await db.query('SELECT COUNT(*) as count FROM enrollments');
    console.log(`   Enrollments in DB: ${enrollmentCount.rows[0].count}`);
    
    // List all courses
    console.log('\n2️⃣ Courses in Database:');
    const courses = await db.query(`
      SELECT code, name, day_of_week, start_time, instructor_id, status, 
             (SELECT COUNT(*) FROM enrollments WHERE course_id = courses.id) as enrollment_count
      FROM courses 
      ORDER BY code
    `);
    
    for (const course of courses.rows) {
      console.log(`   ${course.code}: ${course.name}`);
      console.log(`      Day: ${course.day_of_week || 'Not set'}, Time: ${course.start_time || 'Not set'}`);
      console.log(`      Status: ${course.status}, Enrollments: ${course.enrollment_count}`);
    }
    
    // 3. Read Excel files to compare
    console.log('\n3️⃣ Reading Source Excel Files:');
    
    // Try to read first.xlsx
    const firstPath = path.join(__dirname, '../data/Srijan/first.xlsx');
    const secondPath = path.join(__dirname, '../data/Srijan/second.xlsx');
    
    if (fs.existsSync(firstPath)) {
      console.log('\n   Reading first.xlsx...');
      const firstWorkbook = XLSX.readFile(firstPath);
      
      // Check for Courses sheet
      if (firstWorkbook.Sheets['Courses']) {
        const coursesData = XLSX.utils.sheet_to_json(firstWorkbook.Sheets['Courses'], { header: 1 }) as any[][];
        console.log(`   Found ${coursesData.length - 1} rows in Courses sheet`);
        
        // Count active courses
        let activeCourses = 0;
        for (let i = 1; i < coursesData.length; i++) {
          if (coursesData[i] && coursesData[i][1] === 'Active') {
            activeCourses++;
          }
        }
        console.log(`   Active courses in Excel: ${activeCourses}`);
      } else {
        console.log('   ⚠️  No "Courses" sheet found in first.xlsx');
      }
    } else {
      console.log('   ⚠️  first.xlsx not found at expected location');
    }
    
    if (fs.existsSync(secondPath)) {
      console.log('\n   Reading second.xlsx...');
      const secondWorkbook = XLSX.readFile(secondPath);
      
      console.log(`   Sheets in second.xlsx: ${Object.keys(secondWorkbook.Sheets).join(', ')}`);
      
      // Count total students across all sheets
      let totalStudents = 0;
      const studentIds = new Set<string>();
      
      for (const sheetName of Object.keys(secondWorkbook.Sheets)) {
        const sheet = secondWorkbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        // Skip header row and count unique student IDs
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (row && row[1] && row[1] !== 'Student ID') {
            studentIds.add(row[1].toString());
            totalStudents++;
          }
        }
      }
      
      console.log(`   Total student entries in Excel: ${totalStudents}`);
      console.log(`   Unique students in Excel: ${studentIds.size}`);
    } else {
      console.log('   ⚠️  second.xlsx not found at expected location');
    }
    
    // 4. Check for missing courses (should have schedules)
    console.log('\n4️⃣ Checking Course Schedules:');
    const missingSchedules = await db.query(`
      SELECT code, name, day_of_week, start_time 
      FROM courses 
      WHERE day_of_week IS NULL OR start_time IS NULL
      ORDER BY code
    `);
    
    if (missingSchedules.rows.length > 0) {
      console.log('   ⚠️  Courses missing schedule information:');
      for (const course of missingSchedules.rows) {
        console.log(`      ${course.code}: ${course.name}`);
      }
    } else {
      console.log('   ✅ All courses have schedule information');
    }
    
    // 5. Check for courses with no enrollments
    console.log('\n5️⃣ Courses with No Enrollments:');
    const emptyCoursesQuery = await db.query(`
      SELECT c.code, c.name 
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      WHERE e.id IS NULL
      ORDER BY c.code
    `);
    
    if (emptyCoursesQuery.rows.length > 0) {
      console.log('   ⚠️  Courses with no students:');
      for (const course of emptyCoursesQuery.rows) {
        console.log(`      ${course.code}: ${course.name}`);
      }
    } else {
      console.log('   ✅ All courses have enrollments');
    }
    
    // 6. Check for duplicate students
    console.log('\n6️⃣ Checking for Duplicate Students:');
    const duplicatesQuery = await db.query(`
      SELECT student_number, COUNT(*) as count
      FROM students
      GROUP BY student_number
      HAVING COUNT(*) > 1
    `);
    
    if (duplicatesQuery.rows.length > 0) {
      console.log('   ⚠️  Found duplicate student IDs:');
      for (const dup of duplicatesQuery.rows) {
        console.log(`      ${dup.student_number}: ${dup.count} occurrences`);
      }
    } else {
      console.log('   ✅ No duplicate students found');
    }
    
    // 7. Check instructor assignments
    console.log('\n7️⃣ Instructor Assignments:');
    const instructorQuery = await db.query(`
      SELECT 
        u.name as instructor_name,
        COUNT(c.id) as course_count,
        ARRAY_AGG(c.code ORDER BY c.code) as course_codes
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE u.role = 'instructor'
      GROUP BY u.id, u.name
    `);
    
    for (const instructor of instructorQuery.rows) {
      console.log(`   ${instructor.instructor_name}: ${instructor.course_count} courses`);
      console.log(`      Courses: ${instructor.course_codes.join(', ')}`);
    }
    
    console.log('\n📋 Summary:');
    console.log('   - Check if all Excel courses are in the database');
    console.log('   - Verify all students from Excel are imported');
    console.log('   - Ensure course schedules are properly set');
    console.log('   - Confirm instructor assignments are correct');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await db.close();
    process.exit(0);
  }
}

// Run comparison
compareDataSources().catch(console.error);