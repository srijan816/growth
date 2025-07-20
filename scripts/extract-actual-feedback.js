const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

async function extractActualFeedback(filePath, studentName) {
  console.log('\n' + '='.repeat(80));
  console.log('EXTRACTING FEEDBACK FROM FILE');
  console.log('='.repeat(80));
  console.log(`File: ${filePath}`);
  console.log(`Looking for: ${studentName}`);
  console.log('='.repeat(80));
  
  try {
    // Read both HTML and text
    const [htmlResult, textResult] = await Promise.all([
      mammoth.convertToHtml({ path: filePath }),
      mammoth.extractRawText({ path: filePath })
    ]);
    
    const html = htmlResult.value;
    const text = textResult.value;
    
    // Find student in text first
    const studentIndex = text.indexOf(`Student Name: ${studentName}`);
    
    if (studentIndex === -1) {
      console.log(`\n❌ Student "${studentName}" NOT FOUND in this file`);
      
      // Show what students ARE in the file
      const studentMatches = text.match(/Student Name: ([^\n]+)/g);
      if (studentMatches) {
        console.log('\nStudents found in this file:');
        studentMatches.forEach(match => console.log(`  - ${match}`));
      }
      return null;
    }
    
    console.log(`\n✅ Found "${studentName}" at character position ${studentIndex}`);
    
    // Extract the student's section (up to next student or end)
    const nextStudentIndex = text.indexOf('Student Name:', studentIndex + 1);
    const endIndex = nextStudentIndex > 0 ? nextStudentIndex : text.length;
    const studentSection = text.substring(studentIndex, endIndex);
    
    console.log('\n--- RAW TEXT SECTION ---');
    console.log(studentSection.substring(0, 500) + '...');
    
    // Extract motion from text
    const motionMatch = studentSection.match(/Motion:\s*([^\n]+)/);
    const motion = motionMatch ? motionMatch[1].trim() : 'NOT FOUND';
    
    console.log('\n📋 EXTRACTED DATA:');
    console.log(`Motion: ${motion}`);
    
    // Now work with HTML for rubric scores
    const studentHtmlIndex = html.indexOf(`Student Name: ${studentName}`);
    if (studentHtmlIndex === -1) {
      console.log('\n⚠️  Could not find student in HTML for rubric extraction');
      return { studentName, motion, scores: {}, comments: 'Unable to extract', duration: 'Unknown' };
    }
    
    // Get HTML section for this student
    const nextStudentHtmlIndex = html.indexOf('Student Name:', studentHtmlIndex + 1);
    const htmlEndIndex = nextStudentHtmlIndex > 0 ? nextStudentHtmlIndex : html.length;
    const studentHtml = html.substring(studentHtmlIndex, htmlEndIndex);
    
    // Extract rubric scores by looking for bold numbers
    console.log('\nRubric Scores (looking for bold numbers):');
    const scores = {};
    
    // Define rubric patterns with the exact text from the document
    const rubrics = [
      { name: 'time_management', text: 'Student spoke for the duration' },
      { name: 'poi_handling', text: 'Student offered and/or accepted a point of information' },
      { name: 'speaking_style', text: 'Student spoke in a stylistic and persuasive manner' },
      { name: 'argument_completeness', text: 'Student\'s argument is complete' },
      { name: 'theory_application', text: 'Student argument reflects application of theory' },
      { name: 'rebuttal_effectiveness', text: 'Student\'s rebuttal is effective' },
      { name: 'team_support', text: 'Student ably supported teammate' },
      { name: 'feedback_application', text: 'Student applied feedback from previous debate' }
    ];
    
    rubrics.forEach((rubric, index) => {
      // Find the rubric text
      const rubricIndex = studentHtml.indexOf(rubric.text);
      if (rubricIndex > 0) {
        // Look for bold number after this rubric (within next 200 chars)
        const searchArea = studentHtml.substring(rubricIndex, rubricIndex + 300);
        const boldMatch = searchArea.match(/<(?:strong|b)>(N\/A|[1-5])<\/(?:strong|b)>/);
        
        if (boldMatch) {
          scores[rubric.name] = boldMatch[1];
          console.log(`${index + 1}. ${rubric.name}: ${boldMatch[1]}`);
        } else {
          console.log(`${index + 1}. ${rubric.name}: NOT FOUND (no bold number)`);
          // Debug: show what's there
          const debugMatch = searchArea.match(/([1-5]|N\/A)/g);
          if (debugMatch) {
            console.log(`   (Found these non-bold options: ${debugMatch.join(', ')})`);
          }
        }
      } else {
        console.log(`${index + 1}. ${rubric.name}: RUBRIC TEXT NOT FOUND`);
      }
    });
    
    // Extract teacher comments
    const commentsMatch = studentSection.match(/Teacher comments:\s*([^]+?)(?=\d+:\d+|$)/);
    const comments = commentsMatch ? commentsMatch[1].trim() : 'NOT FOUND';
    
    console.log(`\nTeacher Comments: ${comments.substring(0, 200)}${comments.length > 200 ? '...' : ''}`);
    
    // Extract duration
    const durationMatch = studentSection.match(/(\d+:\d+)/);
    const duration = durationMatch ? durationMatch[1] : 'NOT FOUND';
    
    console.log(`\nSpeech Duration: ${duration}`);
    
    return {
      studentName,
      motion,
      scores,
      comments,
      duration
    };
    
  } catch (error) {
    console.error(`\n❌ ERROR: ${error.message}`);
    return null;
  }
}

// Test with actual files
async function main() {
  const tests = [
    {
      file: '/Users/tikaram/Downloads/claude-code/student-growth/growth-compass/data/Overall/Secondary/Srijan/Wednesday - 6 - 7.5 - 01IPDED2401 - PSD I/Unit 8/8.2.docx',
      student: 'Selina'
    },
    {
      file: '/Users/tikaram/Downloads/claude-code/student-growth/growth-compass/data/Overall/Secondary/Srijan/Wednesday - 6 - 7.5 - 01IPDED2401 - PSD I/Unit 8/8.1.docx',
      student: 'Selina'
    },
    {
      file: '/Users/tikaram/Downloads/claude-code/student-growth/growth-compass/data/Overall/Secondary/Srijan/Wednesday - 6 - 7.5 - 01IPDED2401 - PSD I/Unit 8/8.3.docx',
      student: 'Selina'
    }
  ];
  
  console.log('TESTING FEEDBACK EXTRACTION\n');
  
  for (const test of tests) {
    if (fs.existsSync(test.file)) {
      await extractActualFeedback(test.file, test.student);
    } else {
      console.log(`\n❌ File does not exist: ${test.file}`);
    }
  }
}

main().catch(console.error);