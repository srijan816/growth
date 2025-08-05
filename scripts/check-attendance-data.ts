import { db } from '../src/lib/postgres';

async function checkAttendanceData() {
  console.log('=== ATTENDANCE DATA CHECK ===\n');

  try {
    // 1. Check total attendance records
    const totalResult = await db.query('SELECT COUNT(*) as total FROM attendances');
    console.log(`1. Total attendance records: ${totalResult.rows[0].total}`);

    // 2. Check recent attendance records (last 30 days)
    const recentResult = await db.query(`
      SELECT COUNT(*) as recent_count 
      FROM attendances a
      JOIN class_sessions cs ON a.session_id = cs.id
      WHERE cs.session_date >= CURRENT_DATE - INTERVAL '30 days'
    `);
    console.log(`\n2. Recent attendance records (last 30 days): ${recentResult.rows[0].recent_count}`);

    // 3. Check attendance by status
    const statusResult = await db.query(`
      SELECT status, COUNT(*) as count 
      FROM attendances 
      GROUP BY status 
      ORDER BY count DESC
    `);
    console.log('\n3. Attendance by status:');
    statusResult.rows.forEach((row: any) => {
      console.log(`   - ${row.status}: ${row.count}`);
    });

    // 4. Check attendance records with proper relationships
    const relationshipResult = await db.query(`
      SELECT 
        COUNT(DISTINCT a.id) as attendance_count,
        COUNT(DISTINCT a.session_id) as unique_sessions,
        COUNT(DISTINCT a.student_id) as unique_students,
        COUNT(DISTINCT cs.course_id) as unique_courses
      FROM attendances a
      JOIN class_sessions cs ON a.session_id = cs.id
    `);
    console.log('\n4. Attendance relationships:');
    const rel = relationshipResult.rows[0];
    console.log(`   - Total attendance records: ${rel.attendance_count}`);
    console.log(`   - Unique sessions: ${rel.unique_sessions}`);
    console.log(`   - Unique students: ${rel.unique_students}`);
    console.log(`   - Unique courses: ${rel.unique_courses}`);

    // 5. Check for attendance records with missing relationships
    const missingRelationsResult = await db.query(`
      SELECT 
        SUM(CASE WHEN session_id IS NULL THEN 1 ELSE 0 END) as missing_session,
        SUM(CASE WHEN student_id IS NULL THEN 1 ELSE 0 END) as missing_student,
        SUM(CASE WHEN NOT EXISTS (SELECT 1 FROM class_sessions cs WHERE cs.id = a.session_id) THEN 1 ELSE 0 END) as invalid_session,
        SUM(CASE WHEN NOT EXISTS (SELECT 1 FROM students s WHERE s.id = a.student_id) THEN 1 ELSE 0 END) as invalid_student
      FROM attendances a
    `);
    console.log('\n5. Data integrity issues:');
    const integrity = missingRelationsResult.rows[0];
    console.log(`   - Records with missing session_id: ${integrity.missing_session || 0}`);
    console.log(`   - Records with missing student_id: ${integrity.missing_student || 0}`);
    console.log(`   - Records with invalid session reference: ${integrity.invalid_session || 0}`);
    console.log(`   - Records with invalid student reference: ${integrity.invalid_student || 0}`);

    // 6. Sample recent attendance records with details
    const sampleResult = await db.query(`
      SELECT 
        a.id,
        u.name as student_name,
        c.code as course_code,
        cs.session_date,
        a.status,
        a.attitude_efforts,
        a.asking_questions,
        a.application_skills,
        a.application_feedback,
        a.created_at
      FROM attendances a
      JOIN students s ON a.student_id = s.id
      JOIN users u ON s.id = u.id
      JOIN class_sessions cs ON a.session_id = cs.id
      JOIN courses c ON cs.course_id = c.id
      ORDER BY cs.session_date DESC, a.created_at DESC
      LIMIT 5
    `);
    
    console.log('\n6. Sample recent attendance records:');
    if (sampleResult.rows.length === 0) {
      console.log('   No attendance records found with complete relationships');
    } else {
      sampleResult.rows.forEach((row: any, index: number) => {
        console.log(`\n   Record ${index + 1}:`);
        console.log(`   - Student: ${row.student_name}`);
        console.log(`   - Course: ${row.course_code}`);
        console.log(`   - Date: ${new Date(row.session_date).toLocaleDateString()}`);
        console.log(`   - Status: ${row.status}`);
        console.log(`   - Ratings: Attitude=${row.attitude_efforts}, Questions=${row.asking_questions}, Skills=${row.application_skills}, Feedback=${row.application_feedback}`);
        console.log(`   - Created: ${new Date(row.created_at).toLocaleString()}`);
      });
    }

    // 7. Check attendance by week
    const weeklyResult = await db.query(`
      SELECT 
        DATE_TRUNC('week', cs.session_date) as week_start,
        COUNT(*) as attendance_count,
        COUNT(DISTINCT cs.id) as session_count,
        COUNT(DISTINCT a.student_id) as student_count
      FROM attendances a
      JOIN class_sessions cs ON a.session_id = cs.id
      WHERE cs.session_date >= CURRENT_DATE - INTERVAL '8 weeks'
      GROUP BY week_start
      ORDER BY week_start DESC
    `);
    
    console.log('\n7. Attendance by week (last 8 weeks):');
    weeklyResult.rows.forEach((row: any) => {
      const weekStart = new Date(row.week_start);
      console.log(`   - Week of ${weekStart.toLocaleDateString()}: ${row.attendance_count} records, ${row.session_count} sessions, ${row.student_count} students`);
    });

    // 8. Check for duplicate attendance entries
    const duplicateResult = await db.query(`
      SELECT 
        student_id, 
        session_id, 
        COUNT(*) as duplicate_count
      FROM attendances
      GROUP BY student_id, session_id
      HAVING COUNT(*) > 1
    `);
    
    console.log('\n8. Duplicate attendance entries:');
    if (duplicateResult.rows.length === 0) {
      console.log('   No duplicate entries found (good!)');
    } else {
      console.log(`   Found ${duplicateResult.rows.length} cases of duplicate attendance`);
      duplicateResult.rows.slice(0, 3).forEach((row: any) => {
        console.log(`   - Student ${row.student_id}, Session ${row.session_id}: ${row.duplicate_count} entries`);
      });
    }

  } catch (error) {
    console.error('Error checking attendance data:', error);
  } finally {
    await db.close();
  }
}

// Run the check
checkAttendanceData();