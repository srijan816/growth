import { Client } from 'pg';
import XLSX from 'xlsx';

async function debugAttendanceParsing() {
  const client = new Client({ connectionString: 'postgresql://tikaram@localhost:5432/growth_compass' });
  
  try {
    await client.connect();
    console.log('=== DEBUGGING ATTENDANCE EXCEL PARSING ===\n');
    
    // Load Excel file
    const workbook = XLSX.readFile('./attendance_report.xlsx');
    
    // Check specific sheet for 02OPDEC2401
    const targetSheet = workbook.SheetNames.find(name => name.includes('02OPDEC2401'));
    console.log(`Looking for sheet with 02OPDEC2401...`);
    console.log(`Found: ${targetSheet || 'NOT FOUND'}`);
    
    if (!targetSheet) {
      console.log('\nAll sheet names:');
      workbook.SheetNames.forEach(name => console.log(`- ${name}`));
      return;
    }
    
    // Parse the sheet
    const sheet = workbook.Sheets[targetSheet];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    
    console.log(`\nSheet "${targetSheet}" has ${data.length} rows`);
    
    // Show structure
    console.log('\nFirst 10 rows structure:');
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (Array.isArray(row) && row.length > 0) {
        console.log(`Row ${i}: [${row[0]}] [${row[1]}] ... (${row.length} columns)`);
      }
    }
    
    // Look for student names
    console.log('\n=== EXTRACTING STUDENTS ===');
    const students = new Set();
    
    for (let rowIndex = 2; rowIndex < data.length; rowIndex++) {
      const row = data[rowIndex];
      if (!row || !Array.isArray(row)) continue;
      
      const col0 = row[0]?.toString().trim();
      const col1 = row[1]?.toString().trim();
      
      if (!col0) continue;
      
      // Check if this looks like a student row
      if (col1 && (
        col1.includes('Application') || 
        col1.includes('Attitude') || 
        col1.includes('Asking') || 
        col1.includes('Skills')
      )) {
        students.add(col0);
        console.log(`Found student: ${col0} (category: ${col1})`);
      }
    }
    
    console.log(`\nTotal unique students found: ${students.size}`);
    
    // Check if these students exist in database
    console.log('\n=== CHECKING DATABASE MATCHES ===');
    
    for (const studentName of students) {
      const normalized = studentName.toLowerCase().replace(/[^\\w\\s]/g, '').replace(/\\s+/g, ' ').trim();
      
      const result = await client.query(`
        SELECT s.id, u.name, s.student_number
        FROM students s
        JOIN users u ON s.id = u.id
        WHERE LOWER(REPLACE(u.name, ' ', '')) = LOWER(REPLACE($1, ' ', ''))
           OR LOWER(u.name) = LOWER($1)
      `, [studentName]);
      
      if (result.rows.length > 0) {
        console.log(`✓ ${studentName} -> ${result.rows[0].name} (${result.rows[0].student_number})`);
      } else {
        console.log(`✗ ${studentName} -> NOT FOUND IN DATABASE`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

debugAttendanceParsing().catch(console.error);