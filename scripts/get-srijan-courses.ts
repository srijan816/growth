import { db } from '../src/lib/postgres';

async function getSrijanCourses() {
  try {
    // First, find Srijan's user ID
    const userResult = await db.query(`
      SELECT id, name, email 
      FROM users 
      WHERE LOWER(name) LIKE '%srijan%'
    `);
    
    if (userResult.rows.length === 0) {
      console.log('No user found with name containing "Srijan"');
      return;
    }
    
    const srijanUser = userResult.rows[0];
    console.log(`Found instructor: ${srijanUser.name} (${srijanUser.id})`);
    console.log('=====================================\n');
    
    // Get all courses taught by Srijan with enrollment counts
    const coursesResult = await db.query(`
      SELECT 
        c.id,
        c.code,
        c.name,
        c.day_of_week,
        c.start_time,
        c.status,
        COUNT(DISTINCT e.id) as enrolled_students
      FROM courses c
      LEFT JOIN enrollments e ON e.course_id = c.id AND e.status = 'active'
      WHERE c.instructor_id = $1
      GROUP BY c.id, c.code, c.name, c.day_of_week, c.start_time, c.status
      ORDER BY c.code, c.name
    `, [srijanUser.id]);
    
    if (coursesResult.rows.length === 0) {
      console.log('No courses found for Srijan');
      return;
    }
    
    console.log(`Found ${coursesResult.rows.length} courses taught by Srijan:\n`);
    
    // Format and display each course
    coursesResult.rows.forEach((course, index) => {
      console.log(`${index + 1}. ${course.code} - ${course.name}`);
      console.log(`   Course ID: ${course.id}`);
      console.log(`   Current Schedule: ${course.day_of_week || 'Not set'} at ${course.start_time || 'Not set'}`);
      console.log(`   Status: ${course.status}`);
      console.log(`   Enrolled Students: ${course.enrolled_students}`);
      
      // Extract grade level and PSD level from course name if available
      const gradeMatch = course.name.match(/G(\d+(?:-\d+)?)/);
      const psdMatch = course.name.match(/PSD\s*(\d+)/i);
      
      if (gradeMatch) {
        console.log(`   Grade Level: ${gradeMatch[1]}`);
      }
      if (psdMatch) {
        console.log(`   PSD Level: ${psdMatch[1]}`);
      }
      
      
      console.log('   ---');
    });
    
    // Summary statistics
    console.log('\n=====================================');
    console.log('SUMMARY:');
    console.log(`Total courses: ${coursesResult.rows.length}`);
    const activeCourses = coursesResult.rows.filter(c => c.status === 'active').length;
    console.log(`Active courses: ${activeCourses}`);
    const totalStudents = coursesResult.rows.reduce((sum, c) => sum + parseInt(c.enrolled_students), 0);
    console.log(`Total enrolled students: ${totalStudents}`);
    
  } catch (error) {
    console.error('Error fetching Srijan courses:', error);
  } finally {
    await db.close();
  }
}

// Run the script
getSrijanCourses();