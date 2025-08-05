import { executeQuery } from '../src/lib/postgres'

async function linkFeedbackToStudents() {
  console.log('=== Linking Feedback to Students ===\n')
  
  try {
    // Get all secondary students with their first names
    const studentsQuery = `
      SELECT 
        s.id,
        u.name,
        SPLIT_PART(u.name, ' ', 1) as first_name
      FROM students s
      INNER JOIN users u ON s.id = u.id
      WHERE s.grade_level LIKE 'Grade %'
      AND CAST(REGEXP_REPLACE(s.grade_level, '[^0-9]', '', 'g') AS INTEGER) >= 7
    `
    
    const students = await executeQuery(studentsQuery)
    
    // Create a map of first names to student IDs
    const firstNameToId = new Map<string, string>()
    students.rows.forEach(student => {
      firstNameToId.set(student.first_name, student.id)
    })
    
    // Get all feedback entries without student IDs
    const feedbackQuery = `
      SELECT 
        id,
        student_name,
        SPLIT_PART(student_name, ' ', 1) as first_name
      FROM parsed_student_feedback
      WHERE student_id IS NULL
      AND feedback_type = 'secondary'
      AND instructor = 'Srijan'
    `
    
    const feedbackEntries = await executeQuery(feedbackQuery)
    console.log(`Found ${feedbackEntries.rows.length} feedback entries to link\n`)
    
    let updatedCount = 0
    let notFoundCount = 0
    
    for (const feedback of feedbackEntries.rows) {
      const studentId = firstNameToId.get(feedback.first_name)
      
      if (studentId) {
        // Update the feedback entry with the student ID
        await executeQuery(
          `UPDATE parsed_student_feedback 
           SET student_id = $1 
           WHERE id = $2`,
          [studentId, feedback.id]
        )
        updatedCount++
        process.stdout.write('.')
      } else {
        notFoundCount++
        console.log(`\n⚠️  No match for: ${feedback.student_name}`)
      }
    }
    
    console.log(`\n\n✅ Successfully linked ${updatedCount} feedback entries`)
    console.log(`⚠️  Could not match ${notFoundCount} entries`)
    
    // Verify the results
    const verifyQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT student_id) as linked_students,
        COUNT(*) FILTER (WHERE student_id IS NULL) as unlinked
      FROM parsed_student_feedback
      WHERE feedback_type = 'secondary'
      AND instructor = 'Srijan'
    `
    
    const result = await executeQuery(verifyQuery)
    console.log('\n=== Final Status ===')
    console.log(`Total feedback entries: ${result.rows[0].total}`)
    console.log(`Linked to students: ${result.rows[0].linked_students} unique students`)
    console.log(`Still unlinked: ${result.rows[0].unlinked} entries`)
    
  } catch (error) {
    console.error('Error linking feedback:', error)
  }
}

// Run the linking process
linkFeedbackToStudents().catch(console.error)