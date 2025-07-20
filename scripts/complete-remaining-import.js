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

// Extract all feedback for a student name
async function extractAllStudentFeedback(filePath, studentFirstName) {
  try {
    const [htmlResult, textResult] = await Promise.all([
      mammoth.convertToHtml({ path: filePath }),
      mammoth.extractRawText({ path: filePath })
    ]);
    
    const html = htmlResult.value;
    const text = textResult.value;
    
    const feedbackEntries = [];
    
    // Find all occurrences of the student name in text for better accuracy
    const regex = new RegExp(`Student Name:\\s*${studentFirstName}\\b`, 'gi');
    let match;
    const textIndices = [];
    
    while ((match = regex.exec(text)) !== null) {
      textIndices.push(match.index);
    }
    
    // Process each occurrence
    for (let i = 0; i < textIndices.length; i++) {
      const startIndex = textIndices[i];
      const endIndex = i < textIndices.length - 1 ? textIndices[i + 1] : text.length;
      
      // Find next "Student Name:" to ensure we don't overlap
      const nextStudentIdx = text.substring(startIndex + 20).search(/Student Name:/i);
      const actualEndIndex = nextStudentIdx > 0 
        ? Math.min(endIndex, startIndex + 20 + nextStudentIdx)
        : endIndex;
      
      const studentSection = text.substring(startIndex, actualEndIndex);
      
      // Extract motion - it's the line after Student Name
      const lines = studentSection.split('\n').map(l => l.trim()).filter(l => l);
      let motion = null;
      
      if (lines.length > 1) {
        // Motion is typically on the second line
        const potentialMotion = lines[1];
        if (potentialMotion.length > 10 && 
            !potentialMotion.includes('Teacher comments') &&
            !potentialMotion.includes('Student spoke')) {
          motion = potentialMotion;
        }
      }
      
      // Extract teacher comments
      const commentsMatch = studentSection.match(/Teacher comments:\s*([^]+?)(?=\d+:\d+|Student Name:|$)/i);
      const comments = commentsMatch ? commentsMatch[1].trim() : null;
      
      // Extract duration
      const durationMatch = studentSection.match(/(\d+:\d+)/);
      const duration = durationMatch ? durationMatch[1] : null;
      
      // For rubric scores, we need to check the HTML at the corresponding position
      const htmlStartApprox = html.indexOf(`Student Name:`) + (i * 100); // Rough approximation
      const htmlSection = html.substring(Math.max(0, htmlStartApprox - 50), Math.min(html.length, htmlStartApprox + 2000));
      
      // Extract rubric scores from HTML section
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
      
      const rows = htmlSection.split(/<\/tr>/i);
      rubrics.forEach(rubric => {
        for (const row of rows) {
          const hasRubric = rubric.patterns.some(pattern => 
            row.toLowerCase().includes(pattern.toLowerCase())
          );
          if (hasRubric) {
            const boldMatch = row.match(/<(?:strong|b)>(N\/A|[1-5])<\/(?:strong|b)>/);
            if (boldMatch) {
              scores[rubric.name] = boldMatch[1];
              break;
            }
          }
        }
      });
      
      // Extract unit/lesson from file path
      const unitMatch = path.basename(filePath).match(/(\d+)\.(\d+)/);
      const unit = unitMatch ? unitMatch[1] : '0';
      const lesson = unitMatch ? unitMatch[2] : '0';
      
      feedbackEntries.push({
        studentFirstName,
        motion,
        scores,
        comments,
        duration,
        unit,
        lesson,
        filePath,
        classCode: extractClassCode(filePath),
        index: i  // Track which occurrence this is
      });
    }
    
    return feedbackEntries;
    
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);
    return [];
  }
}

// Main function to complete remaining imports
async function completeRemainingImports() {
  try {
    console.log('Completing remaining secondary feedback imports...\n');
    
    // Get students who still need more imports based on the file counts
    const needsMoreImport = [
      { name: 'Marcel Tsim', firstName: 'Marcel', expected: 24 },
      { name: 'Marcus Tan', firstName: 'Marcus', expected: 13 },
      { name: 'Melody Zhao', firstName: 'Melody', expected: 21 },
      { name: 'Morgan Wong', firstName: 'Morgan', expected: 11 },
      { name: 'Moses Tsz Him Cheuk', firstName: 'Moses', expected: 12 },
      { name: 'Regina Yau Chi Yan', firstName: 'Regina', expected: 1 },
      { name: 'Toby Zhu', firstName: 'Toby', expected: 6 }
    ];
    
    // Get their IDs from database
    const studentIds = {};
    for (const student of needsMoreImport) {
      const result = await pool.query(
        'SELECT id FROM students WHERE name = $1',
        [student.name]
      );
      if (result.rows.length > 0) {
        studentIds[student.name] = result.rows[0].id;
      }
    }
    
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
    console.log(`Found ${allFiles.length} feedback files\n`);
    
    // Process remaining students
    for (const student of needsMoreImport) {
      if (!studentIds[student.name]) {
        console.log(`Skipping ${student.name} - not found in database`);
        continue;
      }
      
      console.log(`\nProcessing ${student.name}:`);
      console.log('-'.repeat(60));
      
      const allFeedback = [];
      
      // Extract all feedback for this student
      for (const file of allFiles) {
        const entries = await extractAllStudentFeedback(file, student.firstName);
        if (entries.length > 0) {
          allFeedback.push(...entries.map(e => ({
            ...e,
            studentName: student.name,
            studentId: studentIds[student.name]
          })));
        }
      }
      
      console.log(`Found ${allFeedback.length} total entries in files`);
      
      // Check current count in database
      const currentCount = await pool.query(
        'SELECT COUNT(*) as count FROM parsed_student_feedback WHERE student_name = $1 AND instructor = $2',
        [student.name, 'Srijan']
      );
      console.log(`Currently in database: ${currentCount.rows[0].count}`);
      console.log(`Expected: ${student.expected}`);
      
      // Sort by unit and lesson
      allFeedback.sort((a, b) => {
        const unitA = parseInt(a.unit);
        const unitB = parseInt(b.unit);
        if (unitA !== unitB) return unitA - unitB;
        
        const lessonA = parseInt(a.lesson);
        const lessonB = parseInt(b.lesson);
        if (lessonA !== lessonB) return lessonA - lessonB;
        
        // If same unit and lesson, sort by index (occurrence order)
        return a.index - b.index;
      });
      
      // Insert all entries
      let inserted = 0;
      let updated = 0;
      
      for (const entry of allFeedback) {
        // Generate unique ID including the index for multiple entries in same file
        const uniqueId = crypto.createHash('md5').update(
          `${entry.studentName}_${entry.classCode}_${entry.unit}.${entry.lesson}_${entry.index}_${path.basename(entry.filePath)}_Srijan`
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
            motion = EXCLUDED.motion,
            topic = EXCLUDED.topic
          RETURNING (xmax = 0) AS inserted
        `;
        
        try {
          const result = await pool.query(insertQuery, [
            entry.studentId,                    // student_id
            entry.studentName,                  // student_name
            'secondary',                        // feedback_type
            entry.classCode,                    // class_code
            'PSD I',                           // class_name
            entry.unit,                        // unit_number
            entry.lesson,                      // lesson_number
            entry.motion,                      // topic
            entry.motion,                      // motion
            entry.comments,                    // teacher_comments
            JSON.stringify(entry.scores),      // rubric_scores
            entry.duration,                    // duration
            'Srijan',                          // instructor
            uniqueId,                          // unique_id
            content,                           // content
            entry.filePath                     // file_path
          ]);
          
          if (result.rows[0].inserted) {
            inserted++;
          } else {
            updated++;
          }
        } catch (err) {
          console.error(`  ❌ Error with Unit ${entry.unit}.${entry.lesson}: ${err.message}`);
        }
      }
      
      console.log(`  ✅ Inserted: ${inserted}, Updated: ${updated}`);
      
      // Verify final count
      const finalCount = await pool.query(
        'SELECT COUNT(*) as count FROM parsed_student_feedback WHERE student_name = $1 AND instructor = $2',
        [student.name, 'Srijan']
      );
      console.log(`  Final count in database: ${finalCount.rows[0].count}`);
    }
    
    // Final summary
    console.log('\n\n' + '='.repeat(70));
    console.log('=== FINAL SUMMARY ===');
    console.log('='.repeat(70));
    
    const summary = await pool.query(`
      SELECT 
        COUNT(DISTINCT student_name) as total_students,
        COUNT(*) as total_entries,
        COUNT(CASE WHEN motion IS NOT NULL AND motion != '' THEN 1 END) as with_motion
      FROM parsed_student_feedback
      WHERE instructor = 'Srijan'
      AND feedback_type = 'secondary'
    `);
    
    const stats = summary.rows[0];
    console.log(`Total students with feedback: ${stats.total_students}`);
    console.log(`Total feedback entries: ${stats.total_entries}`);
    console.log(`Entries with motions: ${stats.with_motion}`);
    console.log(`Motion coverage: ${((stats.with_motion / stats.total_entries) * 100).toFixed(1)}%`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the import
completeRemainingImports();