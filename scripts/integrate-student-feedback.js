const { Pool } = require('pg');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://tikaram@localhost:5432/growth_compass'
});

// Extract feedback from a file for a specific student
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
    const motion = motionMatch ? motionMatch[1].trim() : 'NOT FOUND';
    
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
      if (!found) scores[rubric.name] = null;
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
    const unit = unitMatch ? unitMatch[1] : null;
    const lesson = unitMatch ? unitMatch[2] : null;
    
    return {
      studentName,
      motion,
      scores,
      comments,
      duration,
      unit,
      lesson,
      filePath
    };
    
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);
    return null;
  }
}

// Main integration function
async function integrateStudentFeedback() {
  try {
    console.log('Starting feedback integration for secondary students...\n');
    
    // Step 1: Find Henry and Selena in secondary students
    const studentsQuery = `
      SELECT id, name, grade 
      FROM students 
      WHERE (name LIKE 'Henry%' OR name LIKE 'Selena%' OR name LIKE 'Selina%')
      AND grade ~ 'Grade [7-9]|Grade 1[0-2]'
      ORDER BY name
    `;
    
    const studentsResult = await pool.query(studentsQuery);
    console.log('Found secondary students:');
    studentsResult.rows.forEach(s => {
      console.log(`- ${s.name} (${s.grade}, ID: ${s.id.substring(0, 8)}...)`);
    });
    
    // Step 2: Find all Srijan's secondary feedback files
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
    
    // Step 3: Extract feedback for each student
    for (const student of studentsResult.rows) {
      console.log(`\nProcessing ${student.name}:`);
      console.log('=' .repeat(60));
      
      const feedbackEntries = [];
      
      // Check both exact name and variations
      const nameVariations = [student.name];
      if (student.name.includes('Selena')) {
        nameVariations.push('Selina');
      } else if (student.name.includes('Selina')) {
        nameVariations.push('Selena');
      }
      
      // Search for Henry by first name only (since all secondary have unique first names)
      if (student.name.startsWith('Henry')) {
        nameVariations.push('Henry');
      }
      
      for (const file of allFiles) {
        for (const nameVariant of nameVariations) {
          const feedback = await extractStudentFeedback(file, nameVariant);
          if (feedback) {
            feedbackEntries.push(feedback);
            break; // Don't check other variations if found
          }
        }
      }
      
      // Sort by unit and lesson
      feedbackEntries.sort((a, b) => {
        const unitA = parseInt(a.unit || '0');
        const unitB = parseInt(b.unit || '0');
        if (unitA !== unitB) return unitA - unitB;
        
        const lessonA = parseInt(a.lesson || '0');
        const lessonB = parseInt(b.lesson || '0');
        return lessonA - lessonB;
      });
      
      console.log(`Found ${feedbackEntries.length} feedback entries`);
      
      // Step 4: Insert feedback into database
      for (const entry of feedbackEntries) {
        console.log(`\nUnit ${entry.unit}.${entry.lesson}: ${entry.motion}`);
        console.log(`Duration: ${entry.duration || 'N/A'}`);
        console.log('Rubric Scores:', Object.entries(entry.scores)
          .filter(([k, v]) => v !== null)
          .map(([k, v]) => `${k}=${v}`)
          .join(', '));
        
        // Insert into parsed_student_feedback table
        const insertQuery = `
          INSERT INTO parsed_student_feedback (
            student_id,
            student_name,
            feedback_type,
            unit_number,
            lesson_number,
            topic,
            motion,
            strengths,
            improvement_areas,
            teacher_comments,
            rubric_scores,
            speech_duration,
            instructor,
            feedback_date,
            created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
          ON CONFLICT (unique_feedback_id) DO UPDATE SET
            rubric_scores = EXCLUDED.rubric_scores,
            teacher_comments = EXCLUDED.teacher_comments,
            updated_at = NOW()
        `;
        
        const rubricScoresJson = Object.keys(entry.scores).length > 0 ? entry.scores : null;
        
        try {
          await pool.query(insertQuery, [
            student.id,                    // student_id
            student.name,                  // student_name (use correct spelling from DB)
            'secondary',                   // feedback_type
            entry.unit,                    // unit_number
            entry.lesson,                  // lesson_number
            entry.motion,                  // topic
            entry.motion,                  // motion
            null,                         // strengths (extract from comments later)
            null,                         // improvement_areas (extract from comments later)
            entry.comments,               // teacher_comments
            rubricScoresJson,             // rubric_scores as JSON
            entry.duration,               // speech_duration
            'Srijan',                     // instructor
            new Date(),                   // feedback_date
          ]);
          
          console.log('✅ Inserted successfully');
        } catch (err) {
          console.error('❌ Insert error:', err.message);
        }
      }
    }
    
    console.log('\n\nFeedback integration complete!');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the integration
integrateStudentFeedback();