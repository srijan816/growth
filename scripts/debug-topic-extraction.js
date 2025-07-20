const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

async function debugTopicExtraction() {
  try {
    // Sample files to check
    const sampleFiles = [
      '/Users/tikaram/Downloads/claude-code/student-growth/growth-compass/data/Overall/Primary/Srijan/Friday - 6 - 7.5 - 02IPDEC2402 - PSD I/Unit 7/7.1.docx',
      '/Users/tikaram/Downloads/claude-code/student-growth/growth-compass/data/Overall/Primary/Srijan/Saturday 11 - 12.5 - 02IPDEC2403 - PSD I/Unit 6/6.1- Feedback.docx',
      '/Users/tikaram/Downloads/claude-code/student-growth/growth-compass/data/Overall/Primary/Srijan/Thursday - 6 - 7.5 - 02IPDEC2401 - PSD I/3.3/3.3.docx'
    ];
    
    for (const filePath of sampleFiles) {
      if (!fs.existsSync(filePath)) continue;
      
      console.log(`\n${'='.repeat(80)}`);
      console.log(`Examining: ${path.basename(filePath)}`);
      console.log('='.repeat(80));
      
      const textResult = await mammoth.extractRawText({ path: filePath });
      const text = textResult.value;
      
      // Find first student
      const studentMatch = text.match(/Student:\s*(\w+)/i);
      if (studentMatch) {
        const studentName = studentMatch[1];
        console.log(`\nFirst student found: ${studentName}`);
        
        // Get the section for this student
        const startIdx = studentMatch.index;
        const nextStudent = text.substring(startIdx + 100).search(/Student:/i);
        const endIdx = nextStudent > 0 ? startIdx + 100 + nextStudent : Math.min(startIdx + 2000, text.length);
        
        const studentSection = text.substring(startIdx, endIdx);
        
        console.log('\nStudent section (first 800 chars):');
        console.log('-'.repeat(80));
        console.log(studentSection.substring(0, 800));
        console.log('-'.repeat(80));
        
        // Try different topic patterns
        console.log('\nTopic extraction attempts:');
        
        const patterns = [
          /Topic:\s*([^\n]+)/i,
          /Motion:\s*([^\n]+)/i,
          /Subject:\s*([^\n]+)/i,
          /Theme:\s*([^\n]+)/i,
          /Student:\s*\w+\s*\n+([^\n]+)/i  // Line after student name
        ];
        
        patterns.forEach((pattern, i) => {
          const match = studentSection.match(pattern);
          if (match) {
            console.log(`  Pattern ${i + 1} matched: "${match[1].trim()}"`);
          } else {
            console.log(`  Pattern ${i + 1}: No match`);
          }
        });
        
        // Check if there's any consistent pattern after student name
        const lines = studentSection.split('\n').map(l => l.trim()).filter(l => l);
        console.log('\nFirst 5 non-empty lines after student:');
        lines.slice(0, 5).forEach((line, i) => {
          console.log(`  ${i}: ${line.substring(0, 60)}${line.length > 60 ? '...' : ''}`);
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugTopicExtraction();