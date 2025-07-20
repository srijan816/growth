const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function checkDatabaseState() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    console.log('=== Checking Database State ===\n');
    
    // Check if tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `;
    const tables = await pool.query(tablesQuery);
    console.log('Existing tables:');
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));
    
    // Check if attendances table exists and its columns
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'attendances'
      ORDER BY ordinal_position;
    `;
    const columns = await pool.query(columnsQuery);
    console.log('\nAttendances table columns:');
    columns.rows.forEach(row => 
      console.log(`  - ${row.column_name} (${row.data_type}, nullable: ${row.is_nullable})`)
    );
    
    // Check student count
    const studentCountQuery = 'SELECT COUNT(*) as count FROM students';
    const studentCount = await pool.query(studentCountQuery);
    console.log(`\nTotal students in database: ${studentCount.rows[0].count}`);
    
    // Check first few students
    const studentsQuery = 'SELECT id, name, grade FROM students LIMIT 5';
    const students = await pool.query(studentsQuery);
    console.log('\nFirst few students:');
    students.rows.forEach(row => 
      console.log(`  - ${row.name} (Grade: ${row.grade})`)
    );
    
    // Check migration history
    const migrationsQuery = 'SELECT name, executed_at FROM migrations ORDER BY executed_at DESC LIMIT 10';
    const migrations = await pool.query(migrationsQuery);
    console.log('\nRecent migrations:');
    migrations.rows.forEach(row => 
      console.log(`  - ${row.name} (executed: ${new Date(row.executed_at).toLocaleString()})`)
    );
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    await pool.end();
  }
}

checkDatabaseState();