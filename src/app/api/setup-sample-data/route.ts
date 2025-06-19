import { NextResponse } from 'next/server'
import { parseExcelFile, normalizeTime } from '@/lib/excel-parser'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'
import * as XLSX from 'xlsx'
import fs from 'fs'

export async function GET() {
  try {
    // Read and parse the Excel file directly
    const filePath = '/Users/tikaram/Downloads/Claude Code/student-growth/student_name.xlsx'
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ 
        error: 'File not found',
        path: filePath
      }, { status: 404 })
    }

    const buffer = fs.readFileSync(filePath)
    const parseResult = parseExcelFile(buffer)
    
    // Get the instructor ID (we know it from our setup)
    const instructorId = '550e8400-e29b-41d4-a716-446655440000'
    
    // Generate password hash
    const passwordHash = await bcrypt.hash('student123', 12)
    
    // Clear existing student data (but keep instructor)
    console.log('Clearing existing data...')
    await supabaseAdmin.from('enrollments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('courses').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('students').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabaseAdmin.from('users').delete().eq('role', 'student')

    const results = {
      courses: [] as any[],
      students: [] as any[],
      enrollments: 0,
      errors: [] as string[]
    }

    // Create students first
    const studentMap = new Map<string, string>()
    
    for (const student of parseResult.students) {
      try {
        const email = `${student.name.toLowerCase().replace(/\s+/g, '.')}@student.example.com`
        
        const { data: user, error: userError } = await supabaseAdmin
          .from('users')
          .insert({
            email,
            name: student.name,
            role: 'student' as const,
            password_hash: passwordHash
          })
          .select()
          .single()

        if (userError) throw userError

        const { error: studentError } = await supabaseAdmin
          .from('students')
          .insert({
            id: user.id,
            student_number: `STU-${student.name.split(' ').map(n => n[0]).join('')}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`
          })

        if (studentError) throw studentError

        studentMap.set(student.name, user.id)
        results.students.push({ name: student.name, id: user.id })
      } catch (error) {
        results.errors.push(`Failed to create student ${student.name}: ${error}`)
      }
    }

    // Create courses
    const courseMap = new Map<string, string>()
    
    for (const course of parseResult.courses) {
      try {
        // Normalize time format
        let startTime = course.time
        if (startTime && !startTime.includes(':')) {
          startTime = '00:00:00'
        } else if (startTime && startTime.split(':').length === 2) {
          startTime = `${startTime}:00`
        }

        const { data: newCourse, error: courseError } = await supabaseAdmin
          .from('courses')
          .insert({
            code: course.code,
            name: `${course.day} ${course.grade_range} ${course.program_type}`,
            program_type: course.program_type,
            level: course.level,
            grade_range: course.grade_range,
            day_of_week: course.day,
            start_time: normalizeTime(startTime),
            instructor_id: instructorId,
            max_students: 15,
            status: 'active' as const,
            term_type: 'regular'
          })
          .select()
          .single()

        if (courseError) throw courseError

        courseMap.set(course.code, newCourse.id)
        results.courses.push({
          code: course.code,
          name: newCourse.name,
          students: course.students.length,
          day: course.day,
          time: startTime
        })

        // Create enrollments for this course
        for (const studentName of course.students) {
          const studentId = studentMap.get(studentName)
          if (!studentId) continue

          const { error: enrollError } = await supabaseAdmin
            .from('enrollments')
            .insert({
              student_id: studentId,
              course_id: newCourse.id,
              enrollment_date: new Date().toISOString().split('T')[0],
              status: 'active' as const,
              is_primary_class: true
            })

          if (!enrollError) {
            results.enrollments++
          }
        }
      } catch (error) {
        results.errors.push(`Failed to create course ${course.code}: ${error}`)
      }
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalStudents: results.students.length,
        totalCourses: results.courses.length,
        totalEnrollments: results.enrollments,
        duplicateStudents: parseResult.duplicateStudents.length
      },
      data: results,
      parseResult: {
        studentsFound: parseResult.students.length,
        coursesFound: parseResult.courses.length
      }
    })

  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({ 
      error: 'Setup failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}