import { db } from '@/lib/postgres'

/**
 * Advances student grades by 1 on September 1st
 * Grade 4 -> Grade 5, Grade 6 -> Grade 7, etc.
 */
export async function advanceStudentGrades() {
  const client = await db.connect()
  
  try {
    await client.query('BEGIN')
    
    // Get current date
    const today = new Date()
    const currentYear = today.getFullYear()
    const transitionDate = new Date(currentYear, 8, 1) // September 1st (month is 0-indexed)
    
    // Check if we've already run advancement for this year
    const checkQuery = `
      SELECT COUNT(*) as count
      FROM grade_history 
      WHERE transition_date = $1
    `
    const checkResult = await client.query(checkQuery, [transitionDate])
    
    if (parseInt(checkResult.rows[0].count) > 0) {
      console.log('Grade advancement already completed for', transitionDate)
      await client.query('ROLLBACK')
      return { message: 'Grade advancement already completed for this year' }
    }
    
    // Get all students with numeric grades
    const studentsQuery = `
      SELECT id, grade_level, original_grade
      FROM students
      WHERE grade_level LIKE 'Grade %'
      AND grade_level != 'Grade 12' -- Don't advance Grade 12
    `
    const students = await client.query(studentsQuery)
    
    let advancedCount = 0
    
    for (const student of students.rows) {
      const currentGrade = student.grade_level
      const gradeNumber = parseInt(currentGrade.replace('Grade ', ''))
      
      if (!isNaN(gradeNumber)) {
        const newGradeNumber = gradeNumber + 1
        const newGrade = `Grade ${newGradeNumber}`
        
        // Record the transition in grade_history
        await client.query(`
          INSERT INTO grade_history (student_id, previous_grade, new_grade, transition_date)
          VALUES ($1, $2, $3, $4)
        `, [student.id, currentGrade, newGrade, transitionDate])
        
        // Update the student's current grade
        await client.query(`
          UPDATE students 
          SET grade_level = $1
          WHERE id = $2
        `, [newGrade, student.id])
        
        // If original_grade is not set, set it
        if (!student.original_grade) {
          await client.query(`
            UPDATE students 
            SET original_grade = $1
            WHERE id = $2
          `, [currentGrade, student.id])
        }
        
        advancedCount++
      }
    }
    
    await client.query('COMMIT')
    
    console.log(`Successfully advanced ${advancedCount} students to next grade`)
    return { 
      success: true, 
      advancedCount,
      transitionDate: transitionDate.toISOString()
    }
    
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Error advancing student grades:', error)
    throw error
  } finally {
    client.release()
  }
}

/**
 * Check if a student was in primary when feedback was given
 * Grade 6 and below = Primary
 * Grade 7 and above = Secondary
 */
export function isPrimaryGrade(grade: string): boolean {
  const gradeNumber = parseInt(grade?.replace('Grade ', '') || '0')
  return gradeNumber > 0 && gradeNumber <= 6
}

/**
 * Get the student's grade at a specific date
 */
export async function getStudentGradeAtDate(studentId: string, date: Date): Promise<string | null> {
  try {
    // First get the original grade
    const studentQuery = `
      SELECT original_grade, grade_level
      FROM students
      WHERE id = $1
    `
    const studentResult = await db.query(studentQuery, [studentId])
    
    if (studentResult.rows.length === 0) {
      return null
    }
    
    const { original_grade, grade_level } = studentResult.rows[0]
    
    // Get all grade transitions for this student up to the given date
    const historyQuery = `
      SELECT previous_grade, new_grade, transition_date
      FROM grade_history
      WHERE student_id = $1
      AND transition_date <= $2
      ORDER BY transition_date DESC
      LIMIT 1
    `
    const historyResult = await db.query(historyQuery, [studentId, date])
    
    if (historyResult.rows.length > 0) {
      // Return the most recent grade as of the given date
      return historyResult.rows[0].new_grade
    } else {
      // No transitions found, return original grade
      return original_grade || grade_level
    }
  } catch (error) {
    console.error('Error getting student grade at date:', error)
    return null
  }
}

/**
 * Categorize feedback based on the student's grade when it was created
 */
export async function categorizeFeedback(studentId: string, feedbackList: any[]): Promise<{
  primary: any[],
  secondary: any[]
}> {
  const primary: any[] = []
  const secondary: any[] = []
  
  for (const feedback of feedbackList) {
    const feedbackDate = new Date(feedback.created_at || feedback.parsed_at)
    const gradeAtTime = await getStudentGradeAtDate(studentId, feedbackDate)
    
    if (gradeAtTime && isPrimaryGrade(gradeAtTime)) {
      primary.push({
        ...feedback,
        grade_at_time: gradeAtTime
      })
    } else {
      secondary.push({
        ...feedback,
        grade_at_time: gradeAtTime
      })
    }
  }
  
  return { primary, secondary }
}