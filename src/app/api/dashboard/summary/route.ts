import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { dal } from '@/lib/dal';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const instructorId = session.user.id;
    
    // Get date range from query params
    const dateFrom = searchParams.get('dateFrom') ? new Date(searchParams.get('dateFrom')!) : undefined;
    const dateTo = searchParams.get('dateTo') ? new Date(searchParams.get('dateTo')!) : undefined;

    // Parallel data fetching for dashboard summary
    const [
      coursesWithStats,
      feedbackSummary,
      instructorAnalytics,
      recentActivity
    ] = await Promise.all([
      // Get courses with enrollment stats
      dal.courses.findByInstructor(instructorId).then(async courses => {
        return Promise.all(
          courses.map(course => dal.courses.getWithEnrollmentStats(course.id))
        );
      }),

      // Get feedback summary
      dal.feedback.getFeedbackSummary({
        instructorId: session.user.name, // Note: using name for instructor matching in feedback
        dateFrom,
        dateTo
      }),

      // Get instructor analytics
      dal.analytics.getInstructorAnalytics(instructorId),

      // Get recent attendance and feedback activity
      Promise.all([
        dal.attendance.findMany(
          {},
          { 
            orderBy: 'marked_at', 
            orderDirection: 'DESC', 
            limit: 10 
          }
        ).then(attendances => 
          Promise.all(
            attendances.map(async a => {
              const session = await dal.db.query(
                'SELECT date, start_time FROM sessions WHERE id = $1',
                [a.session_id]
              );
              const course = await dal.db.query(
                'SELECT course_code FROM courses WHERE id = (SELECT course_id FROM sessions WHERE id = $1)',
                [a.session_id]
              );
              return {
                type: 'attendance' as const,
                date: a.marked_at,
                details: {
                  sessionDate: session.rows[0]?.date,
                  courseCode: course.rows[0]?.course_code,
                  status: a.status
                }
              };
            })
          )
        ),
        
        dal.feedback.findMany(
          {},
          { 
            orderBy: 'created_at', 
            orderDirection: 'DESC', 
            limit: 10 
          }
        ).then(feedbacks => 
          feedbacks.map(f => ({
            type: 'feedback' as const,
            date: f.created_at,
            details: {
              studentName: f.student_name,
              courseCode: f.class_code,
              instructor: f.instructor
            }
          }))
        )
      ]).then(([attendanceActivity, feedbackActivity]) => 
        [...attendanceActivity, ...feedbackActivity]
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 20)
      )
    ]);

    // Calculate summary metrics
    const totalStudents = coursesWithStats.reduce((sum, course) => 
      sum + (course?.activeStudents || 0), 0
    );

    const averageAttendance = coursesWithStats.length > 0 
      ? coursesWithStats.reduce((sum, course) => 
          sum + (course?.averageAttendance || 0), 0
        ) / coursesWithStats.length
      : 0;

    const upcomingSessions = coursesWithStats
      .filter(course => course?.nextSession)
      .map(course => ({
        courseCode: course!.course_code,
        courseName: course!.course_name,
        date: course!.nextSession!.date,
        startTime: course!.nextSession!.startTime,
        endTime: course!.nextSession!.endTime,
        enrolledStudents: course!.activeStudents
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);

    const summary = {
      metrics: {
        totalCourses: coursesWithStats.length,
        totalStudents,
        averageAttendance: Math.round(averageAttendance),
        totalFeedback: feedbackSummary.totalFeedback,
        uniqueStudentsWithFeedback: feedbackSummary.uniqueStudents
      },
      courses: coursesWithStats.filter(Boolean),
      upcomingSessions,
      feedbackSummary,
      instructorAnalytics,
      recentActivity,
      dateRange: {
        from: dateFrom?.toISOString(),
        to: dateTo?.toISOString()
      }
    };

    return NextResponse.json(summary);

  } catch (error) {
    console.error('Dashboard summary error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard summary' },
      { status: 500 }
    );
  }
}