#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const { Client } = require('pg');

const MIGRATIONS_TABLE = 'schema_migrations';

async function runMigrations() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        version VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get list of executed migrations
    const result = await client.query(`SELECT version FROM ${MIGRATIONS_TABLE} ORDER BY version`);
    const executedMigrations = new Set(result.rows.map(row => row.version));

    // Get all migration files
    const migrationsDir = path.join(__dirname);
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration files`);

    // Execute pending migrations
    for (const file of files) {
      if (!executedMigrations.has(file)) {
        console.log(`Running migration: ${file}`);
        
        const sqlPath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(sqlPath, 'utf8');
        
        try {
          await client.query('BEGIN');
          await client.query(sql);
          await client.query(`INSERT INTO ${MIGRATIONS_TABLE} (version) VALUES ($1)`, [file]);
          await client.query('COMMIT');
          
          console.log(`✅ Migration ${file} completed`);
        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`❌ Migration ${file} failed:`, error.message);
          throw error;
        }
      } else {
        console.log(`⏭️  Skipping migration ${file} (already executed)`);
      }
    }

    console.log('All migrations completed successfully');

  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run migrations if called directly
if (require.main === module) {
  runMigrations();
}

module.exports = { runMigrations };