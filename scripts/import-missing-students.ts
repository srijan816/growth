#!/usr/bin/env tsx

import { db } from '../src/lib/database/connection';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import bcrypt from 'bcryptjs';

async function importMissingStudents() {
  console.log('🔍 Finding and Importing Missing Students\n');
  
  try {
    // Read Excel files
    const firstPath = path.join(__dirname, '../data/Srijan/first.xlsx');
    const secondPath = path.join(__dirname, '../data/Srijan/second.xlsx');
    
    if (!fs.existsSync(secondPath)) {
      console.error('❌ second.xlsx not found!');
      return;
    }
    
    // Get existing students from database
    const existingStudentsResult = await db.query('SELECT student_number FROM students');
    const existingStudentIds = new Set(existingStudentsResult.rows.map(r => r.student_number));
    
    console.log(`📊 Existing students in DB: ${existingStudentIds.size}`);
    
    // Read second.xlsx to find all students
    const secondWorkbook = XLSX.readFile(secondPath);
    const allStudents = new Map<string, any>();
    const studentEnrollments = new Map<string, string[]>(); // student_id -> [course_codes]
    
    // Process each sheet (course)
    for (const sheetName of Object.keys(secondWorkbook.Sheets)) {
      const sheet = secondWorkbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      
      // Skip header row
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[1] || row[1] === 'Student ID') continue;
        
        const studentId = row[1].toString();
        const studentData = {
          studentId,
          name: row[2]?.toString() || '',
          grade: row[3]?.toString() || '',
          school: row[4]?.toString() || '',
          startLesson: row[5]?.toString() || '',
          endLesson: row[6]?.toString() || '',
          status: row[7]?.toString() || ''
        };
        
        // Store student data
        if (!allStudents.has(studentId)) {
          allStudents.set(studentId, studentData);
        }
        
        // Track enrollments
        if (!studentEnrollments.has(studentId)) {
          studentEnrollments.set(studentId, []);
        }
        studentEnrollments.get(studentId)!.push(sheetName);
      }
    }
    
    console.log(`📊 Total unique students in Excel: ${allStudents.size}`);
    
    // Find missing students
    const missingStudents = [];
    for (const [studentId, studentData] of allStudents) {
      if (!existingStudentIds.has(studentId)) {
        missingStudents.push(studentData);
      }
    }
    
    console.log(`\n❗ Missing students: ${missingStudents.length}`);
    
    if (missingStudents.length > 0) {
      console.log('\n📝 Missing Students List:');
      for (const student of missingStudents.slice(0, 10)) {
        console.log(`   ${student.studentId}: ${student.name} (${student.grade}, ${student.school})`);
      }
      if (missingStudents.length > 10) {
        console.log(`   ... and ${missingStudents.length - 10} more`);
      }
      
      // Import missing students
      console.log('\n📥 Importing missing students...');
      
      const defaultPassword = await bcrypt.hash('changeme123', 12);
      let imported = 0;
      let errors = 0;
      
      await db.query('BEGIN');
      
      for (const student of missingStudents) {
        try {
          // Create user account
          const email = `${student.studentId.toLowerCase()}@student.capstone.com`;
          
          const userResult = await db.query(
            `INSERT INTO users (email, name, role, password)
             VALUES ($1, $2, 'student', $3)
             RETURNING id`,
            [email, student.name, defaultPassword]
          );
          
          const userId = userResult.rows[0].id;
          
          // Create student record
          await db.query(
            `INSERT INTO students (id, student_number, grade_level, school, email)
             VALUES ($1, $2, $3, $4, $5)`,
            [userId, student.studentId, student.grade, student.school, email]
          );
          
          imported++;
          
          // Create enrollments for this student
          const courses = studentEnrollments.get(student.studentId) || [];
          for (const courseCode of courses) {
            const courseResult = await db.query(
              'SELECT id FROM courses WHERE code = $1',
              [courseCode]
            );
            
            if (courseResult.rows.length > 0) {
              const courseId = courseResult.rows[0].id;
              
              // Check if enrollment already exists
              const existingEnrollment = await db.query(
                'SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2',
                [userId, courseId]
              );
              
              if (existingEnrollment.rows.length === 0) {
                await db.query(
                  `INSERT INTO enrollments (student_id, course_id, enrollment_date, status, start_lesson, end_lesson)
                   VALUES ($1, $2, CURRENT_DATE, 'active', $3, $4)`,
                  [userId, courseId, student.startLesson || null, student.endLesson || null]
                );
              }
            }
          }
          
        } catch (error: any) {
          console.error(`   ❌ Error importing ${student.studentId}: ${error.message}`);
          errors++;
        }
      }
      
      await db.query('COMMIT');
      
      console.log(`\n✅ Imported ${imported} students`);
      if (errors > 0) {
        console.log(`❌ Failed to import ${errors} students`);
      }
    }
    
    // Check missing enrollments for existing students
    console.log('\n🔍 Checking for missing enrollments...');
    
    let missingEnrollments = 0;
    let addedEnrollments = 0;
    
    await db.query('BEGIN');
    
    for (const [studentId, courseCodes] of studentEnrollments) {
      // Get student user ID
      const studentResult = await db.query(
        'SELECT id FROM students WHERE student_number = $1',
        [studentId]
      );
      
      if (studentResult.rows.length === 0) continue;
      
      const studentUserId = studentResult.rows[0].id;
      
      for (const courseCode of courseCodes) {
        // Get course ID
        const courseResult = await db.query(
          'SELECT id FROM courses WHERE code = $1',
          [courseCode]
        );
        
        if (courseResult.rows.length === 0) continue;
        
        const courseId = courseResult.rows[0].id;
        
        // Check if enrollment exists
        const enrollmentResult = await db.query(
          'SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2',
          [studentUserId, courseId]
        );
        
        if (enrollmentResult.rows.length === 0) {
          missingEnrollments++;
          
          try {
            // Get student data for enrollment details
            const studentData = allStudents.get(studentId);
            
            await db.query(
              `INSERT INTO enrollments (student_id, course_id, enrollment_date, status, start_lesson, end_lesson)
               VALUES ($1, $2, CURRENT_DATE, 'active', $3, $4)`,
              [studentUserId, courseId, studentData?.startLesson || null, studentData?.endLesson || null]
            );
            
            addedEnrollments++;
          } catch (error: any) {
            console.error(`   ❌ Error creating enrollment for ${studentId} in ${courseCode}: ${error.message}`);
          }
        }
      }
    }
    
    await db.query('COMMIT');
    
    console.log(`   Found ${missingEnrollments} missing enrollments`);
    console.log(`   ✅ Created ${addedEnrollments} new enrollments`);
    
    // Final counts
    console.log('\n📊 Final Database State:');
    const finalStudentCount = await db.query('SELECT COUNT(*) as count FROM students');
    const finalEnrollmentCount = await db.query('SELECT COUNT(*) as count FROM enrollments');
    
    console.log(`   Total students: ${finalStudentCount.rows[0].count}`);
    console.log(`   Total enrollments: ${finalEnrollmentCount.rows[0].count}`);
    
  } catch (error: any) {
    await db.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
  } finally {
    await db.close();
    process.exit(0);
  }
}

// Run import
importMissingStudents().catch(console.error);