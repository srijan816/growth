import { Client } from 'pg';

async function fixInstructorAssignments() {
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
    
    // Check if there's an instructor record
    const instructorResult = await client.query(`
      SELECT id FROM instructors WHERE user_id = $1
    `, [srijan.id]);
    
    if (instructorResult.rows.length === 0) {
      console.log('\nCreating instructor record for Srijan...');
      await client.query(`
        INSERT INTO instructors (user_id, bio, created_at, updated_at)
        VALUES ($1, 'Senior Instructor', NOW(), NOW())
      `, [srijan.id]);
    }
    
    // Check current instructor assignments
    console.log('\n=== CURRENT INSTRUCTOR ASSIGNMENTS ===');
    const coursesResult = await client.query(`
      SELECT 
        code,
        name,
        instructor_id,
        u.name as instructor_name
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE c.status = 'Active'
      ORDER BY c.code
    `);
    
    console.log(`Total active courses: ${coursesResult.rows.length}`);
    const unassigned = coursesResult.rows.filter(r => !r.instructor_id);
    console.log(`Courses without instructor: ${unassigned.length}`);
    
    if (unassigned.length > 0) {
      console.log('\nUnassigned courses:');
      unassigned.forEach(course => {
        console.log(`- ${course.code}: ${course.name}`);
      });
    }
    
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
      console.log('Updated courses:');
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
        COUNT(CASE WHEN day_of_week = 'Wednesday' AND instructor_id = $1 THEN 1 END) as wednesday_courses
      FROM courses
      WHERE status = 'Active'
    `, [srijan.id]);
    
    const stats = verifyResult.rows[0];
    console.log(`Total active courses: ${stats.total_courses}`);
    console.log(`Courses assigned to Srijan: ${stats.srijan_courses}`);
    console.log(`Wednesday courses for Srijan: ${stats.wednesday_courses}`);
    
    console.log('\n✅ Instructor assignments fixed!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

fixInstructorAssignments().catch(console.error);