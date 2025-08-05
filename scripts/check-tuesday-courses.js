import { Client } from 'pg';

async function checkTuesdayCourses() {
  const client = new Client({ connectionString: 'postgresql://tikaram@localhost:5432/growth_compass' });
  
  try {
    await client.connect();
    console.log('=== CHECKING TUESDAY COURSE ISSUE ===\n');
    
    // Check 02IPDEB2401 specifically
    const courseResult = await client.query(`
      SELECT 
        code,
        name,
        day_of_week,
        start_time,
        status,
        instructor_id
      FROM courses
      WHERE code = '02IPDEB2401'
    `);
    
    if (courseResult.rows.length > 0) {
      const course = courseResult.rows[0];
      console.log(`Course: ${course.code} - ${course.name}`);
      console.log(`Day of week: "${course.day_of_week}"`);
      console.log(`Start time: ${course.start_time}`);
      console.log(`Status: ${course.status}`);
      
      // Check for any whitespace issues
      console.log(`\nDay of week length: ${course.day_of_week?.length}`);
      console.log(`Day of week bytes:`, Buffer.from(course.day_of_week || ''));
      
      // Try trimming
      const trimmed = course.day_of_week?.trim();
      console.log(`\nAfter trim: "${trimmed}"`);
      console.log(`Trimmed equals 'Tuesday': ${trimmed === 'Tuesday'}`);
    }
    
    // Check all Tuesday courses
    console.log('\n=== ALL COURSES WITH TUESDAY ===');
    const tuesdayResult = await client.query(`
      SELECT code, name, day_of_week
      FROM courses
      WHERE status = 'Active'
        AND (
          day_of_week = 'Tuesday'
          OR day_of_week LIKE '%Tuesday%'
          OR LOWER(day_of_week) = 'tuesday'
        )
      ORDER BY code
    `);
    
    console.log(`Found ${tuesdayResult.rows.length} Tuesday courses:`);
    tuesdayResult.rows.forEach(row => {
      console.log(`- ${row.code}: day_of_week="${row.day_of_week}"`);
    });
    
    // Update if needed
    if (courseResult.rows.length > 0 && courseResult.rows[0].day_of_week !== 'Tuesday') {
      console.log('\n=== FIXING DAY_OF_WEEK ===');
      
      const updateResult = await client.query(`
        UPDATE courses
        SET day_of_week = TRIM(day_of_week),
            updated_at = NOW()
        WHERE status = 'Active'
          AND day_of_week IS NOT NULL
          AND day_of_week != TRIM(day_of_week)
        RETURNING code, day_of_week
      `);
      
      if (updateResult.rows.length > 0) {
        console.log(`\nTrimmed whitespace from ${updateResult.rows.length} courses:`);
        updateResult.rows.forEach(row => {
          console.log(`- ${row.code}: "${row.day_of_week}"`);
        });
      } else {
        console.log('\nNo whitespace issues found');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkTuesdayCourses().catch(console.error);