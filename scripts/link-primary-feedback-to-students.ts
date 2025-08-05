import { db } from '../src/lib/postgres'

async function linkPrimaryFeedbackToStudents() {
  console.log('Linking primary feedback to students...\n')
  
  // Get all primary feedback without student_id
  const unlinkedFeedback = await db.query(`
    SELECT 
      id,
      student_name,
      feedback_type
    FROM parsed_student_feedback
    WHERE student_id IS NULL
      AND feedback_type = 'primary'
  `)
  
  console.log(`Found ${unlinkedFeedback.rows.length} unlinked primary feedback entries`)
  
  // Get all primary students with unique first names
  const students = await db.query(`
    WITH first_names AS (
      SELECT 
        s.id,
        u.name as full_name,
        SPLIT_PART(u.name, ' ', 1) as first_name,
        s.grade_level
      FROM students s
      JOIN users u ON s.id = u.id
      WHERE s.grade_level IN ('Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6')
    ),
    name_counts AS (
      SELECT first_name, COUNT(*) as count
      FROM first_names
      GROUP BY first_name
    )
    SELECT 
      fn.id,
      fn.full_name,
      fn.first_name,
      fn.grade_level
    FROM first_names fn
    JOIN name_counts nc ON fn.first_name = nc.first_name
    WHERE nc.count = 1
  `)
  
  // Create a map of first names to student IDs
  const studentMap = new Map<string, { id: string; full_name: string }>()
  students.rows.forEach(s => {
    studentMap.set(s.first_name.toLowerCase(), { 
      id: s.id, 
      full_name: s.full_name 
    })
  })
  
  let linkedCount = 0
  let skippedCount = 0
  
  // Process each unlinked feedback
  for (const feedback of unlinkedFeedback.rows) {
    const feedbackFirstName = feedback.student_name.split(' ')[0].toLowerCase()
    const student = studentMap.get(feedbackFirstName)
    
    if (student) {
      // Update the feedback with the student_id
      await db.query(`
        UPDATE parsed_student_feedback
        SET 
          student_id = $1,
          student_name = $2
        WHERE id = $3
      `, [student.id, student.full_name, feedback.id])
      
      linkedCount++
      console.log(`✅ Linked feedback for ${student.full_name}`)
    } else {
      skippedCount++
      console.log(`⚠️  Skipped feedback for ${feedback.student_name} (no unique match or duplicate first name)`)
    }
  }
  
  console.log('\n\nLinking Summary:')
  console.log('================')
  console.log(`Total unlinked feedback: ${unlinkedFeedback.rows.length}`)
  console.log(`Successfully linked: ${linkedCount}`)
  console.log(`Skipped (duplicates or not found): ${skippedCount}`)
  
  // Verify Nathaniel specifically
  const nathanielCheck = await db.query(`
    SELECT 
      COUNT(*) as count
    FROM parsed_student_feedback
    WHERE student_id = (
      SELECT id FROM students s
      JOIN users u ON s.id = u.id
      WHERE LOWER(u.name) LIKE '%nathaniel%'
      LIMIT 1
    )
  `)
  
  console.log(`\nNathaniel now has ${nathanielCheck.rows[0].count} feedback entries`)
  
  process.exit(0)
}

linkPrimaryFeedbackToStudents().catch(console.error)