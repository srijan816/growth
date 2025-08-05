require('dotenv').config();
const { Client } = require('pg');

async function diagnoseFridayOverlap() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    console.log('Connected to database');
    
    // First check what Friday courses exist
    console.log('\n=== CHECKING FRIDAY COURSES ===');
    const fridayQuery = await client.query(`
      SELECT 
        id,
        code,
        name,
        day_of_week,
        start_time,
        end_time,
        instructor_id
      FROM courses
      WHERE status = 'active'
        AND day_of_week = 'Friday'
      ORDER BY start_time
    `);
    
    console.log(`Found ${fridayQuery.rows.length} Friday courses:`);
    fridayQuery.rows.forEach(row => {
      console.log(`- ${row.code}: ${row.name} at ${row.start_time}`);
    });
    
    // Now check class_sessions for today
    console.log('\n=== CHECKING CLASS_SESSIONS FOR TODAY (2025-07-25) ===');
    const sessionsQuery = await client.query(`
      SELECT 
        cs.id,
        c.code,
        c.name,
        cs.start_time,
        cs.session_date,
        c.day_of_week
      FROM class_sessions cs
      JOIN courses c ON cs.course_id = c.id
      WHERE cs.session_date = '2025-07-25'
      ORDER BY c.code, cs.start_time
      LIMIT 50
    `);
    
    console.log(`Found ${sessionsQuery.rowCount} total sessions for today`);
    
    // Check for duplicates
    console.log('\n=== CHECKING FOR DUPLICATE SESSIONS ===');
    const dupQuery = await client.query(`
      SELECT 
        c.code,
        c.name,
        c.day_of_week,
        COUNT(*) as session_count,
        array_agg(DISTINCT cs.start_time::text) as start_times
      FROM class_sessions cs
      JOIN courses c ON cs.course_id = c.id
      WHERE cs.session_date = '2025-07-25'
      GROUP BY c.code, c.name, c.day_of_week
      HAVING COUNT(*) > 1
      ORDER BY session_count DESC
      LIMIT 20
    `);
    
    console.log('\nCourses with multiple sessions today:');
    dupQuery.rows.forEach(row => {
      console.log(`\n- ${row.code}: ${row.name}`);
      console.log(`  Day of Week: ${row.day_of_week}`);
      console.log(`  Number of sessions: ${row.session_count}`);
      console.log(`  Start times: ${row.start_times.join(', ')}`);
    });
    
    // Check total count
    const totalQuery = await client.query(`
      SELECT COUNT(*) as total
      FROM class_sessions
      WHERE session_date = '2025-07-25'
    `);
    
    console.log(`\n=== TOTAL SESSIONS FOR TODAY: ${totalQuery.rows[0].total} ===`);
    
    // Check if there's a migration issue
    console.log('\n=== CHECKING FOR POTENTIAL MIGRATION ISSUE ===');
    const migrationCheck = await client.query(`
      SELECT 
        course_id,
        COUNT(*) as count
      FROM class_sessions
      WHERE session_date = '2025-07-25'
        AND start_time = '10:00:00'
      GROUP BY course_id
      HAVING COUNT(*) > 5
      LIMIT 5
    `);
    
    if (migrationCheck.rows.length > 0) {
      console.log('WARNING: Found courses with many sessions at 10:00:00 - this suggests a migration may have run multiple times!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

diagnoseFridayOverlap().catch(console.error);