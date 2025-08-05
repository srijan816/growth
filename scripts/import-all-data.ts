import * as XLSX from 'xlsx';
import { drizzleDb as db } from '../src/lib/database/drizzle';
import { 
  courses, 
  students, 
  users, 
  enrollments, 
  classSessions,
  attendances 
} from '../src/lib/database/schema';
import { eq, and } from 'drizzle-orm';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';

const instructorId = '97a496bc-3aa7-44e8-8777-f09a8f055ff9'; // Srijan's ID

interface CourseInfo {
  code: string;
  name: string;
  level: string;
  status: string;
}

interface StudentInfo {
  studentId: string;
  name: string;
  grade: string;
}

async function importCourses() {
  console.log('📚 Importing course information from first.xlsx...');
  
  if (!fs.existsSync('first.xlsx')) {
    console.log('❌ first.xlsx not found');
    return [];
  }
  
  const workbook = XLSX.readFile('first.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet) as any[];
  
  const courseMap = new Map<string, string>(); // code -> id mapping
  
  for (const row of data) {
    const courseCode = row['Course Code'];
    const courseName = row['Course Name'];
    const courseLevel = row['Course Level'];
    const status = row['Status']?.toLowerCase() || 'active';
    
    if (!courseCode) continue;
    
    const courseId = uuidv4();
    
    // Determine program type from course name
    let programType = 'PSD';
    if (courseName?.includes('Writing')) programType = 'WRITING';
    else if (courseName?.includes('RAPS')) programType = 'RAPS';
    else if (courseName?.includes('Critical')) programType = 'CRITICAL';
    
    // Determine day and time (defaults for now, can be updated later)
    const dayOfWeek = 'Monday';
    const startTime = '15:00:00';
    
    console.log(`  Creating course: ${courseCode} - ${courseName}`);
    
    try {
      await db.insert(courses).values({
        id: courseId,
        code: courseCode,
        courseCode: courseCode,
        name: courseName || courseCode,
        courseName: courseName || courseCode,
        description: `${courseName} for ${courseLevel}`,
        level: courseLevel?.includes('7') || courseLevel?.includes('8') ? 'SECONDARY' : 'PRIMARY',
        programType: programType,
        instructorId: instructorId,
        dayOfWeek: dayOfWeek,
        startTime: startTime,
        durationMinutes: 60,
        maxStudents: 30,
        status: status,
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: courses.code,
        set: {
          name: courseName || courseCode,
          courseName: courseName || courseCode,
          status: status,
          updatedAt: new Date()
        }
      });
      
      courseMap.set(courseCode, courseId);
    } catch (error) {
      console.error(`  ❌ Failed to create course ${courseCode}:`, error);
    }
  }
  
  console.log(`✅ Imported ${courseMap.size} courses`);
  return courseMap;
}

async function importStudentsAndEnrollments(courseMap: Map<string, string>) {
  console.log('👥 Importing students and enrollments from second.xlsx...');
  
  if (!fs.existsSync('second.xlsx')) {
    console.log('❌ second.xlsx not found');
    return;
  }
  
  const workbook = XLSX.readFile('second.xlsx');
  const studentMap = new Map<string, string>(); // studentNumber -> userId
  
  for (const sheetName of workbook.SheetNames) {
    console.log(`\n  Processing course: ${sheetName}`);
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet) as any[];
    
    // Get or create course
    let courseId = courseMap.get(sheetName);
    if (!courseId) {
      // Course doesn't exist in first.xlsx, create it
      courseId = uuidv4();
      await db.insert(courses).values({
        id: courseId,
        code: sheetName,
        courseCode: sheetName,
        name: `Course ${sheetName}`,
        courseName: `Course ${sheetName}`,
        programType: 'PSD',
        instructorId: instructorId,
        dayOfWeek: 'Monday',
        startTime: '15:00:00',
        durationMinutes: 60,
        maxStudents: 30,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoNothing();
      courseMap.set(sheetName, courseId);
    }
    
    // Process students
    for (const row of data) {
      const studentNumber = row['Student ID'] || row['Student Number'];
      const studentName = row['Student Name'];
      const grade = row['Grade']?.toString().replace('Grade ', '') || '5';
      
      if (!studentNumber || !studentName) continue;
      
      let userId = studentMap.get(studentNumber);
      
      // Create student if doesn't exist
      if (!userId) {
        userId = uuidv4();
        const hashedPassword = await bcrypt.hash('student123', 10);
        
        try {
          // Create user
          await db.insert(users).values({
            id: userId,
            email: `${studentNumber.toLowerCase()}@school.edu`,
            name: studentName,
            password: hashedPassword,
            role: 'student',
            createdAt: new Date(),
            updatedAt: new Date()
          }).onConflictDoNothing();
          
          // Create student record
          await db.insert(students).values({
            id: userId,
            studentNumber: studentNumber,
            gradeLevel: grade,
            section: 'A',
            email: `${studentNumber.toLowerCase()}@school.edu`,
            parentEmail: `parent.${studentNumber.toLowerCase()}@email.com`,
            createdAt: new Date(),
            updatedAt: new Date()
          }).onConflictDoNothing();
          
          studentMap.set(studentNumber, userId);
          console.log(`    Created student: ${studentName} (${studentNumber})`);
        } catch (error) {
          console.error(`    ❌ Failed to create student ${studentName}:`, error);
        }
      }
      
      // Create enrollment
      try {
        await db.insert(enrollments).values({
          id: uuidv4(),
          studentId: userId,
          courseId: courseId,
          enrollmentDate: new Date(),
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }).onConflictDoNothing();
      } catch (error) {
        console.error(`    ❌ Failed to create enrollment:`, error);
      }
    }
  }
  
  console.log(`✅ Imported ${studentMap.size} students`);
  return studentMap;
}

async function importAttendanceData(studentMap: Map<string, string>, courseMap: Map<string, string>) {
  console.log('\n📋 Importing attendance data from attendance_report.xlsx...');
  
  if (!fs.existsSync('attendance_report.xlsx')) {
    console.log('❌ attendance_report.xlsx not found');
    return;
  }
  
  const workbook = XLSX.readFile('attendance_report.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet) as any[];
  
  console.log(`  Found ${data.length} attendance records`);
  
  let imported = 0;
  for (const row of data) {
    // Parse attendance data - the structure may vary
    const studentId = row['Student ID'] || row['Student Number'] || Object.values(row)[0];
    const date = row['Date'] || row['Session Date'] || new Date();
    
    // Get ratings (0-4 scale with 0.5 increments possible)
    const attitude = parseFloat(row['Attitude & Efforts'] || row['Attitude'] || 0);
    const questions = parseFloat(row['Asking Questions'] || row['Questions'] || 0);
    const skills = parseFloat(row['Application of Skills'] || row['Skills'] || 0);
    const feedback = parseFloat(row['Application of Feedback'] || row['Feedback'] || 0);
    
    // Skip if no student ID or all zeros
    if (!studentId || (attitude === 0 && questions === 0 && skills === 0 && feedback === 0)) {
      continue;
    }
    
    const userId = studentMap.get(studentId);
    if (!userId) {
      console.log(`  ⚠️ Student ${studentId} not found in enrollment data`);
      continue;
    }
    
    // Create a session for this attendance (simplified - in production you'd match to actual sessions)
    const sessionId = uuidv4();
    const courseId = courseMap.values().next().value; // Use first course for now
    
    try {
      // Create session
      await db.insert(classSessions).values({
        id: sessionId,
        courseId: courseId,
        sessionDate: new Date(date),
        startTime: '15:00:00',
        endTime: '16:00:00',
        status: 'completed',
        topic: 'Regular Session',
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoNothing();
      
      // Create attendance record
      await db.insert(attendances).values({
        id: uuidv4(),
        sessionId: sessionId,
        studentId: userId,
        status: 'present',
        attitudeEfforts: Math.min(5, attitude * 1.25), // Convert 0-4 to 0-5 scale
        askingQuestions: Math.min(5, questions * 1.25),
        applicationSkills: Math.min(5, skills * 1.25),
        applicationFeedback: Math.min(5, feedback * 1.25),
        recordedBy: instructorId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      imported++;
    } catch (error) {
      console.error(`  ❌ Failed to import attendance:`, error);
    }
  }
  
  console.log(`✅ Imported ${imported} attendance records`);
}

async function main() {
  console.log('🚀 Starting complete data import for Growth Compass...');
  console.log('================================================\n');
  
  try {
    // Import courses from first.xlsx
    const courseMap = await importCourses();
    
    // Import students and enrollments from second.xlsx
    const studentMap = await importStudentsAndEnrollments(courseMap);
    
    // Import attendance data
    await importAttendanceData(studentMap, courseMap);
    
    // Summary
    console.log('\n================================================');
    console.log('✅ DATA IMPORT COMPLETED SUCCESSFULLY!');
    console.log('================================================');
    console.log('\nSummary:');
    console.log(`  - Courses: ${courseMap.size}`);
    console.log(`  - Students: ${studentMap.size}`);
    console.log('\nYou can now:');
    console.log('1. Start the application: npm run dev');
    console.log('2. Login with Srijan account');
    console.log('3. View imported data in the dashboard');
    
  } catch (error) {
    console.error('\n❌ Import failed:', error);
    process.exit(1);
  }
}

// Run the import
main();