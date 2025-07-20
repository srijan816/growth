const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkFeedbackStructure() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Check parsed_student_feedback table structure
    const columnsQuery = `
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'parsed_student_feedback'
      ORDER BY ordinal_position;
    `;
    const columns = await pool.query(columnsQuery);
    console.log('parsed_student_feedback columns:');
    columns.rows.forEach(row => 
      console.log(`  - ${row.column_name} (${row.data_type})`)
    );
    
    // Check feedback data
    const feedbackQuery = `
      SELECT 
        student_name,
        instructor,
        file_path,
        parsed_at
      FROM parsed_student_feedback
      ORDER BY parsed_at DESC
      LIMIT 10
    `;
    const feedback = await pool.query(feedbackQuery);
    console.log(`\nFound ${feedback.rowCount} feedback entries:`);
    feedback.rows.forEach(row => 
      console.log(`  - ${row.student_name} by ${row.instructor || 'Unknown'} (${row.file_path})`)
    );
    
    // Total count
    const totalQuery = 'SELECT COUNT(DISTINCT student_name) as students, COUNT(*) as total FROM parsed_student_feedback';
    const total = await pool.query(totalQuery);
    console.log(`\nTotal: ${total.rows[0].students} unique students, ${total.rows[0].total} feedback records`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkFeedbackStructure();