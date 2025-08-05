import { Client } from 'pg';
import XLSX from 'xlsx';

async function debugAttendanceImport() {
  const client = new Client({ connectionString: 'postgresql://tikaram@localhost:5432/growth_compass' });
  
  try {
    await client.connect();
    console.log('=== DEBUGGING ATTENDANCE IMPORT ===\n');
    
    // Load Excel file
    const workbook = XLSX.readFile('./attendance_report.xlsx');
    
    // Check first sheet in detail
    const firstSheetName = workbook.SheetNames[0];
    console.log(`Analyzing sheet: ${firstSheetName}`);
    
    const sheet = workbook.Sheets[firstSheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    console.log(`Sheet has ${data.length} rows`);
    
    // Show first few rows
    console.log('\nFirst 5 rows:');
    for (let i = 0; i < Math.min(5, data.length); i++) {
      console.log(`Row ${i}:`, data[i].slice(0, 5)); // First 5 columns
    }
    
    // Check if it matches expected format
    if (data.length >= 3) {
      console.log('\nHeader row (row 1):', data[1]);
      
      // Look for unit/lesson headers
      const headers = data[1];
      console.log('\nUnit/Lesson columns:');
      for (let i = 0; i < headers.length; i++) {
        const header = headers[i];
        if (header && header.toString().includes('Unit')) {
          console.log(`Column ${i}: ${header}`);
        }
      }
      
      // Check student data
      console.log('\nStudent data (first non-header row):');
      if (data[2]) {
        console.log('Student name:', data[2][0]);
        console.log('Category:', data[2][1]);
        console.log('First few ratings:', data[2].slice(2, 6));
      }
    }
    
    // Check if we're missing data in the expected format
    console.log('\n=== ALTERNATIVE CHECK ===');
    
    // Try reading as JSON to see structure
    const jsonData = XLSX.utils.sheet_to_json(sheet);
    if (jsonData.length > 0) {
      console.log('First row as JSON:', jsonData[0]);
      console.log('Keys:', Object.keys(jsonData[0]));
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

debugAttendanceImport().catch(console.error);