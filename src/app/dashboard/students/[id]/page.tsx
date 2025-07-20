import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import StudentProfileClient from './student-profile-client'
import { db } from '@/lib/postgres'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function StudentProfilePage({ params }: PageProps) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect('/auth/signin')
  }

  const { id } = await params

  // Fetch student data - check if id is UUID or external ID
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  
  const studentResult = await db.query(`
    SELECT 
      s.*,
      json_agg(
        DISTINCT jsonb_build_object(
          'id', c.id,
          'code', c.course_code,
          'name', c.course_name,
          'type', c.program_type,
          'day_of_week', c.day_of_week,
          'start_time', c.start_time,
          'end_time', c.start_time
        )
      ) FILTER (WHERE c.id IS NOT NULL) as courses
    FROM students s
    LEFT JOIN enrollments e ON e.student_id = s.id
    LEFT JOIN courses c ON c.id = e.course_id
    WHERE ${isUUID ? 's.id = $1' : 's.student_number = $1'}
    GROUP BY s.id
  `, [id])

  if (studentResult.rows.length === 0) {
    redirect('/dashboard/students')
  }

  const student = studentResult.rows[0]
  const studentDbId = student.id  // Get the actual database ID

  // Fetch recent feedback
  const feedbackResult = await db.query(`
    SELECT 
      f.*
    FROM parsed_student_feedback f
    WHERE f.student_id = $1
    ORDER BY f.created_at DESC
    LIMIT 10
  `, [studentDbId])

  // Fetch attendance data
  const attendanceResult = await db.query(`
    SELECT 
      a.*,
      cs.session_date as date,
      c.course_code,
      c.course_name
    FROM attendances a
    LEFT JOIN class_sessions cs ON cs.id = a.session_id
    LEFT JOIN courses c ON c.id = cs.course_id
    WHERE a.student_id = $1
    ORDER BY cs.session_date DESC
    LIMIT 20
  `, [studentDbId])

  return (
    <StudentProfileClient
      student={student}
      feedback={feedbackResult.rows}
      attendance={attendanceResult.rows}
      session={session}
    />
  )
}