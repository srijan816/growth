import { db } from '../src/lib/postgres';

async function checkRelatedData() {
  console.log('=== CHECKING RELATED DATA FOR ATTENDANCE ===\n');

  try {
    // 1. Check students
    const studentsResult = await db.query('SELECT COUNT(*) as total FROM students');
    console.log(`1. Total students: ${studentsResult.rows[0].total}`);
    
    // Sample students
    const sampleStudentsResult = await db.query(`
      SELECT s.id, u.name, s.student_number, s.grade_level, s.created_at
      FROM students s
      JOIN users u ON s.id = u.id
      ORDER BY s.created_at DESC
      LIMIT 5
    `);
    
    if (sampleStudentsResult.rows.length > 0) {
      console.log('\n   Sample students:');
      sampleStudentsResult.rows.forEach((row: any, index: number) => {
        console.log(`   ${index + 1}. ${row.name} (${row.student_number}) - Grade ${row.grade_level}`);
      });
    }

    // 2. Check courses
    const coursesResult = await db.query('SELECT COUNT(*) as total FROM courses WHERE status = \'active\'');
    console.log(`\n2. Active courses: ${coursesResult.rows[0].total}`);
    
    // Sample courses
    const sampleCoursesResult = await db.query(`
      SELECT id, code, name, day_of_week, start_time, instructor_id
      FROM courses
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (sampleCoursesResult.rows.length > 0) {
      console.log('\n   Sample courses:');
      sampleCoursesResult.rows.forEach((row: any, index: number) => {
        console.log(`   ${index + 1}. ${row.code} - ${row.name} (${row.day_of_week} at ${row.start_time})`);
      });
    }

    // 3. Check class sessions
    const sessionsResult = await db.query('SELECT COUNT(*) as total FROM class_sessions');
    console.log(`\n3. Total class sessions: ${sessionsResult.rows[0].total}`);
    
    // Recent sessions
    const recentSessionsResult = await db.query(`
      SELECT cs.id, cs.session_date, cs.status, c.code, c.name
      FROM class_sessions cs
      JOIN courses c ON cs.course_id = c.id
      WHERE cs.session_date >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY cs.session_date DESC
      LIMIT 10
    `);
    
    console.log(`\n   Recent sessions (last 30 days): ${recentSessionsResult.rows.length}`);
    if (recentSessionsResult.rows.length > 0) {
      console.log('\n   Sample recent sessions:');
      recentSessionsResult.rows.forEach((row: any, index: number) => {
        console.log(`   ${index + 1}. ${new Date(row.session_date).toLocaleDateString()} - ${row.code} ${row.name} (${row.status})`);
      });
    }

    // 4. Check enrollments
    const enrollmentsResult = await db.query('SELECT COUNT(*) as total FROM enrollments WHERE status = \'active\'');
    console.log(`\n4. Active enrollments: ${enrollmentsResult.rows[0].total}`);
    
    // Sample enrollments
    const sampleEnrollmentsResult = await db.query(`
      SELECT e.id, u.name as student_name, c.code, c.name as course_name, e.enrollment_date
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN users u ON s.id = u.id
      JOIN courses c ON e.course_id = c.id
      WHERE e.status = 'active'
      ORDER BY e.enrollment_date DESC
      LIMIT 5
    `);
    
    if (sampleEnrollmentsResult.rows.length > 0) {
      console.log('\n   Sample enrollments:');
      sampleEnrollmentsResult.rows.forEach((row: any, index: number) => {
        console.log(`   ${index + 1}. ${row.student_name} enrolled in ${row.code} on ${new Date(row.enrollment_date).toLocaleDateString()}`);
      });
    }

    // 5. Check for any import batches
    const importBatchesResult = await db.query(`
      SELECT DISTINCT import_batch_id, COUNT(*) as count
      FROM attendances
      WHERE import_batch_id IS NOT NULL
      GROUP BY import_batch_id
    `);
    
    console.log(`\n5. Import batches in attendance table: ${importBatchesResult.rows.length}`);

    // 6. Check for expected attendance combinations
    const expectedAttendanceResult = await db.query(`
      SELECT COUNT(*) as potential_attendance_records
      FROM (
        SELECT DISTINCT s.id as student_id, cs.id as session_id
        FROM students s
        CROSS JOIN class_sessions cs
        JOIN enrollments e ON e.student_id = s.id AND e.course_id = cs.course_id
        WHERE e.status = 'active'
        AND cs.session_date <= CURRENT_DATE
        AND cs.session_date >= e.enrollment_date
      ) as potential
    `);
    
    console.log(`\n6. Potential attendance records (students × past sessions they're enrolled in): ${expectedAttendanceResult.rows[0].potential_attendance_records}`);

    // 7. Check if there's a mismatch
    if (expectedAttendanceResult.rows[0].potential_attendance_records > 0) {
      console.log('\n⚠️  WARNING: There should be attendance records but none exist!');
      console.log('   This suggests that attendance has not been recorded for any classes.');
    }

  } catch (error) {
    console.error('Error checking related data:', error);
  } finally {
    await db.close();
  }
}

// Run the check
checkRelatedData();