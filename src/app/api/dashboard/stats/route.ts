import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/postgres'
import { getInstructorPermissions } from '@/lib/instructor-permissions'
import FeedbackStorage from '@/lib/feedback-storage'
import { cachedQuery, CachePrefix, CacheTTL } from '@/lib/cache/cache-manager'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['instructor', 'test_instructor'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const instructorId = session.user.id
    const permissions = await getInstructorPermissions()
    
    if (permissions.canAccessAllData) {
      const feedbackStorage = new FeedbackStorage()
      const students = await feedbackStorage.getStudentsWithFeedback()
      
      const classCodes = new Set<string>()
      students.forEach(student => {
        student.class_codes.split(', ').forEach(code => {
          if (code.trim()) classCodes.add(code.trim())
        })
      })
      
      return NextResponse.json({
        totalStudents: students.length,
        totalCourses: classCodes.size,
        todaysClasses: 0,
        nextClass: null,
        activeMetrics: students.length,
        weeklyClasses: 0,
        currentDay: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        dataSource: 'feedback_system',
        instructorType: 'test_instructor'
      })
    }

    try {
      // Cache student count
      const cacheKey = `${CachePrefix.DASHBOARD}students:${instructorId}`;
      const studentData = await cachedQuery(
        cacheKey,
        async () => {
          const result = await db.query(`
            SELECT COUNT(DISTINCT e.student_id) as total_students
            FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE c.instructor_id = $1 AND e.status = 'active'
          `, [instructorId]);
          return result.rows[0];
        },
        CacheTTL.MEDIUM
      );
      const totalStudents = parseInt(studentData.total_students, 10);

      // Cache courses data
      const coursesKey = `${CachePrefix.DASHBOARD}courses:${instructorId}`;
      const courses = await cachedQuery(
        coursesKey,
        async () => {
          const result = await db.query(`
            SELECT id, code, name, day_of_week, start_time
            FROM courses
            WHERE instructor_id = $1 AND status = 'active'
          `, [instructorId]);
          return result.rows;
        },
        CacheTTL.MEDIUM
      );
      const totalCourses = courses?.length || 0

      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
      const todaysClasses = courses?.filter(c => c.day_of_week === today) || []

      const metricsDataResult = await db.query(`
        SELECT COUNT(DISTINCT smt.id) as active_metrics
        FROM student_metrics_tracker smt
        JOIN enrollments e ON smt.enrollment_id = e.id
        JOIN courses c ON e.course_id = c.id
        WHERE c.instructor_id = $1 AND smt.assessment_date >= NOW() - INTERVAL '30 days'
      `, [instructorId]);
      const activeMetrics = parseInt(metricsDataResult.rows[0].active_metrics, 10);

      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      weekStart.setHours(0, 0, 0, 0)

      const sessionsDataResult = await db.query(`
        SELECT COUNT(*) as weekly_classes
        FROM class_sessions cs
        JOIN courses c ON cs.course_id = c.id
        WHERE c.instructor_id = $1 AND cs.status = 'completed' AND cs.session_date >= $2
      `, [instructorId, weekStart]);
      const weeklyClasses = parseInt(sessionsDataResult.rows[0].weekly_classes, 10);

      const now = new Date()
      const currentTime = now.toTimeString().slice(0, 5)
      
      let nextClass = null
      if (todaysClasses.length > 0) {
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
        currentDay: today,
        dataSource: 'database',
        instructorType: 'regular'
      })
      
    } catch (dbError) {
      console.log('Database error (expected for test instructor):', dbError)
      
      return NextResponse.json({
        totalStudents: 0,
        totalCourses: 0,
        todaysClasses: 0,
        nextClass: null,
        activeMetrics: 0,
        weeklyClasses: 0,
        currentDay: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
        dataSource: 'fallback',
        instructorType: 'regular'
      })
    }


  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch dashboard stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
