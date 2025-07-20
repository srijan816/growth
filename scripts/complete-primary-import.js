const { Pool } = require('pg');
const mammoth = require('mammoth');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const pool = new Pool({
  connectionString: 'postgresql://tikaram@localhost:5432/growth_compass'
});

// Same helper functions as before
function extractClassCode(filePath) {
  const match = filePath.match(/\b(\d{2}[A-Z]{5}\d{4})\b/);
  return match ? match[1] : 'UNKNOWN';
}

function extractUnitLesson(filePath) {
  const basename = path.basename(filePath);
  const patterns = [
    /(\d+)[._](\d+)/,
    /Unit\s*(\d+).*?(\d+)/i,
    /Day\s*(\d+)/i,
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

function extractInstructor(filePath) {
  if (filePath.includes('/Intensives/')) return 'Intensives';
  if (filePath.includes('/Jami/')) return 'Jami';
  if (filePath.includes('/Saurav/')) return 'Saurav';
  if (filePath.includes('/Srijan/')) return 'Srijan';
  return 'Unknown';
}

async function extractPrimaryStudentFeedback(filePath, studentFirstName) {
  try {
    const textResult = await mammoth.extractRawText({ path: filePath });
    const text = textResult.value;
    
    const feedbackEntries = [];
    
    const regex = new RegExp(`Student:\\s*${studentFirstName}\\b`, 'gi');
    let match;
    const indices = [];
    
    while ((match = regex.exec(text)) !== null) {
      indices.push(match.index);
    }
    
    for (let i = 0; i < indices.length; i++) {
      const startIndex = indices[i];
      const endIndex = i < indices.length - 1 ? indices[i + 1] : text.length;
      
      const nextStudentIdx = text.substring(startIndex + 20).search(/Student:/i);
      const actualEndIndex = nextStudentIdx > 0 
        ? Math.min(endIndex, startIndex + 20 + nextStudentIdx)
        : endIndex;
      
      const studentSection = text.substring(startIndex, actualEndIndex);
      
      const topicMatch = studentSection.match(/Topic:\s*([^\n]+)/i);
      const topic = topicMatch ? topicMatch[1].trim() : null;
      
      const timeMatch = studentSection.match(/Speaking time:\s*(\d+:\d+(?:\.\d+)?)/i);
      const duration = timeMatch ? timeMatch[1] : null;
      
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

async function completeRemainingPrimaryImport() {
  try {
    console.log('Completing remaining primary feedback import...\n');
    
    // Get students already imported
    const importedResult = await pool.query(`
      SELECT DISTINCT student_name 
      FROM parsed_student_feedback 
      WHERE feedback_type = 'primary'
    `);
    const importedNames = new Set(importedResult.rows.map(r => r.student_name));
    
    // Load the analysis file
    const analysisPath = path.join(__dirname, 'primary-students-analysis.json');
    const analysis = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));
    const nonConflictingStudents = analysis.nonConflictingStudents;
    
    // Filter out already imported
    const remainingStudents = nonConflictingStudents.filter(s => !importedNames.has(s.name));
    
    console.log(`Already imported: ${importedNames.size} students`);
    console.log(`Remaining to import: ${remainingStudents.length} students\n`);
    
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
    
    // Process remaining students
    let totalImported = 0;
    let studentsWithFeedback = 0;
    
    for (const student of remainingStudents) {
      const feedbackEntries = [];
      
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
        
        feedbackEntries.sort((a, b) => {
          const unitA = parseInt(a.unit);
          const unitB = parseInt(b.unit);
          if (unitA !== unitB) return unitA - unitB;
          
          const lessonA = parseInt(a.lesson);
          const lessonB = parseInt(b.lesson);
          if (lessonA !== lessonB) return lessonA - lessonB;
          
          return a.index - b.index;
        });
        
        let inserted = 0;
        
        for (const entry of feedbackEntries) {
          const uniqueId = crypto.createHash('md5').update(
            `${entry.studentName}_${entry.classCode}_${entry.unit}.${entry.lesson}_${entry.index}_${path.basename(entry.filePath)}_${entry.instructor}_primary`
          ).digest('hex');
          
          const content = `Topic: ${entry.topic || 'N/A'}\nDuration: ${entry.duration || 'N/A'}\n\nWhat was BEST:\n${entry.whatWasGood || 'No feedback'}\n\nNeeds IMPROVEMENT:\n${entry.needsImprovement || 'No feedback'}`;
          
          const teacherComments = `What was BEST: ${entry.whatWasGood || 'No feedback'}\n\nNeeds IMPROVEMENT: ${entry.needsImprovement || 'No feedback'}`;
          
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
            ON CONFLICT (unique_id) DO NOTHING
          `;
          
          try {
            const result = await pool.query(insertQuery, [
              entry.studentId,
              entry.studentName,
              'primary',
              entry.classCode,
              'PSD Primary',
              entry.unit,
              entry.lesson,
              entry.topic,
              entry.topic,
              teacherComments,
              JSON.stringify(feedbackCategories),
              entry.duration,
              entry.instructor,
              uniqueId,
              content,
              entry.filePath
            ]);
            
            if (result.rowCount > 0) {
              inserted++;
              totalImported++;
            }
          } catch (err) {
            console.error(`  ❌ Error: ${err.message}`);
          }
        }
        
        console.log(`  ✅ Inserted ${inserted} entries`);
      }
    }
    
    // Final summary
    console.log('\n\n' + '='.repeat(70));
    console.log('=== FINAL SUMMARY ===');
    console.log('='.repeat(70));
    
    const finalStats = await pool.query(`
      SELECT 
        COUNT(DISTINCT student_name) as total_students,
        COUNT(*) as total_entries,
        COUNT(DISTINCT instructor) as instructors
      FROM parsed_student_feedback
      WHERE feedback_type = 'primary'
    `);
    
    const stats = finalStats.rows[0];
    console.log(`Total primary students with feedback: ${stats.total_students}`);
    console.log(`Total feedback entries: ${stats.total_entries}`);
    console.log(`Number of instructors: ${stats.instructors}`);
    
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

completeRemainingPrimaryImport();