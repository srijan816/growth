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
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })

    // Get today's courses with enrollment counts
    const { data: courses, error } = await supabaseAdmin
      .from('courses')
      .select(`
        id,
        code,
        name,
        program_type,
        grade_range,
        day_of_week,
        start_time,
        enrollments(
          id,
          student_id,
          status
        )
      `)
      .eq('instructor_id', instructorId)
      .eq('status', 'active')
      .eq('day_of_week', today)
      .order('start_time', { ascending: true })

    if (error) {
      throw error
    }

    // Get current time for comparison
    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5)

    // Transform data and add status
    const schedule = courses?.map(course => {
      const activeEnrollments = course.enrollments?.filter(e => e.status === 'active') || []
      const startTime = course.start_time.slice(0, 5)
      
      let status = 'upcoming'
      if (startTime < currentTime) {
        // Check if class is still ongoing (assuming 1.5 hour duration)
        const endTime = new Date(`2000-01-01 ${course.start_time}`)
        endTime.setMinutes(endTime.getMinutes() + 90)
        const endTimeStr = endTime.toTimeString().slice(0, 5)
        
        if (currentTime > endTimeStr) {
          status = 'completed'
        } else {
          status = 'ongoing'
        }
      } else if (startTime > currentTime && 
                 new Date(`2000-01-01 ${startTime}`).getTime() - 
                 new Date(`2000-01-01 ${currentTime}`).getTime() <= 30 * 60 * 1000) {
        status = 'next'
      }

      return {
        id: course.id,
        code: course.code,
        name: course.name,
        programType: course.program_type,
        gradeRange: course.grade_range,
        time: startTime,
        studentCount: activeEnrollments.length,
        status
      }
    }) || []

    // Get recent activity (last 5 attendances or metrics)
    const { data: recentActivity } = await supabaseAdmin
      .from('attendances')
      .select(`
        id,
        recorded_at,
        status,
        star_rating_1,
        star_rating_2,
        star_rating_3,
        star_rating_4,
        enrollments!inner(
          students!inner(
            users!students_id_fkey(name)
          ),
          courses!inner(
            name,
            instructor_id
          )
        )
      `)
      .eq('enrollments.courses.instructor_id', instructorId)
      .order('recorded_at', { ascending: false })
      .limit(5)

    const activities = recentActivity?.map(activity => {
      const avgRating = [
        activity.star_rating_1,
        activity.star_rating_2,
        activity.star_rating_3,
        activity.star_rating_4
      ].filter(r => r !== null).reduce((sum, r) => sum + (r || 0), 0) / 4

      return {
        id: activity.id,
        type: avgRating >= 3.5 ? 'improvement' : avgRating >= 2.5 ? 'progress' : 'attention',
        studentName: activity.enrollments.students.users.name,
        courseName: activity.enrollments.courses.name,
        time: activity.recorded_at,
        message: avgRating >= 3.5 
          ? `showed significant improvement` 
          : avgRating >= 2.5 
          ? `making steady progress`
          : `needs additional support`,
        avgRating: avgRating.toFixed(1)
      }
    }) || []

    return NextResponse.json({
      today,
      currentTime,
      schedule,
      recentActivity: activities
    })

  } catch (error) {
    console.error('Schedule error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch schedule',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}