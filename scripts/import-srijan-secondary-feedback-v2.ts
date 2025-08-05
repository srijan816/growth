import { FeedbackParser } from '../src/lib/feedback-parser'
import { executeQuery } from '../src/lib/postgres'
import path from 'path'

interface FeedbackImportResult {
  studentName: string
  studentId: string
  feedbackCount: number
  status: 'success' | 'error'
  error?: string
}

async function importSrijanSecondaryFeedback() {
  console.log('=== Importing Srijan\'s Secondary Feedback ===\n')
  
  const results: FeedbackImportResult[] = []
  
  try {
    // Initialize feedback parser
    const parser = new FeedbackParser('./data/Overall')
    
    // Parse all feedback files
    console.log('Parsing feedback files...')
    const parseResult = await parser.parseAllFeedback()
    
    // Filter for Srijan's secondary feedback
    const srijanSecondaryFeedback = parseResult.feedbacks.filter(f => 
      f.feedbackType === 'secondary' && 
      f.instructor === 'Srijan'
    )
    
    console.log(`Found ${srijanSecondaryFeedback.length} feedback entries from Srijan\n`)
    
    // Get all secondary students from database with their IDs
    const studentsQuery = `
      SELECT 
        s.id,
        u.name,
        s.student_number,
        s.grade_level
      FROM students s
      INNER JOIN users u ON s.id = u.id
      WHERE s.grade_level LIKE 'Grade %'
      AND CAST(REGEXP_REPLACE(s.grade_level, '[^0-9]', '', 'g') AS INTEGER) >= 7
      ORDER BY u.name
    `
    
    const studentsResult = await executeQuery(studentsQuery)
    console.log(`Found ${studentsResult.rows.length} secondary students in database\n`)
    
    // Create a map of first names to student records
    const studentsByFirstName = new Map<string, any>()
    studentsResult.rows.forEach(student => {
      const firstName = student.name.split(' ')[0]
      studentsByFirstName.set(firstName, student)
    })
    
    // Group feedback by student
    const feedbackByStudent = new Map<string, any[]>()
    srijanSecondaryFeedback.forEach(feedback => {
      const firstName = feedback.studentName.split(' ')[0]
      if (!feedbackByStudent.has(firstName)) {
        feedbackByStudent.set(firstName, [])
      }
      feedbackByStudent.get(firstName)!.push(feedback)
    })
    
    // Import feedback for each student
    console.log('Importing feedback for each student...\n')
    
    for (const [firstName, feedbackList] of feedbackByStudent) {
      const student = studentsByFirstName.get(firstName)
      
      if (!student) {
        console.log(`⚠️  Skipping ${firstName} - not found in database`)
        continue
      }
      
      console.log(`\n📚 Processing ${student.name} (${student.student_number})`)
      console.log(`   Found ${feedbackList.length} feedback entries`)
      
      let importedCount = 0
      let errorCount = 0
      
      for (const feedback of feedbackList) {
        try {
          // Prepare metadata including rubric scores
          const metadata: any = {
            rubric_scores: feedback.rubricScores || {},
            motion: feedback.motion,
            duration: feedback.duration,
            unit_number: feedback.unitNumber,
            lesson_number: feedback.lessonNumber,
            file_path: feedback.filePath,
            instructor: feedback.instructor
          }
          
          // Extract teacher comments from content
          let teacherComments = ''
          if (feedback.content.includes('TEACHER COMMENTS:')) {
            const commentStart = feedback.content.indexOf('TEACHER COMMENTS:') + 'TEACHER COMMENTS:'.length
            teacherComments = feedback.content.substring(commentStart).trim()
          }
          
          // Check if this feedback already exists
          const checkQuery = `
            SELECT id FROM parsed_student_feedback
            WHERE student_id = $1
            AND class_code = $2
            AND unit_number = $3
            AND lesson_number = $4
            AND feedback_type = 'secondary'
            LIMIT 1
          `
          
          const existing = await executeQuery(checkQuery, [
            student.id,
            feedback.classCode || 'N/A',
            parseInt(feedback.unitNumber) || 0,
            parseInt(feedback.lessonNumber) || 0
          ])
          
          if (existing.rows.length > 0) {
            console.log(`   ⏭️  Skipping - already exists (Unit ${feedback.unitNumber}, Lesson ${feedback.lessonNumber})`)
            continue
          }
          
          // Insert feedback into database
          const insertQuery = `
            INSERT INTO parsed_student_feedback (
              id,
              student_id,
              student_name,
              class_code,
              class_name,
              unit_number,
              lesson_number,
              topic,
              motion,
              feedback_type,
              duration,
              rubric_scores,
              teacher_comments,
              metadata,
              original_file_path,
              instructor_id,
              created_at,
              parsed_at
            ) VALUES (
              gen_random_uuid(),
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
            )
          `
          
          await executeQuery(insertQuery, [
            student.id,                           // student_id
            student.name,                         // student_name
            feedback.classCode || 'N/A',          // class_code
            feedback.className || 'N/A',          // class_name
            parseInt(feedback.unitNumber) || 0,   // unit_number
            parseInt(feedback.lessonNumber) || 0, // lesson_number
            feedback.topic || null,               // topic
            feedback.motion || null,              // motion
            'secondary',                          // feedback_type
            feedback.duration || null,            // duration
            JSON.stringify(metadata.rubric_scores), // rubric_scores
            teacherComments || null,              // teacher_comments
            JSON.stringify(metadata),             // metadata
            feedback.filePath,                    // original_file_path
            null,                                 // instructor_id (we don't have instructor IDs in users table)
            feedback.extractedAt,                 // created_at
            new Date()                           // parsed_at
          ])
          
          importedCount++
          process.stdout.write('.')
          
        } catch (error: any) {
          errorCount++
          console.error(`\n   ❌ Error importing feedback: ${error.message}`)
        }
      }
      
      console.log(`\n   ✅ Imported ${importedCount} feedback entries`)
      if (errorCount > 0) {
        console.log(`   ❌ Failed to import ${errorCount} entries`)
      }
      
      results.push({
        studentName: student.name,
        studentId: student.id,
        feedbackCount: importedCount,
        status: errorCount === 0 ? 'success' : 'error',
        error: errorCount > 0 ? `${errorCount} entries failed` : undefined
      })
    }
    
    console.log('\n\n✅ Import process completed!')
    
    // Print summary
    console.log('\n=== IMPORT SUMMARY ===\n')
    const successCount = results.filter(r => r.status === 'success').length
    const totalFeedback = results.reduce((sum, r) => sum + r.feedbackCount, 0)
    
    console.log(`Students processed: ${results.length}`)
    console.log(`Successful imports: ${successCount}`)
    console.log(`Total feedback imported: ${totalFeedback}`)
    
    // List any errors
    const errors = results.filter(r => r.status === 'error')
    if (errors.length > 0) {
      console.log('\n⚠️  Students with errors:')
      errors.forEach(e => {
        console.log(`   - ${e.studentName}: ${e.error}`)
      })
    }
    
    // Verify import by checking a sample
    console.log('\n=== VERIFICATION ===\n')
    const verifyQuery = `
      SELECT 
        COUNT(*) as total_feedback,
        COUNT(DISTINCT student_id) as unique_students
      FROM parsed_student_feedback
      WHERE feedback_type = 'secondary'
      AND instructor_id IS NULL
      AND metadata->>'instructor' = 'Srijan'
    `
    
    const verifyResult = await executeQuery(verifyQuery)
    console.log(`Database now contains:`)
    console.log(`- ${verifyResult.rows[0].total_feedback} secondary feedback entries from Srijan`)
    console.log(`- For ${verifyResult.rows[0].unique_students} unique students`)
    
    // Show a sample student's feedback
    console.log('\n=== SAMPLE FEEDBACK ===\n')
    const sampleQuery = `
      SELECT 
        s.student_number,
        u.name as student_name,
        f.unit_number,
        f.lesson_number,
        f.motion,
        f.rubric_scores,
        f.duration
      FROM parsed_student_feedback f
      JOIN students s ON f.student_id = s.id
      JOIN users u ON s.id = u.id
      WHERE f.feedback_type = 'secondary'
      AND f.metadata->>'instructor' = 'Srijan'
      ORDER BY u.name, f.unit_number, f.lesson_number
      LIMIT 5
    `
    
    const sampleResult = await executeQuery(sampleQuery)
    console.log('Sample feedback entries:')
    sampleResult.rows.forEach((row: any) => {
      console.log(`\n${row.student_name} (${row.student_number}) - Unit ${row.unit_number}.${row.lesson_number}`)
      console.log(`Motion: ${row.motion || 'N/A'}`)
      console.log(`Duration: ${row.duration || 'N/A'}`)
      if (row.rubric_scores) {
        const scores = JSON.parse(row.rubric_scores)
        const scoreValues = Object.values(scores).filter((s: any) => s > 0)
        if (scoreValues.length > 0) {
          const avgScore = scoreValues.reduce((a: number, b: any) => a + b, 0) / scoreValues.length
          console.log(`Rubric Average: ${avgScore.toFixed(1)}/5`)
        }
      }
    })
    
  } catch (error) {
    console.error('\n❌ Error during import:', error)
  }
}

// Run the import
importSrijanSecondaryFeedback().catch(console.error)