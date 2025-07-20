const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

async function extractStudentFeedback(filePath, studentName) {
  try {
    const [htmlResult, textResult] = await Promise.all([
      mammoth.convertToHtml({ path: filePath }),
      mammoth.extractRawText({ path: filePath })
    ]);
    
    const html = htmlResult.value;
    const text = textResult.value;
    
    // Try multiple patterns for finding student names in HTML
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
    
    if (studentHtmlIndex === -1) {
      // Also check text version
      const textIndex = text.indexOf(`Student Name: ${studentName}`);
      if (textIndex === -1) return null;
      
      // If found in text but not HTML, there's a parsing issue
      console.log(`Warning: Found ${studentName} in text but not in HTML for ${path.basename(filePath)}`);
      return null;
    }
    
    // Find the next student or end
    const nextPatterns = [
      'Student Name:',
      '<strong>Student Name:',
      'Student Name:</strong>'
    ];
    
    let nextStudentIndex = -1;
    for (const pattern of nextPatterns) {
      const idx = html.indexOf(pattern, studentHtmlIndex + 20);
      if (idx > 0 && (nextStudentIndex === -1 || idx < nextStudentIndex)) {
        nextStudentIndex = idx;
      }
    }
    
    const endIndex = nextStudentIndex > 0 ? nextStudentIndex : html.length;
    const studentHtml = html.substring(studentHtmlIndex, endIndex);
    
    // Extract motion from HTML
    const motionMatch = studentHtml.match(/Motion[:<\/strong>]*\s*([^<]+)/i);
    const motion = motionMatch ? motionMatch[1].trim() : 'NOT FOUND';
    
    // Extract rubric scores from tables
    const scores = {};
    const rubrics = [
      { name: 'Time Management', patterns: ['Student spoke for the duration', 'spoke for the duration'] },
      { name: 'POI Handling', patterns: ['point of information', 'POI'] },
      { name: 'Speaking Style', patterns: ['stylistic and persuasive manner', 'speaking style'] },
      { name: 'Argument Completeness', patterns: ['argument is complete', 'Claims, supported by'] },
      { name: 'Theory Application', patterns: ['reflects application of theory', 'theory taught'] },
      { name: 'Rebuttal Effectiveness', patterns: ['rebuttal is effective', 'responds to an opponent'] },
      { name: 'Team Support', patterns: ['supported teammate', 'teammate\'s case'] },
      { name: 'Feedback Application', patterns: ['applied feedback from previous', 'previous debate'] }
    ];
    
    // Split by table rows
    const rows = studentHtml.split(/<\/tr>/i);
    
    rubrics.forEach(rubric => {
      let found = false;
      
      // Look through each row
      for (const row of rows) {
        // Check if this row contains the rubric text
        const hasRubric = rubric.patterns.some(pattern => 
          row.toLowerCase().includes(pattern.toLowerCase())
        );
        
        if (hasRubric) {
          // Look for bold score in this row
          const boldMatch = row.match(/<(?:strong|b)>(N\/A|[1-5])<\/(?:strong|b)>/);
          if (boldMatch) {
            scores[rubric.name] = boldMatch[1];
            found = true;
            break;
          }
        }
      }
      
      if (!found) {
        scores[rubric.name] = 'Not found';
      }
    });
    
    // Extract teacher comments from text (more reliable than HTML)
    const textIndex = text.indexOf(`Student Name: ${studentName}`);
    const nextTextStudent = text.indexOf('Student Name:', textIndex + 1);
    const textEndIndex = nextTextStudent > 0 ? nextTextStudent : text.length;
    const studentText = text.substring(textIndex, textEndIndex);
    
    const commentsMatch = studentText.match(/Teacher comments:\s*([^]+?)(?=\d+:\d+|$)/);
    const comments = commentsMatch ? commentsMatch[1].trim() : 'NOT FOUND';
    
    // Extract duration
    const durationMatch = studentText.match(/(\d+:\d+)/);
    const duration = durationMatch ? durationMatch[1] : 'NOT FOUND';
    
    return {
      studentName,
      motion,
      scores,
      comments,
      duration,
      filePath
    };
    
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);
    return null;
  }
}

// Test with the problematic file
async function testExtraction() {
  const testFile = '/Users/tikaram/Downloads/claude-code/student-growth/growth-compass/data/Overall/Secondary/Srijan/Thursday - 4_30 - 6_00 - 01IPDED2406 - PSD I/2.2 - 3rd October.docx';
  
  console.log('Testing fixed extraction on problematic file...\n');
  
  const result = await extractStudentFeedback(testFile, 'Selina');
  
  if (result) {
    console.log('SUCCESS! Extracted data:');
    console.log('Motion:', result.motion);
    console.log('\nRubric Scores:');
    Object.entries(result.scores).forEach(([key, value]) => {
      console.log(`- ${key}: ${value}`);
    });
    console.log('\nDuration:', result.duration);
    console.log('\nTeacher Comments (first 200 chars):');
    console.log(result.comments.substring(0, 200) + '...');
  } else {
    console.log('Failed to extract data');
  }
}

testExtraction().catch(console.error);