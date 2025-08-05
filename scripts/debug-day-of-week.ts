import { executeQuery } from '../src/lib/postgres';

async function debugDayOfWeek() {
  console.log('=== Debugging day_of_week values ===\n');
  
  // First, check course 02IPDEB2401 specifically
  const course02Query = `
    SELECT 
      code, 
      name, 
      day_of_week,
      pg_typeof(day_of_week) as day_type,
      start_time,
      instructor_id
    FROM courses 
    WHERE code = '02IPDEB2401'
  `;
  
  const course02Result = await executeQuery(course02Query);
  console.log('Course 02IPDEB2401:');
  if (course02Result.rows.length > 0) {
    const course = course02Result.rows[0];
    console.log('- Code:', course.code);
    console.log('- Name:', course.name);
    console.log('- day_of_week value:', course.day_of_week);
    console.log('- day_of_week type:', course.day_type);
    console.log('- typeof day_of_week:', typeof course.day_of_week);
    console.log('- Is Array?:', Array.isArray(course.day_of_week));
    console.log('- JSON.stringify:', JSON.stringify(course.day_of_week));
    console.log('- start_time:', course.start_time);
    console.log('- instructor_id:', course.instructor_id);
  }
  
  console.log('\n=== Checking all Srijan courses ===\n');
  
  // Get Srijan's user ID
  const srijanQuery = `SELECT id, name, email FROM users WHERE name LIKE '%Srijan%'`;
  const srijanResult = await executeQuery(srijanQuery);
  
  if (srijanResult.rows.length > 0) {
    const srijan = srijanResult.rows[0];
    console.log('Srijan user:', srijan.name, '(ID:', srijan.id, ')');
    
    // Get all courses for Srijan
    const coursesQuery = `
      SELECT 
        code,
        name,
        day_of_week,
        pg_typeof(day_of_week) as day_type,
        start_time,
        status
      FROM courses 
      WHERE instructor_id = $1
      ORDER BY code
    `;
    
    const coursesResult = await executeQuery(coursesQuery, [srijan.id]);
    console.log(`\nFound ${coursesResult.rows.length} courses for Srijan:\n`);
    
    for (const course of coursesResult.rows) {
      console.log(`Course: ${course.code} - ${course.name}`);
      console.log(`  - Status: ${course.status}`);
      console.log(`  - Start time: ${course.start_time}`);
      console.log(`  - day_of_week: ${course.day_of_week}`);
      console.log(`  - Type: ${course.day_type}`);
      console.log(`  - Is Array?: ${Array.isArray(course.day_of_week)}`);
      console.log(`  - JSON: ${JSON.stringify(course.day_of_week)}`);
      console.log('');
    }
  }
  
  console.log('\n=== Checking different day_of_week formats in database ===\n');
  
  // Check all unique day_of_week values
  const uniqueDaysQuery = `
    SELECT DISTINCT 
      day_of_week,
      pg_typeof(day_of_week) as day_type,
      COUNT(*) as course_count
    FROM courses
    WHERE day_of_week IS NOT NULL
    GROUP BY day_of_week, pg_typeof(day_of_week)
    ORDER BY course_count DESC
  `;
  
  const uniqueDaysResult = await executeQuery(uniqueDaysQuery);
  console.log('Unique day_of_week values in database:');
  for (const row of uniqueDaysResult.rows) {
    console.log(`- Value: ${JSON.stringify(row.day_of_week)}, Type: ${row.day_type}, Count: ${row.course_count}`);
  }
  
  // Check Tuesday courses specifically
  console.log('\n=== Checking Tuesday courses ===\n');
  
  const tuesdayQuery = `
    SELECT 
      code,
      name,
      day_of_week,
      instructor_id,
      start_time
    FROM courses
    WHERE status = 'active'
      AND start_time IS NOT NULL
      AND (
        day_of_week = 'Tuesday'
        OR day_of_week = 'tuesday'
        OR day_of_week::text ILIKE '%tuesday%'
        OR (day_of_week::jsonb ? '2' AND day_of_week::jsonb @> '2'::jsonb)
      )
    ORDER BY start_time
  `;
  
  try {
    const tuesdayResult = await executeQuery(tuesdayQuery);
    console.log(`Found ${tuesdayResult.rows.length} Tuesday courses:`);
    for (const course of tuesdayResult.rows) {
      console.log(`- ${course.code}: ${course.name} at ${course.start_time}, day_of_week: ${JSON.stringify(course.day_of_week)}`);
    }
  } catch (error) {
    console.log('Error with complex Tuesday query:', error);
    
    // Try simpler query
    const simpleTuesdayQuery = `
      SELECT code, name, day_of_week, start_time
      FROM courses
      WHERE status = 'active' AND start_time IS NOT NULL
      ORDER BY start_time
    `;
    
    const allCoursesResult = await executeQuery(simpleTuesdayQuery);
    const tuesdayCourses = allCoursesResult.rows.filter(course => {
      if (!course.day_of_week) return false;
      
      // Check various formats
      if (typeof course.day_of_week === 'string') {
        return course.day_of_week.toLowerCase() === 'tuesday';
      }
      if (Array.isArray(course.day_of_week)) {
        return course.day_of_week.includes(2) || course.day_of_week.includes('2');
      }
      if (typeof course.day_of_week === 'number') {
        return course.day_of_week === 2;
      }
      
      return false;
    });
    
    console.log(`\nFiltered ${tuesdayCourses.length} Tuesday courses from ${allCoursesResult.rows.length} total:`);
    for (const course of tuesdayCourses) {
      console.log(`- ${course.code}: ${course.name}, day_of_week: ${JSON.stringify(course.day_of_week)}`);
    }
  }
  
  process.exit(0);
}

debugDayOfWeek().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});