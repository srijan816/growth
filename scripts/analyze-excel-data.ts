#!/usr/bin/env tsx

import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

function analyzeExcelData() {
  console.log('📊 Analyzing Excel Data Structure\n');
  
  try {
    // Read both Excel files
    const firstPath = path.join(__dirname, '../data/Srijan/first.xlsx');
    const secondPath = path.join(__dirname, '../data/Srijan/second.xlsx');
    
    // Analyze first.xlsx
    if (fs.existsSync(firstPath)) {
      console.log('1️⃣ Analyzing first.xlsx:');
      const firstWorkbook = XLSX.readFile(firstPath);
      
      console.log(`   Sheet names: ${Object.keys(firstWorkbook.Sheets).join(', ')}`);
      
      // Look at Courses sheet
      if (firstWorkbook.Sheets['Courses']) {
        const coursesData = XLSX.utils.sheet_to_json(firstWorkbook.Sheets['Courses'], { header: 1 }) as any[][];
        console.log('\n   Courses sheet:');
        console.log(`   Headers: ${coursesData[0]?.join(' | ')}`);
        console.log(`   Sample rows:`);
        for (let i = 1; i < Math.min(5, coursesData.length); i++) {
          console.log(`   Row ${i}: ${coursesData[i]?.slice(0, 8).join(' | ')}`);
        }
      }
    }
    
    // Analyze second.xlsx
    if (fs.existsSync(secondPath)) {
      console.log('\n2️⃣ Analyzing second.xlsx:');
      const secondWorkbook = XLSX.readFile(secondPath);
      
      const sheetNames = Object.keys(secondWorkbook.Sheets);
      console.log(`   Total sheets: ${sheetNames.length}`);
      console.log(`   Sheet names: ${sheetNames.slice(0, 5).join(', ')}...`);
      
      // Analyze structure of each sheet
      console.log('\n   Sheet structures:');
      
      for (const sheetName of sheetNames.slice(0, 3)) {
        console.log(`\n   Sheet: ${sheetName}`);
        const sheet = secondWorkbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        if (data.length > 0) {
          console.log(`   Rows: ${data.length}`);
          console.log(`   Headers: ${data[0]?.join(' | ')}`);
          
          // Show a few sample rows
          for (let i = 1; i < Math.min(4, data.length); i++) {
            const row = data[i];
            if (row && row.length > 0) {
              console.log(`   Row ${i}:`);
              for (let j = 0; j < Math.min(9, row.length); j++) {
                console.log(`     Col ${j}: ${row[j]}`);
              }
            }
          }
        }
      }
      
      // Count unique students across all sheets
      console.log('\n3️⃣ Student Data Analysis:');
      
      const allStudentIds = new Set<string>();
      const studentDataMap = new Map<string, any>();
      
      for (const sheetName of sheetNames) {
        const sheet = secondWorkbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
        
        // Skip header row
        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || row.length < 2) continue;
          
          // Try to find student ID in different positions
          let studentId = '';
          let studentName = '';
          
          // Check if first column is a number (row number)
          if (typeof row[0] === 'number' && row[1]) {
            studentId = row[1].toString();
            studentName = row[2]?.toString() || '';
          } else if (row[0] && typeof row[0] === 'string') {
            studentId = row[0];
            studentName = row[1]?.toString() || '';
          }
          
          // Skip invalid entries
          if (!studentId || studentId === 'Student ID' || studentId.includes('Student')) continue;
          
          allStudentIds.add(studentId);
          
          if (!studentDataMap.has(studentId)) {
            studentDataMap.set(studentId, {
              id: studentId,
              name: studentName,
              appearances: []
            });
          }
          
          studentDataMap.get(studentId)!.appearances.push(sheetName);
        }
      }
      
      console.log(`   Total unique students found: ${allStudentIds.size}`);
      console.log(`\n   Sample students:`);
      
      let count = 0;
      for (const [id, data] of studentDataMap) {
        if (count++ >= 10) break;
        console.log(`   ${id}: "${data.name}" (in ${data.appearances.length} courses)`);
      }
    }
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  }
}

// Run analysis
analyzeExcelData();