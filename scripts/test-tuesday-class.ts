import { executeQuery } from '../src/lib/postgres';

async function testTuesdayClass() {
  console.log('=== Testing Tuesday Class Visibility ===\n');
  
  const now = new Date();
  console.log(`Current date/time: ${now.toString()}`);
  console.log(`Day of week: ${now.toLocaleDateString('en-US', { weekday: 'long' })}`);
  console.log(`Day number: ${now.getDay()} (0=Sunday, 2=Tuesday)`);
  
  // Test Srijan's credentials
  const srijanEmail = 'srijan@instructor.com';
  console.log(`\nTesting with email: ${srijanEmail}`);
  
  // Get Srijan's user record
  const userQuery = `SELECT id, name, email FROM users WHERE email = $1`;
  const userResult = await executeQuery(userQuery, [srijanEmail]);
  
  if (userResult.rows.length === 0) {
    console.error('ERROR: No user found with that email!');
    process.exit(1);
  }
  
  const user = userResult.rows[0];
  console.log(`Found user: ${user.name} (ID: ${user.id})`);
  
  // Get all courses for this instructor
  const coursesQuery = `
    SELECT 
      code,
      name,
      day_of_week,
      start_time,
      status
    FROM courses
    WHERE instructor_id = $1 
      AND status = 'active'
      AND start_time IS NOT NULL
    ORDER BY 
      CASE day_of_week
        WHEN 'Monday' THEN 1
        WHEN 'Tuesday' THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4
        WHEN 'Friday' THEN 5
        WHEN 'Saturday' THEN 6
        WHEN 'Sunday' THEN 7
      END,
      start_time
  `;
  
  const coursesResult = await executeQuery(coursesQuery, [user.id]);
  console.log(`\nFound ${coursesResult.rows.length} active courses for ${user.name}:`);
  
  // Group by day
  const coursesByDay: Record<string, any[]> = {};
  for (const course of coursesResult.rows) {
    const day = course.day_of_week || 'No Day';
    if (!coursesByDay[day]) coursesByDay[day] = [];
    coursesByDay[day].push(course);
  }
  
  // Display courses by day
  for (const [day, courses] of Object.entries(coursesByDay)) {
    console.log(`\n${day}:`);
    for (const course of courses) {
      console.log(`  - ${course.code}: ${course.name} at ${course.start_time}`);
    }
  }
  
  // Specifically check Tuesday courses
  console.log('\n=== Tuesday Classes Check ===');
  const tuesdayQuery = `
    SELECT 
      code,
      name,
      day_of_week,
      pg_typeof(day_of_week) as day_type,
      start_time,
      end_time
    FROM courses
    WHERE instructor_id = $1
      AND status = 'active'
      AND day_of_week = 'Tuesday'
  `;
  
  const tuesdayResult = await executeQuery(tuesdayQuery, [user.id]);
  console.log(`\nDirect query for Tuesday courses: ${tuesdayResult.rows.length} found`);
  
  for (const course of tuesdayResult.rows) {
    console.log(`\nCourse: ${course.code}`);
    console.log(`  Name: ${course.name}`);
    console.log(`  day_of_week: "${course.day_of_week}" (type: ${course.day_type})`);
    console.log(`  Start time: ${course.start_time}`);
    console.log(`  End time: ${course.end_time || 'not set'}`);
    
    // Test string comparison
    const testDay = 'Tuesday';
    console.log(`  Comparison test:`);
    console.log(`    course.day_of_week === '${testDay}': ${course.day_of_week === testDay}`);
    console.log(`    course.day_of_week.toLowerCase() === '${testDay.toLowerCase()}': ${course.day_of_week.toLowerCase() === testDay.toLowerCase()}`);
  }
  
  // Simulate the dashboard filter logic
  console.log('\n=== Simulating Dashboard Filter ===');
  const today = now.toLocaleDateString('en-US', { weekday: 'long' });
  console.log(`Today is: ${today}`);
  
  const allCoursesResult = await executeQuery(coursesQuery, [user.id]);
  const filteredCourses = allCoursesResult.rows.filter(row => {
    if (!row.day_of_week) return false;
    
    if (typeof row.day_of_week === 'string') {
      const matches = row.day_of_week.toLowerCase() === today.toLowerCase();
      if (row.code === '02IPDEB2401') {
        console.log(`\nFiltering ${row.code}:`);
        console.log(`  day_of_week: "${row.day_of_week}"`);
        console.log(`  today: "${today}"`);
        console.log(`  toLowerCase comparison: "${row.day_of_week.toLowerCase()}" === "${today.toLowerCase()}"`);
        console.log(`  Result: ${matches}`);
      }
      return matches;
    }
    
    return false;
  });
  
  console.log(`\nFiltered to ${filteredCourses.length} courses for today (${today})`);
  for (const course of filteredCourses) {
    console.log(`  - ${course.code}: ${course.name}`);
  }
  
  process.exit(0);
}

testTuesdayClass().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});