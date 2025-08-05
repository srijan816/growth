#!/usr/bin/env tsx

import { db } from '../src/lib/database/connection';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';

async function fixDataImport() {
  console.log('🔧 Fixing Data Import Issues\n');
  
  try {
    // First, let's check the database schema
    console.log('1️⃣ Checking Database Schema:');
    
    const schemaCheck = await db.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'students' 
      ORDER BY ordinal_position
    `);
    
    console.log('   Students table columns:');
    for (const col of schemaCheck.rows) {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    }
    
    // Read Excel files
    const firstPath = path.join(__dirname, '../data/Srijan/first.xlsx');
    const secondPath = path.join(__dirname, '../data/Srijan/second.xlsx');
    
    if (!fs.existsSync(secondPath)) {
      console.error('❌ second.xlsx not found!');
      return;
    }
    
    // Read second.xlsx and analyze the structure
    console.log('\n2️⃣ Analyzing Excel Structure:');
    const secondWorkbook = XLSX.readFile(secondPath);
    
    // Look at the first sheet to understand the structure
    const firstSheetName = Object.keys(secondWorkbook.Sheets)[0];
    const firstSheet = secondWorkbook.Sheets[firstSheetName];
    const firstSheetData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];
    
    console.log(`   First sheet: ${firstSheetName}`);
    console.log(`   Headers: ${firstSheetData[0]?.join(', ')}`);
    console.log(`   Sample row: ${firstSheetData[1]?.join(', ')}`);
    
    // Get existing students to avoid duplicates
    const existingStudentsResult = await db.query('SELECT student_number FROM students');
    const existingStudentIds = new Set(existingStudentsResult.rows.map(r => r.student_number));
    
    // Process all sheets and collect students
    const allStudents = new Map<string, any>();
    const studentEnrollments = new Map<string, Set<string>>();
    
    for (const sheetName of Object.keys(secondWorkbook.Sheets)) {
      const sheet = secondWorkbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      
      // Skip if no data
      if (data.length < 2) continue;
      
      // Process each row (skip header)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length < 2) continue;
        
        // Handle different data formats
        let studentId: string;
        let name: string;
        let grade: string = '';
        let school: string = '';
        
        // Check if the first column is a number (Excel serial number issue)
        if (typeof row[0] === 'number') {
          // Skip serial number, student ID is in column 1
          studentId = row[1]?.toString() || '';
          name = row[2]?.toString() || '';
          grade = row[3]?.toString() || '';
          school = row[4]?.toString() || '';
        } else {
          // Normal format
          studentId = row[0]?.toString() || '';
          name = row[1]?.toString() || '';
          grade = row[2]?.toString() || '';
          school = row[3]?.toString() || '';
        }
        
        // Skip invalid rows
        if (!studentId || studentId === 'Student ID' || !name || name === 'Name') continue;
        
        // Store student data
        if (!allStudents.has(studentId)) {
          allStudents.set(studentId, { studentId, name, grade, school });
        }
        
        // Track enrollments
        if (!studentEnrollments.has(studentId)) {
          studentEnrollments.set(studentId, new Set());
        }
        studentEnrollments.get(studentId)!.add(sheetName);
      }
    }
    
    console.log(`\n3️⃣ Found ${allStudents.size} unique students in Excel`);
    
    // Find missing students
    const missingStudents = [];
    for (const [studentId, studentData] of allStudents) {
      if (!existingStudentIds.has(studentId)) {
        missingStudents.push(studentData);
      }
    }
    
    console.log(`   Missing students: ${missingStudents.length}`);
    
    if (missingStudents.length > 0) {
      console.log('\n4️⃣ Importing Missing Students:');
      
      const defaultPassword = await bcrypt.hash('changeme123', 12);
      let imported = 0;
      let errors = 0;
      
      // Import each student individually to avoid transaction issues
      for (const student of missingStudents) {
        try {
          await db.query('BEGIN');
          
          // Create user account
          const email = `${student.studentId.toLowerCase()}@student.capstone.com`;
          
          const userResult = await db.query(
            `INSERT INTO users (email, name, role, password)
             VALUES ($1, $2, 'student', $3)
             ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
             RETURNING id`,
            [email, student.name, defaultPassword]
          );
          
          const userId = userResult.rows[0].id;
          
          // Create student record
          await db.query(
            `INSERT INTO students (id, student_number, grade_level, school, email)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE SET 
               grade_level = EXCLUDED.grade_level,
               school = EXCLUDED.school`,
            [userId, student.studentId, student.grade || null, student.school || null, email]
          );
          
          // Create enrollments
          const courseCodes = studentEnrollments.get(student.studentId) || new Set();
          for (const courseCode of courseCodes) {
            const courseResult = await db.query(
              'SELECT id FROM courses WHERE code = $1',
              [courseCode]
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
          }
          
          await db.query('COMMIT');
          imported++;
          
          if (imported % 10 === 0) {
            console.log(`   ✅ Imported ${imported} students...`);
          }
          
        } catch (error: any) {
          await db.query('ROLLBACK');
          console.error(`   ❌ Error importing ${student.studentId} (${student.name}): ${error.message}`);
          errors++;
        }
      }
      
      console.log(`\n   ✅ Successfully imported ${imported} students`);
      if (errors > 0) {
        console.log(`   ❌ Failed to import ${errors} students`);
      }
    }
    
    // Fix course schedules
    console.log('\n5️⃣ Fixing Course Schedules:');
    
    // Update intensives courses to have proper schedules
    const intensivesUpdates = [
      { code: '02IPBJU2502', day: 'Monday', time: '16:00:00' },
      { code: '02IPCJY2502', day: 'Monday', time: '16:00:00' },
      { code: '02IPDBEP2503', day: 'Monday', time: '16:00:00' },
      { code: '02IPDBXP2401', day: 'Monday', time: '16:00:00' },
      { code: '02IPDCEP2502', day: 'Monday', time: '16:00:00' },
    ];
    
    for (const update of intensivesUpdates) {
      await db.query(
        `UPDATE courses 
         SET day_of_week = $2, start_time = $3 
         WHERE code = $1 AND (day_of_week IS NULL OR day_of_week = 'Not set')`,
        [update.code, update.day, update.time]
      );
    }
    
    console.log('   ✅ Updated intensives course schedules');
    
    // Final summary
    console.log('\n📊 Final Summary:');
    const finalStudentCount = await db.query('SELECT COUNT(*) as count FROM students');
    const finalEnrollmentCount = await db.query('SELECT COUNT(*) as count FROM enrollments');
    const finalCourseCount = await db.query('SELECT COUNT(*) as count FROM courses WHERE day_of_week IS NOT NULL');
    
    console.log(`   Total students: ${finalStudentCount.rows[0].count}`);
    console.log(`   Total enrollments: ${finalEnrollmentCount.rows[0].count}`);
    console.log(`   Courses with schedules: ${finalCourseCount.rows[0].count}`);
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await db.close();
    process.exit(0);
  }
}

// Run fix
fixDataImport().catch(console.error);