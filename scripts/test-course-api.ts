import { executeQuery } from '../src/lib/postgres';

async function testCourseAPI() {
  console.log('=== Testing Course API ===\n');
  
  // Get the Tuesday course ID
  const courseQuery = `
    SELECT id, code, name, day_of_week, instructor_id
    FROM courses 
    WHERE code = '02IPDEB2401'
  `;
  
  const courseResult = await executeQuery(courseQuery);
  
  if (courseResult.rows.length === 0) {
    console.error('Course 02IPDEB2401 not found!');
    process.exit(1);
  }
  
  const course = courseResult.rows[0];
  console.log('Found course:');
  console.log(`- ID: ${course.id}`);
  console.log(`- Code: ${course.code}`);
  console.log(`- Name: ${course.name}`);
  console.log(`- Day: ${course.day_of_week}`);
  console.log(`- Instructor ID: ${course.instructor_id}`);
  
  // Test the main course query used in the API
  console.log('\n=== Testing Course Detail Query ===');
  const detailQuery = `
    SELECT 
      c.id,
      c.code as course_code,
      c.name as course_name,
      c.level as course_level,
      COALESCE(c.program_type, c.course_type, 'PSD') as course_type,
      COALESCE(c.max_students, c.student_count, 0) as student_count,
      c.start_time,
      c.end_time,
      c.day_of_week,
      c.status = 'active' as is_active,
      c.status,
      c.created_at,
      COUNT(DISTINCT e.student_id) as enrolled_count,
      COUNT(DISTINCT cs.id) as total_sessions
    FROM courses c
    LEFT JOIN enrollments e ON c.id = e.course_id
    LEFT JOIN class_sessions cs ON c.id = cs.course_id
    WHERE c.id = $1
    GROUP BY c.id
  `;
  
  try {
    const detailResult = await executeQuery(detailQuery, [course.id]);
    
    if (detailResult.rows.length > 0) {
      const details = detailResult.rows[0];
      console.log('\nCourse details retrieved successfully:');
      console.log(`- Course code: ${details.course_code}`);
      console.log(`- Course name: ${details.course_name}`);
      console.log(`- Level: ${details.course_level}`);
      console.log(`- Type: ${details.course_type}`);
      console.log(`- Max students: ${details.student_count}`);
      console.log(`- Enrolled count: ${details.enrolled_count}`);
      console.log(`- Start time: ${details.start_time}`);
      console.log(`- End time: ${details.end_time}`);
      console.log(`- Day of week: ${details.day_of_week}`);
      console.log(`- Is active: ${details.is_active}`);
      console.log(`- Status: ${details.status}`);
      console.log(`- Total sessions: ${details.total_sessions}`);
    } else {
      console.error('No course details returned!');
    }
  } catch (error) {
    console.error('Error executing detail query:', error);
  }
  
  // Test students query
  console.log('\n=== Testing Students Query ===');
  const studentsQuery = `
    SELECT COUNT(*) as student_count
    FROM students s
    INNER JOIN enrollments e ON s.id = e.student_id
    WHERE e.course_id = $1
  `;
  
  const studentsResult = await executeQuery(studentsQuery, [course.id]);
  console.log(`Students enrolled: ${studentsResult.rows[0].student_count}`);
  
  process.exit(0);
}

testCourseAPI().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});