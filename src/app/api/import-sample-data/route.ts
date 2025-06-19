import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseExcelFile } from '@/lib/excel-parser'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import fs from 'fs/promises'
import path from 'path'

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Read the sample Excel file
    const filePath = path.join(process.cwd(), '../../../../student_name.xlsx')
    let buffer: Buffer
    
    try {
      // Try the relative path from the project root
      buffer = await fs.readFile('/Users/tikaram/Downloads/Claude Code/student-growth/student_name.xlsx')
    } catch (error) {
      return NextResponse.json({ 
        error: 'Sample file not found',
        details: 'Could not find student_name.xlsx file',
        path: filePath
      }, { status: 404 })
    }

    // Parse Excel file
    const parseResult = parseExcelFile(buffer)
    
    if (parseResult.errors.length > 0) {
      return NextResponse.json({ 
        error: 'Parse errors occurred',
        details: parseResult.errors
      }, { status: 400 })
    }

    // Clear existing data (except the instructor)
    await supabaseAdmin.from('attendances').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('class_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('enrollments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('courses').delete().neq('instructor_id', session.user.id)
    await supabaseAdmin.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('users').delete().eq('role', 'student')

    // Import data
    const defaultPassword = await bcrypt.hash('changeme123', 12)
    const importResults = {
      coursesCreated: 0,
      studentsCreated: 0,
      enrollmentsCreated: 0,
      summary: [] as string[]
    }

    // Create all students first
    const studentIds = new Map<string, string>()
    
    for (const student of parseResult.students) {
      const email = `${student.name.toLowerCase().replace(/\s+/g, '.')}@student.example.com`
      
      // Create user record
      const { data: newUser, error: userError } = await supabaseAdmin
        .from('users')
        .insert({
          email,
          name: student.name,
          role: 'student',
          password_hash: defaultPassword
        })
        .select('id')
        .single()

      if (userError) {
        console.error(`Failed to create user for ${student.name}:`, userError)
        continue
      }

      // Create student record
      const { error: studentError } = await supabaseAdmin
        .from('students')
        .insert({
          id: newUser.id,
          student_number: `STU${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
        })

      if (!studentError) {
        studentIds.set(student.name, newUser.id)
        importResults.studentsCreated++
      }
    }

    // Create all courses
    const courseIds = new Map<string, string>()
    
    for (const course of parseResult.courses) {
      const { data: newCourse, error: courseError } = await supabaseAdmin
        .from('courses')
        .insert({
          code: course.code,
          name: `${course.day} ${course.grade_range} ${course.program_type}`,
          program_type: course.program_type,
          level: course.level,
          grade_range: course.grade_range,
          day_of_week: course.day,
          start_time: course.time.includes(':') ? 
            (course.time.split(':').length === 2 ? `${course.time}:00` : course.time) : 
            '00:00:00',
          instructor_id: session.user.id,
          max_students: Math.max(course.students.length, 15),
          status: 'active'
        })
        .select('id')
        .single()

      if (!courseError && newCourse) {
        courseIds.set(course.code, newCourse.id)
        importResults.coursesCreated++
        importResults.summary.push(`${course.code}: ${course.students.length} students`)
      }
    }

    // Create enrollments
    for (const course of parseResult.courses) {
      const courseId = courseIds.get(course.code)
      if (!courseId) continue

      for (const studentName of course.students) {
        const studentId = studentIds.get(studentName)
        if (!studentId) continue

        const { error: enrollmentError } = await supabaseAdmin
          .from('enrollments')
          .insert({
            student_id: studentId,
            course_id: courseId,
            enrollment_date: new Date().toISOString().split('T')[0],
            status: 'active',
            is_primary_class: true
          })

        if (!enrollmentError) {
          importResults.enrollmentsCreated++
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Sample data imported successfully',
      results: importResults,
      totalStudents: parseResult.students.length,
      totalCourses: parseResult.courses.length,
      duplicateStudents: parseResult.duplicateStudents
    })

  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json({ 
      error: 'Import failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}