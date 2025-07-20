const mammoth = require('mammoth');

async function examineFile() {
  try {
    const filePath = '/Users/tikaram/Downloads/claude-code/student-growth/growth-compass/data/Overall/Primary/Trial Class - 21_3_24.docx';
    
    const textResult = await mammoth.extractRawText({ path: filePath });
    const text = textResult.value;
    
    console.log('File content (first 2000 chars):');
    console.log('='.repeat(80));
    console.log(text.substring(0, 2000));
    console.log('='.repeat(80));
    
    // Look for student patterns
    const lines = text.split('\n');
    console.log('\n\nSearching for student entries...');
    
    lines.forEach((line, index) => {
      if (line.match(/student/i) && line.length < 100) {
        console.log(`Line ${index}: ${line}`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

examineFile();