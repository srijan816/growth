const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function fixMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  try {
    // Check if the class_sessions table already exists
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'class_sessions'
      );
    `;
    const tableExists = await pool.query(checkTableQuery);
    
    if (tableExists.rows[0].exists) {
      console.log('class_sessions table already exists, marking migration as complete...');
      
      // Mark the migration as complete
      const insertQuery = `
        INSERT INTO schema_migrations (version) 
        VALUES ('006_rename_sessions_to_class_sessions.sql')
        ON CONFLICT (version) DO NOTHING;
      `;
      await pool.query(insertQuery);
      console.log('Migration marked as complete');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

fixMigration();