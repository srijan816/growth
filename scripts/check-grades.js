const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://tikaram@localhost:5432/growth_compass'
});

async function checkGrades() {
  try {
    const result = await pool.query(`
      SELECT DISTINCT grade, COUNT(*) as count 
      FROM students 
      GROUP BY grade 
      ORDER BY grade
    `);
    
    console.log('Grades in database:');
    result.rows.forEach(row => {
      console.log(`Grade ${row.grade}: ${row.count} students`);
    });
    
    // Check secondary students
    const secondaryResult = await pool.query(`
      SELECT name, grade 
      FROM students 
      WHERE name IN ('Henry Cheng', 'Selina Ke')
    `);
    
    console.log('\nHenry and Selina:');
    secondaryResult.rows.forEach(row => {
      console.log(`${row.name}: Grade ${row.grade}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkGrades();