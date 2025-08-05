#!/usr/bin/env tsx

import { db } from '../src/lib/postgres';

async function checkSchema() {
  console.log('🔍 Checking class_sessions table schema...');
  
  const schemaQuery = `
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = 'class_sessions'
    ORDER BY ordinal_position
  `;
  
  const result = await db.query(schemaQuery);
  
  console.log('📋 class_sessions columns:');
  result.rows.forEach(row => {
    console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
  });
  
  process.exit(0);
}

if (require.main === module) {
  checkSchema();
}
