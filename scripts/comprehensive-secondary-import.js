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

// Count all student occurrences in a file
async function countStudentsInFile(filePath) {
  try {
    const textResult = await mammoth.extractRawText({ path: filePath });
    const text = textResult.value;
    
    // Find all instances of "Student Name:"
    const studentMatches = text.match(/Student Name:\s*([^\n]+)/gi);
    const studentCounts = {};
    
    if (studentMatches) {
      studentMatches.forEach(match => {
        const name = match.replace(/Student Name:\s*/i, '').trim();
        if (name && name.length > 2 && name.length < 50) {
          // Extract just first name for counting
          const firstName = name.split(' ')[0];
          studentCounts[firstName] = (studentCounts[firstName] || 0) + 1;
        }
      });
    }
    
    return studentCounts;
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);
    return {};
  }
}

// Extract all feedback for a student name (including variations)
async function extractAllStudentFeedback(filePath, studentFirstName) {
  try {
    const [htmlResult, textResult] = await Promise.all([
      mammoth.convertToHtml({ path: filePath }),
      mammoth.extractRawText({ path: filePath })
    ]);
    
    const html = htmlResult.value;
    const text = textResult.value;
    
    const feedbackEntries = [];
    
    // Find all occurrences of the student name
    const searchPatterns = [
      new RegExp(`Student Name:\\s*${studentFirstName}\\b`, 'gi'),
      new RegExp(`Student Name:\\s*<\\/strong>\\s*${studentFirstName}\\b`, 'gi'),
      new RegExp(`<strong>Student Name:\\s*<\\/strong>\\s*${studentFirstName}\\b`, 'gi')
    ];
    
    let indices = [];
    searchPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        indices.push(match.index);
      }
    });
    
    // Sort indices to process in order
    indices = [...new Set(indices)].sort((a, b) => a - b);
    
    // Process each occurrence
    for (let i = 0; i < indices.length; i++) {
      const startIndex = indices[i];
      const endIndex = i < indices.length - 1 ? indices[i + 1] : html.length;
      
      // Also check for next "Student Name:" pattern
      const nextStudentMatch = html.substring(startIndex + 20).search(/Student Name:/i);
      const actualEndIndex = nextStudentMatch > 0 
        ? Math.min(endIndex, startIndex + 20 + nextStudentMatch)
        : endIndex;
      
      const studentHtml = html.substring(startIndex, actualEndIndex);
      
      // Extract motion from text
      let motion = null;
      const textMatch = text.match(new RegExp(`Student Name:\\s*${studentFirstName}[^\\n]*\\n([^\\n]+)`, 'i'));
      if (textMatch && textMatch[1]) {
        const potentialMotion = textMatch[1].trim();
        if (potentialMotion.length > 10 && !potentialMotion.includes('Teacher comments')) {
          motion = potentialMotion;
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
      
      // Extract teacher comments
      const commentsMatch = studentHtml.match(/Teacher comments:[^<]*([^]+?)(?=<\/|$)/i);
      const comments = commentsMatch ? commentsMatch[1].replace(/<[^>]+>/g, '').trim() : null;
      
      // Extract duration
      const durationMatch = studentHtml.match(/(\d+:\d+)/);
      const duration = durationMatch ? durationMatch[1] : null;
      
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
        classCode: extractClassCode(filePath)
      });
    }
    
    return feedbackEntries;
    
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);
    return [];
  }
}

// Main comprehensive import function
async function comprehensiveSecondaryImport() {
  try {
    console.log('Starting COMPREHENSIVE secondary feedback import...\n');
    console.log('This will find ALL feedback entries for each student.\n');
    
    // Get all secondary students
    const studentsQuery = `
      SELECT id, name, grade 
      FROM students 
      WHERE grade LIKE 'Grade %' 
      AND CAST(SUBSTRING(grade FROM 7) AS INTEGER) >= 7
      ORDER BY name
    `;
    
    const studentsResult = await pool.query(studentsQuery);
    console.log(`Found ${studentsResult.rows.length} secondary students\n`);
    
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
    console.log(`Found ${allFiles.length} feedback files\n`);
    
    // First, count all feedback entries across all files
    console.log('Phase 1: Counting all feedback entries in files...');
    const totalFileCounts = {};
    
    for (const file of allFiles) {
      const counts = await countStudentsInFile(file);
      Object.entries(counts).forEach(([name, count]) => {
        totalFileCounts[name] = (totalFileCounts[name] || 0) + count;
      });
    }
    
    console.log('\nTotal feedback entries found in files:');
    Object.entries(totalFileCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([name, count]) => {
        console.log(`  ${name}: ${count} entries`);
      });
    
    // Count what's in database
    console.log('\n\nPhase 2: Comparing with database...');
    const dbCountsQuery = `
      SELECT 
        SPLIT_PART(student_name, ' ', 1) as first_name,
        COUNT(*) as count
      FROM parsed_student_feedback
      WHERE instructor = 'Srijan'
      AND feedback_type = 'secondary'
      GROUP BY SPLIT_PART(student_name, ' ', 1)
      ORDER BY first_name
    `;
    
    const dbCounts = await pool.query(dbCountsQuery);
    const dbCountMap = {};
    dbCounts.rows.forEach(row => {
      dbCountMap[row.first_name] = parseInt(row.count);
    });
    
    console.log('\nComparison (File vs Database):');
    console.log('First Name    | In Files | In DB | Difference');
    console.log('-'.repeat(50));
    
    const needsImport = [];
    
    Object.entries(totalFileCounts).forEach(([firstName, fileCount]) => {
      const dbCount = dbCountMap[firstName] || 0;
      const diff = fileCount - dbCount;
      console.log(
        `${firstName.padEnd(13)} | ${fileCount.toString().padStart(8)} | ${dbCount.toString().padStart(5)} | ${diff > 0 ? '+' : ''}${diff}`
      );
      
      if (diff > 0) {
        needsImport.push(firstName);
      }
    });
    
    console.log(`\n\nPhase 3: Importing missing feedback entries...`);
    console.log(`Students needing import: ${needsImport.length}`);
    
    // Process each student that needs import
    let totalImported = 0;
    
    for (const student of studentsResult.rows) {
      const firstName = student.name.split(' ')[0];
      
      // Skip if this student doesn't need import
      if (!needsImport.includes(firstName)) {
        continue;
      }
      
      console.log(`\n\nProcessing ${student.name} (${student.grade}):`);
      console.log('-'.repeat(60));
      
      const allFeedback = [];
      
      // Extract all feedback for this student
      for (const file of allFiles) {
        const entries = await extractAllStudentFeedback(file, firstName);
        if (entries.length > 0) {
          allFeedback.push(...entries.map(e => ({
            ...e,
            studentName: student.name,
            studentId: student.id
          })));
        }
      }
      
      console.log(`Found ${allFeedback.length} total entries in files`);
      
      // Sort by unit and lesson
      allFeedback.sort((a, b) => {
        const unitA = parseInt(a.unit);
        const unitB = parseInt(b.unit);
        if (unitA !== unitB) return unitA - unitB;
        
        const lessonA = parseInt(a.lesson);
        const lessonB = parseInt(b.lesson);
        return lessonA - lessonB;
      });
      
      // Insert all entries
      let inserted = 0;
      let updated = 0;
      
      for (const entry of allFeedback) {
        // Generate unique ID based on student, unit, lesson, and file path
        const uniqueId = crypto.createHash('md5').update(
          `${entry.studentName}_${entry.classCode}_${entry.unit}.${entry.lesson}_${entry.filePath}_Srijan`
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
          totalImported++;
        } catch (err) {
          console.error(`  ❌ Error with Unit ${entry.unit}.${entry.lesson}: ${err.message}`);
        }
      }
      
      console.log(`  ✅ Inserted: ${inserted}, Updated: ${updated}`);
    }
    
    // Final verification
    console.log('\n\n' + '='.repeat(70));
    console.log('=== FINAL VERIFICATION ===');
    console.log('='.repeat(70));
    
    const finalQuery = `
      SELECT 
        SPLIT_PART(student_name, ' ', 1) as first_name,
        COUNT(*) as db_count
      FROM parsed_student_feedback
      WHERE instructor = 'Srijan'
      AND feedback_type = 'secondary'
      GROUP BY SPLIT_PART(student_name, ' ', 1)
      ORDER BY first_name
    `;
    
    const finalResult = await pool.query(finalQuery);
    
    console.log('\nFinal counts:');
    console.log('First Name    | In Files | In DB | Status');
    console.log('-'.repeat(50));
    
    finalResult.rows.forEach(row => {
      const fileCount = totalFileCounts[row.first_name] || 0;
      const dbCount = parseInt(row.db_count);
      const status = fileCount === dbCount ? '✅ Complete' : `⚠️  Missing ${fileCount - dbCount}`;
      
      console.log(
        `${row.first_name.padEnd(13)} | ${fileCount.toString().padStart(8)} | ${dbCount.toString().padStart(5)} | ${status}`
      );
    });
    
    console.log(`\nTotal entries imported/updated: ${totalImported}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the comprehensive import
comprehensiveSecondaryImport();