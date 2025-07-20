const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

async function extractRubricScores(filePath, studentName) {
  try {
    // Get HTML content to preserve formatting
    const result = await mammoth.convertToHtml({ path: filePath });
    const html = result.value;
    
    console.log('\n' + '='.repeat(80));
    console.log(`Extracting rubric scores for: ${studentName}`);
    console.log(`File: ${path.basename(filePath)}`);
    console.log('='.repeat(80));
    
    // Find the student section
    const studentPattern = new RegExp(`Student Name:\\s*${studentName}[\\s\\S]*?(?=Student Name:|$)`, 'i');
    const studentSection = html.match(studentPattern);
    
    if (!studentSection) {
      console.log(`Student ${studentName} not found in file`);
      return null;
    }
    
    const sectionHtml = studentSection[0];
    
    // Extract motion
    const motionMatch = sectionHtml.match(/Motion:\s*([^<]+)/i);
    const motion = motionMatch ? motionMatch[1].trim() : 'Not found';
    console.log(`\nMotion: ${motion}`);
    
    // Define rubric categories
    const rubricCategories = [
      { key: 'time_management', pattern: /Student spoke for the duration[^<]*<[^>]*>[\s\S]*?(?:<strong>|<b>)(N\/A|\d)(?:<\/strong>|<\/b>)/i },
      { key: 'poi_handling', pattern: /Student offered and\/or accepted[^<]*<[^>]*>[\s\S]*?(?:<strong>|<b>)(N\/A|\d)(?:<\/strong>|<\/b>)/i },
      { key: 'speaking_style', pattern: /Student spoke in a stylistic[^<]*<[^>]*>[\s\S]*?(?:<strong>|<b>)(N\/A|\d)(?:<\/strong>|<\/b>)/i },
      { key: 'argument_completeness', pattern: /Student.*argument is complete[^<]*<[^>]*>[\s\S]*?(?:<strong>|<b>)(N\/A|\d)(?:<\/strong>|<\/b>)/i },
      { key: 'theory_application', pattern: /Student argument reflects[^<]*<[^>]*>[\s\S]*?(?:<strong>|<b>)(N\/A|\d)(?:<\/strong>|<\/b>)/i },
      { key: 'rebuttal_effectiveness', pattern: /Student.*rebuttal is effective[^<]*<[^>]*>[\s\S]*?(?:<strong>|<b>)(N\/A|\d)(?:<\/strong>|<\/b>)/i },
      { key: 'team_support', pattern: /Student ably supported[^<]*<[^>]*>[\s\S]*?(?:<strong>|<b>)(N\/A|\d)(?:<\/strong>|<\/b>)/i },
      { key: 'feedback_application', pattern: /Student applied feedback[^<]*<[^>]*>[\s\S]*?(?:<strong>|<b>)(N\/A|\d)(?:<\/strong>|<\/b>)/i }
    ];
    
    console.log('\nRubric Scores:');
    const scores = {};
    
    // Try multiple extraction methods for each category
    rubricCategories.forEach((category, index) => {
      // Method 1: Look for pattern with bold tags
      let match = sectionHtml.match(category.pattern);
      
      // Method 2: Look for table cells with bold content
      if (!match) {
        // Try to find the rubric text followed by table cells
        const rubricText = category.pattern.source.split('[^<]*')[0].replace(/\\/g, '');
        const tablePattern = new RegExp(
          rubricText + '[\\s\\S]*?<td[^>]*>[\\s\\S]*?(?:<strong>|<b>)(N\/A|\\d)(?:<\/strong>|<\/b>)',
          'i'
        );
        match = sectionHtml.match(tablePattern);
      }
      
      // Method 3: Look in numbered lists or paragraphs
      if (!match) {
        const numberedPattern = new RegExp(
          `${index + 1}\\.[\\s\\S]*?(?:<strong>|<b>)(N\/A|\\d)(?:<\/strong>|<\/b>)`,
          'i'
        );
        match = sectionHtml.match(numberedPattern);
      }
      
      if (match) {
        scores[category.key] = match[1];
        console.log(`${index + 1}. ${category.key}: ${match[1]}`);
      } else {
        // Debug: show what we're looking for
        console.log(`${index + 1}. ${category.key}: NOT FOUND`);
        
        // Show a snippet of where we expect to find it
        const snippetMatch = sectionHtml.match(new RegExp(category.pattern.source.split('[^<]*')[0].replace(/\\/g, ''), 'i'));
        if (snippetMatch) {
          const startIndex = sectionHtml.indexOf(snippetMatch[0]);
          const snippet = sectionHtml.substring(startIndex, startIndex + 200);
          console.log(`   Debug snippet: ${snippet.replace(/<[^>]+>/g, ' ').substring(0, 100)}...`);
        }
      }
    });
    
    // Extract teacher comments
    const commentsMatch = sectionHtml.match(/Teacher comments:\s*<[^>]*>([^<]+(?:<[^>]*>[^<]+)*)/i);
    const comments = commentsMatch ? commentsMatch[1].replace(/<[^>]+>/g, ' ').trim() : 'Not found';
    
    console.log(`\nTeacher Comments: ${comments.substring(0, 200)}...`);
    
    // Extract duration if present
    const durationMatch = sectionHtml.match(/(\d+:\d+)/);
    const duration = durationMatch ? durationMatch[1] : 'Not found';
    console.log(`\nSpeech Duration: ${duration}`);
    
    return {
      studentName,
      motion,
      scores,
      comments,
      duration
    };
    
  } catch (error) {
    console.error(`Error processing file: ${error.message}`);
    return null;
  }
}

// Test with Selina's feedback
async function main() {
  const testFiles = [
    {
      path: '/Users/tikaram/Downloads/claude-code/student-growth/growth-compass/data/Overall/Secondary/Srijan/Wednesday - 6 - 7.5 - 01IPDED2401 - PSD I/Unit 8/8.2.docx',
      student: 'Selina'
    },
    {
      path: '/Users/tikaram/Downloads/claude-code/student-growth/growth-compass/data/Overall/Secondary/Srijan/Wednesday - 6 - 7.5 - 01IPDED2401 - PSD I/Unit 8/8.1.docx',
      student: 'Kana'
    }
  ];
  
  for (const test of testFiles) {
    if (fs.existsSync(test.path)) {
      await extractRubricScores(test.path, test.student);
    } else {
      console.log(`File not found: ${test.path}`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('DEBUGGING TIP: If scores are missing, check:');
  console.log('1. The HTML structure might be different than expected');
  console.log('2. Bold tags might be <b> instead of <strong> or vice versa');
  console.log('3. Table structure might have nested elements');
  console.log('4. Text might have slight variations in wording');
}

main().catch(console.error);