require('dotenv').config();
const { Client } = require('pg');

async function listCoursesByDay() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Get Srijan's user ID first
    const userQuery = `SELECT id FROM users WHERE email = 'srijanshetty@gmail.com' OR name ILIKE '%srijan%' LIMIT 1`;
    const userResult = await client.query(userQuery);
    
    if (userResult.rows.length === 0) {
      console.log('Could not find Srijan\'s user account');
      return;
    }
    
    const srijanId = userResult.rows[0].id;
    console.log(`Found Srijan's ID: ${srijanId}\n`);
    
    // Query all active courses for Srijan
    const query = `
      SELECT 
        code,
        name,
        day_of_week,
        start_time,
        end_time,
        level,
        program_type,
        instructor_id,
        max_students
      FROM courses
      WHERE status = 'active'
        AND day_of_week IS NOT NULL
        AND start_time IS NOT NULL
        AND instructor_id = $1
      ORDER BY 
        CASE day_of_week
          WHEN 'Sunday' THEN 0
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
        END,
        start_time
    `;
    
    const result = await client.query(query, [srijanId]);
    
    // Group courses by day
    const coursesByDay = {
      'Tuesday': [],
      'Wednesday': [],
      'Thursday': [],
      'Friday': [],
      'Saturday': []
    };
    
    result.rows.forEach(course => {
      if (coursesByDay[course.day_of_week]) {
        coursesByDay[course.day_of_week].push(course);
      }
    });
    
    // Display courses for each day
    console.log('=== SRIJAN\'S COURSES BY DAY (Tuesday to Saturday) ===\n');
    
    const daysOrder = ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    daysOrder.forEach(day => {
      console.log(`\n📅 ${day.toUpperCase()}`);
      console.log('─'.repeat(70));
      
      if (coursesByDay[day].length === 0) {
        console.log('  No courses scheduled');
      } else {
        coursesByDay[day].forEach(course => {
          const startTime = course.start_time.substring(0, 5);
          const endTime = course.end_time ? course.end_time.substring(0, 5) : 'TBD';
          
          console.log(`  ${startTime}-${endTime} │ ${course.code} - ${course.name}`);
          console.log(`              │ Level: ${course.level || 'N/A'} | Type: ${course.program_type || 'N/A'} | Max Students: ${course.max_students || 0}`);
          console.log('');
        });
      }
    });
    
    // Check for overlaps
    console.log('\n=== CHECKING FOR OVERLAPS ===');
    let overlapsFound = false;
    
    daysOrder.forEach(day => {
      const courses = coursesByDay[day];
      if (courses.length > 1) {
        for (let i = 0; i < courses.length - 1; i++) {
          for (let j = i + 1; j < courses.length; j++) {
            const course1 = courses[i];
            const course2 = courses[j];
            
            const start1 = course1.start_time;
            const end1 = course1.end_time || '23:59:00';
            const start2 = course2.start_time;
            const end2 = course2.end_time || '23:59:00';
            
            // Check if times overlap
            if ((start1 < end2 && end1 > start2)) {
              overlapsFound = true;
              console.log(`\n⚠️  OVERLAP DETECTED on ${day}:`);
              console.log(`   ${course1.code}: ${start1.substring(0,5)}-${end1.substring(0,5)}`);
              console.log(`   ${course2.code}: ${start2.substring(0,5)}-${end2.substring(0,5)}`);
            }
          }
        }
      }
    });
    
    if (!overlapsFound) {
      console.log('✅ No overlaps detected');
    }
    
    // Summary statistics
    console.log('\n=== SUMMARY ===');
    console.log(`Total active courses for Srijan: ${result.rows.length}`);
    daysOrder.forEach(day => {
      console.log(`${day}: ${coursesByDay[day].length} courses`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

listCoursesByDay().catch(console.error);