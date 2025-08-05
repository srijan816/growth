#!/usr/bin/env tsx

import { db } from '../src/lib/database/connection';

async function fixCourseSchedules() {
  console.log('🗓️ Fixing Course Schedules\n');
  
  try {
    // First, let's see all courses and their current schedules
    console.log('1️⃣ Current Course Schedules:');
    const allCourses = await db.query(`
      SELECT code, name, day_of_week, start_time, instructor_id 
      FROM courses 
      ORDER BY code
    `);
    
    console.log('   Current state:');
    for (const course of allCourses.rows) {
      console.log(`   ${course.code}: ${course.day_of_week || 'NO DAY'} at ${course.start_time || 'NO TIME'}`);
    }
    
    // Define course schedule mappings based on the folder structure patterns I saw
    console.log('\n2️⃣ Applying Schedule Updates:');
    
    const scheduleUpdates = [
      // Tuesday courses
      { code: '02IPDEB2401', day: 'Tuesday', time: '16:30:00' }, // Tuesday - 4_30 - 6_00 PM
      { code: '02IPDDC2401', day: 'Tuesday', time: '18:00:00' }, // Tuesday - 6_00 - 7_30 PM
      { code: '01IPDDD2401', day: 'Tuesday', time: '18:00:00' }, // Tue - 6-7.30pm
      { code: '01IPDCD2401', day: 'Tuesday', time: '18:00:00' }, // Tue - PSD III
      
      // Wednesday courses  
      { code: '02IPDEB2402', day: 'Wednesday', time: '16:30:00' }, // Wednesday - 4.30 - 6pm
      { code: '02IPDEC2401', day: 'Wednesday', time: '16:30:00' }, // Wednesday - 4.5-6
      { code: '02OPDEC2401', day: 'Wednesday', time: '16:30:00' }, // Wednesday - 4.5-6
      { code: '01IPDED2401', day: 'Wednesday', time: '18:00:00' }, // Wednesday - 6 - 7.5
      { code: '01IPDDD2401', day: 'Wednesday', time: '18:00:00' }, // Wed - PSD II
      { code: '01OPDCD2401', day: 'Wednesday', time: '18:00:00' }, // Wednesday - 6-8pm
      
      // Thursday courses
      { code: '02IPDEB2403', day: 'Thursday', time: '16:30:00' }, // Thursday - 4.30 - 6pm
      { code: '01IPDED2406', day: 'Thursday', time: '16:30:00' }, // Thursday - 4_30 - 6_00
      { code: '02IPDEC2401', day: 'Thursday', time: '18:00:00' }, // Thursday - 6 - 7.5 (duplicate?)
      { code: '01IPDDD2402', day: 'Thursday', time: '18:00:00' }, // Thur - PSD II
      { code: '21IDPDED2501', day: 'Thursday', time: '18:00:00' }, // Thursday - 6_00 PM
      
      // Friday courses
      { code: '21IDPDEB2502', day: 'Friday', time: '16:30:00' }, // Friday - 4_30 PM
      { code: '01IPDED2402', day: 'Friday', time: '16:30:00' }, // Friday - 4_30 - 6_00 PM
      { code: '02IPDEC2402', day: 'Friday', time: '18:00:00' }, // Friday - 6 - 7.5
      { code: '21IDPDEC2503', day: 'Friday', time: '18:00:00' }, // Friday - 6_00 PM
      { code: '01IPDDD2403', day: 'Friday', time: '18:00:00' }, // Fri - PSD II
      { code: '01IPDCD2402', day: 'Friday', time: '18:00:00' }, // Fri - PSD III
      
      // Saturday courses
      { code: '21IDPDEC2504', day: 'Saturday', time: '09:30:00' }, // Saturday - 9_30 AM
      { code: '01OPDED2402', day: 'Saturday', time: '09:30:00' }, // Saturday - 9.30-11am
      { code: '01OPDCD2402', day: 'Saturday', time: '09:30:00' }, // Saturday - 9.30-11.30am
      { code: '02IPDDC2402', day: 'Saturday', time: '09:30:00' }, // Saturday - 9.5- 11 (9:30)
      { code: '02IPDEC2403', day: 'Saturday', time: '11:00:00' }, // Saturday 11 - 12.5
      { code: '01IPDED2403', day: 'Saturday', time: '11:00:00' }, // Saturday - 11_00 -12_30PM
      { code: '02IPDEB2404', day: 'Saturday', time: '13:30:00' }, // Saturday - 1_30 -3_00
      { code: '02IPDEC2404', day: 'Saturday', time: '13:30:00' }, // Saturday - 1.5 - 3 PM
      { code: '02OPDCD2403', day: 'Saturday', time: '14:30:00' }, // Saturday - 2.30-4.30pm
      { code: '01IPDDD2404', day: 'Saturday', time: '15:00:00' }, // Saturday - 3_00 - 4_30
      { code: '01IPDED2404', day: 'Saturday', time: '15:00:00' }, // Saturday - 3_00 - 4_30
      { code: '01IPDCD2403', day: 'Saturday', time: '15:00:00' }, // Sat - PSD III
      { code: '02IPDEB2405', day: 'Saturday', time: '16:45:00' }, // Saturday - 4_45 - 6_15PM
      { code: '01IPDED2405', day: 'Saturday', time: '16:45:00' }, // Saturday - 4_45- 6_15 PM
      { code: '01IPDDD2405', day: 'Saturday', time: '16:45:00' }, // Sat 4_45 - PSD II
      
      // Intensives - default to weekday mornings
      { code: '02IPBAU2401', day: 'Monday', time: '10:00:00' }, // Intensives
      { code: '02IPBJU2502', day: 'Monday', time: '10:00:00' }, // Intensives
      { code: '02IPBJY2403', day: 'Monday', time: '10:00:00' }, // Intensives
      { code: '02IPCAU2402', day: 'Monday', time: '10:00:00' }, // Intensives
      { code: '02IPCJY2403', day: 'Monday', time: '10:00:00' }, // Intensives
      { code: '02IPCJY2502', day: 'Monday', time: '10:00:00' }, // Intensives
      { code: '02IPDBEP2503', day: 'Monday', time: '10:00:00' }, // Intensives
      { code: '02IPDBXP2401', day: 'Monday', time: '10:00:00' }, // Intensives
      { code: '02IPDCEP2502', day: 'Monday', time: '10:00:00' }, // Intensives
    ];
    
    let updated = 0;
    for (const schedule of scheduleUpdates) {
      const result = await db.query(
        `UPDATE courses 
         SET day_of_week = $2, start_time = $3 
         WHERE code = $1 
         RETURNING code`,
        [schedule.code, schedule.day, schedule.time]
      );
      
      if (result.rows.length > 0) {
        updated++;
        console.log(`   ✅ Updated ${schedule.code}: ${schedule.day} at ${schedule.time}`);
      }
    }
    
    console.log(`\n   Total courses updated: ${updated}`);
    
    // Check if any courses still don't have schedules
    console.log('\n3️⃣ Verifying All Courses Have Schedules:');
    const missingSchedules = await db.query(`
      SELECT code, name, day_of_week, start_time 
      FROM courses 
      WHERE day_of_week IS NULL OR start_time IS NULL OR day_of_week = 'Not set'
      ORDER BY code
    `);
    
    if (missingSchedules.rows.length > 0) {
      console.log('   ⚠️  Courses still missing schedules:');
      for (const course of missingSchedules.rows) {
        console.log(`      ${course.code}: ${course.name}`);
      }
    } else {
      console.log('   ✅ All courses now have schedules!');
    }
    
    // Show final state
    console.log('\n4️⃣ Final Course Schedules:');
    const finalCourses = await db.query(`
      SELECT code, name, day_of_week, start_time,
             (SELECT COUNT(*) FROM enrollments WHERE course_id = courses.id) as enrollment_count
      FROM courses 
      ORDER BY 
        CASE day_of_week 
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
          WHEN 'Sunday' THEN 7
        END,
        start_time,
        code
    `);
    
    let currentDay = '';
    for (const course of finalCourses.rows) {
      if (course.day_of_week !== currentDay) {
        currentDay = course.day_of_week;
        console.log(`\n   ${currentDay}:`);
      }
      console.log(`     ${course.start_time} - ${course.code}: ${course.name} (${course.enrollment_count} students)`);
    }
    
    // Generate weekly sessions for courses with proper schedules
    console.log('\n5️⃣ Generating Weekly Sessions:');
    
    // Get all active courses with schedules
    const activeCoursesResult = await db.query(`
      SELECT id, code, day_of_week, start_time 
      FROM courses 
      WHERE status = 'active' 
        AND day_of_week IS NOT NULL 
        AND start_time IS NOT NULL
    `);
    
    let sessionsCreated = 0;
    const startDate = new Date('2025-08-01');
    const endDate = new Date('2025-12-31');
    
    for (const course of activeCoursesResult.rows) {
      // Check if sessions already exist
      const existingSessions = await db.query(
        'SELECT COUNT(*) as count FROM class_sessions WHERE course_id = $1',
        [course.id]
      );
      
      if (existingSessions.rows[0].count > 0) {
        continue; // Skip if sessions already exist
      }
      
      // Generate sessions for this course
      const dayMap: { [key: string]: number } = {
        'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
        'Thursday': 4, 'Friday': 5, 'Saturday': 6
      };
      
      const courseDayNumber = dayMap[course.day_of_week];
      const currentDate = new Date(startDate);
      
      // Find first occurrence of the day
      while (currentDate.getDay() !== courseDayNumber) {
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Generate weekly sessions
      while (currentDate <= endDate) {
        await db.query(
          `INSERT INTO class_sessions (course_id, session_date, session_time, status)
           VALUES ($1, $2, $3, 'scheduled')
           ON CONFLICT DO NOTHING`,
          [course.id, currentDate.toISOString().split('T')[0], course.start_time]
        );
        
        sessionsCreated++;
        currentDate.setDate(currentDate.getDate() + 7); // Next week
      }
    }
    
    console.log(`   ✅ Created ${sessionsCreated} weekly sessions`);
    
    console.log('\n✅ Course schedule fix completed!');
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await db.close();
    process.exit(0);
  }
}

// Run fix
fixCourseSchedules().catch(console.error);