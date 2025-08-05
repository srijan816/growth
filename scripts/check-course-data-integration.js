import { Client } from 'pg';

async function checkCourseDataIntegration() {
  const client = new Client({ connectionString: 'postgresql://tikaram@localhost:5432/growth_compass' });
  
  try {
    await client.connect();
    console.log('=== CHECKING DATA INTEGRATION FOR 02OPDEC2401 ===\n');
    
    // 1. Get course details
    const courseResult = await client.query(`
      SELECT id, code, name, day_of_week, start_time
      FROM courses
      WHERE code = '02OPDEC2401'
    `);
    
    const course = courseResult.rows[0];
    console.log('Course:', course.name);
    console.log('Course ID:', course.id);
    
    // 2. Check enrollments
    console.log('\n=== ENROLLMENTS ===');
    const enrollmentResult = await client.query(`
      SELECT 
        u.name,
        s.student_number,
        e.created_at
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN users u ON s.id = u.id
      WHERE e.course_id = $1
      ORDER BY u.name
    `, [course.id]);
    
    console.log(`Found ${enrollmentResult.rows.length} enrolled students:`);
    enrollmentResult.rows.forEach(row => {
      console.log(`- ${row.name} (${row.student_number})`);
    });
    
    // 3. Check sessions
    console.log('\n=== SESSIONS ===');
    const sessionResult = await client.query(`
      SELECT 
        id,
        session_date,
        unit_number,
        lesson_number,
        status
      FROM class_sessions
      WHERE course_id = $1
      ORDER BY session_date DESC
      LIMIT 5
    `, [course.id]);
    
    console.log(`Found ${sessionResult.rowCount} recent sessions:`);
    sessionResult.rows.forEach(row => {
      console.log(`- ${row.session_date}: Unit ${row.unit_number} Lesson ${row.lesson_number} (${row.status})`);
    });
    
    // 4. Check attendance
    console.log('\n=== ATTENDANCE DATA ===');
    const attendanceResult = await client.query(`
      SELECT 
        u.name,
        COUNT(a.id) as attendance_count,
        AVG(a.application_feedback) as avg_feedback
      FROM attendances a
      JOIN class_sessions cs ON a.session_id = cs.id
      JOIN students s ON a.student_id = s.id
      JOIN users u ON s.id = u.id
      WHERE cs.course_id = $1
      GROUP BY u.name
      ORDER BY u.name
    `, [course.id]);
    
    console.log(`Found attendance for ${attendanceResult.rows.length} students:`);
    attendanceResult.rows.forEach(row => {
      console.log(`- ${row.name}: ${row.attendance_count} records, avg rating: ${row.avg_feedback?.toFixed(1) || 'N/A'}`);
    });
    
    // 5. Check feedback data
    console.log('\n=== FEEDBACK DATA ===');
    
    // Check if parsed_student_feedback has course info
    const feedbackColumnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'parsed_student_feedback'
      AND column_name IN ('course_id', 'course_code')
    `);
    
    console.log('Feedback table has columns:', feedbackColumnsResult.rows.map(r => r.column_name));
    
    // Get feedback for enrolled students
    const feedbackResult = await client.query(`
      SELECT 
        pf.student_name,
        COUNT(pf.id) as feedback_count,
        MAX(pf.created_at) as last_feedback
      FROM parsed_student_feedback pf
      WHERE pf.student_id IN (
        SELECT student_id FROM enrollments WHERE course_id = $1
      )
      GROUP BY pf.student_name
      ORDER BY pf.student_name
    `, [course.id]);
    
    console.log(`\nFound feedback for ${feedbackResult.rows.length} students:`);
    feedbackResult.rows.forEach(row => {
      console.log(`- ${row.student_name}: ${row.feedback_count} feedback entries`);
    });
    
    // 6. Check the actual query being used
    console.log('\n=== TESTING COURSE PAGE QUERY ===');
    
    const testQuery = `
      SELECT 
        s.id,
        u.name,
        s.student_number,
        COUNT(DISTINCT a.id) as attendance_count,
        COUNT(DISTINCT pf.id) as feedback_count,
        COALESCE(AVG(a.application_feedback), 0) as avg_performance
      FROM students s
      INNER JOIN users u ON s.id = u.id
      INNER JOIN enrollments e ON s.id = e.student_id
      LEFT JOIN class_sessions cs ON e.course_id = cs.course_id
      LEFT JOIN attendances a ON s.id = a.student_id AND cs.id = a.session_id
      LEFT JOIN parsed_student_feedback pf ON s.id = pf.student_id
      WHERE e.course_id = $1
      GROUP BY s.id, u.name, s.student_number
      ORDER BY u.name
    `;
    
    const testResult = await client.query(testQuery, [course.id]);
    
    console.log('\nQuery results:');
    testResult.rows.forEach(row => {
      console.log(`- ${row.name}: ${row.attendance_count} attendance, ${row.feedback_count} feedback, avg: ${row.avg_performance.toFixed(1)}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkCourseDataIntegration().catch(console.error);