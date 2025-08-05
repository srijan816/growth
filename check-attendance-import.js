import { Client } from 'pg';
import * as XLSX from 'xlsx';
import fs from 'fs';

async function checkAttendanceImport() {
  const client = new Client({ connectionString: 'postgresql://tikaram@localhost:5432/growth_compass' });
  
  try {
    await client.connect();
    console.log('=== CHECKING ATTENDANCE DATA ===\n');
    
    // 1. Check if attendance_report.xlsx exists
    const excelPath = './attendance_report.xlsx';
    if (!fs.existsSync(excelPath)) {
      console.log('❌ attendance_report.xlsx not found!');
      return;
    }
    
    console.log('✓ Found attendance_report.xlsx');
    
    // 2. Read Excel file to see what's inside
    const workbook = XLSX.readFile(excelPath);
    console.log(`\nExcel file contains ${workbook.SheetNames.length} sheets:`);
    workbook.SheetNames.forEach(name => {
      const sheet = workbook.Sheets[name];
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
      const rowCount = range.e.r - range.s.r + 1;
      console.log(`- ${name}: ${rowCount} rows`);
    });
    
    // 3. Check current attendance data in database
    console.log('\n=== DATABASE STATUS ===');
    const attendanceCount = await client.query('SELECT COUNT(*) FROM attendances');
    console.log(`Total attendance records: ${attendanceCount.rows[0].count}`);
    
    // Check if there's any import_source column
    const columns = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'attendances' 
      AND column_name = 'import_source'
    `);
    
    console.log(`Has import_source column: ${columns.rows.length > 0 ? 'Yes' : 'No'}`);
    
    // 4. Check for any recent imports
    const recentAttendance = await client.query(`
      SELECT 
        COUNT(*) as count,
        MIN(created_at) as oldest,
        MAX(created_at) as newest
      FROM attendances
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    `);
    
    const recent = recentAttendance.rows[0];
    if (recent.count > 0) {
      console.log(`\nRecent attendance (last 7 days): ${recent.count} records`);
      console.log(`- Oldest: ${recent.oldest}`);
      console.log(`- Newest: ${recent.newest}`);
    }
    
    // 5. Sample the Excel data
    console.log('\n=== SAMPLE EXCEL DATA ===');
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(firstSheet);
    
    if (data.length > 0) {
      console.log('First row structure:', Object.keys(data[0]));
      console.log('Sample data:', data[0]);
    }
    
    // 6. Check if we need to import
    if (attendanceCount.rows[0].count === '0' && data.length > 0) {
      console.log('\n⚠️  No attendance data in database but Excel file has data!');
      console.log('You should run: npx tsx scripts/import-attendance-data.ts');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkAttendanceImport().catch(console.error);