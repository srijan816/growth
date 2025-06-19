import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseExcelFile, validateCourseData, normalizeTime } from '@/lib/excel-parser'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer())
    
    // Parse Excel file
    const parseResult = parseExcelFile(buffer)
    
    if (parseResult.errors.length > 0) {
      return NextResponse.json({ 
        error: 'Parse errors occurred',
        details: parseResult.errors,
        success: false
      })
    }

    // Validate all courses
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

    // Return preview data if this is a preview request
    const isPreview = formData.get('preview') === 'true'
    if (isPreview) {
      return NextResponse.json({
        success: true,
        preview: true,
        data: parseResult
      })
    }

    // Begin transaction for data import
    try {
      // Create a default password hash for all new users
      const defaultPassword = 'changeme123'
      const passwordHash = await bcrypt.hash(defaultPassword, 12)
      
      const importResults = {
        coursesCreated: 0,
        studentsCreated: 0,
        enrollmentsCreated: 0,
        errors: [] as string[]
      }

      // Import students first
      const studentIds = new Map<string, string>()
      
      for (const student of parseResult.students) {
        try {
          // Check if student already exists
          const { data: existingUser } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('email', `${student.name.toLowerCase().replace(/\s+/g, '.')}@student.example.com`)
            .single()

          if (existingUser) {
            studentIds.set(student.name, existingUser.id)
            continue
          }

          // Create user record
          const { data: newUser, error: userError } = await supabaseAdmin
            .from('users')
            .insert({
              email: `${student.name.toLowerCase().replace(/\s+/g, '.')}@student.example.com`,
              name: student.name,
              role: 'student',
              password_hash: passwordHash
            })
            .select('id')
            .single()

          if (userError) throw userError

          // Create student record
          const { error: studentError } = await supabaseAdmin
            .from('students')
            .insert({
              id: newUser.id,
              student_number: `STU${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
            })

          if (studentError) throw studentError

          studentIds.set(student.name, newUser.id)
          importResults.studentsCreated++

        } catch (error) {
          importResults.errors.push(`Failed to create student ${student.name}: ${error}`)
        }
      }

      // Import courses
      const courseIds = new Map<string, string>()
      
      for (const course of parseResult.courses) {
        try {
          // Check if course already exists
          const { data: existingCourse } = await supabaseAdmin
            .from('courses')
            .select('id')
            .eq('code', course.code)
            .single()

          if (existingCourse) {
            courseIds.set(course.code, existingCourse.id)
            continue
          }

          // Create course record
          const { data: newCourse, error: courseError } = await supabaseAdmin
            .from('courses')
            .insert({
              code: course.code,
              name: `${course.day} ${course.grade_range} ${course.program_type}`,
              program_type: course.program_type,
              level: course.level,
              grade_range: course.grade_range,
              day_of_week: course.day,
              start_time: normalizeTime(course.time),
              instructor_id: session.user.id,
              max_students: course.students.length
            })
            .select('id')
            .single()

          if (courseError) throw courseError

          courseIds.set(course.code, newCourse.id)
          importResults.coursesCreated++

        } catch (error) {
          importResults.errors.push(`Failed to create course ${course.code}: ${error}`)
        }
      }

      // Create enrollments
      for (const course of parseResult.courses) {
        const courseId = courseIds.get(course.code)
        if (!courseId) continue

        for (const studentName of course.students) {
          const studentId = studentIds.get(studentName)
          if (!studentId) continue

          try {
            // Check if enrollment already exists
            const { data: existingEnrollment } = await supabaseAdmin
              .from('enrollments')
              .select('id')
              .eq('student_id', studentId)
              .eq('course_id', courseId)
              .single()

            if (existingEnrollment) continue

            // Create enrollment
            const { error: enrollmentError } = await supabaseAdmin
              .from('enrollments')
              .insert({
                student_id: studentId,
                course_id: courseId,
                enrollment_date: new Date().toISOString().split('T')[0],
                status: 'active'
              })

            if (enrollmentError) throw enrollmentError

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