const { Pool } = require('pg');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: 'postgresql://tikaram@localhost:5432/growth_compass'
});

// Extract class code from file path
function extractClassCode(filePath) {
  const match = filePath.match(/\b(\d{2}[A-Z]{5}\d{4})\b/);
  return match ? match[1] : 'UNKNOWN';
}

// Extract all feedback for a student with improved motion detection
async function extractStudentFeedback(filePath, studentName) {
  try {
    const [htmlResult, textResult] = await Promise.all([
      mammoth.convertToHtml({ path: filePath }),
      mammoth.extractRawText({ path: filePath })
    ]);
    
    const html = htmlResult.value;
    const text = textResult.value;
    
    // Try multiple patterns for finding student names
    const patterns = [
      `Student Name: ${studentName}`,
      `Student Name: </strong>${studentName}`,
      `<strong>Student Name: </strong>${studentName}`,
      `Student Name:</strong> ${studentName}`
    ];
    
    let studentHtmlIndex = -1;
    for (const pattern of patterns) {
      studentHtmlIndex = html.indexOf(pattern);
      if (studentHtmlIndex >= 0) break;
    }
    
    if (studentHtmlIndex === -1) return null;
    
    // Find the next student or end
    const nextPatterns = ['Student Name:', '<strong>Student Name:', 'Student Name:</strong>'];
    let nextStudentIndex = -1;
    for (const pattern of nextPatterns) {
      const idx = html.indexOf(pattern, studentHtmlIndex + 20);
      if (idx > 0 && (nextStudentIndex === -1 || idx < nextStudentIndex)) {
        nextStudentIndex = idx;
      }
    }
    
    const endIndex = nextStudentIndex > 0 ? nextStudentIndex : html.length;
    const studentHtml = html.substring(studentHtmlIndex, endIndex);
    
    // Extract motion - NEW IMPROVED LOGIC
    let motion = null;
    
    // Debug: Show the HTML around student name
    console.log('\n--- HTML Section for', studentName, '---');
    const debugSection = studentHtml.substring(0, 500);
    console.log(debugSection);
    console.log('--- End HTML Section ---\n');
    
    // Pattern 1: Look for table cell after student name
    const tablePattern1 = new RegExp(`${studentName}[^<]*<\/(?:td|th|p)>\\s*<(?:td|th|p)[^>]*>([^<]+)<\/(?:td|th|p)>`, 'i');
    const tableMatch1 = studentHtml.match(tablePattern1);
    if (tableMatch1) {
      motion = tableMatch1[1].trim();
      console.log('Motion found with Pattern 1:', motion);
    }
    
    // Pattern 2: Look for next table cell in same row
    if (!motion) {
      const tablePattern2 = /<\/td>\s*<td[^>]*>([^<]+)<\/td>/i;
      const nameIndex = studentHtml.indexOf(studentName);
      if (nameIndex >= 0) {
        const afterName = studentHtml.substring(nameIndex);
        const tableMatch2 = afterName.match(tablePattern2);
        if (tableMatch2) {
          motion = tableMatch2[1].trim();
          console.log('Motion found with Pattern 2:', motion);
        }
      }
    }
    
    // Pattern 3: Look for any text in a table cell after the name
    if (!motion) {
      // Find closing tag after name
      const nameEnd = studentHtml.indexOf(studentName) + studentName.length;
      const afterNameHtml = studentHtml.substring(nameEnd, nameEnd + 200);
      
      // Look for table cell content
      const cellMatch = afterNameHtml.match(/<td[^>]*>([^<]+)<\/td>/);
      if (cellMatch && cellMatch[1].trim().length > 10) {
        motion = cellMatch[1].trim();
        console.log('Motion found with Pattern 3:', motion);
      }
    }
    
    // Pattern 4: Look for labeled motion
    if (!motion) {
      const motionMatch = studentHtml.match(/Motion[:<\/strong>]*\s*([^<]+)/i);
      if (motionMatch) {
        motion = motionMatch[1].trim();
        console.log('Motion found with Pattern 4 (labeled):', motion);
      }
    }
    
    // Pattern 5: Extract from plain text
    if (!motion) {
      const textIndex = text.indexOf(studentName);
      if (textIndex >= 0) {
        const afterNameText = text.substring(textIndex + studentName.length);
        const lines = afterNameText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        
        // Debug text extraction
        console.log('Text lines after name:');
        lines.slice(0, 5).forEach((line, i) => {
          console.log(`  ${i}: ${line.substring(0, 80)}${line.length > 80 ? '...' : ''}`);
        });
        
        if (lines.length > 0 && lines[0].length > 10 && !lines[0].includes('Teacher comments')) {
          motion = lines[0];
          console.log('Motion found with Pattern 5 (text):', motion);
        }
      }
    }
    
    // Extract unit/lesson from file path
    const unitMatch = path.basename(filePath).match(/(\d+)\.(\d+)/);
    const unit = unitMatch ? unitMatch[1] : '0';
    const lesson = unitMatch ? unitMatch[2] : '0';
    
    console.log(`File: ${path.basename(filePath)} - Unit ${unit}.${lesson}`);
    console.log(`Final motion: ${motion || 'NOT FOUND'}`);
    
    return {
      studentName,
      motion,
      unit,
      lesson,
      filePath
    };
    
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);
    return null;
  }
}

// Test with a few files
async function testMotionExtraction() {
  try {
    console.log('Testing motion extraction...\n');
    
    const baseDir = '/Users/tikaram/Downloads/claude-code/student-growth/growth-compass/data/Overall/Secondary/Srijan';
    
    // Get a few sample files
    const testFiles = [
      `${baseDir}/Saturday - 3_00 - 4_30 -  01IPDED2404 - PSD I/Unit 8/8.1 - April 5.docx`,
      `${baseDir}/Saturday - 3_00 - 4_30 -  01IPDED2404 - PSD I/Unit 8/8.2.docx`,
      `${baseDir}/Saturday - 3_00 - 4_30 -  01IPDED2404 - PSD I/Unit 7/7.1.docx`
    ];
    
    // Test for Henry
    console.log('=== Testing for Henry ===');
    for (const file of testFiles) {
      if (fs.existsSync(file)) {
        await extractStudentFeedback(file, 'Henry');
        console.log('\n' + '='.repeat(60) + '\n');
      }
    }
    
    // Test for Selina/Selena
    console.log('=== Testing for Selina/Selena ===');
    for (const file of testFiles) {
      if (fs.existsSync(file)) {
        await extractStudentFeedback(file, 'Selina');
        await extractStudentFeedback(file, 'Selena');
        console.log('\n' + '='.repeat(60) + '\n');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the test
testMotionExtraction();