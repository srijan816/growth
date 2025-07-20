const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function testStudentsQuery() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Test the exact query from the API
    const query = `
      WITH student_ratings AS (
        SELECT 
          s.id,
          AVG(
            (COALESCE(a.attitude_efforts, 0) + 
             COALESCE(a.asking_questions, 0) + 
             COALESCE(a.application_skills, 0) + 
             COALESCE(a.application_feedback, 0))::DECIMAL / 4.0
          ) as avg_star_rating,
          COUNT(DISTINCT cs.id) as attended_sessions,
          MAX(cs.session_date) as last_activity_date
        FROM students s
        LEFT JOIN attendances a ON s.id = a.student_id
        LEFT JOIN class_sessions cs ON a.session_id = cs.id
        WHERE a.status = 'present'
        GROUP BY s.id
      ),
      student_makeups AS (
        SELECT 
          s.id,
          COUNT(*) as makeup_count
        FROM students s
        LEFT JOIN attendances a ON s.id = a.student_id
        LEFT JOIN class_sessions cs ON a.session_id = cs.id
        WHERE a.status = 'absent' 
        AND cs.session_date < CURRENT_DATE
        GROUP BY s.id
      )
      SELECT 
        s.id,
        s.student_number as student_id_external,
        s.name,
        s.grade_level as grade,
        s.school,
        COUNT(DISTINCT e.course_id) as course_count,
        COUNT(DISTINCT pf.id) as feedback_count,
        ARRAY_AGG(DISTINCT c.course_code) FILTER (WHERE c.course_code IS NOT NULL) as course_codes,
        ARRAY_AGG(DISTINCT c.course_name) FILTER (WHERE c.course_name IS NOT NULL) as course_names,
        MAX(pf.parsed_at) as last_feedback_date,
        COALESCE(sr.avg_star_rating, 3.0) as star_average,
        COALESCE(sr.attended_sessions, 0) as attended_sessions,
        COALESCE(sr.last_activity_date, CURRENT_DATE) as last_activity,
        COALESCE(sm.makeup_count, 0) as makeup_count,
        CASE 
          WHEN s.grade_level LIKE '%Grade%' THEN
            CASE 
              WHEN CAST(REGEXP_REPLACE(s.grade_level, '[^0-9]', '', 'g') AS INTEGER) <= 6 THEN 'primary'
              ELSE 'secondary'
            END
          ELSE 'secondary'
        END as level
      FROM students s
      LEFT JOIN enrollments e ON s.id = e.student_id
      LEFT JOIN courses c ON e.course_id = c.id
      LEFT JOIN parsed_student_feedback pf ON s.id = pf.student_id
      LEFT JOIN student_ratings sr ON s.id = sr.id
      LEFT JOIN student_makeups sm ON s.id = sm.id
      GROUP BY s.id, s.student_number, s.name, s.grade_level, s.school, 
               sr.avg_star_rating, sr.attended_sessions, sr.last_activity_date, sm.makeup_count
      ORDER BY s.name
    `;
    
    console.log('Running students query...');
    const result = await pool.query(query);
    
    console.log(`\nFound ${result.rows.length} students`);
    
    // Show first 5 students
    console.log('\nFirst 5 students:');
    result.rows.slice(0, 5).forEach(row => {
      console.log(`- ${row.name || 'NO NAME'} (${row.student_id_external})`);
      console.log(`  Grade: ${row.grade || 'Unknown'}`);
      console.log(`  Courses: ${row.course_codes?.join(', ') || 'None'}`);
      console.log(`  Feedback count: ${row.feedback_count}`);
    });
    
  } catch (error) {
    console.error('Query failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await pool.end();
  }
}

testStudentsQuery();