const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function diagnoseDashboardClasses() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    console.log(`\nToday is: ${dayName} (${today.toISOString().split('T')[0]})`);
    console.log(`Current time: ${today.toTimeString().substring(0, 8)}`);

    // 1. Check courses table for today's classes
    console.log('\n=== COURSES TABLE - TODAY\'S CLASSES ===');
    const todayQuery = `
      SELECT 
        id,
        code,
        name,
        day_of_week,
        start_time,
        end_time,
        status,
        instructor_id,
        program_type,
        max_students
      FROM courses
      WHERE status = 'active'
        AND start_time IS NOT NULL
        AND day_of_week = $1
      ORDER BY start_time
    `;
    const todayResult = await client.query(todayQuery, [dayName]);
    
    console.log(`\nFound ${todayResult.rows.length} active courses for ${dayName}:`);
    todayResult.rows.forEach(course => {
      console.log(`\n${course.code}: ${course.name}`);
      console.log(`  Time: ${course.start_time} - ${course.end_time || 'Not set'}`);
      console.log(`  Status: ${course.status}`);
      console.log(`  Students: ${course.max_students || 0}`);
      console.log(`  Instructor ID: ${course.instructor_id || 'Not assigned'}`);
      
      // Check if it's currently ongoing
      if (course.start_time && course.end_time) {
        const now = today.toTimeString().substring(0, 8);
        if (now >= course.start_time && now <= course.end_time) {
          console.log('  ✅ Currently ONGOING');
        } else if (now < course.start_time) {
          console.log('  ⏰ UPCOMING');
        } else {
          console.log('  ✓ COMPLETED');
        }
      }
    });

    // 2. Check if there are any courses without day_of_week set
    console.log('\n=== COURSES WITHOUT DAY_OF_WEEK ===');
    const noDayQuery = `
      SELECT code, name, start_time
      FROM courses
      WHERE status = 'active'
        AND start_time IS NOT NULL
        AND (day_of_week IS NULL OR day_of_week = '')
    `;
    const noDayResult = await client.query(noDayQuery);
    
    if (noDayResult.rows.length > 0) {
      console.log(`\nFound ${noDayResult.rows.length} active courses without day_of_week:`);
      noDayResult.rows.forEach(course => {
        console.log(`- ${course.code}: ${course.name} at ${course.start_time}`);
      });
    } else {
      console.log('\nAll active courses have day_of_week set ✓');
    }

    // 3. Check specific instructor's classes
    console.log('\n=== INSTRUCTOR SPECIFIC CHECK ===');
    const instructorQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(c.id) as total_courses,
        COUNT(CASE WHEN c.day_of_week = $1 THEN 1 END) as today_courses
      FROM users u
      LEFT JOIN courses c ON u.id = c.instructor_id AND c.status = 'active'
      WHERE u.role = 'instructor'
      GROUP BY u.id, u.name, u.email
      ORDER BY u.name
    `;
    const instructorResult = await client.query(instructorQuery, [dayName]);
    
    console.log('\nInstructor course counts:');
    instructorResult.rows.forEach(instructor => {
      console.log(`\n${instructor.name} (${instructor.email}):`);
      console.log(`  Total active courses: ${instructor.total_courses}`);
      console.log(`  Courses today (${dayName}): ${instructor.today_courses}`);
    });

    // 4. Check for the specific test instructor
    console.log('\n=== TEST INSTRUCTOR CHECK ===');
    const testInstructorQuery = `
      SELECT 
        c.code,
        c.name,
        c.day_of_week,
        c.start_time,
        u.name as instructor_name
      FROM courses c
      JOIN users u ON c.instructor_id = u.id
      WHERE u.email = 'test@instructor.com'
        AND c.status = 'active'
      ORDER BY c.day_of_week, c.start_time
    `;
    const testInstructorResult = await client.query(testInstructorQuery);
    
    if (testInstructorResult.rows.length > 0) {
      console.log(`\nTest instructor courses:`);
      testInstructorResult.rows.forEach(course => {
        console.log(`- ${course.code} on ${course.day_of_week} at ${course.start_time}`);
      });
    } else {
      console.log('\nNo courses found for test@instructor.com');
    }

    // 5. Summary statistics
    console.log('\n=== SUMMARY STATISTICS ===');
    const statsQuery = `
      SELECT 
        COUNT(*) as total_active_courses,
        COUNT(CASE WHEN day_of_week IS NOT NULL THEN 1 END) as courses_with_schedule,
        COUNT(CASE WHEN instructor_id IS NOT NULL THEN 1 END) as courses_with_instructor,
        COUNT(DISTINCT day_of_week) as unique_days_scheduled
      FROM courses
      WHERE status = 'active'
    `;
    const statsResult = await client.query(statsQuery);
    const stats = statsResult.rows[0];
    
    console.log(`\nTotal active courses: ${stats.total_active_courses}`);
    console.log(`Courses with schedule: ${stats.courses_with_schedule}`);
    console.log(`Courses with instructor: ${stats.courses_with_instructor}`);
    console.log(`Days with classes: ${stats.unique_days_scheduled}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

diagnoseDashboardClasses();