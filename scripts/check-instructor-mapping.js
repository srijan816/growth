const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkInstructorMapping() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // 1. Check all users and their IDs
    console.log('\n=== ALL USERS ===');
    const usersQuery = `
      SELECT id, name, email, role
      FROM users
      ORDER BY created_at
    `;
    const usersResult = await client.query(usersQuery);
    
    console.log('\nUsers in system:');
    usersResult.rows.forEach(user => {
      console.log(`\nID: ${user.id}`);
      console.log(`Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Role: ${user.role}`);
    });

    // 2. Map instructor IDs to courses
    console.log('\n\n=== INSTRUCTOR -> COURSES MAPPING ===');
    const mappingQuery = `
      SELECT 
        u.id as instructor_id,
        u.name as instructor_name,
        u.email as instructor_email,
        COUNT(c.id) as course_count,
        STRING_AGG(c.code || ' (' || c.day_of_week || ')', ', ' ORDER BY c.code) as courses
      FROM users u
      LEFT JOIN courses c ON u.id = c.instructor_id AND c.status = 'active'
      WHERE u.role = 'instructor'
      GROUP BY u.id, u.name, u.email
      ORDER BY u.name
    `;
    const mappingResult = await client.query(mappingQuery);
    
    mappingResult.rows.forEach(instructor => {
      console.log(`\n${instructor.instructor_name} (${instructor.instructor_email}):`);
      console.log(`  ID: ${instructor.instructor_id}`);
      console.log(`  Course count: ${instructor.course_count}`);
      if (instructor.courses) {
        console.log(`  Courses: ${instructor.courses}`);
      }
    });

    // 3. Check who owns the Tuesday classes
    console.log('\n\n=== TUESDAY CLASSES OWNERSHIP ===');
    const tuesdayQuery = `
      SELECT 
        c.code,
        c.name,
        c.instructor_id,
        u.name as instructor_name,
        u.email as instructor_email
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      WHERE c.status = 'active'
        AND c.day_of_week = 'Tuesday'
      ORDER BY c.start_time
    `;
    const tuesdayResult = await client.query(tuesdayQuery);
    
    console.log('\nTuesday classes:');
    tuesdayResult.rows.forEach(course => {
      console.log(`\n${course.code}: ${course.name}`);
      console.log(`  Instructor ID: ${course.instructor_id}`);
      console.log(`  Instructor: ${course.instructor_name || 'NOT FOUND'} (${course.instructor_email || 'N/A'})`);
    });

    // 4. Check if we need to reassign courses
    console.log('\n\n=== REASSIGNMENT CHECK ===');
    console.log('\nTo fix "No Classes Today" issue, you may need to:');
    console.log('1. Log in as the instructor who owns the courses (Srijan or Saurav)');
    console.log('2. OR reassign the courses to test@instructor.com');
    console.log('3. OR remove the instructor filter from getTodaysClasses function');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkInstructorMapping();