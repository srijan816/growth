import { Client } from 'pg';

async function checkEnrollmentPattern() {
  const client = new Client({ connectionString: 'postgresql://tikaram@localhost:5432/growth_compass' });
  
  try {
    await client.connect();
    console.log('=== ANALYZING STUDENT ENROLLMENT PATTERN ===\n');
    
    // 1. Get all students ordered by student_number
    const studentsResult = await client.query(`
      SELECT 
        s.id,
        s.student_number,
        u.name,
        s.grade_level
      FROM students s
      JOIN users u ON s.id = u.id
      WHERE s.student_number LIKE 'STU%'
      ORDER BY s.student_number
    `);
    
    console.log(`Total students with STU numbers: ${studentsResult.rows.length}`);
    console.log('\nFirst 10 students:');
    studentsResult.rows.slice(0, 10).forEach(row => {
      console.log(`${row.student_number}: ${row.name} (Grade ${row.grade_level || 'N/A'})`);
    });
    
    // 2. Check enrollment patterns across courses
    const enrollmentPatternResult = await client.query(`
      SELECT 
        c.code,
        c.name as course_name,
        COUNT(e.id) as enrollment_count,
        STRING_AGG(s.student_number, ', ' ORDER BY s.student_number) as student_numbers
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      LEFT JOIN students s ON e.student_id = s.id
      WHERE c.status = 'Active'
      GROUP BY c.code, c.name
      ORDER BY c.code
      LIMIT 5
    `);
    
    console.log('\n=== ENROLLMENT PATTERN BY COURSE ===');
    enrollmentPatternResult.rows.forEach(row => {
      console.log(`\n${row.code}: ${row.course_name}`);
      console.log(`Students (${row.enrollment_count}): ${row.student_numbers || 'None'}`);
    });
    
    // 3. Check when these enrollments were created
    const enrollmentTimingResult = await client.query(`
      SELECT 
        DATE(created_at) as enrollment_date,
        COUNT(*) as count,
        COUNT(DISTINCT course_id) as courses_affected
      FROM enrollments
      GROUP BY DATE(created_at)
      ORDER BY enrollment_date DESC
    `);
    
    console.log('\n=== ENROLLMENT CREATION DATES ===');
    enrollmentTimingResult.rows.forEach(row => {
      console.log(`${row.enrollment_date}: ${row.count} enrollments across ${row.courses_affected} courses`);
    });
    
    // 4. Check if enrollments follow alphabetical pattern
    console.log('\n=== CHECKING ALPHABETICAL ASSIGNMENT ===');
    
    const alphabeticalCheckResult = await client.query(`
      WITH course_enrollments AS (
        SELECT 
          c.code,
          c.name as course_name,
          s.student_number,
          u.name as student_name,
          ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY s.student_number) as enrollment_order
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        JOIN students s ON e.student_id = s.id
        JOIN users u ON s.id = u.id
        WHERE s.student_number LIKE 'STU%'
      )
      SELECT 
        code,
        course_name,
        COUNT(*) as total_students,
        MIN(student_number) as first_student,
        MAX(student_number) as last_student
      FROM course_enrollments
      GROUP BY code, course_name
      ORDER BY code
      LIMIT 10
    `);
    
    console.log('\nCourse enrollment ranges (showing alphabetical assignment):');
    alphabeticalCheckResult.rows.forEach(row => {
      console.log(`${row.code}: ${row.first_student} to ${row.last_student} (${row.total_students} students)`);
    });
    
    // 5. Show the actual problem
    console.log('\n=== EVIDENCE OF ALPHABETICAL ASSIGNMENT ===');
    
    const sequentialCheckResult = await client.query(`
      SELECT 
        c.code,
        COUNT(*) as student_count,
        ARRAY_AGG(s.student_number ORDER BY s.student_number) as student_numbers
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN students s ON e.student_id = s.id
      WHERE s.student_number BETWEEN 'STU1050' AND 'STU1070'
      GROUP BY c.code
      HAVING COUNT(*) >= 3
      ORDER BY c.code
      LIMIT 5
    `);
    
    console.log('\nCourses with sequential student numbers STU1050-STU1070:');
    sequentialCheckResult.rows.forEach(row => {
      console.log(`${row.code}: ${row.student_numbers.join(', ')}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkEnrollmentPattern().catch(console.error);