import { Client } from 'pg';
import XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';

async function fixEnrollmentsV2() {
  const client = new Client({ connectionString: 'postgresql://tikaram@localhost:5432/growth_compass' });
  
  try {
    await client.connect();
    console.log('=== FIXING ENROLLMENTS BASED ON ATTENDANCE DATA ===\n');
    
    // Load Excel file
    const workbook = XLSX.readFile('./attendance_report.xlsx');
    
    // Get course and student mappings
    const coursesResult = await client.query(`
      SELECT id, code, name FROM courses WHERE status = 'Active'
    `);
    const courseMap = new Map();
    coursesResult.rows.forEach(row => courseMap.set(row.code, { id: row.id, name: row.name }));
    
    const studentsResult = await client.query(`
      SELECT s.id, u.name, s.student_number
      FROM students s
      JOIN users u ON s.id = u.id
      WHERE u.role = 'student'
    `);
    
    // Create multiple name mappings for flexibility
    const studentMap = new Map();
    studentsResult.rows.forEach(row => {
      // Try multiple normalized versions
      const name1 = row.name.toLowerCase().trim();
      const name2 = row.name.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
      const name3 = row.name.toLowerCase().replace(/\s+/g, '');
      
      studentMap.set(name1, { id: row.id, name: row.name, student_number: row.student_number });
      studentMap.set(name2, { id: row.id, name: row.name, student_number: row.student_number });
      studentMap.set(name3, { id: row.id, name: row.name, student_number: row.student_number });
    });
    
    console.log(`Loaded ${courseMap.size} courses and ${studentsResult.rows.length} students`);
    
    let totalCreated = 0;
    let totalErrors = 0;
    
    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      const courseCode = sheetName.match(/^([A-Z0-9]+)/)?.[1];
      if (!courseCode) continue;
      
      const course = courseMap.get(courseCode);
      if (!course) {
        console.log(`\nSkipping ${sheetName} - course ${courseCode} not found`);
        continue;
      }
      
      console.log(`\nProcessing ${courseCode}: ${course.name}`);
      
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      if (data.length < 3) {
        console.log(`  Skipping - insufficient data`);
        continue;
      }
      
      // In this format, row 0 has headers with "Student Name" in first column
      // Row 1 has category headers
      // Rows 2+ have student data
      
      const studentsInCourse = new Set();
      
      // Check each row starting from row 2
      for (let rowIndex = 2; rowIndex < data.length; rowIndex++) {
        const row = data[rowIndex];
        if (!row || !Array.isArray(row)) continue;
        
        const studentName = row[0]?.toString().trim();
        if (!studentName || studentName === '') continue;
        
        // Skip if this looks like a header row
        if (studentName.toLowerCase().includes('student') || 
            studentName.toLowerCase().includes('name')) continue;
        
        // This is a student name
        studentsInCourse.add(studentName);
      }
      
      console.log(`  Found ${studentsInCourse.size} students in attendance data`);
      
      // Create enrollments for these students
      for (const studentName of studentsInCourse) {
        // Try to find student in database
        const normalized1 = studentName.toLowerCase().trim();
        const normalized2 = studentName.toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim();
        const normalized3 = studentName.toLowerCase().replace(/\s+/g, '');
        
        const student = studentMap.get(normalized1) || 
                       studentMap.get(normalized2) || 
                       studentMap.get(normalized3);
        
        if (!student) {
          console.log(`  ⚠️  Student "${studentName}" not found in database`);
          totalErrors++;
          continue;
        }
        
        // Check if enrollment already exists
        const existingResult = await client.query(`
          SELECT id FROM enrollments
          WHERE course_id = $1 AND student_id = $2
        `, [course.id, student.id]);
        
        if (existingResult.rows.length === 0) {
          // Create enrollment
          await client.query(`
            INSERT INTO enrollments (id, course_id, student_id, enrollment_date, status, created_at, updated_at)
            VALUES ($1, $2, $3, CURRENT_DATE, 'active', NOW(), NOW())
          `, [uuidv4(), course.id, student.id]);
          
          console.log(`  ✓ Enrolled ${student.name} (${student.student_number})`);
          totalCreated++;
        }
      }
    }
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Created ${totalCreated} enrollments`);
    console.log(`${totalErrors} students not found in database`);
    
    // Verify 02OPDEC2401 specifically
    console.log('\n=== VERIFYING 02OPDEC2401 ===');
    const verifyResult = await client.query(`
      SELECT 
        u.name as student_name,
        s.student_number,
        s.grade_level
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN students s ON e.student_id = s.id
      JOIN users u ON s.id = u.id
      WHERE c.code = '02OPDEC2401'
      ORDER BY u.name
    `);
    
    console.log(`Students enrolled in 02OPDEC2401 (${verifyResult.rows.length} total):`);
    verifyResult.rows.forEach(row => {
      console.log(`- ${row.student_name} (${row.student_number}) Grade ${row.grade_level || 'N/A'}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

fixEnrollmentsV2().catch(console.error);