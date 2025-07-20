const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

async function extractStudentFeedback(filePath, studentName) {
  try {
    // Read both HTML and text
    const [htmlResult, textResult] = await Promise.all([
      mammoth.convertToHtml({ path: filePath }),
      mammoth.extractRawText({ path: filePath })
    ]);
    
    const html = htmlResult.value;
    const text = textResult.value;
    
    // Find student in text
    const studentIndex = text.indexOf(`Student Name: ${studentName}`);
    
    if (studentIndex === -1) {
      return null;
    }
    
    // Extract the student's section
    const nextStudentIndex = text.indexOf('Student Name:', studentIndex + 1);
    const endIndex = nextStudentIndex > 0 ? nextStudentIndex : text.length;
    const studentSection = text.substring(studentIndex, endIndex);
    
    // Extract motion
    const motionMatch = studentSection.match(/Motion:\s*([^\n]+)/);
    const motion = motionMatch ? motionMatch[1].trim() : 'NOT FOUND';
    
    // Get HTML section for rubric scores
    const studentHtmlIndex = html.indexOf(`Student Name: ${studentName}`);
    const nextStudentHtmlIndex = html.indexOf('Student Name:', studentHtmlIndex + 1);
    const htmlEndIndex = nextStudentHtmlIndex > 0 ? nextStudentHtmlIndex : html.length;
    const studentHtml = html.substring(studentHtmlIndex, htmlEndIndex);
    
    // Extract rubric scores
    const scores = {};
    const rubrics = [
      { name: 'Time Management', text: 'Student spoke for the duration' },
      { name: 'POI Handling', text: 'Student offered and/or accepted a point of information' },
      { name: 'Speaking Style', text: 'Student spoke in a stylistic and persuasive manner' },
      { name: 'Argument Completeness', text: 'Student\'s argument is complete' },
      { name: 'Theory Application', text: 'Student argument reflects application of theory' },
      { name: 'Rebuttal Effectiveness', text: 'Student\'s rebuttal is effective' },
      { name: 'Team Support', text: 'Student ably supported teammate' },
      { name: 'Feedback Application', text: 'Student applied feedback from previous debate' }
    ];
    
    rubrics.forEach(rubric => {
      const rubricIndex = studentHtml.indexOf(rubric.text);
      if (rubricIndex > 0) {
        const searchArea = studentHtml.substring(rubricIndex, rubricIndex + 300);
        const boldMatch = searchArea.match(/<(?:strong|b)>(N\/A|[1-5])<\/(?:strong|b)>/);
        scores[rubric.name] = boldMatch ? boldMatch[1] : 'Not found';
      } else {
        scores[rubric.name] = 'Not found';
      }
    });
    
    // Extract teacher comments
    const commentsMatch = studentSection.match(/Teacher comments:\s*([^]+?)(?=\d+:\d+|$)/);
    const comments = commentsMatch ? commentsMatch[1].trim() : 'NOT FOUND';
    
    // Extract duration
    const durationMatch = studentSection.match(/(\d+:\d+)/);
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

async function findAllSelenaFeedback() {
  const baseDir = '/Users/tikaram/Downloads/claude-code/student-growth/growth-compass/data/Overall/Secondary/Srijan';
  const results = [];
  let output = '';
  
  console.log('Searching for all Selena/Selina feedback files...\n');
  output += 'SELENA/SELINA FEEDBACK EXTRACTION REPORT\n';
  output += '=' .repeat(80) + '\n';
  output += `Generated: ${new Date().toISOString()}\n`;
  output += '=' .repeat(80) + '\n\n';
  
  // Find all .docx files in Srijan's folders
  function findDocxFiles(dir) {
    const files = [];
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        files.push(...findDocxFiles(fullPath));
      } else if (item.endsWith('.docx') && !item.startsWith('~$')) {
        files.push(fullPath);
      }
    }
    
    return files;
  }
  
  const allFiles = findDocxFiles(baseDir);
  console.log(`Found ${allFiles.length} total .docx files to search\n`);
  
  // Search each file for Selena or Selina
  for (const file of allFiles) {
    const selenaData = await extractStudentFeedback(file, 'Selena');
    const selinaData = await extractStudentFeedback(file, 'Selina');
    
    if (selenaData) {
      results.push(selenaData);
    }
    if (selinaData) {
      results.push(selinaData);
    }
  }
  
  // Sort results by file path
  results.sort((a, b) => a.filePath.localeCompare(b.filePath));
  
  console.log(`Found ${results.length} feedback entries for Selena/Selina\n`);
  output += `Total feedback entries found: ${results.length}\n\n`;
  
  // Format and display results
  results.forEach((result, index) => {
    const relativePath = result.filePath.replace(baseDir + '/', '');
    const unitMatch = relativePath.match(/(\d+\.\d+)/);
    const unit = unitMatch ? unitMatch[1] : 'Unknown';
    
    const feedbackText = `
FEEDBACK #${index + 1}
${'='.repeat(80)}
File: ${relativePath}
Unit: ${unit}
Student Name: ${result.studentName}
Motion: ${result.motion}
Duration: ${result.duration}

Rubric Scores:
- Time Management: ${result.scores['Time Management']}
- POI Handling: ${result.scores['POI Handling']}
- Speaking Style: ${result.scores['Speaking Style']}
- Argument Completeness: ${result.scores['Argument Completeness']}
- Theory Application: ${result.scores['Theory Application']}
- Rebuttal Effectiveness: ${result.scores['Rebuttal Effectiveness']}
- Team Support: ${result.scores['Team Support']}
- Feedback Application: ${result.scores['Feedback Application']}

Teacher Comments:
${result.comments}

${'='.repeat(80)}
`;
    
    console.log(feedbackText);
    output += feedbackText + '\n';
  });
  
  // Save to file
  const outputPath = path.join(__dirname, 'selena-feedback-report.txt');
  fs.writeFileSync(outputPath, output);
  console.log(`\nReport saved to: ${outputPath}`);
}

// Run the extraction
findAllSelenaFeedback().catch(console.error);