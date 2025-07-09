import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { dal } from '@/lib/dal'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const instructorId = session.user.id
    const metricType = searchParams.get('type') || 'overview'
    const programType = searchParams.get('program')
    const courseId = searchParams.get('courseId')
    const studentId = searchParams.get('studentId')
    const timeframe = searchParams.get('timeframe') || '6months'

    // Calculate date range based on timeframe
    const now = new Date()
    const dateFrom = new Date()
    
    switch (timeframe) {
      case '1month':
        dateFrom.setMonth(now.getMonth() - 1)
        break
      case '3months':
        dateFrom.setMonth(now.getMonth() - 3)
        break
      case '6months':
        dateFrom.setMonth(now.getMonth() - 6)
        break
      case '1year':
        dateFrom.setFullYear(now.getFullYear() - 1)
        break
      default:
        dateFrom.setMonth(now.getMonth() - 6)
    }

    let metrics: any = {}

    switch (metricType) {
      case 'overview':
        // Get instructor analytics and course summaries
        const [instructorAnalytics, courseSummaries] = await Promise.all([
          dal.analytics.getInstructorAnalytics(instructorId),
          dal.feedback.getCourseSummaries(session.user.name)
        ])

        metrics = {
          instructor: instructorAnalytics,
          courses: courseSummaries,
          timeframe
        }
        break

      case 'program':
        if (!programType) {
          return NextResponse.json(
            { error: 'Program type required for program metrics' },
            { status: 400 }
          )
        }

        const programMetrics = await dal.analytics.getProgramGrowthMetrics(programType)
        metrics = {
          program: programMetrics,
          timeframe
        }
        break

      case 'course':
        if (!courseId) {
          return NextResponse.json(
            { error: 'Course ID required for course metrics' },
            { status: 400 }
          )
        }

        const [courseStats, attendanceHeatmap] = await Promise.all([
          dal.courses.getWithEnrollmentStats(courseId),
          dal.attendance.getAttendanceHeatmap(courseId, dateFrom, now)
        ])

        if (!courseStats) {
          return NextResponse.json(
            { error: 'Course not found' },
            { status: 404 }
          )
        }

        metrics = {
          course: courseStats,
          attendanceHeatmap,
          timeframe
        }
        break

      case 'student':
        if (!studentId) {
          return NextResponse.json(
            { error: 'Student ID required for student metrics' },
            { status: 400 }
          )
        }

        const [studentGrowth, attendanceStats, crossProgramAnalytics] = await Promise.all([
          dal.students.getGrowthMetrics(studentId),
          dal.attendance.getStudentAttendanceStats(
            studentId,
            courseId,
            dateFrom,
            now
          ),
          dal.analytics.getCrossProgramAnalytics(studentId)
        ])

        metrics = {
          student: studentGrowth,
          attendance: attendanceStats,
          crossProgram: crossProgramAnalytics,
          timeframe
        }
        break

      case 'growth':
        if (!studentId || !programType) {
          return NextResponse.json(
            { error: 'Student ID and program type required for growth trajectory' },
            { status: 400 }
          )
        }

        const months = timeframe === '1year' ? 12 : 
                     timeframe === '6months' ? 6 : 
                     timeframe === '3months' ? 3 : 6

        const growthTrajectory = await dal.analytics.getGrowthTrajectory(
          studentId,
          programType,
          months
        )

        metrics = {
          growth: growthTrajectory,
          timeframe
        }
        break

      case 'legacy':
        // Legacy endpoint for backward compatibility
        const legacyData = {
          programs: await getProgramMetrics(),
          todaysClasses: await getTodaysClasses(),
          overallMetrics: await getOverallMetrics(),
          recentActivity: await getRecentActivity(),
          lastUpdated: new Date()
        }
        
        return NextResponse.json(legacyData)

      default:
        return NextResponse.json(
          { error: 'Invalid metric type' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      type: metricType,
      data: metrics,
      generated_at: new Date().toISOString(),
      filters: {
        timeframe,
        programType,
        courseId,
        studentId
      }
    })

  } catch (error) {
    console.error('Dashboard metrics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    )
  }
}

async function getProgramMetrics(): Promise<ProgramMetrics[]> {
  // This would eventually query your database
  // For now, returning realistic mock data based on your requirements
  
  return [
    {
      programType: 'PSD',
      programName: 'Public Speaking & Debating',
      totalStudents: 156,
      totalClasses: 12,
      averageAttendance: 87.5,
      averageGrowth: 23.8,
      recentFeedbackCount: 89,
      topPerformers: 34,
      needsAttention: 12,
      completionRate: 78.2,
      trendDirection: 'up',
      levels: [
        {
          level: 'PRIMARY',
          studentCount: 78,
          classCount: 6,
          averageProgress: 76.3,
          classes: [
            {
              classId: '01IPDED2405',
              classCode: '01IPDED2405',
              className: 'Saturday - 4_45- 6_15 PM - 01IPDED2405 - PSD I',
              studentCount: 17,
              instructor: 'Sarah Johnson',
              currentProgress: 67.5,
              averageAttendance: 89.2
            }
            // More classes...
          ]
        },
        {
          level: 'SECONDARY',
          studentCount: 78,
          classCount: 6,
          averageProgress: 82.1,
          classes: []
        }
      ]
    },
    {
      programType: 'WRITING',
      programName: 'Academic Writing',
      totalStudents: 94,
      totalClasses: 8,
      averageAttendance: 91.2,
      averageGrowth: 28.4,
      recentFeedbackCount: 56,
      topPerformers: 23,
      needsAttention: 8,
      completionRate: 84.6,
      trendDirection: 'up',
      levels: [
        {
          level: 'PRIMARY',
          studentCount: 46,
          classCount: 4,
          averageProgress: 81.7,
          classes: []
        },
        {
          level: 'SECONDARY',
          studentCount: 48,
          classCount: 4,
          averageProgress: 86.3,
          classes: []
        }
      ]
    },
    {
      programType: 'RAPS',
      programName: 'Research Analysis & Problem Solving',
      totalStudents: 72,
      totalClasses: 6,
      averageAttendance: 85.8,
      averageGrowth: 21.3,
      recentFeedbackCount: 41,
      topPerformers: 18,
      needsAttention: 9,
      completionRate: 73.5,
      trendDirection: 'stable',
      levels: [
        {
          level: 'PRIMARY',
          studentCount: 35,
          classCount: 3,
          averageProgress: 71.2,
          classes: []
        },
        {
          level: 'SECONDARY',
          studentCount: 37,
          classCount: 3,
          averageProgress: 79.8,
          classes: []
        }
      ]
    },
    {
      programType: 'CRITICAL',
      programName: 'Critical Thinking',
      totalStudents: 58,
      totalClasses: 5,
      averageAttendance: 88.9,
      averageGrowth: 25.7,
      recentFeedbackCount: 34,
      topPerformers: 16,
      needsAttention: 5,
      completionRate: 81.3,
      trendDirection: 'up',
      levels: [
        {
          level: 'PRIMARY',
          studentCount: 28,
          classCount: 2,
          averageProgress: 79.4,
          classes: []
        },
        {
          level: 'SECONDARY',
          studentCount: 30,
          classCount: 3,
          averageProgress: 83.6,
          classes: []
        }
      ]
    }
  ]
}

async function getTodaysClasses(): Promise<TodaysClassData[]> {
  const today = new Date()
  const todayWeekday = today.getDay()
  
  // Filter classes based on today's schedule
  // This is mock data - you'll replace with real database queries
  const allClasses = [
    {
      classId: '02IPDEB2402',
      classCode: '02IPDEB2402',
      className: 'Thursday - 4.30 - 6pm - 02IPDEB2403 - G3-4 PSD I',
      programType: 'PSD' as const,
      instructor: 'Mike Chen',
      schedule: {
        dayOfWeek: 4, // Thursday
        startTime: '16:30',
        endTime: '18:00',
        duration: 90,
        timezone: 'UTC'
      },
      studentCount: 28,
      attendanceExpected: 26,
      status: 'upcoming' as const,
      location: 'Room A'
    },
    {
      classId: '02IPDEC2402',
      classCode: '02IPDEC2402',
      className: 'Thursday - 6 - 7.5 - 02IPDEC2401 - PSD I',
      programType: 'PSD' as const,
      instructor: 'Sarah Johnson',
      schedule: {
        dayOfWeek: 4, // Thursday
        startTime: '18:00',
        endTime: '19:30',
        duration: 90,
        timezone: 'UTC'
      },
      studentCount: 21,
      attendanceExpected: 19,
      status: 'upcoming' as const,
      location: 'Room B'
    }
  ]
  
  // Filter for today only
  return allClasses.filter(cls => cls.schedule.dayOfWeek === todayWeekday)
}

async function getOverallMetrics(): Promise<OverallMetrics> {
  return {
    totalStudents: 380,
    totalActiveClasses: 31,
    totalInstructors: 8,
    averageAttendanceRate: 88.1,
    averageGrowthRate: 24.8,
    totalFeedbackDocuments: 220
  }
}

async function getRecentActivity(): Promise<ActivityItem[]> {
  return [
    {
      id: '1',
      type: 'feedback',
      studentName: 'Alex Chen',
      className: 'PSD Advanced',
      description: 'New feedback uploaded for debate performance',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
    },
    {
      id: '2',
      type: 'achievement',
      studentName: 'Sarah Kim',
      description: 'Earned "Excellent Presenter" achievement',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000) // 4 hours ago
    },
    {
      id: '3',
      type: 'enrollment',
      studentName: 'Mike Rodriguez',
      className: 'Critical Thinking Primary',
      description: 'New student enrollment',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000) // 6 hours ago
    }
  ]
}