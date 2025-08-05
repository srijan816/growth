require('dotenv').config();
const { Client } = require('pg');

async function diagnoseAllOverlaps() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  
  try {
    await client.connect();
    console.log('Connected to database\n');
    
    // Get all Srijan's courses
    console.log('=== ALL COURSES FOR SRIJAN ===');
    const allCoursesQuery = `
      SELECT 
        code,
        name,
        day_of_week,
        start_time,
        end_time,
        term_type
      FROM courses
      WHERE status = 'active'
        AND instructor_id = '550e8400-e29b-41d4-a716-446655440002'
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
    
    const result = await client.query(allCoursesQuery);
    
    // Group by day
    const coursesByDay = {};
    const intensiveCourses = [];
    
    result.rows.forEach(course => {
      // Check if it's an intensive course
      if (course.name.toLowerCase().includes('intensive') || 
          course.code.includes('BJU') || 
          course.code.includes('CJY') ||
          course.code.includes('DBEP') ||
          course.code.includes('DBXP') ||
          course.code.includes('DCEP')) {
        intensiveCourses.push(course);
      } else {
        if (!coursesByDay[course.day_of_week]) {
          coursesByDay[course.day_of_week] = [];
        }
        coursesByDay[course.day_of_week].push(course);
      }
    });
    
    // Display regular courses by day
    console.log('\n=== REGULAR COURSES BY DAY ===');
    const daysOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    daysOrder.forEach(day => {
      if (coursesByDay[day] && coursesByDay[day].length > 0) {
        console.log(`\n${day.toUpperCase()}:`);
        coursesByDay[day].forEach(course => {
          console.log(`  ${course.start_time.substring(0,5)}-${course.end_time ? course.end_time.substring(0,5) : 'TBD'} │ ${course.code} - ${course.name}`);
        });
        
        // Check for overlaps
        if (coursesByDay[day].length > 1) {
          for (let i = 0; i < coursesByDay[day].length - 1; i++) {
            for (let j = i + 1; j < coursesByDay[day].length; j++) {
              const course1 = coursesByDay[day][i];
              const course2 = coursesByDay[day][j];
              
              if (course1.start_time < course2.end_time && course1.end_time > course2.start_time) {
                console.log(`  ⚠️  OVERLAP: ${course1.code} and ${course2.code}`);
              }
            }
          }
        }
      }
    });
    
    // Display intensive courses
    console.log('\n\n=== INTENSIVE COURSES (TO BE HIDDEN) ===');
    intensiveCourses.forEach(course => {
      console.log(`${course.day_of_week} ${course.start_time.substring(0,5)} │ ${course.code} - ${course.name}`);
    });
    
    // Check sessions for each day this week
    console.log('\n\n=== CHECKING THIS WEEK\'S SESSIONS ===');
    const dates = {
      'Monday': '2025-07-21',
      'Tuesday': '2025-07-22', 
      'Wednesday': '2025-07-23',
      'Thursday': '2025-07-24',
      'Friday': '2025-07-25',
      'Saturday': '2025-07-26'
    };
    
    for (const [day, date] of Object.entries(dates)) {
      const sessionsQuery = `
        SELECT 
          c.code,
          c.name,
          cs.start_time,
          cs.end_time,
          cs.id as session_id
        FROM class_sessions cs
        JOIN courses c ON cs.course_id = c.id
        WHERE cs.session_date = $1
          AND c.instructor_id = '550e8400-e29b-41d4-a716-446655440002'
        ORDER BY cs.start_time
      `;
      
      const sessionsResult = await client.query(sessionsQuery, [date]);
      
      if (sessionsResult.rows.length > 0) {
        console.log(`\n${day} (${date}): ${sessionsResult.rows.length} sessions`);
        
        // Group by time to find duplicates
        const sessionsByTime = {};
        sessionsResult.rows.forEach(session => {
          const timeKey = `${session.start_time}-${session.end_time}`;
          if (!sessionsByTime[timeKey]) {
            sessionsByTime[timeKey] = [];
          }
          sessionsByTime[timeKey].push(session);
        });
        
        // Show sessions and highlight duplicates
        Object.entries(sessionsByTime).forEach(([time, sessions]) => {
          if (sessions.length > 1) {
            console.log(`  ⚠️  ${time}: ${sessions.length} OVERLAPPING SESSIONS:`);
            sessions.forEach(s => console.log(`      - ${s.code}: ${s.name}`));
          } else {
            console.log(`  ✓ ${time}: ${sessions[0].code} - ${sessions[0].name}`);
          }
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

diagnoseAllOverlaps().catch(console.error);