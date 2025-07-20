#!/usr/bin/env node

/**
 * Script to import all feedback files from the data/Overall directory
 * This will parse and store all .docx files in the database
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN; // You'll need to set this

const feedbackDir = path.join(__dirname, '..', 'data', 'Overall');

// Find all .docx files recursively
function findDocxFiles(dir, files = []) {
  const items = fs.readdirSync(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      findDocxFiles(fullPath, files);
    } else if (item.endsWith('.docx') && !item.startsWith('~$')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

// Extract instructor name from file path
function getInstructorFromPath(filePath) {
  const relativePath = path.relative(feedbackDir, filePath);
  const parts = relativePath.split(path.sep);
  
  // Look for instructor names in known locations
  if (parts[0] === 'Primary' || parts[0] === 'Secondary') {
    // Format: Primary/InstructorName/...
    if (parts[1] && parts[1] !== 'Intensives' && parts[1] !== 'Clearing') {
      return parts[1];
    }
    // Format: Primary/Intensives/... or Primary/Clearing/...
    // These are general files, assign to Test Instructor
    return 'Test Instructor';
  }
  
  return 'Unknown';
}

// Main function
async function importAllFeedback() {
  console.log('🔍 Scanning for feedback files...');
  
  const docxFiles = findDocxFiles(feedbackDir);
  console.log(`📁 Found ${docxFiles.length} feedback files\n`);
  
  // Group files by instructor
  const filesByInstructor = {};
  for (const file of docxFiles) {
    const instructor = getInstructorFromPath(file);
    if (!filesByInstructor[instructor]) {
      filesByInstructor[instructor] = [];
    }
    filesByInstructor[instructor].push(file);
  }
  
  // Display summary
  console.log('📊 Files by instructor:');
  for (const [instructor, files] of Object.entries(filesByInstructor)) {
    console.log(`   ${instructor}: ${files.length} files`);
  }
  console.log('');
  
  // Show sample files
  console.log('📄 Sample files to be imported:');
  const sampleFiles = docxFiles.slice(0, 10);
  for (const file of sampleFiles) {
    const relativePath = path.relative(feedbackDir, file);
    const instructor = getInstructorFromPath(file);
    console.log(`   [${instructor}] ${relativePath}`);
  }
  if (docxFiles.length > 10) {
    console.log(`   ... and ${docxFiles.length - 10} more files`);
  }
  console.log('');
  
  // Instructions for importing
  console.log('📝 To import these files:');
  console.log('');
  console.log('1. Start your development server:');
  console.log('   npm run dev');
  console.log('');
  console.log('2. Sign in as an admin/instructor at:');
  console.log('   http://localhost:3000/auth/signin');
  console.log('');
  console.log('3. Navigate to the admin page:');
  console.log('   http://localhost:3000/dashboard/admin');
  console.log('');
  console.log('4. Use the "File Upload" section to:');
  console.log('   - Select multiple .docx files at once');
  console.log('   - Choose the appropriate instructor');
  console.log('   - Click "Upload Files"');
  console.log('');
  console.log('5. Files will be automatically:');
  console.log('   - Parsed for student names and feedback');
  console.log('   - Stored in the database');
  console.log('   - Made available for analysis');
  console.log('');
  console.log('💡 Tip: You can select and upload multiple files at once!');
  console.log('');
  
  // Create a batch upload helper
  console.log('📦 Creating batch upload lists...');
  
  for (const [instructor, files] of Object.entries(filesByInstructor)) {
    const listFile = path.join(__dirname, `feedback-list-${instructor.toLowerCase().replace(/\s+/g, '-')}.txt`);
    const fileList = files.map(f => path.relative(feedbackDir, f)).join('\n');
    fs.writeFileSync(listFile, fileList);
    console.log(`   Created: ${listFile} (${files.length} files)`);
  }
  
  console.log('');
  console.log('✅ Analysis complete! Follow the instructions above to import the feedback.');
}

// Run the script
importAllFeedback().catch(console.error);