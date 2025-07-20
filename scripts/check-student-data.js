const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkStudentData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    console.log('=== Checking Student Data ===\n');
    
    // Check users table (where student names might be stored)
    const usersQuery = `
      SELECT id, name, email, role
      FROM users
      WHERE role = 'student'
      ORDER BY name
      LIMIT 10
    `;
    const users = await pool.query(usersQuery);
    console.log(`Found ${users.rowCount} student users in users table:`);
    users.rows.forEach(row => 
      console.log(`  - ${row.name || 'NO NAME'} (${row.email || 'NO EMAIL'})`)
    );
    
    // Check if there's a link between users and students
    const linkedStudentsQuery = `
      SELECT s.*, u.name as user_name, u.email as user_email
      FROM students s
      LEFT JOIN users u ON u.id = s.id OR u.email = s.email
      WHERE u.name IS NOT NULL
      LIMIT 10
    `;
    const linkedStudents = await pool.query(linkedStudentsQuery);
    console.log(`\nFound ${linkedStudents.rowCount} students linked to users:`);
    linkedStudents.rows.forEach(row => 
      console.log(`  - ${row.user_name} (Student ID: ${row.student_number})`)
    );
    
    // Check parsed feedback
    const feedbackQuery = `
      SELECT 
        pf.student_name,
        pf.instructor_name,
        pf.parsed_at,
        COUNT(*) as feedback_count
      FROM parsed_student_feedback pf
      GROUP BY pf.student_name, pf.instructor_name, pf.parsed_at
      ORDER BY pf.parsed_at DESC
      LIMIT 10
    `;
    const feedback = await pool.query(feedbackQuery);
    console.log(`\nFound ${feedback.rowCount} unique student feedback entries:`);
    feedback.rows.forEach(row => 
      console.log(`  - ${row.student_name} by ${row.instructor_name} (${new Date(row.parsed_at).toLocaleDateString()})`)
    );
    
    // Check total feedback count
    const totalFeedbackQuery = 'SELECT COUNT(*) as total FROM parsed_student_feedback';
    const totalFeedback = await pool.query(totalFeedbackQuery);
    console.log(`\nTotal feedback records: ${totalFeedback.rows[0].total}`);
    
    // Check if student names are in parsed_student_feedback but not in students table
    const orphanedFeedbackQuery = `
      SELECT DISTINCT pf.student_name
      FROM parsed_student_feedback pf
      LEFT JOIN students s ON s.name = pf.student_name
      WHERE s.id IS NULL
      LIMIT 10
    `;
    const orphanedFeedback = await pool.query(orphanedFeedbackQuery);
    console.log(`\nStudent names in feedback but not in students table: ${orphanedFeedback.rowCount}`);
    orphanedFeedback.rows.forEach(row => 
      console.log(`  - ${row.student_name}`)
    );
    
  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    await pool.end();
  }
}

checkStudentData();