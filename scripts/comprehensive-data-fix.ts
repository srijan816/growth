#!/usr/bin/env tsx

import { db } from '../src/lib/database/connection';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';

async function comprehensiveDataFix() {
  console.log('🔧 Comprehensive Data Fix\n');
  
  try {
    // Check current database state
    console.log('1️⃣ Current Database State:');
    const studentCount = await db.query('SELECT COUNT(*) as count FROM students');
    console.log(`   Students in DB: ${studentCount.rows[0].count}`);
    
    // Sample existing students
    const sampleStudents = await db.query(`
      SELECT s.student_number, u.name, s.grade_level, s.school 
      FROM students s 
      JOIN users u ON s.id = u.id 
      LIMIT 5
    `);
    console.log('\n   Sample existing students:');
    for (const student of sampleStudents.rows) {
      console.log(`   ${student.student_number}: ${student.name} (${student.grade_level})`);
    }
    
    // Read Excel files
    const secondPath = path.join(__dirname, '../data/Srijan/second.xlsx');
    if (!fs.existsSync(secondPath)) {
      console.error('❌ second.xlsx not found!');
      return;
    }
    
    const secondWorkbook = XLSX.readFile(secondPath);
    
    // Process all students from Excel
    console.log('\n2️⃣ Processing Excel Data:');
    
    const studentsToImport = [];
    const enrollmentsToCreate = [];
    
    // Get existing students
    const existingStudentsResult = await db.query('SELECT student_number FROM students');
    const existingStudentIds = new Set(existingStudentsResult.rows.map(r => r.student_number));
    
    for (const sheetName of Object.keys(secondWorkbook.Sheets)) {
      const sheet = secondWorkbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      
      // Skip empty sheets
      if (data.length < 2) continue;
      
      // Process each row (skip header)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 3) continue;
        
        // Extract data - handle the special case of "Luca Chan"
        let studentId = row[1]?.toString() || '';
        let studentName = row[2]?.toString() || '';
        const grade = row[3]?.toString() || '';
        const school = row[4]?.toString() || '';
        
        // Fix the "Luca Chan" issue - generate a proper student ID
        if (studentId === 'Luca Chan' || !studentId.match(/^[A-Z]{3}[A-Z]{3}\d{4}$/)) {
          // Generate a student ID based on name
          const nameParts = studentName.split(' ');
          const firstName = nameParts[0] || 'XXX';
          const lastName = nameParts[nameParts.length - 1] || 'YYY';
          studentId = `${lastName.substring(0, 3).toUpperCase()}${firstName.substring(0, 3).toUpperCase()}9999`.replace(/[^A-Z0-9]/g, '');
          console.log(`   Generated ID for ${studentName}: ${studentId}`);
        }
        
        // Skip header rows and invalid data
        if (studentId === 'Student ID' || !studentName || studentName === 'Student Name') continue;
        
        // Check if student already exists
        if (!existingStudentIds.has(studentId)) {
          studentsToImport.push({
            studentId,
            name: studentName,
            grade: grade || null,
            school: school || null,
            courseCode: sheetName
          });
          existingStudentIds.add(studentId); // Prevent duplicates in this run
        } else {
          // Student exists, just track enrollment
          enrollmentsToCreate.push({
            studentId,
            courseCode: sheetName
          });
        }
      }
    }
    
    console.log(`   Found ${studentsToImport.length} new students to import`);
    console.log(`   Found ${enrollmentsToCreate.length} enrollments to create for existing students`);
    
    // Import new students
    if (studentsToImport.length > 0) {
      console.log('\n3️⃣ Importing New Students:');
      
      const defaultPassword = await bcrypt.hash('changeme123', 12);
      let imported = 0;
      let errors = 0;
      
      for (const student of studentsToImport) {
        try {
          await db.query('BEGIN');
          
          // Create user account
          const email = `${student.studentId.toLowerCase()}@student.capstone.com`;
          
          // Check if user already exists
          const existingUser = await db.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
          );
          
          let userId;
          if (existingUser.rows.length === 0) {
            const userResult = await db.query(
              `INSERT INTO users (email, name, role, password)
               VALUES ($1, $2, 'student', $3)
               RETURNING id`,
              [email, student.name, defaultPassword]
            );
            userId = userResult.rows[0].id;
          } else {
            userId = existingUser.rows[0].id;
            // Update name if needed
            await db.query(
              'UPDATE users SET name = $2 WHERE id = $1',
              [userId, student.name]
            );
          }
          
          // Check if student record exists
          const existingStudent = await db.query(
            'SELECT id FROM students WHERE id = $1',
            [userId]
          );
          
          if (existingStudent.rows.length === 0) {
            // Create student record - use 'name' column instead of separate fields
            await db.query(
              `INSERT INTO students (id, student_number, grade_level, school, email, name)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [userId, student.studentId, student.grade, student.school, email, student.name]
            );
          }
          
          // Create enrollment
          const courseResult = await db.query(
            'SELECT id FROM courses WHERE code = $1',
            [student.courseCode]
          );
          
          if (courseResult.rows.length > 0) {
            const courseId = courseResult.rows[0].id;
            
            await db.query(
              `INSERT INTO enrollments (student_id, course_id, enrollment_date, status)
               VALUES ($1, $2, CURRENT_DATE, 'active')
               ON CONFLICT (student_id, course_id) DO NOTHING`,
              [userId, courseId]
            );
          }
          
          await db.query('COMMIT');
          imported++;
          
          if (imported % 10 === 0) {
            console.log(`   ✅ Imported ${imported} students...`);
          }
          
        } catch (error: any) {
          await db.query('ROLLBACK');
          console.error(`   ❌ Error importing ${student.studentId}: ${error.message}`);
          errors++;
        }
      }
      
      console.log(`   ✅ Successfully imported ${imported} students`);
      if (errors > 0) {
        console.log(`   ❌ Failed to import ${errors} students`);
      }
    }
    
    // Create missing enrollments for existing students
    console.log('\n4️⃣ Creating Missing Enrollments:');
    let enrollmentsCreated = 0;
    
    for (const enrollment of enrollmentsToCreate) {
      try {
        // Get student user ID
        const studentResult = await db.query(
          'SELECT id FROM students WHERE student_number = $1',
          [enrollment.studentId]
        );
        
        if (studentResult.rows.length === 0) continue;
        
        const studentUserId = studentResult.rows[0].id;
        
        // Get course ID
        const courseResult = await db.query(
          'SELECT id FROM courses WHERE code = $1',
          [enrollment.courseCode]
        );
        
        if (courseResult.rows.length === 0) continue;
        
        const courseId = courseResult.rows[0].id;
        
        // Create enrollment if it doesn't exist
        await db.query(
          `INSERT INTO enrollments (student_id, course_id, enrollment_date, status)
           VALUES ($1, $2, CURRENT_DATE, 'active')
           ON CONFLICT (student_id, course_id) DO NOTHING`,
          [studentUserId, courseId]
        );
        
        enrollmentsCreated++;
        
      } catch (error: any) {
        console.error(`   ❌ Error creating enrollment: ${error.message}`);
      }
    }
    
    console.log(`   ✅ Created ${enrollmentsCreated} new enrollments`);
    
    // Fix course schedules
    console.log('\n5️⃣ Fixing Course Schedules:');
    
    // Map course codes to proper schedules based on folder structure
    const courseSchedules = [
      // Regular courses from folder names
      { pattern: /Tuesday.*4.30.*6.00/i, day: 'Tuesday', time: '16:30:00' },
      { pattern: /Wednesday.*4.30.*6/i, day: 'Wednesday', time: '16:30:00' },
      { pattern: /Wednesday.*6.*7.5/i, day: 'Wednesday', time: '18:00:00' },
      { pattern: /Thursday.*4.30.*6/i, day: 'Thursday', time: '16:30:00' },
      { pattern: /Thursday.*6.*7.5/i, day: 'Thursday', time: '18:00:00' },
      { pattern: /Friday.*4.30.*6/i, day: 'Friday', time: '16:30:00' },
      { pattern: /Friday.*6.*7.5/i, day: 'Friday', time: '18:00:00' },
      { pattern: /Saturday.*9.30.*11/i, day: 'Saturday', time: '09:30:00' },
      { pattern: /Saturday.*11.*12.5/i, day: 'Saturday', time: '11:00:00' },
      { pattern: /Saturday.*1.30.*3/i, day: 'Saturday', time: '13:30:00' },
      { pattern: /Saturday.*1.5.*3/i, day: 'Saturday', time: '13:30:00' },
      { pattern: /Saturday.*3.*4.30/i, day: 'Saturday', time: '15:00:00' },
      { pattern: /Saturday.*4.45.*6.15/i, day: 'Saturday', time: '16:45:00' },
    ];
    
    // Update courses without schedules
    const coursesWithoutSchedule = await db.query(`
      SELECT id, code, name 
      FROM courses 
      WHERE day_of_week IS NULL OR day_of_week = 'Not set'
    `);
    
    for (const course of coursesWithoutSchedule.rows) {
      // Default schedule for intensives
      if (course.name.includes('Intensive')) {
        await db.query(
          `UPDATE courses SET day_of_week = 'Monday', start_time = '10:00:00' WHERE id = $1`,
          [course.id]
        );
      }
    }
    
    console.log(`   ✅ Updated ${coursesWithoutSchedule.rows.length} course schedules`);
    
    // Final summary
    console.log('\n📊 Final Summary:');
    const finalStudentCount = await db.query('SELECT COUNT(*) as count FROM students');
    const finalEnrollmentCount = await db.query('SELECT COUNT(*) as count FROM enrollments');
    const coursesWithSchedules = await db.query('SELECT COUNT(*) as count FROM courses WHERE day_of_week IS NOT NULL');
    
    console.log(`   Total students: ${finalStudentCount.rows[0].count}`);
    console.log(`   Total enrollments: ${finalEnrollmentCount.rows[0].count}`);
    console.log(`   Courses with schedules: ${coursesWithSchedules.rows[0].count}/20`);
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await db.close();
    process.exit(0);
  }
}

// Run fix
comprehensiveDataFix().catch(console.error);