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

// Extract unit and lesson from file path
function extractUnitLesson(filePath) {
  const basename = path.basename(filePath);
  
  // Try various patterns
  const patterns = [
    /(\d+)[._](\d+)/,           // 2.4, 2_4
    /Unit\s*(\d+).*?(\d+)/i,    // Unit 6 ... 7.1
    /Day\s*(\d+)/i,             // Day 3 (use day as unit, lesson = 1)
  ];
  
  for (const pattern of patterns) {
    const match = basename.match(pattern);
    if (match) {
      return {
        unit: match[1],
        lesson: match[2] || '1'
      };
    }
  }
  
  return { unit: '0', lesson: '0' };
}

// Extract instructor from file path
function extractInstructor(filePath) {
  if (filePath.includes('/Intensives/')) return 'Intensives';
  if (filePath.includes('/Jami/')) return 'Jami';
  if (filePath.includes('/Saurav/')) return 'Saurav';
  if (filePath.includes('/Srijan/')) return 'Srijan';
  return 'Unknown';
}

// Extract feedback for primary students (different format)
async function extractPrimaryStudentFeedback(filePath, studentFirstName) {
  try {
    const textResult = await mammoth.extractRawText({ path: filePath });
    const text = textResult.value;
    
    const feedbackEntries = [];
    
    // Find all occurrences of "Student: FirstName"
    const regex = new RegExp(`Student:\\s*${studentFirstName}\\b`, 'gi');
    let match;
    const indices = [];
    
    while ((match = regex.exec(text)) !== null) {
      indices.push(match.index);
    }
    
    // Process each occurrence
    for (let i = 0; i < indices.length; i++) {
      const startIndex = indices[i];
      const endIndex = i < indices.length - 1 ? indices[i + 1] : text.length;
      
      // Find next "Student:" to ensure we don't overlap
      const nextStudentIdx = text.substring(startIndex + 20).search(/Student:/i);
      const actualEndIndex = nextStudentIdx > 0 
        ? Math.min(endIndex, startIndex + 20 + nextStudentIdx)
        : endIndex;
      
      const studentSection = text.substring(startIndex, actualEndIndex);
      
      // Extract topic/motion
      const topicMatch = studentSection.match(/Topic:\s*([^\n]+)/i);
      const topic = topicMatch ? topicMatch[1].trim() : null;
      
      // Extract speaking time
      const timeMatch = studentSection.match(/Speaking time:\s*(\d+:\d+(?:\.\d+)?)/i);
      const duration = timeMatch ? timeMatch[1] : null;
      
      // Extract what was good
      let whatWasGood = null;
      const goodPatterns = [
        /What was the BEST thing[^?]*\?\s*([^]+?)(?=What part|$)/i,
        /What went well[^?]*\?\s*([^]+?)(?=What|Areas|$)/i,
        /Strengths[^:]*:\s*([^]+?)(?=Areas|What|$)/i
      ];
      
      for (const pattern of goodPatterns) {
        const match = studentSection.match(pattern);
        if (match) {
          whatWasGood = match[1].trim();
          break;
        }
      }
      
      // Extract what needs improvement
      let needsImprovement = null;
      const improvementPatterns = [
        /What part[^?]*NEEDS IMPROVEMENT[^?]*\?\s*([^]+?)$/i,
        /Areas? for improvement[^:]*:\s*([^]+?)$/i,
        /What.*improve[^?]*\?\s*([^]+?)$/i
      ];
      
      for (const pattern of improvementPatterns) {
        const match = studentSection.match(pattern);
        if (match) {
          needsImprovement = match[1].trim();
          break;
        }
      }
      
      // Get unit/lesson info
      const { unit, lesson } = extractUnitLesson(filePath);
      
      feedbackEntries.push({
        studentFirstName,
        topic,
        duration,
        whatWasGood,
        needsImprovement,
        unit,
        lesson,
        filePath,
        classCode: extractClassCode(filePath),
        instructor: extractInstructor(filePath),
        index: i
      });
    }
    
    return feedbackEntries;
    
  } catch (error) {
    console.error(`Error processing ${filePath}: ${error.message}`);
    return [];
  }
}

// Main import function for primary students
async function importPrimaryFeedback() {
  try {
    console.log('Starting primary feedback import (non-conflicting students only)...\n');
    
    // Load the analysis file
    const analysisPath = path.join(__dirname, 'primary-students-analysis.json');
    if (!fs.existsSync(analysisPath)) {
      console.error('Please run analyze-primary-students.js first!');
      return;
    }
    
    const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
    const nonConflictingStudents = analysis.nonConflictingStudents;
    
    console.log(`Processing ${nonConflictingStudents.length} non-conflicting primary students\n`);
    
    // Find all primary feedback files
    const primaryDir = '/Users/tikaram/Downloads/claude-code/student-growth/growth-compass/data/Overall/Primary';
    
    function findDocxFiles(dir) {
      const files = [];
      if (!fs.existsSync(dir)) return files;
      
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('_')) {
          files.push(...findDocxFiles(fullPath));
        } else if (item.endsWith('.docx') && !item.startsWith('~$')) {
          files.push(fullPath);
        }
      }
      return files;
    }
    
    const allFiles = findDocxFiles(primaryDir);
    console.log(`Found ${allFiles.length} feedback files\n`);
    
    // Process each non-conflicting student
    let totalImported = 0;
    let studentsWithFeedback = 0;
    
    for (const student of nonConflictingStudents) {
      const feedbackEntries = [];
      
      // Search all files for this student
      for (const file of allFiles) {
        const entries = await extractPrimaryStudentFeedback(file, student.firstName);
        if (entries.length > 0) {
          feedbackEntries.push(...entries.map(e => ({
            ...e,
            studentName: student.name,
            studentId: student.id
          })));
        }
      }
      
      if (feedbackEntries.length > 0) {
        studentsWithFeedback++;
        console.log(`\nProcessing ${student.name} (${student.grade}):`);
        console.log(`Found ${feedbackEntries.length} feedback entries`);
        
        // Sort by unit and lesson
        feedbackEntries.sort((a, b) => {
          const unitA = parseInt(a.unit);
          const unitB = parseInt(b.unit);
          if (unitA !== unitB) return unitA - unitB;
          
          const lessonA = parseInt(a.lesson);
          const lessonB = parseInt(b.lesson);
          if (lessonA !== lessonB) return lessonA - lessonB;
          
          return a.index - b.index;
        });
        
        // Insert into database
        let inserted = 0;
        
        for (const entry of feedbackEntries) {
          // Generate unique ID
          const uniqueId = crypto.createHash('md5').update(
            `${entry.studentName}_${entry.classCode}_${entry.unit}.${entry.lesson}_${entry.index}_${path.basename(entry.filePath)}_${entry.instructor}_primary`
          ).digest('hex');
          
          // Create content field
          const content = `Topic: ${entry.topic || 'N/A'}\nDuration: ${entry.duration || 'N/A'}\n\nWhat was BEST:\n${entry.whatWasGood || 'No feedback'}\n\nNeeds IMPROVEMENT:\n${entry.needsImprovement || 'No feedback'}`;
          
          // Create combined feedback for teacher_comments
          const teacherComments = `What was BEST: ${entry.whatWasGood || 'No feedback'}\n\nNeeds IMPROVEMENT: ${entry.needsImprovement || 'No feedback'}`;
          
          // Store feedback categories in rubric_scores as JSON
          const feedbackCategories = {
            what_was_good: entry.whatWasGood ? 'Yes' : 'No',
            needs_improvement: entry.needsImprovement ? 'Yes' : 'No'
          };
          
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
              teacher_comments = EXCLUDED.teacher_comments,
              duration = EXCLUDED.duration,
              content = EXCLUDED.content,
              topic = EXCLUDED.topic,
              rubric_scores = EXCLUDED.rubric_scores
          `;
          
          try {
            await pool.query(insertQuery, [
              entry.studentId,                      // student_id
              entry.studentName,                    // student_name
              'primary',                            // feedback_type
              entry.classCode,                      // class_code
              'PSD Primary',                        // class_name
              entry.unit,                           // unit_number
              entry.lesson,                         // lesson_number
              entry.topic,                          // topic
              entry.topic,                          // motion
              teacherComments,                      // teacher_comments
              JSON.stringify(feedbackCategories),   // rubric_scores (repurposed)
              entry.duration,                       // duration
              entry.instructor,                     // instructor
              uniqueId,                            // unique_id
              content,                             // content
              entry.filePath                       // file_path
            ]);
            
            inserted++;
            totalImported++;
          } catch (err) {
            console.error(`  ❌ Error: ${err.message}`);
          }
        }
        
        console.log(`  ✅ Inserted ${inserted} entries`);
      }
    }
    
    // Summary
    console.log('\n\n' + '='.repeat(70));
    console.log('=== IMPORT SUMMARY ===');
    console.log('='.repeat(70));
    console.log(`Non-conflicting students processed: ${nonConflictingStudents.length}`);
    console.log(`Students with feedback found: ${studentsWithFeedback}`);
    console.log(`Total entries imported: ${totalImported}`);
    
    // Show conflicting names that were skipped
    console.log('\n\nStudents skipped due to name conflicts:');
    analysis.conflictingGroups.forEach(group => {
      console.log(`- ${group.firstName}: ${group.students.map(s => s.name).join(', ')}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

// Run the import
importPrimaryFeedback();