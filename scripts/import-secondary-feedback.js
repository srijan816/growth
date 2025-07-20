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
  // Pattern: 01IPDED2404, 01IPDED2401, etc.
  const match = filePath.match(/\b(\d{2}[A-Z]{5}\d{4})\b/);
  return match ? match[1] : 'UNKNOWN';
}

// Extract all feedback for a student
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
    
    // Extract motion
    const motionMatch = studentHtml.match(/Motion[:<\/strong>]*\s*([^<]+)/i);
    const motion = motionMatch ? motionMatch[1].trim() : null;
    
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
    const textIndex = text.indexOf(`Student Name: ${studentName}`);
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

// Main import function
async function importSecondaryFeedback() {
  try {
    console.log('Starting secondary feedback import...\n');
    
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
      
      // Insert into database
      let inserted = 0;
      for (const entry of feedbackEntries) {
        // Generate unique ID
        const uniqueId = crypto.createHash('md5').update(
          `${student.name}_${entry.classCode}_${entry.unit}.${entry.lesson}_${entry.motion || ''}_Srijan`
        ).digest('hex');
        
        // Create content field
        const content = `Motion: ${entry.motion || 'N/A'}\nDuration: ${entry.duration || 'N/A'}\n\nTeacher Comments:\n${entry.comments || 'No comments'}`;
        
        const insertQuery = `
          INSERT INTO parsed_student_feedback (
            id,
            student_id,
            student_name,
            feedback_type,
            class_code,
            class_name,
            unit_number,
            lesson_number,
            topic,
            motion,
            teacher_comments,
            rubric_scores,
            duration,
            instructor,
            unique_id,
            content,
            file_path,
            created_at
          ) VALUES (
            gen_random_uuid(),
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW()
          )
          ON CONFLICT (unique_id) DO UPDATE SET
            rubric_scores = EXCLUDED.rubric_scores,
            teacher_comments = EXCLUDED.teacher_comments,
            duration = EXCLUDED.duration,
            content = EXCLUDED.content,
            file_path = EXCLUDED.file_path
        `;
        
        try {
          await pool.query(insertQuery, [
            student.id,                    // student_id
            student.name,                  // student_name
            'secondary',                   // feedback_type
            entry.classCode,              // class_code
            'PSD I',                      // class_name
            entry.unit,                   // unit_number
            entry.lesson,                 // lesson_number
            entry.motion,                 // topic
            entry.motion,                 // motion
            entry.comments,               // teacher_comments
            JSON.stringify(entry.scores), // rubric_scores
            entry.duration,               // duration
            'Srijan',                     // instructor
            uniqueId,                     // unique_id
            content,                      // content
            entry.filePath                // file_path
          ]);
          
          console.log(`✅ Unit ${entry.unit}.${entry.lesson}`);
          inserted++;
        } catch (err) {
          console.error(`❌ Unit ${entry.unit}.${entry.lesson}: ${err.message}`);
        }
      }
      
      console.log(`\nInserted ${inserted} out of ${feedbackEntries.length} entries`);
    }
    
    // Verify the import
    console.log('\n\nVerifying imported data...');
    const verifyQuery = `
      SELECT student_name, COUNT(*) as count
      FROM parsed_student_feedback
      WHERE student_name IN ('Henry Cheng', 'Selina Ke')
      AND instructor = 'Srijan'
      GROUP BY student_name
    `;
    
    const verifyResult = await pool.query(verifyQuery);
    console.log('\nFeedback counts in database:');
    verifyResult.rows.forEach(row => {
      console.log(`- ${row.student_name}: ${row.count} entries`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the import
importSecondaryFeedback();