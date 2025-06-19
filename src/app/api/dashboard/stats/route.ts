import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const instructorId = session.user.id

    // Get total students enrolled in instructor's courses
    const { data: studentData, error: studentError } = await supabaseAdmin
      .from('enrollments')
      .select(`
        student_id,
        courses!inner(
          instructor_id
        )
      `)
      .eq('courses.instructor_id', instructorId)
      .eq('status', 'active')

    // Get unique students
    const uniqueStudents = new Set(studentData?.map(e => e.student_id) || [])
    const totalStudents = uniqueStudents.size

    // Get total courses for this instructor
    const { data: courses, error: coursesError } = await supabaseAdmin
      .from('courses')
      .select('id, code, name, day_of_week, start_time')
      .eq('instructor_id', instructorId)
      .eq('status', 'active')

    const totalCourses = courses?.length || 0

    // Get today's classes
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
    const todaysClasses = courses?.filter(c => c.day_of_week === today) || []

    // Get active growth metrics
    const { data: metricsData } = await supabaseAdmin
      .from('student_metrics_tracker')
      .select(`
        id,
        students!inner(
          id
        ),
        enrollments!inner(
          courses!inner(
            instructor_id
          )
        )
      `)
      .eq('enrollments.courses.instructor_id', instructorId)
      .gte('assessment_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

    const activeMetrics = new Set(metricsData?.map(m => m.id) || []).size

    // Get this week's completed sessions
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay())
    weekStart.setHours(0, 0, 0, 0)

    const { data: sessionsData } = await supabaseAdmin
      .from('class_sessions')
      .select(`
        id,
        courses!inner(
          instructor_id
        )
      `)
      .eq('courses.instructor_id', instructorId)
      .eq('status', 'completed')
      .gte('session_date', weekStart.toISOString())

    const weeklyClasses = sessionsData?.length || 0

    // Find next class
    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5)
    
    let nextClass = null
    if (todaysClasses.length > 0) {
      // Find next class today
      nextClass = todaysClasses
        .filter(c => c.start_time > currentTime)
        .sort((a, b) => a.start_time.localeCompare(b.start_time))[0]
    }

    return NextResponse.json({
      totalStudents,
      totalCourses,
      todaysClasses: todaysClasses.length,
      nextClass: nextClass ? {
        time: nextClass.start_time.slice(0, 5),
        name: nextClass.name,
        code: nextClass.code
      } : null,
      activeMetrics,
      weeklyClasses,
      currentDay: today
    })

  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch dashboard stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}