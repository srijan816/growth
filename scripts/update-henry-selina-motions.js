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
    
    // Extract motion - IMPROVED LOGIC
    let motion = null;
    
    // Primary method: Extract from plain text (most reliable)
    const textIndex = text.indexOf(studentName);
    if (textIndex >= 0) {
      const afterNameText = text.substring(textIndex + studentName.length);
      const lines = afterNameText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      
      // The motion is typically the first non-empty line after the name
      if (lines.length > 0 && lines[0].length > 10 && !lines[0].includes('Teacher comments')) {
        motion = lines[0];
      }
    }
    
    // Fallback: Look for labeled motion
    if (!motion) {
      const motionMatch = studentHtml.match(/Motion[:<\/strong>]*\s*([^<]+)/i);
      if (motionMatch) {
        motion = motionMatch[1].trim();
      }
    }
    
    // Extract rubric scores
    const scores = {};
    const rubrics = [
      { name: 'time_management', patterns: ['Student spoke for the duration', 'spoke for the duration'] },
      { name: 'poi_handling', patterns: ['point of information', 'POI'] },
      { name: 'speaking_style', patterns: ['stylistic and persuasive manner', 'speaking style'] },
      { name: 'argument_completeness', patterns: ['argument is complete', 'Claims, supported by'] },
      { name: 'theory_application', patterns: ['reflects application of theory', 'theory taught'] },
      { name: 'rebuttal_effectiveness', patterns: ['rebuttal is effective', 'responds to an opponent'] },
      { name: 'team_support', patterns: ['supported teammate', 'teammate\'s case'] },
      { name: 'feedback_application', patterns: ['applied feedback from previous', 'previous debate'] }
    ];
    
    const rows = studentHtml.split(/<\/tr>/i);
    rubrics.forEach(rubric => {
      let found = false;
      for (const row of rows) {
        const hasRubric = rubric.patterns.some(pattern => 
          row.toLowerCase().includes(pattern.toLowerCase())
        );
        if (hasRubric) {
          const boldMatch = row.match(/<(?:strong|b)>(N\/A|[1-5])<\/(?:strong|b)>/);
          if (boldMatch) {
            scores[rubric.name] = boldMatch[1];
            found = true;
            break;
          }
        }
      }
    });
    
    // Extract teacher comments from text
    const nextTextStudent = text.indexOf('Student Name:', textIndex + 1);
    const textEndIndex = nextTextStudent > 0 ? nextTextStudent : text.length;
    const studentText = text.substring(textIndex, textEndIndex);
    
    const commentsMatch = studentText.match(/Teacher comments:\s*([^]+?)(?=\d+:\d+|$)/);
    const comments = commentsMatch ? commentsMatch[1].trim() : null;
    
    // Extract duration
    const durationMatch = studentText.match(/(\d+:\d+)/);
    const duration = durationMatch ? durationMatch[1] : null;
    
    // Extract unit/lesson from file path
    const unitMatch = path.basename(filePath).match(/(\d+)\.(\d+)/);
    const unit = unitMatch ? unitMatch[1] : '0';
    const lesson = unitMatch ? unitMatch[2] : '0';
    
    // Get class code from path
    const classCode = extractClassCode(filePath);
    
    return {
      studentName,
      motion,
      scores,
      comments,
      duration,
      unit,
      lesson,
      filePath,
      classCode
    };
    
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);
    return null;
  }
}

// Main update function
async function updateHenrySelinaMotions() {
  try {
    console.log('Updating motions for Henry and Selina...\n');
    
    // Get Henry and Selina from database
    const studentsQuery = `
      SELECT id, name, grade 
      FROM students 
      WHERE (name = 'Henry Cheng' OR name = 'Selina Ke')
      ORDER BY name
    `;
    
    const studentsResult = await pool.query(studentsQuery);
    console.log('Target students:');
    studentsResult.rows.forEach(s => {
      console.log(`- ${s.name} (${s.grade}, ID: ${s.id})`);
    });
    
    // Find all Srijan's secondary feedback files
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
    console.log(`\nSearching through ${allFiles.length} feedback files...\n`);
    
    // Process each student
    for (const student of studentsResult.rows) {
      console.log(`\nProcessing ${student.name}:`);
      console.log('=' .repeat(60));
      
      const feedbackEntries = [];
      
      // Check both exact name and variations
      const nameVariations = [student.name.split(' ')[0]]; // Just first name for secondary
      if (student.name === 'Selina Ke') {
        nameVariations.push('Selina', 'Selena');
      }
      
      // Search files
      for (const file of allFiles) {
        for (const nameVariant of nameVariations) {
          const feedback = await extractStudentFeedback(file, nameVariant);
          if (feedback) {
            feedbackEntries.push(feedback);
            break;
          }
        }
      }
      
      // Sort by unit and lesson
      feedbackEntries.sort((a, b) => {
        const unitA = parseInt(a.unit);
        const unitB = parseInt(b.unit);
        if (unitA !== unitB) return unitA - unitB;
        
        const lessonA = parseInt(a.lesson);
        const lessonB = parseInt(b.lesson);
        return lessonA - lessonB;
      });
      
      console.log(`Found ${feedbackEntries.length} feedback entries`);
      
      // Update motions in database
      let updated = 0;
      let withMotion = 0;
      
      for (const entry of feedbackEntries) {
        if (entry.motion) {
          withMotion++;
          
          // Update the motion field
          const updateQuery = `
            UPDATE parsed_student_feedback 
            SET 
              motion = $1,
              topic = $1
            WHERE 
              student_name = $2 
              AND unit_number = $3 
              AND lesson_number = $4
              AND instructor = 'Srijan'
          `;
          
          try {
            const result = await pool.query(updateQuery, [
              entry.motion,
              student.name,
              entry.unit,
              entry.lesson
            ]);
            
            if (result.rowCount > 0) {
              console.log(`✅ Unit ${entry.unit}.${entry.lesson}: ${entry.motion.substring(0, 50)}...`);
              updated++;
            }
          } catch (err) {
            console.error(`❌ Unit ${entry.unit}.${entry.lesson}: ${err.message}`);
          }
        }
      }
      
      console.log(`\nUpdated ${updated} entries with motions (${withMotion} had motions)`);
    }
    
    // Verify the update
    console.log('\n\nVerifying updated data...');
    const verifyQuery = `
      SELECT 
        student_name, 
        COUNT(*) as total_entries,
        COUNT(CASE WHEN motion IS NOT NULL AND motion != '' THEN 1 END) as has_motion,
        COUNT(CASE WHEN motion IS NULL OR motion = '' THEN 1 END) as missing_motion
      FROM parsed_student_feedback
      WHERE student_name IN ('Henry Cheng', 'Selina Ke')
      AND instructor = 'Srijan'
      GROUP BY student_name
      ORDER BY student_name
    `;
    
    const verifyResult = await pool.query(verifyQuery);
    console.log('\nFeedback entries in database:');
    verifyResult.rows.forEach(row => {
      console.log(`- ${row.student_name}: ${row.total_entries} total, ${row.has_motion} with motion, ${row.missing_motion} missing motion`);
    });
    
    // Show a few examples
    console.log('\n\nSample entries with motions:');
    const sampleQuery = `
      SELECT student_name, unit_number, lesson_number, motion
      FROM parsed_student_feedback
      WHERE student_name IN ('Henry Cheng', 'Selina Ke')
      AND instructor = 'Srijan'
      AND motion IS NOT NULL
      ORDER BY student_name, CAST(unit_number AS INT), CAST(lesson_number AS INT)
      LIMIT 10
    `;
    
    const sampleResult = await pool.query(sampleQuery);
    sampleResult.rows.forEach(row => {
      console.log(`- ${row.student_name} Unit ${row.unit_number}.${row.lesson_number}: ${row.motion.substring(0, 60)}...`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the update
updateHenrySelinaMotions();