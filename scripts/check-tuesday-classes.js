const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkTuesdayClasses() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check courses table
    console.log('\n=== CHECKING COURSES TABLE ===');
    const coursesQuery = `
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
        course_type,
        max_students,
        student_count
      FROM courses
      WHERE status = 'active'
      ORDER BY code
    `;
    const coursesResult = await client.query(coursesQuery);
    
    console.log(`\nFound ${coursesResult.rows.length} active courses:`);
    coursesResult.rows.forEach(course => {
      console.log(`\nCode: ${course.code}`);
      console.log(`Name: ${course.name}`);
      console.log(`Day of Week: ${course.day_of_week} (type: ${typeof course.day_of_week})`);
      console.log(`Start Time: ${course.start_time}`);
      console.log(`End Time: ${course.end_time}`);
      console.log(`Status: ${course.status}`);
      console.log(`Program Type: ${course.program_type || course.course_type || 'Not set'}`);
      console.log(`Max Students: ${course.max_students || course.student_count || 0}`);
      
      // Check if it runs on Tuesday
      if (course.day_of_week) {
        if (typeof course.day_of_week === 'string' && course.day_of_week.toLowerCase() === 'tuesday') {
          console.log('✅ This course runs on Tuesday (string match)');
        } else if (Array.isArray(course.day_of_week) && course.day_of_week.includes(2)) {
          console.log('✅ This course runs on Tuesday (array includes 2)');
        } else {
          console.log('❌ This course does NOT run on Tuesday');
        }
      } else {
        console.log('⚠️  No day_of_week set');
      }
    });

    // Check if 02IPDEB2401 exists
    console.log('\n=== CHECKING FOR 02IPDEB2401 ===');
    const specificQuery = `
      SELECT * FROM courses 
      WHERE code = '02IPDEB2401' OR code LIKE '%02IPDEB2401%'
    `;
    const specificResult = await client.query(specificQuery);
    
    if (specificResult.rows.length > 0) {
      console.log('Found 02IPDEB2401:', JSON.stringify(specificResult.rows[0], null, 2));
    } else {
      console.log('❌ Course 02IPDEB2401 NOT FOUND in courses table');
    }

    // Check class_sessions for today
    console.log('\n=== CHECKING CLASS_SESSIONS FOR TODAY ===');
    const today = new Date().toISOString().split('T')[0];
    const sessionsQuery = `
      SELECT 
        cs.*,
        c.code as course_code,
        c.name as course_name
      FROM class_sessions cs
      JOIN courses c ON cs.course_id = c.id
      WHERE cs.session_date = $1
    `;
    const sessionsResult = await client.query(sessionsQuery, [today]);
    
    console.log(`\nFound ${sessionsResult.rows.length} sessions for today (${today})`);
    sessionsResult.rows.forEach(session => {
      console.log(`- ${session.course_code}: ${session.course_name} at ${session.start_time}`);
    });

    // Check dashboard_classes table if it exists
    console.log('\n=== CHECKING DASHBOARD_CLASSES TABLE ===');
    const dashboardQuery = `
      SELECT * FROM dashboard_classes 
      WHERE status = 'active'
      ORDER BY class_code
    `;
    try {
      const dashboardResult = await client.query(dashboardQuery);
      console.log(`\nFound ${dashboardResult.rows.length} active dashboard classes`);
      dashboardResult.rows.forEach(cls => {
        console.log(`- ${cls.class_code}: ${cls.class_name} on day ${cls.schedule_day_of_week}`);
      });
    } catch (err) {
      console.log('dashboard_classes table might not exist:', err.message);
    }

    // Check data types in information_schema
    console.log('\n=== CHECKING COLUMN DATA TYPES ===');
    const schemaQuery = `
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'courses' 
        AND column_name IN ('day_of_week', 'start_time', 'end_time', 'status')
      ORDER BY column_name
    `;
    const schemaResult = await client.query(schemaQuery);
    console.log('\nColumn types in courses table:');
    schemaResult.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (${col.udt_name})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkTuesdayClasses();