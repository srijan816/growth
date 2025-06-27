#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { Client } = require('pg');

async function runSingleMigration(filename) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const sqlPath = path.join(__dirname, '..', 'migrations', filename);
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log(`Running migration: ${filename}`);
    
    await client.query('BEGIN');
    await client.query(sql);
    
    // Mark migration as complete
    await client.query(`
      INSERT INTO schema_migrations (version) 
      VALUES ($1) 
      ON CONFLICT (version) DO NOTHING
    `, [filename]);
    
    await client.query('COMMIT');
    
    console.log(`✅ Migration ${filename} completed`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the specific migration
if (process.argv.length < 3) {
  console.error('Usage: node run-single-migration.js <migration-file>');
  process.exit(1);
}

runSingleMigration(process.argv[2]);