import { Client } from 'pg';

async function debugDashboardClasses() {
  const client = new Client({ connectionString: 'postgresql://tikaram@localhost:5432/growth_compass' });
  
  try {
    await client.connect();
    const now = new Date();
    const today = now.toLocaleDateString('en-US', { weekday: 'long' });
    
    console.log('=== DEBUGGING DASHBOARD CLASS DISPLAY ===\n');
    console.log(`Current time: ${now.toTimeString()}`);
    console.log(`Today is: ${today}`);
    console.log(`Current day number: ${now.getDay()} (0=Sunday, 6=Saturday)`);
    
    // 1. Check courses table data
    console.log('\n=== ACTIVE COURSES ===');
    const coursesResult = await client.query(`
      SELECT 
        code,
        name,
        day_of_week,
        start_time,
        end_time,
        status,
        is_intensive,
        instructor_id
      FROM courses
      WHERE status = 'Active'
        AND day_of_week = $1
      ORDER BY start_time
    `, [today]);
    
    console.log(`Found ${coursesResult.rows.length} courses for ${today}:`);
    coursesResult.rows.forEach(row => {
      console.log(`- ${row.code}: ${row.start_time} - ${row.end_time || 'calculated'} (intensive: ${row.is_intensive || false})`);
    });
    
    // 2. Check what dashboard query would return
    console.log('\n=== DASHBOARD QUERY SIMULATION ===');
    
    // Get Srijan's user ID
    const userResult = await client.query(`
      SELECT id FROM users WHERE email = 'srijan@capstone.com'
    `);
    const srijansId = userResult.rows[0]?.id;
    console.log(`Srijan's ID: ${srijansId}`);
    
    // Simulate dashboard's getTodaysClasses query
    const dashboardQuery = `
      SELECT 
        id,
        code,
        name,
        level,
        COALESCE(program_type, course_type, 'PSD') as type,
        max_students as student_count,
        start_time,
        COALESCE(
          end_time,
          CASE 
            WHEN name LIKE '%III%' THEN (start_time + INTERVAL '120 minutes')::time
            ELSE (start_time + INTERVAL '90 minutes')::time
          END
        ) as end_time,
        day_of_week,
        instructor_id
      FROM courses
      WHERE status = 'active'
        AND start_time IS NOT NULL
        AND instructor_id = $1
      ORDER BY start_time
    `;
    
    const dashboardResult = await client.query(dashboardQuery, [srijansId]);
    
    console.log(`\nDashboard query returns ${dashboardResult.rows.length} courses total`);
    
    // Filter by day
    const todaysFromDashboard = dashboardResult.rows.filter(row => {
      const matches = row.day_of_week && row.day_of_week.toLowerCase() === today.toLowerCase();
      return matches;
    });
    
    console.log(`After filtering for ${today}: ${todaysFromDashboard.length} courses`);
    todaysFromDashboard.forEach(row => {
      console.log(`- ${row.code}: ${row.name}`);
    });
    
    // 3. Check next upcoming class logic
    console.log('\n=== NEXT UPCOMING CLASS ===');
    
    const upcomingQuery = `
      WITH upcoming_classes AS (
        SELECT 
          id,
          code,
          name,
          start_time,
          day_of_week,
          CASE 
            WHEN day_of_week = 'Sunday' THEN (7 - $1 + 0) % 7
            WHEN day_of_week = 'Monday' THEN (7 - $1 + 1) % 7
            WHEN day_of_week = 'Tuesday' THEN (7 - $1 + 2) % 7
            WHEN day_of_week = 'Wednesday' THEN (7 - $1 + 3) % 7
            WHEN day_of_week = 'Thursday' THEN (7 - $1 + 4) % 7
            WHEN day_of_week = 'Friday' THEN (7 - $1 + 5) % 7
            WHEN day_of_week = 'Saturday' THEN (7 - $1 + 6) % 7
          END as days_until
        FROM courses
        WHERE status = 'Active'
          AND start_time IS NOT NULL
          AND COALESCE(is_intensive, FALSE) = FALSE
          AND instructor_id = $2
      )
      SELECT * FROM upcoming_classes
      WHERE days_until >= 0
      ORDER BY days_until, start_time
      LIMIT 5
    `;
    
    const upcomingResult = await client.query(upcomingQuery, [now.getDay(), srijansId]);
    
    console.log('Next upcoming classes:');
    upcomingResult.rows.forEach(row => {
      console.log(`- ${row.code}: ${row.day_of_week} (${row.days_until} days from now)`);
    });
    
    // 4. Check API route
    console.log('\n=== API ROUTE CHECK ===');
    
    // Check what the API would return
    const apiQuery = `
      SELECT 
        id,
        code,
        name,
        day_of_week,
        start_time,
        COALESCE(is_intensive, FALSE) as is_intensive
      FROM courses
      WHERE status = 'active'
        AND start_time IS NOT NULL
        AND COALESCE(is_intensive, FALSE) = FALSE
        AND instructor_id = $1
    `;
    
    const apiResult = await client.query(apiQuery, [srijansId]);
    
    const apiFiltered = apiResult.rows.filter(row => {
      return row.day_of_week && row.day_of_week.toLowerCase() === today.toLowerCase();
    });
    
    console.log(`API would return ${apiFiltered.length} classes for ${today}`);
    apiFiltered.forEach(row => {
      console.log(`- ${row.code}: ${row.name}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

debugDashboardClasses().catch(console.error);