import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import * as XLSX from 'xlsx'
import bcrypt from 'bcryptjs'
import { pool } from '@/lib/postgres'

interface CourseData {
  code: string
  name: string
  level: string
  type: string
  studentCount: number
}

interface StudentEnrollment {
  studentId: string
  name: string
  grade: string
  school: string
  startLesson: string
  endLesson: string
  status: string
}

export async function POST(request: NextRequest) {
  const client = await pool.connect()
  
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const firstFile = formData.get('firstFile') as File
    const secondFile = formData.get('secondFile') as File
    
    if (!firstFile || !secondFile) {
      return NextResponse.json({ error: 'Both Excel files are required' }, { status: 400 })
    }

    // Parse first.xlsx
    const firstBuffer = Buffer.from(await firstFile.arrayBuffer())
    const firstWorkbook = XLSX.read(firstBuffer, { type: 'buffer' })
    const coursesSheet = firstWorkbook.Sheets['Courses']
    const coursesData = XLSX.utils.sheet_to_json(coursesSheet, { header: 1 }) as any[][]

    // Parse courses
    const courses: CourseData[] = []
    for (let i = 1; i < coursesData.length; i++) {
      const row = coursesData[i]
      if (row && row[1] === 'Active') {
        courses.push({
          code: row[2],
          name: row[3],
          level: row[4],
          type: row[5],
          studentCount: parseInt(row[6]) || 0
        })
      }
    }

    // Parse second.xlsx
    const secondBuffer = Buffer.from(await secondFile.arrayBuffer())
    const secondWorkbook = XLSX.read(secondBuffer, { type: 'buffer' })

    await client.query('BEGIN')

    const results = {
      coursesCreated: 0,
      coursesUpdated: 0,
      studentsCreated: 0,
      studentsUpdated: 0,
      enrollmentsCreated: 0,
      errors: [] as string[]
    }

    // Create a default password for new student accounts
    const defaultPassword = await bcrypt.hash('changeme123', 12)

    // Process each course
    for (const course of courses) {
      try {
        // Determine program type and level from course data
        const programType = course.name.includes('PSD II') ? 'PSD II' : 'PSD I'
        const level = course.level.includes('G7') || course.level.includes('G8') || course.level.includes('G9') 
          ? 'Secondary' 
          : 'Primary'
        
        // Extract day and time (would need to be provided or determined from schedule)
        // For now, using defaults
        const dayOfWeek = 'Monday' // This would need to be extracted from actual schedule
        const startTime = '18:00:00' // Default time
        
        // Check if course exists
        const existingCourse = await client.query(
          'SELECT id FROM courses WHERE code = $1',
          [course.code]
        )

        if (existingCourse.rows.length === 0) {
          // Create course
          await client.query(
            `INSERT INTO courses (code, name, program_type, level, grade_range, day_of_week, start_time, 
             instructor_id, max_students, status, course_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active', $10)`,
            [
              course.code,
              course.name,
              programType,
              level,
              course.level,
              dayOfWeek,
              startTime,
              session.user.id,
              course.studentCount,
              course.type
            ]
          )
          results.coursesCreated++
        } else {
          // Update course
          await client.query(
            `UPDATE courses 
             SET name = $2, program_type = $3, level = $4, grade_range = $5, 
                 max_students = $6, course_type = $7
             WHERE code = $1`,
            [
              course.code,
              course.name,
              programType,
              level,
              course.level,
              course.studentCount,
              course.type
            ]
          )
          results.coursesUpdated++
        }

        // Process students for this course
        const sheetName = course.code
        if (!secondWorkbook.Sheets[sheetName]) {
          results.errors.push(`No student data found for course ${course.code}`)
          continue
        }

        const sheet = secondWorkbook.Sheets[sheetName]
        const studentData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][]

        for (let i = 1; i < studentData.length; i++) {
          const row = studentData[i]
          if (!row || !row[1]) continue

          const studentEnrollment: StudentEnrollment = {
            studentId: row[1].toString(),
            name: row[2]?.toString() || '',
            grade: row[3]?.toString() || '',
            school: row[4]?.toString() || '',
            startLesson: row[5]?.toString() || '',
            endLesson: row[6]?.toString() || '',
            status: row[7]?.toString() || ''
          }

          // Skip if student ID is invalid
          if (studentEnrollment.studentId === 'Student ID' || !studentEnrollment.name) {
            continue
          }

          try {
            // Check if student exists
            const existingStudent = await client.query(
              'SELECT id FROM students WHERE student_number = $1',
              [studentEnrollment.studentId]
            )

            let studentUserId: string

            if (existingStudent.rows.length === 0) {
              // Create user account first
              const email = `${studentEnrollment.studentId.toLowerCase()}@student.capstone.com`
              
              const userResult = await client.query(
                `INSERT INTO users (email, name, role, password_hash)
                 VALUES ($1, $2, 'student', $3)
                 RETURNING id`,
                [email, studentEnrollment.name, defaultPassword]
              )
              
              studentUserId = userResult.rows[0].id

              // Create student record
              await client.query(
                `INSERT INTO students (id, student_number, grade_level, school, email)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                  studentUserId,
                  studentEnrollment.studentId,
                  studentEnrollment.grade,
                  studentEnrollment.school,
                  email
                ]
              )
              results.studentsCreated++
            } else {
              studentUserId = existingStudent.rows[0].id
              
              // Update student information
              await client.query(
                `UPDATE students 
                 SET grade_level = $2, school = $3
                 WHERE student_number = $1`,
                [studentEnrollment.studentId, studentEnrollment.grade, studentEnrollment.school]
              )
              
              // Update user name if different
              await client.query(
                `UPDATE users SET name = $2 WHERE id = $1`,
                [studentUserId, studentEnrollment.name]
              )
              
              results.studentsUpdated++
            }

            // Get course ID
            const courseResult = await client.query(
              'SELECT id FROM courses WHERE code = $1',
              [course.code]
            )
            
            if (courseResult.rows.length === 0) {
              results.errors.push(`Course ${course.code} not found for enrollment`)
              continue
            }

            const courseId = courseResult.rows[0].id

            // Check if enrollment exists
            const existingEnrollment = await client.query(
              'SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2',
              [studentUserId, courseId]
            )

            if (existingEnrollment.rows.length === 0) {
              // Create enrollment
              const enrollmentStatus = studentEnrollment.status === 'Re-Assign' ? 'active' : 'pending'
              
              await client.query(
                `INSERT INTO enrollments (student_id, course_id, enrollment_date, status, 
                 start_lesson, end_lesson)
                 VALUES ($1, $2, CURRENT_DATE, $3, $4, $5)`,
                [
                  studentUserId,
                  courseId,
                  enrollmentStatus,
                  studentEnrollment.startLesson || null,
                  studentEnrollment.endLesson || null
                ]
              )
              results.enrollmentsCreated++
            }

          } catch (error) {
            results.errors.push(`Error processing student ${studentEnrollment.name}: ${error}`)
          }
        }

      } catch (error) {
        results.errors.push(`Error processing course ${course.code}: ${error}`)
      }
    }

    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      results,
      summary: {
        totalCourses: results.coursesCreated + results.coursesUpdated,
        totalStudents: results.studentsCreated + results.studentsUpdated,
        totalEnrollments: results.enrollmentsCreated,
        hasErrors: results.errors.length > 0
      }
    })

  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Import error:', error)
    return NextResponse.json({
      error: 'Import failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  } finally {
    client.release()
  }
}