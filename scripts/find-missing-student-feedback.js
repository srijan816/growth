const { Pool } = require('pg');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://tikaram@localhost:5432/growth_compass'
});

// Extract all student names from a file
async function extractAllStudentNames(filePath) {
  try {
    const [htmlResult, textResult] = await Promise.all([
      mammoth.convertToHtml({ path: filePath }),
      mammoth.extractRawText({ path: filePath })
    ]);
    
    const text = textResult.value;
    const html = htmlResult.value;
    
    // Find all instances of "Student Name:"
    const studentNames = new Set();
    
    // Pattern 1: From text
    const textMatches = text.match(/Student Name:\s*([^\n]+)/gi);
    if (textMatches) {
      textMatches.forEach(match => {
        const name = match.replace(/Student Name:\s*/i, '').trim();
        if (name && name.length > 2 && name.length < 50) {
          studentNames.add(name);
        }
      });
    }
    
    // Pattern 2: From HTML (handling bold tags)
    const htmlPatterns = [
      /Student Name:\s*<\/strong>\s*([^<]+)/gi,
      /Student Name:\s*([^<]+)/gi,
      /Student Name:<\/strong>\s*([^<]+)/gi
    ];
    
    htmlPatterns.forEach(pattern => {
      const matches = html.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleanMatch = match.replace(/<[^>]+>/g, '').replace(/Student Name:\s*/i, '').trim();
          if (cleanMatch && cleanMatch.length > 2 && cleanMatch.length < 50) {
            studentNames.add(cleanMatch);
          }
        });
      }
    });
    
    return Array.from(studentNames);
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);
    return [];
  }
}

// Search for specific students with variations
async function searchForStudent(filePath, targetStudent, nameVariations) {
  try {
    const names = await extractAllStudentNames(filePath);
    
    for (const name of names) {
      // Check exact match
      if (name.toLowerCase() === targetStudent.toLowerCase()) {
        return { found: true, foundAs: name, file: filePath };
      }
      
      // Check variations
      for (const variation of nameVariations) {
        if (name.toLowerCase().includes(variation.toLowerCase())) {
          return { found: true, foundAs: name, file: filePath };
        }
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

// Main search function
async function findMissingStudentFeedback() {
  try {
    console.log('Searching for feedback for missing students...\n');
    
    // Define target students and their possible variations
    const targetStudents = [
      { 
        name: 'Regina Yau Chi Yan', 
        variations: ['Regina', 'Yau Chi Yan', 'Regina Yau', 'Chi Yan']
      },
      { 
        name: 'Athena Wen', 
        variations: ['Athena', 'Wen']
      },
      { 
        name: 'Anders Poon', 
        variations: ['Anders', 'Poon']
      },
      { 
        name: 'Davian Hung', 
        variations: ['Davian', 'Hung']
      },
      { 
        name: 'Kaiden Lau', 
        variations: ['Kaiden', 'Lau']
      }
    ];
    
    // Find all feedback files
    const baseDir = '/Users/tikaram/Downloads/claude-code/student-growth/growth-compass/data/Overall/Secondary/Srijan';
    
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
    console.log(`Searching through ${allFiles.length} feedback files...\n`);
    
    // First, let's get a sample of all unique student names found
    console.log('Sampling student names from files...');
    const allFoundNames = new Set();
    const sampleSize = Math.min(20, allFiles.length);
    
    for (let i = 0; i < sampleSize; i++) {
      const names = await extractAllStudentNames(allFiles[i]);
      names.forEach(name => allFoundNames.add(name));
    }
    
    console.log('\nSample of student names found in files:');
    Array.from(allFoundNames).sort().forEach(name => {
      console.log(`- ${name}`);
    });
    
    // Now search for specific students
    console.log('\n\nSearching for target students:');
    console.log('=' .repeat(60));
    
    for (const target of targetStudents) {
      console.log(`\nSearching for: ${target.name}`);
      console.log(`Variations: ${target.variations.join(', ')}`);
      
      const foundIn = [];
      
      for (const file of allFiles) {
        const result = await searchForStudent(file, target.name, target.variations);
        if (result) {
          foundIn.push({
            file: path.relative(baseDir, result.file),
            foundAs: result.foundAs
          });
        }
      }
      
      if (foundIn.length > 0) {
        console.log(`✅ FOUND in ${foundIn.length} files:`);
        foundIn.forEach(f => {
          console.log(`   - ${f.file}`);
          console.log(`     (as "${f.foundAs}")`);
        });
      } else {
        console.log(`❌ NOT FOUND in any files`);
      }
    }
    
    // Let's also check if there are any close matches
    console.log('\n\nChecking for similar names in database vs files:');
    
    // Get all unique names from a larger sample
    const largerSample = new Set();
    const checkSize = Math.min(50, allFiles.length);
    
    for (let i = 0; i < checkSize; i++) {
      const names = await extractAllStudentNames(allFiles[i]);
      names.forEach(name => largerSample.add(name));
    }
    
    console.log(`\nUnique student names found in sample of ${checkSize} files:`);
    const sortedNames = Array.from(largerSample).sort();
    
    // Group by first letter for easier scanning
    const grouped = {};
    sortedNames.forEach(name => {
      const firstLetter = name[0].toUpperCase();
      if (!grouped[firstLetter]) grouped[firstLetter] = [];
      grouped[firstLetter].push(name);
    });
    
    // Show names starting with R (for Regina) and A (for Athena)
    ['A', 'D', 'K', 'R'].forEach(letter => {
      if (grouped[letter]) {
        console.log(`\nNames starting with ${letter}:`);
        grouped[letter].forEach(name => console.log(`  - ${name}`));
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the search
findMissingStudentFeedback();