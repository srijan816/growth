import { Client } from 'pg';
import XLSX from 'xlsx';

async function fixEnrollments() {
  const client = new Client({ connectionString: 'postgresql://tikaram@localhost:5432/growth_compass' });
  
  try {
    await client.connect();
    console.log('=== FIXING INCORRECT ENROLLMENTS ===\n');
    
    // Start transaction
    await client.query('BEGIN');
    
    // 1. Delete all enrollments created on 2025-07-15 (the alphabetical batch)
    console.log('Step 1: Deleting incorrect alphabetical enrollments...');
    const deleteResult = await client.query(`
      DELETE FROM enrollments
      WHERE DATE(created_at) = '2025-07-15'
      RETURNING id
    `);
    console.log(`Deleted ${deleteResult.rows.length} incorrect enrollments`);
    
    // 2. Load attendance data to find actual enrollments
    console.log('\nStep 2: Reading attendance_report.xlsx to find actual students...');
    const workbook = XLSX.readFile('./attendance_report.xlsx');
    
    // Map to store unique course-student pairs
    const actualEnrollments = new Map();
    
    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      const courseCode = sheetName.match(/^([A-Z0-9]+)/)?.[1];
      if (!courseCode) continue;
      
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      
      if (data.length < 3) continue;
      
      // Extract unique student names from the sheet
      const studentsInSheet = new Set();
      
      for (let rowIndex = 2; rowIndex < data.length; rowIndex++) {
        const row = data[rowIndex];
        if (!row[0] || typeof row[0] !== 'string') continue;
        
        const studentName = row[0].trim();
        const category = row[1]?.toString().trim();
        
        // Skip if this is not a student row (check for rating category)
        if (!category || !['Application', 'Attitude', 'Asking', 'Skills'].some(c => category.includes(c))) {
          continue;
        }
        
        // This is a valid student name
        studentsInSheet.add(studentName);
      }
      
      // Add to enrollments map
      if (studentsInSheet.size > 0) {
        actualEnrollments.set(courseCode, Array.from(studentsInSheet));
        console.log(`Found ${studentsInSheet.size} students in ${courseCode}`);
      }
    }
    
    // 3. Get course and student mappings
    console.log('\nStep 3: Loading course and student mappings...');
    
    const coursesResult = await client.query(`
      SELECT id, code FROM courses WHERE status = 'Active'
    `);
    const courseMap = new Map();
    coursesResult.rows.forEach(row => courseMap.set(row.code, row.id));
    
    const studentsResult = await client.query(`
      SELECT s.id, u.name
      FROM students s
      JOIN users u ON s.id = u.id
      WHERE u.role = 'student'
    `);
    
    // Create normalized name to ID mapping
    const studentMap = new Map();
    studentsResult.rows.forEach(row => {
      const normalized = row.name.toLowerCase().replace(/[^\\w\\s]/g, '').replace(/\\s+/g, ' ').trim();
      studentMap.set(normalized, row.id);
    });
    
    // 4. Create correct enrollments
    console.log('\nStep 4: Creating correct enrollments...');
    let totalCreated = 0;
    
    for (const [courseCode, studentNames] of actualEnrollments) {
      const courseId = courseMap.get(courseCode);
      if (!courseId) {
        console.log(`Warning: Course ${courseCode} not found in database`);
        continue;
      }
      
      for (const studentName of studentNames) {
        const normalized = studentName.toLowerCase().replace(/[^\\w\\s]/g, '').replace(/\\s+/g, ' ').trim();
        const studentId = studentMap.get(normalized);
        
        if (!studentId) {
          console.log(`Warning: Student "${studentName}" not found in database`);
          continue;
        }
        
        // Check if enrollment already exists
        const existingResult = await client.query(`
          SELECT id FROM enrollments
          WHERE course_id = $1 AND student_id = $2
        `, [courseId, studentId]);
        
        if (existingResult.rows.length === 0) {
          // Create enrollment
          await client.query(`
            INSERT INTO enrollments (course_id, student_id, enrollment_date, status)
            VALUES ($1, $2, CURRENT_DATE, 'active')
          `, [courseId, studentId]);
          totalCreated++;
        }
      }
    }
    
    console.log(`\nCreated ${totalCreated} correct enrollments`);
    
    // 5. Verify specific course
    console.log('\n=== VERIFYING 02OPDEC2401 ===');
    const verifyResult = await client.query(`
      SELECT 
        u.name as student_name,
        s.student_number
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN students s ON e.student_id = s.id
      JOIN users u ON s.id = u.id
      WHERE c.code = '02OPDEC2401'
      ORDER BY u.name
    `);
    
    console.log(`Students now enrolled in 02OPDEC2401:`);
    verifyResult.rows.forEach(row => {
      console.log(`- ${row.student_name} (${row.student_number})`);
    });
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('\n✅ Enrollment fix completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

fixEnrollments().catch(console.error);