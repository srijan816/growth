require('dotenv').config();
const { Client } = require('pg');

async function verifyFridayFix() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Check Friday courses for Srijan
    console.log('=== FRIDAY COURSES FOR SRIJAN ===');
    const fridayCoursesQuery = `
      SELECT 
        code,
        name,
        day_of_week,
        start_time,
        end_time
      FROM courses
      WHERE status = 'active'
        AND day_of_week = 'Friday'
        AND instructor_id = '550e8400-e29b-41d4-a716-446655440002'
      ORDER BY start_time
    `;
    
    const fridayCoursesResult = await client.query(fridayCoursesQuery);
    
    console.log(`Found ${fridayCoursesResult.rows.length} Friday course(s) for Srijan:`);
    fridayCoursesResult.rows.forEach(row => {
      console.log(`- ${row.code}: ${row.name}`);
      console.log(`  Time: ${row.start_time} - ${row.end_time}`);
    });
    
    // Check Friday sessions after cleanup
    console.log('\n=== FRIDAY SESSIONS AFTER CLEANUP ===');
    const fridaySessionsQuery = `
      SELECT 
        c.code,
        c.name,
        cs.session_date,
        cs.start_time,
        cs.end_time,
        cs.id as session_id
      FROM class_sessions cs
      JOIN courses c ON cs.course_id = c.id
      WHERE cs.session_date = '2025-07-25'
        AND c.instructor_id = '550e8400-e29b-41d4-a716-446655440002'
      ORDER BY cs.start_time, c.code
    `;
    
    const fridaySessionsResult = await client.query(fridaySessionsQuery);
    
    console.log(`Found ${fridaySessionsResult.rows.length} session(s) for Srijan on Friday:`);
    fridaySessionsResult.rows.forEach(row => {
      console.log(`- ${row.code}: ${row.name}`);
      console.log(`  Time: ${row.start_time} - ${row.end_time}`);
    });
    
    // Check if Thursday overlap is fixed
    console.log('\n=== THURSDAY COURSES CHECK ===');
    const thursdayQuery = `
      SELECT 
        c.code,
        c.name,
        c.start_time,
        c.end_time,
        u.name as instructor_name
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      WHERE c.status = 'active'
        AND c.day_of_week = 'Thursday'
        AND c.start_time = '16:30:00'
      ORDER BY c.code
    `;
    
    const thursdayResult = await client.query(thursdayQuery);
    
    console.log('Thursday courses at 16:30:');
    thursdayResult.rows.forEach(row => {
      console.log(`- ${row.code}: ${row.name}`);
      console.log(`  Instructor: ${row.instructor_name}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

verifyFridayFix().catch(console.error);