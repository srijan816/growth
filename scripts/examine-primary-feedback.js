const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

async function examinePrimaryFeedback() {
  try {
    console.log('Examining primary feedback format...\n');
    
    // Find a good sample file
    const sampleFiles = [
      '/Users/tikaram/Downloads/claude-code/student-growth/growth-compass/data/Overall/Primary/Intensives/PSD I - Battle of Ideas - Day 3 - 27_12.docx',
      '/Users/tikaram/Downloads/claude-code/student-growth/growth-compass/data/Overall/Primary/Intensives/PSD I - G3_4 - 1_30PM - 3_00PM - 16th of April_.docx',
      '/Users/tikaram/Downloads/claude-code/student-growth/growth-compass/data/Overall/Primary/Jami/02IPDEJ2401 2.4.docx'
    ];
    
    for (const filePath of sampleFiles) {
      if (!fs.existsSync(filePath)) continue;
      
      console.log(`\nExamining: ${path.basename(filePath)}`);
      console.log('='.repeat(80));
      
      const [htmlResult, textResult] = await Promise.all([
        mammoth.convertToHtml({ path: filePath }),
        mammoth.extractRawText({ path: filePath })
      ]);
      
      const html = htmlResult.value;
      const text = textResult.value;
      
      // Find first few student entries
      const studentMatches = text.match(/Student[:\s]+([^\n]+)/gi);
      if (studentMatches) {
        console.log(`\nFound ${studentMatches.length} student entries`);
        console.log('First 3 student names:');
        studentMatches.slice(0, 3).forEach(match => {
          console.log(`  - ${match}`);
        });
      }
      
      // Look for feedback structure
      console.log('\nChecking for feedback structure patterns:');
      
      // Check for "What went well" or similar
      const goodPatterns = [
        /what went well/i,
        /what.*good/i,
        /strengths/i,
        /positive/i,
        /well done/i
      ];
      
      goodPatterns.forEach(pattern => {
        if (pattern.test(text)) {
          console.log(`  ✓ Found pattern: ${pattern}`);
          const match = text.match(new RegExp(pattern.source + '[:\s]*([^\\n]+)', 'i'));
          if (match) {
            console.log(`    Sample: "${match[1].substring(0, 50)}..."`);
          }
        }
      });
      
      // Check for "Areas for improvement" or similar
      const improvementPatterns = [
        /areas? for improvement/i,
        /what.*improve/i,
        /needs? improvement/i,
        /work on/i,
        /next time/i
      ];
      
      improvementPatterns.forEach(pattern => {
        if (pattern.test(text)) {
          console.log(`  ✓ Found pattern: ${pattern}`);
          const match = text.match(new RegExp(pattern.source + '[:\s]*([^\\n]+)', 'i'));
          if (match) {
            console.log(`    Sample: "${match[1].substring(0, 50)}..."`);
          }
        }
      });
      
      // Extract a sample student section
      const studentIndex = text.search(/Student[:\s]+/i);
      if (studentIndex >= 0) {
        const nextStudent = text.substring(studentIndex + 100).search(/Student[:\s]+/i);
        const endIndex = nextStudent > 0 ? studentIndex + 100 + nextStudent : Math.min(studentIndex + 1000, text.length);
        const sampleSection = text.substring(studentIndex, endIndex);
        
        console.log('\n\nSample student section:');
        console.log('-'.repeat(80));
        console.log(sampleSection);
        console.log('-'.repeat(80));
      }
      
      // Check HTML structure
      console.log('\n\nHTML structure sample (first 1000 chars):');
      console.log(html.substring(0, 1000));
      
      break; // Just examine one file for now
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

examinePrimaryFeedback();