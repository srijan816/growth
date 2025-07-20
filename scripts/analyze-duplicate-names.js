const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

// Create connection pool
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'growth_compass',
  user: process.env.POSTGRES_USER || 'tikaram',
  password: process.env.POSTGRES_PASSWORD || ''
});

async function findDuplicateFirstNames() {
  try {
    console.log('Connecting to database...');
    
    // Query to find duplicate first names
    const query = `
      WITH student_names AS (
        SELECT 
          SPLIT_PART(u.name, ' ', 1) as first_name,
          u.name as full_name,
          s.id as student_id
        FROM users u
        JOIN students s ON u.id = s.id
        WHERE u.role = 'student'
      ),
      duplicate_first_names AS (
        SELECT first_name, COUNT(*) as count
        FROM student_names
        GROUP BY first_name
        HAVING COUNT(*) > 1
      )
      SELECT 
        sn.first_name,
        sn.full_name,
        sn.student_id,
        dfn.count as students_with_same_first_name
      FROM student_names sn
      JOIN duplicate_first_names dfn ON sn.first_name = dfn.first_name
      ORDER BY sn.first_name, sn.full_name;
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('\n✅ No duplicate first names found in the database!');
      
      // Show total students count
      const countResult = await pool.query(`
        SELECT COUNT(*) as total 
        FROM users u 
        JOIN students s ON u.id = s.id 
        WHERE u.role = 'student'
      `);
      console.log(`Total students in database: ${countResult.rows[0].total}`);
    } else {
      console.log('\n⚠️  Found students with duplicate first names:\n');
      console.log('='.repeat(70));
      
      let currentFirstName = '';
      result.rows.forEach(row => {
        if (row.first_name !== currentFirstName) {
          currentFirstName = row.first_name;
          console.log(`\n${row.first_name} (${row.students_with_same_first_name} students):`);
        }
        console.log(`  - ${row.full_name} (ID: ${row.student_id})`);
      });
      
      console.log('\n' + '='.repeat(70));
      
      // Summary
      const uniqueFirstNames = [...new Set(result.rows.map(r => r.first_name))];
      console.log(`\nSummary:`);
      console.log(`- Total students with duplicate first names: ${result.rows.length}`);
      console.log(`- Number of duplicate first names: ${uniqueFirstNames.length}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the analysis
console.log('Analyzing student names for duplicates...\n');
findDuplicateFirstNames();