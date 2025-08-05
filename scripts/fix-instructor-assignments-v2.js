import { Client } from 'pg';

async function fixInstructorAssignmentsV2() {
  const client = new Client({ connectionString: 'postgresql://tikaram@localhost:5432/growth_compass' });
  
  try {
    await client.connect();
    console.log('=== FIXING INSTRUCTOR ASSIGNMENTS ===\n');
    
    // Get Srijan's user ID
    const userResult = await client.query(`
      SELECT id, name, email FROM users WHERE email = 'srijan@capstone.com'
    `);
    
    if (userResult.rows.length === 0) {
      console.log('ERROR: Srijan user not found!');
      return;
    }
    
    const srijan = userResult.rows[0];
    console.log(`Found user: ${srijan.name} (${srijan.email})`);
    console.log(`User ID: ${srijan.id}`);
    
    // Check instructors table structure
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'instructors'
    `);
    
    if (tableCheck.rows.length === 0) {
      console.log('\nInstructors table does not exist - that\'s OK, we\'ll assign directly');
    }
    
    // Check current instructor assignments
    console.log('\n=== CURRENT INSTRUCTOR ASSIGNMENTS ===');
    const coursesResult = await client.query(`
      SELECT 
        code,
        name,
        instructor_id,
        day_of_week,
        start_time
      FROM courses
      WHERE status = 'Active'
      ORDER BY code
    `);
    
    console.log(`Total active courses: ${coursesResult.rows.length}`);
    
    // Group by instructor
    const byInstructor = {};
    coursesResult.rows.forEach(course => {
      const instructorId = course.instructor_id || 'unassigned';
      if (!byInstructor[instructorId]) {
        byInstructor[instructorId] = [];
      }
      byInstructor[instructorId].push(course);
    });
    
    console.log('\nCourses by instructor:');
    Object.entries(byInstructor).forEach(([instructorId, courses]) => {
      if (instructorId === srijan.id) {
        console.log(`- Srijan: ${courses.length} courses`);
      } else if (instructorId === 'unassigned') {
        console.log(`- Unassigned: ${courses.length} courses`);
      } else {
        console.log(`- Other instructor (${instructorId}): ${courses.length} courses`);
      }
    });
    
    // Update all active courses to have Srijan as instructor
    console.log('\n=== UPDATING INSTRUCTOR ASSIGNMENTS ===');
    const updateResult = await client.query(`
      UPDATE courses
      SET instructor_id = $1,
          updated_at = NOW()
      WHERE status = 'Active'
        AND (instructor_id IS NULL OR instructor_id != $1)
      RETURNING code, name
    `, [srijan.id]);
    
    console.log(`\nUpdated ${updateResult.rows.length} courses to assign Srijan as instructor`);
    if (updateResult.rows.length > 0) {
      console.log('\nUpdated courses:');
      updateResult.rows.forEach(course => {
        console.log(`- ${course.code}: ${course.name}`);
      });
    }
    
    // Verify the fix
    console.log('\n=== VERIFICATION ===');
    const verifyResult = await client.query(`
      SELECT 
        COUNT(*) as total_courses,
        COUNT(CASE WHEN instructor_id = $1 THEN 1 END) as srijan_courses,
        COUNT(CASE WHEN day_of_week = 'Wednesday' AND instructor_id = $1 THEN 1 END) as wednesday_courses,
        COUNT(CASE WHEN day_of_week = 'Thursday' AND instructor_id = $1 THEN 1 END) as thursday_courses,
        COUNT(CASE WHEN day_of_week = 'Friday' AND instructor_id = $1 THEN 1 END) as friday_courses
      FROM courses
      WHERE status = 'Active'
    `, [srijan.id]);
    
    const stats = verifyResult.rows[0];
    console.log(`Total active courses: ${stats.total_courses}`);
    console.log(`Courses assigned to Srijan: ${stats.srijan_courses}`);
    console.log(`\nSrijan's schedule:`);
    console.log(`- Wednesday: ${stats.wednesday_courses} courses`);
    console.log(`- Thursday: ${stats.thursday_courses} courses`);
    console.log(`- Friday: ${stats.friday_courses} courses`);
    
    // Show Wednesday courses specifically
    const wednesdayResult = await client.query(`
      SELECT code, name, start_time
      FROM courses
      WHERE status = 'Active'
        AND instructor_id = $1
        AND day_of_week = 'Wednesday'
      ORDER BY start_time
    `, [srijan.id]);
    
    if (wednesdayResult.rows.length > 0) {
      console.log('\nWednesday courses:');
      wednesdayResult.rows.forEach(course => {
        console.log(`- ${course.start_time}: ${course.code} - ${course.name}`);
      });
    }
    
    console.log('\n✅ Instructor assignments fixed!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

fixInstructorAssignmentsV2().catch(console.error);