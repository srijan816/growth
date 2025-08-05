import { db } from '../src/lib/postgres';

async function checkAttendanceStructure() {
  console.log('=== CHECKING ATTENDANCE TABLE STRUCTURE ===\n');

  try {
    // 1. Check if attendances table exists
    const tableExistsResult = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'attendances'
      );
    `);
    console.log(`1. Attendances table exists: ${tableExistsResult.rows[0].exists}`);

    if (!tableExistsResult.rows[0].exists) {
      console.log('\nAttendances table does not exist!');
      
      // Check what tables do exist
      const tablesResult = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name;
      `);
      console.log('\nExisting tables:');
      tablesResult.rows.forEach((row: any) => {
        console.log(`   - ${row.table_name}`);
      });
      
      return;
    }

    // 2. Get column information for attendances table
    const columnsResult = await db.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'attendances'
      ORDER BY ordinal_position;
    `);
    
    console.log('\n2. Attendances table columns:');
    columnsResult.rows.forEach((col: any) => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
    });

    // 3. Check foreign key constraints
    const fkResult = await db.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
        AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'attendances';
    `);
    
    console.log('\n3. Foreign key constraints:');
    if (fkResult.rows.length === 0) {
      console.log('   No foreign key constraints found');
    } else {
      fkResult.rows.forEach((fk: any) => {
        console.log(`   - ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name} (${fk.constraint_name})`);
      });
    }

    // 4. Check indexes
    const indexResult = await db.query(`
      SELECT 
        indexname, 
        indexdef 
      FROM pg_indexes 
      WHERE tablename = 'attendances';
    `);
    
    console.log('\n4. Indexes:');
    indexResult.rows.forEach((idx: any) => {
      console.log(`   - ${idx.indexname}`);
      console.log(`     ${idx.indexdef}`);
    });

    // 5. Check data statistics
    const statsResult = await db.query(`
      SELECT COUNT(*) as total_records FROM attendances;
    `);
    console.log(`\n5. Total records in attendances table: ${statsResult.rows[0].total_records}`);

    // 6. Sample a few records if any exist
    if (statsResult.rows[0].total_records > 0) {
      const sampleResult = await db.query(`
        SELECT * FROM attendances LIMIT 3;
      `);
      console.log('\n6. Sample records:');
      sampleResult.rows.forEach((row: any, index: number) => {
        console.log(`\n   Record ${index + 1}:`);
        Object.entries(row).forEach(([key, value]) => {
          console.log(`     - ${key}: ${value}`);
        });
      });
    }

  } catch (error) {
    console.error('Error checking attendance structure:', error);
  } finally {
    await db.close();
  }
}

// Run the check
checkAttendanceStructure();