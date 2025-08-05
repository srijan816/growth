#!/usr/bin/env tsx

import * as XLSX from 'xlsx';

// Read the Excel file
const workbook = XLSX.readFile('attendance_report.xlsx');

// Check the first sheet's structure
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

console.log('First sheet:', workbook.SheetNames[0]);
console.log('\nFirst few rows and columns:');

// Show first 5 rows, first 20 columns
for (let i = 0; i < 5 && i < data.length; i++) {
  console.log(`Row ${i}:`);
  const row = data[i];
  for (let j = 0; j < 20 && j < row.length; j++) {
    if (row[j] !== undefined && row[j] !== null && row[j] !== '') {
      console.log(`  Col ${j}: ${row[j]}`);
    }
  }
}

// Check how categories are mapped
console.log('\nChecking Unit 10 Lesson 1 columns:');
const headers = data[0];
const categories = data[1];

for (let i = 0; i < headers.length; i++) {
  if (headers[i] && headers[i].toString().includes('Unit 10 Lesson 1')) {
    console.log(`Column ${i}: ${headers[i]}`);
    // Check next 4 columns for categories
    for (let j = 0; j < 4; j++) {
      if (i + j < categories.length) {
        console.log(`  Column ${i + j}: Category = ${categories[i + j]}`);
      }
    }
    break;
  }
}

// Let's also check a student's data for Unit 10 Lesson 1
console.log('\nStudent data for Unit 10 Lesson 1:');
if (data.length > 2) {
  const studentRow = data[2]; // First student
  console.log(`Student: ${studentRow[0]}`);
  
  for (let i = 0; i < headers.length; i++) {
    if (headers[i] && headers[i].toString().includes('Unit 10 Lesson 1')) {
      // Show the 4 values for this unit/lesson
      for (let j = 0; j < 4; j++) {
        if (i + j < categories.length && i + j < studentRow.length) {
          console.log(`  ${categories[i + j]}: ${studentRow[i + j] || 'empty'}`);
        }
      }
      break;
    }
  }
}