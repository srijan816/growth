import { Client } from 'pg';

async function checkCourseEnrollments() {
  const client = new Client({ connectionString: 'postgresql://tikaram@localhost:5432/growth_compass' });
  
  try {
    await client.connect();
    console.log('=== CHECKING COURSE 02OPDEC2401 ENROLLMENTS ===\n');
    
    // 1. Check course details
    const courseResult = await client.query(`
      SELECT id, code, name, instructor_id, day_of_week, start_time
      FROM courses
      WHERE code = '02OPDEC2401'
    `);
    
    if (courseResult.rows.length === 0) {
      console.log('Course 02OPDEC2401 not found!');
      return;
    }
    
    const course = courseResult.rows[0];
    console.log('Course found:', course.name);
    console.log('Course ID:', course.id);
    console.log('Day/Time:', course.day_of_week, course.start_time);
    
    // 2. Check enrollments
    const enrollmentResult = await client.query(`
      SELECT 
        e.id as enrollment_id,
        e.student_id,
        e.created_at,
        u.name as student_name,
        s.student_number,
        s.grade_level
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN users u ON s.id = u.id
      WHERE e.course_id = $1
      ORDER BY u.name
    `, [course.id]);
    
    console.log(`\nFound ${enrollmentResult.rows.length} enrollments:`);
    enrollmentResult.rows.forEach(row => {
      console.log(`- ${row.student_name} (${row.student_number}) Grade ${row.grade_level}`);
      console.log(`  Enrolled: ${row.created_at}`);
    });
    
    // 3. Check if these students exist in feedback data
    console.log('\n=== CHECKING FEEDBACK DATA ===');
    
    const feedbackResult = await client.query(`
      SELECT DISTINCT
        f.student_name,
        f.course_code,
        COUNT(*) as feedback_count
      FROM parsed_student_feedback f
      WHERE f.course_code = '02OPDEC2401'
      GROUP BY f.student_name, f.course_code
      ORDER BY f.student_name
    `);
    
    console.log(`\nStudents with feedback for 02OPDEC2401:`);
    feedbackResult.rows.forEach(row => {
      console.log(`- ${row.student_name} (${row.feedback_count} feedback entries)`);
    });
    
    // 4. Check for mismatches
    console.log('\n=== ENROLLMENT SOURCE ANALYSIS ===');
    
    // Check if enrollments were auto-created from feedback
    const enrollmentSourceResult = await client.query(`
      SELECT 
        e.student_id,
        u.name,
        e.created_at,
        e.enrollment_type,
        e.created_by
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN users u ON s.id = u.id
      WHERE e.course_id = $1
    `, [course.id]);
    
    console.log('\nEnrollment details:');
    enrollmentSourceResult.rows.forEach(row => {
      console.log(`- ${row.name}:`);
      console.log(`  Created: ${row.created_at}`);
      console.log(`  Type: ${row.enrollment_type || 'not set'}`);
      console.log(`  Created by: ${row.created_by || 'system'}`);
    });
    
    // 5. Look for actual students from attendance data
    console.log('\n=== CHECKING ATTENDANCE DATA ===');
    
    const attendanceResult = await client.query(`
      SELECT DISTINCT
        u.name as student_name,
        s.student_number,
        COUNT(*) as attendance_count
      FROM attendances a
      JOIN class_sessions cs ON a.session_id = cs.id
      JOIN students s ON a.student_id = s.id
      JOIN users u ON s.id = u.id
      WHERE cs.course_id = $1
      GROUP BY u.name, s.student_number
      ORDER BY u.name
    `, [course.id]);
    
    console.log(`\nStudents with attendance for 02OPDEC2401:`);
    attendanceResult.rows.forEach(row => {
      console.log(`- ${row.student_name} (${row.student_number}): ${row.attendance_count} records`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkCourseEnrollments().catch(console.error);