import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseExcelFile, validateCourseData, normalizeTime } from '@/lib/excel-parser'
import { db, findOne, insertOne } from '@/lib/postgres'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    
    const parseResult = parseExcelFile(buffer)
    
    if (parseResult.errors.length > 0) {
      return NextResponse.json({ 
        error: 'Parse errors occurred',
        details: parseResult.errors,
        success: false
      })
    }

    const validationErrors: string[] = []
    parseResult.courses.forEach((course, index) => {
      const courseErrors = validateCourseData(course)
      if (courseErrors.length > 0) {
        validationErrors.push(`Course ${course.code}: ${courseErrors.join(', ')}`)
      }
    })

    if (validationErrors.length > 0) {
      return NextResponse.json({
        error: 'Validation errors occurred',
        details: validationErrors,
        success: false
      })
    }

    const isPreview = formData.get('preview') === 'true'
    if (isPreview) {
      return NextResponse.json({
        success: true,
        preview: true,
        data: parseResult
      })
    }

    try {
      const defaultPassword = 'changeme123'
      const passwordHash = await bcrypt.hash(defaultPassword, 12)
      
      const importResults = {
        coursesCreated: 0,
        studentsCreated: 0,
        enrollmentsCreated: 0,
        errors: [] as string[]
      }

      const studentIds = new Map<string, string>()
      
      for (const student of parseResult.students) {
        try {
          let existingUser = await findOne('users', { email: `${student.name.toLowerCase().replace(/\s+/g, '.')}@student.example.com` });

          if (existingUser) {
            studentIds.set(student.name, existingUser.id)
            continue
          }

          const newUser = await insertOne('users', {
            email: `${student.name.toLowerCase().replace(/\s+/g, '.')}@student.example.com`,
            name: student.name,
            role: 'student',
            password_hash: passwordHash
          });

          await insertOne('students', {
            id: newUser.id,
            student_number: `STU${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
          });

          studentIds.set(student.name, newUser.id)
          importResults.studentsCreated++

        } catch (error) {
          importResults.errors.push(`Failed to create student ${student.name}: ${error}`)
        }
      }

      const courseIds = new Map<string, string>()
      
      for (const course of parseResult.courses) {
        try {
          let existingCourse = await findOne('courses', { code: course.code });

          if (existingCourse) {
            courseIds.set(course.code, existingCourse.id)
            continue
          }

          const newCourse = await insertOne('courses', {
            code: course.code,
            name: `${course.day} ${course.grade_range} ${course.program_type}`,
            program_type: course.program_type,
            level: course.level,
            grade_range: course.grade_range,
            day_of_week: course.day,
            start_time: normalizeTime(course.time),
            instructor_id: session.user.id,
            max_students: course.students.length
          });

          courseIds.set(course.code, newCourse.id)
          importResults.coursesCreated++

        } catch (error) {
          importResults.errors.push(`Failed to create course ${course.code}: ${error}`)
        }
      }

      for (const course of parseResult.courses) {
        const courseId = courseIds.get(course.code)
        if (!courseId) continue

        for (const studentName of course.students) {
          const studentId = studentIds.get(studentName)
          if (!studentId) continue

          try {
            let existingEnrollment = await findOne('enrollments', { student_id: studentId, course_id: courseId });

            if (existingEnrollment) continue

            await insertOne('enrollments', {
              student_id: studentId,
              course_id: courseId,
              enrollment_date: new Date().toISOString().split('T')[0],
              status: 'active'
            });

            importResults.enrollmentsCreated++

          } catch (error) {
            importResults.errors.push(`Failed to enroll ${studentName} in ${course.code}: ${error}`)
          }
        }
      }

      return NextResponse.json({
        success: true,
        import: true,
        results: importResults,
        duplicateStudents: parseResult.duplicateStudents
      })

    } catch (error) {
      return NextResponse.json({
        error: 'Import failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Excel import error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      success: false
    }, { status: 500 })
  }
}
