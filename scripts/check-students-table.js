const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkStudentsTable() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Check students table columns
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'students'
      ORDER BY ordinal_position;
    `;
    const columns = await pool.query(columnsQuery);
    console.log('Students table columns:');
    columns.rows.forEach(row => 
      console.log(`  - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`)
    );
    
    // Check first few students with available columns
    const studentsQuery = 'SELECT * FROM students LIMIT 3';
    const students = await pool.query(studentsQuery);
    console.log('\nFirst few students:');
    console.log(JSON.stringify(students.rows, null, 2));
    
  } catch (error) {
    console.error('Error checking students table:', error);
  } finally {
    await pool.end();
  }
}

checkStudentsTable();