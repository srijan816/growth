const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkMissingStudents() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Count students in different tables
    console.log('=== Student Count Analysis ===\n');
    
    // Students table
    const studentsCount = await pool.query('SELECT COUNT(*) as count FROM students');
    console.log(`Students table: ${studentsCount.rows[0].count} records`);
    
    // Users table with student role
    const usersCount = await pool.query("SELECT COUNT(*) as count FROM users WHERE role = 'student'");
    console.log(`Users table (role=student): ${usersCount.rows[0].count} records`);
    
    // Unique students in feedback
    const feedbackCount = await pool.query('SELECT COUNT(DISTINCT student_name) as count FROM parsed_student_feedback');
    console.log(`Unique students in feedback: ${feedbackCount.rows[0].count} records`);
    
    // Find students in feedback but not in students table
    const missingQuery = `
      SELECT DISTINCT pf.student_name, COUNT(*) as feedback_count
      FROM parsed_student_feedback pf
      WHERE NOT EXISTS (
        SELECT 1 FROM students s WHERE s.name = pf.student_name
      )
      GROUP BY pf.student_name
      ORDER BY pf.student_name
      LIMIT 20
    `;
    const missing = await pool.query(missingQuery);
    console.log(`\nStudents in feedback but NOT in students table: ${missing.rowCount} (showing first 20)`);
    missing.rows.forEach(row => 
      console.log(`  - ${row.student_name} (${row.feedback_count} feedback records)`)
    );
    
    // Count total missing
    const totalMissingQuery = `
      SELECT COUNT(DISTINCT pf.student_name) as count
      FROM parsed_student_feedback pf
      WHERE NOT EXISTS (
        SELECT 1 FROM students s WHERE s.name = pf.student_name
      )
    `;
    const totalMissing = await pool.query(totalMissingQuery);
    console.log(`\nTotal missing students: ${totalMissing.rows[0].count}`);
    
    // Check if these missing students exist in users table
    const inUsersQuery = `
      SELECT COUNT(DISTINCT pf.student_name) as count
      FROM parsed_student_feedback pf
      WHERE NOT EXISTS (
        SELECT 1 FROM students s WHERE s.name = pf.student_name
      )
      AND EXISTS (
        SELECT 1 FROM users u WHERE u.name = pf.student_name AND u.role = 'student'
      )
    `;
    const inUsers = await pool.query(inUsersQuery);
    console.log(`Missing students that ARE in users table: ${inUsers.rows[0].count}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkMissingStudents();