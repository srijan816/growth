const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function diagnoseDatabaseIssues() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  console.log('=== DATABASE DIAGNOSTIC REPORT ===\n');
  console.log(`Connecting to: ${process.env.DATABASE_URL}\n`);
  
  try {
    // 1. Check PostgreSQL version
    const versionResult = await pool.query('SELECT version()');
    console.log('PostgreSQL Version:');
    console.log(versionResult.rows[0].version);
    console.log();
    
    // 2. Check database creation date
    const dbInfoQuery = `
      SELECT 
        datname,
        pg_database_size(datname) as size_bytes,
        pg_size_pretty(pg_database_size(datname)) as size_pretty,
        (SELECT MIN(created_at) FROM students WHERE created_at IS NOT NULL) as oldest_student,
        (SELECT MAX(created_at) FROM students WHERE created_at IS NOT NULL) as newest_student
      FROM pg_database 
      WHERE datname = current_database()
    `;
    const dbInfo = await pool.query(dbInfoQuery);
    console.log('Database Info:');
    console.log(`  Name: ${dbInfo.rows[0].datname}`);
    console.log(`  Size: ${dbInfo.rows[0].size_pretty}`);
    console.log(`  Oldest student record: ${dbInfo.rows[0].oldest_student || 'N/A'}`);
    console.log(`  Newest student record: ${dbInfo.rows[0].newest_student || 'N/A'}`);
    console.log();
    
    // 3. Check migration history
    console.log('Migration History:');
    try {
      const migrationsQuery = 'SELECT version, applied_at FROM schema_migrations ORDER BY applied_at DESC LIMIT 5';
      const migrations = await pool.query(migrationsQuery);
      migrations.rows.forEach(row => {
        console.log(`  - ${row.version} (applied: ${new Date(row.applied_at).toLocaleString()})`);
      });
    } catch (e) {
      console.log('  No migration history found');
    }
    console.log();
    
    // 4. Check table creation times (PostgreSQL doesn't track this directly, so we'll check table count)
    const tableCountQuery = `
      SELECT COUNT(*) as table_count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `;
    const tableCount = await pool.query(tableCountQuery);
    console.log(`Total tables: ${tableCount.rows[0].table_count}`);
    console.log();
    
    // 5. Check for schema mismatches
    console.log('Schema Verification:');
    const schemaChecks = [
      { table: 'students', expected: ['student_number', 'grade_level'], old: ['student_id_external', 'grade'] },
      { table: 'attendances', expected: ['attitude_efforts', 'asking_questions'], old: ['attitude_rating', 'questions_rating'] },
      { table: 'class_sessions', expected: ['session_date'], old: ['date'] },
      { table: 'courses', expected: ['start_time'], old: ['end_time'] }
    ];
    
    for (const check of schemaChecks) {
      const columnsQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
      `;
      const columns = await pool.query(columnsQuery, [check.table]);
      const columnNames = columns.rows.map(r => r.column_name);
      
      console.log(`\n  Table: ${check.table}`);
      check.expected.forEach(col => {
        if (columnNames.includes(col)) {
          console.log(`    ✓ ${col} exists`);
        } else {
          console.log(`    ✗ ${col} MISSING`);
        }
      });
      check.old.forEach(col => {
        if (columnNames.includes(col)) {
          console.log(`    ⚠️  ${col} (old column) still exists`);
        }
      });
    }
    
    // 6. Check for any active connections
    const connectionsQuery = `
      SELECT count(*) as connection_count 
      FROM pg_stat_activity 
      WHERE datname = current_database()
    `;
    const connections = await pool.query(connectionsQuery);
    console.log(`\nActive connections: ${connections.rows[0].connection_count}`);
    
  } catch (error) {
    console.error('Diagnostic error:', error.message);
  } finally {
    await pool.end();
  }
}

diagnoseDatabaseIssues();