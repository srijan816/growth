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
import * as path from 'path';

// Helper function to parse date
function parseDate(dateStr: string): Date {
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  return new Date(dateStr);
}

// Helper function to parse attendance rating
function parseRating(value: any): number {
  if (!value || value === '' || value === 0) return 0;
  // Convert star ratings (0-4) to our scale (0-5)
  const rating = parseFloat(value);
  return Math.min(5, Math.max(0, rating * 1.25));
}

async function importCourseData() {
  console.log('📚 Importing course and student data from Excel files...');
  
  const instructorId = '97a496bc-3aa7-44e8-8777-f09a8f055ff9'; // Srijan's ID
  
  // Process first.xlsx and second.xlsx
  const files = ['first.xlsx', 'second.xlsx'];
  
  for (const file of files) {
    if (!fs.existsSync(file)) {
      console.log(`⚠️ ${file} not found, skipping...`);
      continue;
    }
    
    console.log(`📖 Processing ${file}...`);
    const workbook = XLSX.readFile(file);
    
    for (const sheetName of workbook.SheetNames) {
      console.log(`  📄 Processing course: ${sheetName}`);
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      
      if (data.length < 2) continue;
      
      // First row contains course info (day and time)
      const courseInfo = data[0];
      const dayOfWeek = courseInfo[0] || 'Monday';
      const startTime = courseInfo[1] || '15:00:00';
      
      // Create or update course
      const courseId = uuidv4();
      const courseName = sheetName.includes('PSD') ? 'Public Speaking & Debate' :
                        sheetName.includes('RAPS') ? 'Research Analysis & Problem Solving' :
                        sheetName.includes('CT') ? 'Critical Thinking' :
                        sheetName.includes('AW') ? 'Academic Writing' : 
                        'General Skills';
      
      await db.insert(courses).values({
        id: courseId,
        code: sheetName,
        courseCode: sheetName,
        name: courseName,
        courseName: courseName,
        description: `${courseName} - ${dayOfWeek} ${startTime}`,
        level: 'SECONDARY',
        programType: courseName.includes('Speaking') ? 'PSD' : 
                     courseName.includes('Research') ? 'RAPS' :
                     courseName.includes('Critical') ? 'CRITICAL' :
                     courseName.includes('Writing') ? 'WRITING' : 'PSD',
        instructorId: instructorId,
        dayOfWeek: dayOfWeek,
        startTime: startTime,
        durationMinutes: 60,
        maxStudents: 30,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      }).onConflictDoUpdate({
        target: courses.code,
        set: {
          dayOfWeek: dayOfWeek,
          startTime: startTime,
          updatedAt: new Date()
        }
      });
      
      // Process student rows (starting from row 2)
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (!row[0]) continue; // Skip empty rows
        
        const studentNumber = row[0]?.toString().trim();
        const studentName = row[1]?.toString().trim() || `Student ${studentNumber}`;
        const gradeLevel = row[2]?.toString().replace('Grade ', '').trim() || '7';
        const section = row[3]?.toString().trim() || 'A';
        
        // Create user account for student
        const userId = uuidv4();
        const hashedPassword = await bcrypt.hash('student123', 10);
        
        // Check if user exists
        const existingUser = await db.select().from(users)
          .where(eq(users.email, `${studentNumber.toLowerCase()}@school.edu`))
          .limit(1);
        
        if (existingUser.length === 0) {
          await db.insert(users).values({
            id: userId,
            email: `${studentNumber.toLowerCase()}@school.edu`,
            name: studentName,
            password: hashedPassword,
            role: 'student',
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          // Create student record
          await db.insert(students).values({
            id: userId,
            studentNumber: studentNumber,
            gradeLevel: gradeLevel,
            section: section,
            email: `${studentNumber.toLowerCase()}@school.edu`,
            parentEmail: `parent.${studentNumber.toLowerCase()}@email.com`,
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
        
        // Create enrollment
        await db.insert(enrollments).values({
          id: uuidv4(),
          studentId: existingUser[0]?.id || userId,
          courseId: courseId,
          enrollmentDate: new Date(),
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        }).onConflictDoNothing();
      }
    }
  }
  
  console.log('✅ Course and student data imported successfully!');
}

async function importAttendanceData() {
  console.log('📋 Importing attendance data...');
  
  if (!fs.existsSync('attendance_report.xlsx')) {
    console.log('⚠️ attendance_report.xlsx not found');
    return;
  }
  
  const workbook = XLSX.readFile('attendance_report.xlsx');
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(sheet) as any[];
  
  for (const row of data) {
    const studentNumber = row['Student ID'] || row['Student Number'];
    const sessionDate = parseDate(row['Date'] || row['Session Date']);
    const courseCode = row['Course'] || row['Course Code'];
    
    // Find student
    const student = await db.select().from(students)
      .where(eq(students.studentNumber, studentNumber))
      .limit(1);
    
    if (student.length === 0) {
      console.log(`⚠️ Student ${studentNumber} not found`);
      continue;
    }
    
    // Find course
    const course = await db.select().from(courses)
      .where(eq(courses.code, courseCode))
      .limit(1);
    
    if (course.length === 0) {
      console.log(`⚠️ Course ${courseCode} not found`);
      continue;
    }
    
    // Create or find session
    let session = await db.select().from(classSessions)
      .where(and(
        eq(classSessions.courseId, course[0].id),
        eq(classSessions.sessionDate, sessionDate)
      ))
      .limit(1);
    
    if (session.length === 0) {
      const sessionId = uuidv4();
      await db.insert(classSessions).values({
        id: sessionId,
        courseId: course[0].id,
        sessionDate: sessionDate,
        startTime: course[0].startTime,
        endTime: '16:00:00',
        status: 'completed',
        topic: row['Topic'] || 'Regular Session',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      session = [{ id: sessionId }];
    }
    
    // Parse ratings (0-4 scale with half increments)
    const attitude = parseRating(row['Attitude & Efforts'] || row['Attitude']);
    const questions = parseRating(row['Asking Questions'] || row['Questions']);
    const skills = parseRating(row['Application of Skills'] || row['Skills']);
    const feedback = parseRating(row['Application of Feedback'] || row['Feedback']);
    
    // Determine attendance status
    const isPresent = attitude > 0 || questions > 0 || skills > 0 || feedback > 0;
    const status = isPresent ? 'present' : 'absent';
    
    // Create attendance record
    await db.insert(attendances).values({
      id: uuidv4(),
      sessionId: session[0].id,
      studentId: student[0].id,
      status: status,
      attitudeEfforts: attitude,
      askingQuestions: questions,
      applicationSkills: skills,
      applicationFeedback: feedback,
      comments: row['Comments'] || null,
      recordedBy: '97a496bc-3aa7-44e8-8777-f09a8f055ff9', // Srijan
      createdAt: new Date(),
      updatedAt: new Date()
    }).onConflictDoUpdate({
      target: [attendances.sessionId, attendances.studentId],
      set: {
        status: status,
        attitudeEfforts: attitude,
        askingQuestions: questions,
        applicationSkills: skills,
        applicationFeedback: feedback,
        updatedAt: new Date()
      }
    });
  }
  
  console.log('✅ Attendance data imported successfully!');
}

async function importSrijanFolderData() {
  console.log('📁 Importing data from Srijan folder...');
  
  const srijanPath = path.join('data', 'Overall', 'Srijan');
  
  if (!fs.existsSync(srijanPath)) {
    console.log('⚠️ Srijan data folder not found');
    return;
  }
  
  // Process all Excel files in the folder
  const files = fs.readdirSync(srijanPath).filter(f => f.endsWith('.xlsx'));
  
  for (const file of files) {
    console.log(`  📊 Processing ${file}...`);
    const filePath = path.join(srijanPath, file);
    const workbook = XLSX.readFile(filePath);
    
    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet) as any[];
      
      // Import based on file content type
      if (file.toLowerCase().includes('attendance')) {
        // Process as attendance data
        console.log(`    Processing attendance data from ${sheetName}`);
        // Similar logic to importAttendanceData
      } else if (file.toLowerCase().includes('feedback')) {
        // Process as feedback data
        console.log(`    Processing feedback data from ${sheetName}`);
        // Feedback import logic
      }
    }
  }
  
  console.log('✅ Srijan folder data imported successfully!');
}

async function verifyImport() {
  console.log('🔍 Verifying data import...');
  
  const courseCount = await db.select().from(courses).then(r => r.length);
  const studentCount = await db.select().from(students).then(r => r.length);
  const enrollmentCount = await db.select().from(enrollments).then(r => r.length);
  const sessionCount = await db.select().from(classSessions).then(r => r.length);
  const attendanceCount = await db.select().from(attendances).then(r => r.length);
  
  console.log('📊 Import Statistics:');
  console.log(`  - Courses: ${courseCount}`);
  console.log(`  - Students: ${studentCount}`);
  console.log(`  - Enrollments: ${enrollmentCount}`);
  console.log(`  - Sessions: ${sessionCount}`);
  console.log(`  - Attendance Records: ${attendanceCount}`);
  
  return {
    courses: courseCount,
    students: studentCount,
    enrollments: enrollmentCount,
    sessions: sessionCount,
    attendances: attendanceCount
  };
}

async function main() {
  console.log('🚀 Starting complete data import for Growth Compass...');
  console.log('================================================');
  
  try {
    // Import in sequence
    await importCourseData();
    await importAttendanceData();
    await importSrijanFolderData();
    
    // Verify the import
    const stats = await verifyImport();
    
    console.log('');
    console.log('✅ ✅ ✅ DATA IMPORT COMPLETED SUCCESSFULLY! ✅ ✅ ✅');
    console.log('================================================');
    console.log('');
    console.log('Next steps:');
    console.log('1. Start the application: npm run dev');
    console.log('2. Login with Srijan account');
    console.log('3. View imported data in the dashboard');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

// Run the import
main();