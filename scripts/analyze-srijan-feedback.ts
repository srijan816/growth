import { FeedbackParser } from '../src/lib/feedback-parser'
import { db } from '../src/lib/postgres'
import path from 'path'

async function analyzeSrijanFeedback() {
  console.log('=== Analyzing Srijan\'s Secondary Feedback ===\n')
  
  try {
    // Initialize feedback parser
    const parser = new FeedbackParser('./data/Overall')
    
    // Parse all feedback files
    console.log('Parsing feedback files...')
    const result = await parser.parseAllFeedback()
    
    // Filter for Srijan's secondary feedback
    const srijanSecondaryFeedback = result.feedbacks.filter(f => 
      f.feedbackType === 'secondary' && 
      f.instructor === 'Srijan'
    )
    
    console.log(`Total feedback entries found: ${result.feedbacks.length}`)
    console.log(`Srijan's secondary feedback entries: ${srijanSecondaryFeedback.length}`)
    
    // Extract unique student names
    const uniqueStudentNames = new Set<string>()
    srijanSecondaryFeedback.forEach(f => {
      if (f.studentName) {
        uniqueStudentNames.add(f.studentName)
      }
    })
    
    console.log(`\nUnique students in Srijan's secondary feedback: ${uniqueStudentNames.size}`)
    console.log('\nStudent names found:')
    const feedbackStudents = Array.from(uniqueStudentNames).sort()
    feedbackStudents.forEach((name, index) => {
      console.log(`${index + 1}. ${name}`)
    })
    
    // Now get secondary students from database
    console.log('\n=== Checking Database for Secondary Students ===\n')
    
    const dbQuery = `
      SELECT DISTINCT
        s.id,
        u.name,
        s.grade_level,
        s.student_number
      FROM students s
      INNER JOIN users u ON s.id = u.id
      WHERE s.grade_level LIKE 'Grade %'
      AND CAST(REGEXP_REPLACE(s.grade_level, '[^0-9]', '', 'g') AS INTEGER) >= 7
      ORDER BY u.name
    `
    
    const dbResult = await db.query(dbQuery)
    console.log(`Secondary students in database: ${dbResult.rows.length}`)
    
    // Extract first names from database students
    const dbStudentFirstNames = new Map<string, any[]>()
    dbResult.rows.forEach(student => {
      const firstName = student.name.split(' ')[0]
      if (!dbStudentFirstNames.has(firstName)) {
        dbStudentFirstNames.set(firstName, [])
      }
      dbStudentFirstNames.get(firstName)!.push(student)
    })
    
    console.log('\n=== First Name Matching Analysis ===\n')
    
    // Check matches
    let matchCount = 0
    const matches: { feedbackName: string, dbStudents: any[] }[] = []
    const noMatches: string[] = []
    
    feedbackStudents.forEach(feedbackName => {
      const feedbackFirstName = feedbackName.split(' ')[0]
      
      if (dbStudentFirstNames.has(feedbackFirstName)) {
        matchCount++
        matches.push({
          feedbackName,
          dbStudents: dbStudentFirstNames.get(feedbackFirstName)!
        })
      } else {
        noMatches.push(feedbackName)
      }
    })
    
    console.log(`Total matches by first name: ${matchCount} out of ${feedbackStudents.length}`)
    console.log(`Match percentage: ${((matchCount / feedbackStudents.length) * 100).toFixed(1)}%`)
    
    console.log('\n=== Matched Students ===')
    matches.forEach(({ feedbackName, dbStudents }) => {
      console.log(`\nFeedback: ${feedbackName}`)
      dbStudents.forEach(dbStudent => {
        console.log(`  → DB: ${dbStudent.name} (${dbStudent.student_number}, ${dbStudent.grade_level})`)
      })
    })
    
    console.log('\n=== Students in Feedback but NOT in Database ===')
    noMatches.forEach((name, index) => {
      console.log(`${index + 1}. ${name}`)
    })
    
    // Also check for DB students not in feedback
    console.log('\n=== Secondary Students in Database but NOT in Srijan\'s Feedback ===')
    const feedbackFirstNames = new Set(feedbackStudents.map(name => name.split(' ')[0]))
    let notInFeedbackCount = 0
    
    dbResult.rows.forEach(student => {
      const firstName = student.name.split(' ')[0]
      if (!feedbackFirstNames.has(firstName)) {
        notInFeedbackCount++
        console.log(`${notInFeedbackCount}. ${student.name} (${student.student_number}, ${student.grade_level})`)
      }
    })
    
    // Summary statistics
    console.log('\n=== SUMMARY ===')
    console.log(`Srijan's secondary feedback files contain: ${uniqueStudentNames.size} unique students`)
    console.log(`Database contains: ${dbResult.rows.length} secondary students`)
    console.log(`Matched by first name: ${matchCount} students`)
    console.log(`In feedback but not in DB: ${noMatches.length} students`)
    console.log(`In DB but not in feedback: ${notInFeedbackCount} students`)
    
  } catch (error) {
    console.error('Error analyzing feedback:', error)
  } finally {
    await db.end()
  }
}

// Run the analysis
analyzeSrijanFeedback()