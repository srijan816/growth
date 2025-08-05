#!/usr/bin/env tsx

import { db } from '../src/lib/postgres';

async function verifyAttendanceData() {
  try {
    console.log('🔍 Verifying attendance data import...\n');

    // Check total attendance records
    const totalQuery = `
      SELECT COUNT(*) as total_records
      FROM attendances
      WHERE import_source = 'excel_import'
    `;
    const totalResult = await db.query(totalQuery);
    console.log(`📊 Total imported attendance records: ${totalResult.rows[0].total_records}`);

    // Check attendance by course
    const courseQuery = `
      SELECT 
        c.code as course_code,
        c.name as course_name,
        COUNT(a.id) as attendance_count,
        COUNT(DISTINCT a.student_id) as unique_students,
        AVG(a.attitude_efforts) as avg_attitude_efforts,
        AVG(a.asking_questions) as avg_asking_questions,
        AVG(a.application_skills) as avg_application_skills,
        AVG(a.application_feedback) as avg_application_feedback
      FROM attendances a
      JOIN class_sessions cs ON cs.id = a.session_id
      JOIN courses c ON c.id = cs.course_id
      WHERE a.import_source = 'excel_import'
      GROUP BY c.id, c.code, c.name
      ORDER BY attendance_count DESC
    `;
    const courseResult = await db.query(courseQuery);
    
    console.log('\n📚 Attendance by Course:');
    courseResult.rows.forEach(row => {
      console.log(`  ${row.course_code}: ${row.attendance_count} records, ${row.unique_students} students`);
      console.log(`    Avg Ratings - Attitude: ${parseFloat(row.avg_attitude_efforts || 0).toFixed(1)}, Questions: ${parseFloat(row.avg_asking_questions || 0).toFixed(1)}, Skills: ${parseFloat(row.avg_application_skills || 0).toFixed(1)}, Feedback: ${parseFloat(row.avg_application_feedback || 0).toFixed(1)}`);
    });

    // Check sample student data
    const studentQuery = `
      SELECT 
        u.name as student_name,
        COUNT(a.id) as attendance_count,
        AVG((COALESCE(a.attitude_efforts, 0) + COALESCE(a.asking_questions, 0) + 
             COALESCE(a.application_skills, 0) + COALESCE(a.application_feedback, 0)) / 4) as avg_overall_rating
      FROM attendances a
      JOIN users u ON u.id = a.student_id
      WHERE a.import_source = 'excel_import'
      GROUP BY u.id, u.name
      ORDER BY attendance_count DESC
      LIMIT 10
    `;
    const studentResult = await db.query(studentQuery);
    
    console.log('\n👥 Top Students by Attendance Records:');
    studentResult.rows.forEach(row => {
      console.log(`  ${row.student_name}: ${row.attendance_count} sessions, avg rating: ${parseFloat(row.avg_overall_rating || 0).toFixed(1)}/4.0`);
    });

    // Check class sessions created
    const sessionQuery = `
      SELECT
        COUNT(*) as total_sessions,
        COUNT(DISTINCT course_id) as unique_courses,
        MIN(CASE WHEN unit_number ~ '^[0-9]+$' THEN unit_number::int END) as min_unit,
        MAX(CASE WHEN unit_number ~ '^[0-9]+$' THEN unit_number::int END) as max_unit,
        MIN(CASE WHEN lesson_number ~ '^[0-9]+$' THEN lesson_number::int END) as min_lesson,
        MAX(CASE WHEN lesson_number ~ '^[0-9]+$' THEN lesson_number::int END) as max_lesson
      FROM class_sessions
      WHERE unit_number IS NOT NULL AND lesson_number IS NOT NULL
    `;
    const sessionResult = await db.query(sessionQuery);
    
    console.log('\n📅 Class Sessions Created:');
    const session = sessionResult.rows[0];
    console.log(`  Total sessions: ${session.total_sessions}`);
    console.log(`  Unique courses: ${session.unique_courses}`);
    console.log(`  Unit range: ${session.min_unit} - ${session.max_unit}`);
    console.log(`  Lesson range: ${session.min_lesson} - ${session.max_lesson}`);

    // Sample detailed records
    const sampleQuery = `
      SELECT 
        u.name as student_name,
        c.code as course_code,
        cs.unit_number,
        cs.lesson_number,
        a.attitude_efforts,
        a.asking_questions,
        a.application_skills,
        a.application_feedback,
        cs.session_date
      FROM attendances a
      JOIN users u ON u.id = a.student_id
      JOIN class_sessions cs ON cs.id = a.session_id
      JOIN courses c ON c.id = cs.course_id
      WHERE a.import_source = 'excel_import'
        AND a.attitude_efforts IS NOT NULL
      ORDER BY cs.session_date DESC, u.name
      LIMIT 5
    `;
    const sampleResult = await db.query(sampleQuery);
    
    console.log('\n📝 Sample Attendance Records:');
    sampleResult.rows.forEach(row => {
      console.log(`  ${row.student_name} - ${row.course_code} Unit ${row.unit_number} Lesson ${row.lesson_number}`);
      console.log(`    Ratings: Attitude=${row.attitude_efforts}, Questions=${row.asking_questions}, Skills=${row.application_skills}, Feedback=${row.application_feedback}`);
    });

    // Check for any data quality issues
    const qualityQuery = `
      SELECT 
        COUNT(*) as records_with_null_ratings,
        COUNT(CASE WHEN attitude_efforts IS NULL AND asking_questions IS NULL AND 
                        application_skills IS NULL AND application_feedback IS NULL THEN 1 END) as completely_null_records
      FROM attendances
      WHERE import_source = 'excel_import'
    `;
    const qualityResult = await db.query(qualityQuery);
    
    console.log('\n⚠️  Data Quality Check:');
    const quality = qualityResult.rows[0];
    console.log(`  Records with some null ratings: ${quality.records_with_null_ratings}`);
    console.log(`  Records with all null ratings: ${quality.completely_null_records}`);

    console.log('\n✅ Verification completed successfully!');

  } catch (error) {
    console.error('❌ Error during verification:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  verifyAttendanceData();
}
