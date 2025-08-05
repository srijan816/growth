import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/postgres'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''

    console.log('Search query:', query)

    // First get students
    const studentsQuery = `
      SELECT DISTINCT
        s.id,
        s.student_number as student_id_external,
        u.name,
        s.grade_level as grade,
        s.school,
        s.email as parent_email,
        NULL as parent_phone,
        s.created_at,
        COUNT(DISTINCT f.id) as feedback_count
      FROM students s
      INNER JOIN users u ON s.id = u.id
      LEFT JOIN parsed_student_feedback f ON f.student_id = s.id
      ${query ? `WHERE (
          LOWER(u.name) LIKE LOWER($1) OR
          s.id::text LIKE $1 OR
          LOWER(COALESCE(s.student_number, '')) LIKE LOWER($1)
        )` : ''}
      GROUP BY s.id, s.student_number, u.name, s.grade_level, s.school, s.email, s.created_at
      ORDER BY u.name
      LIMIT 50
    `
    
    const result = await db.query(studentsQuery, query ? [`%${query}%`] : [])
    
    // Get courses for each student
    const studentIds = result.rows.map(s => s.id)
    let coursesMap = new Map()
    
    if (studentIds.length > 0) {
      const coursesQuery = `
        SELECT 
          e.student_id,
          c.id,
          c.course_code as code,
          c.course_name as name
        FROM enrollments e
        JOIN courses c ON c.id = e.course_id
        WHERE e.student_id = ANY($1)
      `
      const coursesResult = await db.query(coursesQuery, [studentIds])
      
      // Group courses by student
      coursesResult.rows.forEach(row => {
        if (!coursesMap.has(row.student_id)) {
          coursesMap.set(row.student_id, [])
        }
        coursesMap.get(row.student_id).push({
          id: row.id,
          code: row.code,
          name: row.name
        })
      })
    }

    console.log('Search results:', result.rows.length, 'students found')

    // Transform data for search results
    const students = result.rows.map(student => {
      const courses = coursesMap.get(student.id) || []
      
      return {
        id: `student-${student.id}`,
        type: 'student' as const,
        title: student.name,
        subtitle: courses.length > 0 
          ? courses.map((c: any) => c.code).join(', ')
          : `Grade ${student.grade || 'N/A'}`,
        description: `${student.feedback_count} feedback entries`,
        tags: [
          student.grade ? `Grade ${student.grade}` : null,
          student.school,
          ...courses.map((c: any) => c.name)
        ].filter(Boolean),
        metadata: {
          studentId: student.id,
          studentIdExternal: student.student_id_external,
          courses: courses,
          grade: student.grade,
          school: student.school,
          feedbackCount: parseInt(student.feedback_count) || 0,
          parentEmail: student.parent_email,
          parentPhone: student.parent_phone
        }
      }
    })

    return NextResponse.json(students)
  } catch (error) {
    console.error('Search students error:', error)
    return NextResponse.json(
      { error: 'Failed to search students' },
      { status: 500 }
    )
  }
}