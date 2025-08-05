import { executeQuery } from '../src/lib/postgres';

async function fixSrijanCourses() {
  console.log('=== Fixing Srijan Course Assignments ===\n');
  
  // First, identify the correct Srijan account (the one with 16 courses)
  const srijanId = '550e8400-e29b-41d4-a716-446655440002';
  const testInstructorId = '550e8400-e29b-41d4-a716-446655440006';
  
  // Check current state
  console.log('Current state of 02IPDEB2401:');
  const checkQuery = `
    SELECT c.code, c.name, c.day_of_week, c.start_time, u.name as instructor_name
    FROM courses c
    LEFT JOIN users u ON c.instructor_id = u.id
    WHERE c.code = '02IPDEB2401'
  `;
  const checkResult = await executeQuery(checkQuery);
  if (checkResult.rows.length > 0) {
    const course = checkResult.rows[0];
    console.log(`- Currently assigned to: ${course.instructor_name}`);
    console.log(`- Day: ${course.day_of_week}`);
    console.log(`- Time: ${course.start_time}`);
  }
  
  // Reassign the Tuesday course to Srijan
  console.log('\nReassigning 02IPDEB2401 to Srijan...');
  const updateQuery = `
    UPDATE courses 
    SET instructor_id = $1
    WHERE code = '02IPDEB2401'
    RETURNING code, name, day_of_week
  `;
  
  const updateResult = await executeQuery(updateQuery, [srijanId]);
  if (updateResult.rows.length > 0) {
    console.log('✓ Successfully reassigned:', updateResult.rows[0].name);
  }
  
  // Verify all Tuesday courses for Srijan
  console.log('\n=== Verifying Tuesday Courses for Srijan ===');
  const tuesdayQuery = `
    SELECT code, name, day_of_week, start_time
    FROM courses
    WHERE instructor_id = $1
      AND day_of_week = 'Tuesday'
      AND status = 'active'
    ORDER BY start_time
  `;
  
  const tuesdayResult = await executeQuery(tuesdayQuery, [srijanId]);
  console.log(`\nFound ${tuesdayResult.rows.length} Tuesday courses for Srijan:`);
  for (const course of tuesdayResult.rows) {
    console.log(`- ${course.code}: ${course.name} at ${course.start_time}`);
  }
  
  // Show all Srijan's courses by day
  console.log('\n=== All Srijan Courses by Day ===');
  const allCoursesQuery = `
    SELECT day_of_week, COUNT(*) as count, 
           STRING_AGG(code || ' (' || SUBSTRING(start_time::text, 1, 5) || ')', ', ' ORDER BY start_time) as courses
    FROM courses
    WHERE instructor_id = $1 AND status = 'active'
    GROUP BY day_of_week
    ORDER BY 
      CASE day_of_week
        WHEN 'Monday' THEN 1
        WHEN 'Tuesday' THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4
        WHEN 'Friday' THEN 5
        WHEN 'Saturday' THEN 6
        WHEN 'Sunday' THEN 7
      END
  `;
  
  const allCoursesResult = await executeQuery(allCoursesQuery, [srijanId]);
  for (const row of allCoursesResult.rows) {
    console.log(`\n${row.day_of_week}: ${row.count} classes`);
    console.log(`  ${row.courses}`);
  }
  
  process.exit(0);
}

fixSrijanCourses().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});