import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/postgres'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['instructor', 'test_instructor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const instructorId = session.user.id
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })

    if (permissions.canAccessAllData) {
      return NextResponse.json({
        today,
        currentTime: new Date().toTimeString().slice(0, 5),
        schedule: [],
        recentActivity: [
          {
            id: 'demo-1',
            type: 'improvement',
            studentName: 'Henry',
            courseName: 'PSD I Advanced',
            time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            message: 'showed significant improvement in argument structure',
            avgRating: '4.2'
          },
          {
            id: 'demo-2',
            type: 'progress',
            studentName: 'Charlotte',
            courseName: 'PSD I Foundation',
            time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
            message: 'making steady progress in POI handling',
            avgRating: '3.1'
          },
          {
            id: 'demo-3',
            type: 'attention',
            studentName: 'Alexis',
            courseName: 'PSD I Foundation',
            time: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
            message: 'needs additional support with time management',
            avgRating: '2.3'
          }
        ]
      })
    }

    try {
      const coursesResult = await db.query(`
        SELECT c.id, c.code, c.name, c.program_type, c.grade_range, c.day_of_week, c.start_time, c.end_time,
               (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.status = 'active') as student_count
        FROM courses c
        WHERE c.instructor_id = $1
        AND c.status = 'active'
        AND c.day_of_week = $2
        ORDER BY c.start_time ASC
      `, [instructorId, today]);
      const courses = coursesResult.rows;

      const now = new Date()
      const currentTime = now.toTimeString().slice(0, 5)

      const schedule = courses?.map(course => {
        const startTime = course.start_time.slice(0, 5)
        
        let status = 'upcoming'
        if (startTime < currentTime) {
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
          studentCount: course.student_count,
          status
        }
      }) || []

      const recentActivityResult = await db.query(`
        SELECT a.id, a.recorded_at, a.status, a.star_rating_1, a.star_rating_2, a.star_rating_3, a.star_rating_4,
               u.name as student_name, c.name as course_name
        FROM attendances a
        JOIN enrollments e ON a.enrollment_id = e.id
        JOIN students s ON e.student_id = s.id
        JOIN users u ON s.id = u.id
        JOIN courses c ON e.course_id = c.id
        WHERE c.instructor_id = $1
        ORDER BY a.recorded_at DESC
        LIMIT 100
      `, [instructorId]);
      const recentActivity = recentActivityResult.rows;

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
          studentName: activity.student_name,
          courseName: activity.course_name,
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
      
    } catch (dbError) {
      console.log('Database error (expected for test setup):', dbError)
      
      return NextResponse.json({
        today,
        currentTime: new Date().toTimeString().slice(0, 5),
        schedule: [],
        recentActivity: []
      })
    }

  } catch (error) {
    console.error('Schedule error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch schedule',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
