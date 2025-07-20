const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function syncStudentNames() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Update students that have matching IDs with users
    const updateQuery1 = `
      UPDATE students s
      SET 
        name = u.name,
        email = u.email
      FROM users u
      WHERE u.id = s.id
      AND u.role = 'student'
      RETURNING s.name;
    `;
    const result1 = await pool.query(updateQuery1);
    console.log(`Updated ${result1.rowCount} students with matching IDs`);
    
    // Also update students based on the users table
    const linkQuery = `
      UPDATE students s
      SET name = subq.name
      FROM (
        SELECT 
          ROW_NUMBER() OVER (ORDER BY u.name) as rn,
          u.name
        FROM users u
        WHERE u.role = 'student'
      ) subq
      WHERE s.student_number = 'S' || LPAD(subq.rn::text, 3, '0')
      AND s.name IS NULL
      RETURNING s.name;
    `;
    const result2 = await pool.query(linkQuery);
    console.log(`Updated ${result2.rowCount} additional students by matching student numbers`);
    
    // Show the results
    const checkQuery = `
      SELECT id, student_number, name, email
      FROM students
      WHERE name IS NOT NULL
      ORDER BY name
      LIMIT 10;
    `;
    const check = await pool.query(checkQuery);
    console.log('\nFirst 10 students with names:');
    check.rows.forEach(row => 
      console.log(`  - ${row.name} (${row.student_number})`)
    );
    
    // Count total
    const countQuery = 'SELECT COUNT(*) as total FROM students WHERE name IS NOT NULL';
    const count = await pool.query(countQuery);
    console.log(`\nTotal students with names: ${count.rows[0].total}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

syncStudentNames();