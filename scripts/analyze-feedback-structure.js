const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

async function analyzeFeedbackFile(filePath) {
  try {
    const result = await mammoth.extractRawText({ path: filePath });
    const text = result.value;
    
    console.log('\n' + '='.repeat(80));
    console.log(`FILE: ${path.basename(filePath)}`);
    console.log(`PATH: ${filePath.replace(/.*\/data\/Overall\//, 'data/Overall/')}`);
    console.log('='.repeat(80));
    
    // Show first 1500 characters to understand structure
    console.log('\nCONTENT PREVIEW:');
    console.log('-'.repeat(40));
    console.log(text.substring(0, 1500));
    console.log('-'.repeat(40));
    
    // Look for patterns
    const studentMatches = text.match(/Student\s*:?\s*([^\n]+)/gi) || [];
    const studentNameMatches = text.match(/Student Name\s*:?\s*([^\n]+)/gi) || [];
    const motionMatches = text.match(/Motion\s*:?\s*([^\n]+)/gi) || [];
    const topicMatches = text.match(/Topic\s*:?\s*([^\n]+)/gi) || [];
    
    console.log('\nKEY PATTERNS FOUND:');
    if (studentMatches.length > 0) {
      console.log(`- "Student:" delimiter found ${studentMatches.length} times`);
      console.log(`  Examples: ${studentMatches.slice(0, 3).join(', ')}`);
    }
    if (studentNameMatches.length > 0) {
      console.log(`- "Student Name:" delimiter found ${studentNameMatches.length} times`);
      console.log(`  Examples: ${studentNameMatches.slice(0, 3).join(', ')}`);
    }
    if (motionMatches.length > 0) {
      console.log(`- Motion/debate topics found: ${motionMatches.length}`);
    }
    if (topicMatches.length > 0) {
      console.log(`- Topic headers found: ${topicMatches.length}`);
    }
    
    // Count students
    const allStudentDelimiters = [...studentMatches, ...studentNameMatches];
    console.log(`\nTOTAL STUDENTS IN FILE: ${allStudentDelimiters.length}`);
    
  } catch (error) {
    console.error(`Error reading ${filePath}: ${error.message}`);
  }
}

async function main() {
  console.log('ANALYZING SRIJAN\'S FEEDBACK FILE STRUCTURE');
  console.log('='.repeat(80));
  
  // Primary feedback samples
  const primaryFiles = [
    '/Users/tikaram/Downloads/claude-code/student-growth/growth-compass/data/Overall/Primary/Srijan/Friday - 6 - 7.5 - 02IPDEC2402 - PSD I/Unit 7/7.1.docx',
    '/Users/tikaram/Downloads/claude-code/student-growth/growth-compass/data/Overall/Primary/Srijan/Friday - 6 - 7.5 - 02IPDEC2402 - PSD I/Unit 9/9.2.docx',
  ];
  
  // Secondary feedback samples  
  const secondaryFiles = [
    '/Users/tikaram/Downloads/claude-code/student-growth/growth-compass/data/Overall/Secondary/Srijan/Saturday - 3_00 - 4_30 -  01IPDED2404 - PSD I/3.4 - 23rd November.docx',
    '/Users/tikaram/Downloads/claude-code/student-growth/growth-compass/data/Overall/Secondary/Srijan/Saturday - 3_00 - 4_30 -  01IPDED2404 - PSD I/Unit 7/7.2.docx',
  ];
  
  console.log('\nPRIMARY FEEDBACK STRUCTURE:');
  for (const file of primaryFiles) {
    if (fs.existsSync(file)) {
      await analyzeFeedbackFile(file);
    }
  }
  
  console.log('\n\nSECONDARY FEEDBACK STRUCTURE:');
  for (const file of secondaryFiles) {
    if (fs.existsSync(file)) {
      await analyzeFeedbackFile(file);
    }
  }
}

main().catch(console.error);