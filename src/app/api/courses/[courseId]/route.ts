import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { executeQuery } from '@/lib/postgres';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { courseId } = await context.params;

    // Get course details
    const courseQuery = `
      SELECT 
        c.id,
        c.course_code,
        c.course_name,
        c.course_level,
        c.course_type,
        c.student_count,
        c.start_time,
        c.end_time,
        c.day_of_week,
        c.is_active,
        c.status,
        c.created_at,
        COUNT(DISTINCT e.student_id) as enrolled_count,
        COUNT(DISTINCT cs.id) as total_sessions,
        COALESCE(AVG((COALESCE(a.attitude_rating, 0) + COALESCE(a.questions_rating, 0) + 
             COALESCE(a.skills_rating, 0) + COALESCE(a.feedback_rating, 0)) / 
             NULLIF(
               (CASE WHEN a.attitude_rating IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN a.questions_rating IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN a.skills_rating IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN a.feedback_rating IS NOT NULL THEN 1 ELSE 0 END), 0
             )
        ), 0) as avg_rating
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      LEFT JOIN class_sessions cs ON c.id = cs.course_id
      LEFT JOIN attendances a ON cs.id = a.session_id
      WHERE c.id = $1
      GROUP BY c.id
    `;

    const courseResult = await executeQuery(courseQuery, [courseId]);
    
    if (courseResult.rows.length === 0) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const course = courseResult.rows[0];

    // Get enrolled students with their metrics
    const studentsQuery = `
      SELECT 
        s.id,
        s.student_number as student_id_external,
        s.name,
        s.grade_level as grade,
        s.school,
        e.enrollment_date,
        e.start_lesson,
        e.end_lesson,
        e.status as enrollment_status,
        COUNT(DISTINCT a.id) as attendance_count,
        COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.id END) as present_count,
        COALESCE(AVG((COALESCE(a.attitude_efforts, 0) + COALESCE(a.asking_questions, 0) + 
             COALESCE(a.application_skills, 0) + COALESCE(a.application_feedback, 0)) / 
             NULLIF(
               (CASE WHEN a.attitude_efforts IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN a.asking_questions IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN a.application_skills IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN a.application_feedback IS NOT NULL THEN 1 ELSE 0 END), 0
             )
        ), 0) as avg_performance,
        COUNT(DISTINCT pf.id) as feedback_count,
        MAX(pf.created_at) as last_feedback_date,
        COALESCE(
          JSON_AGG(
            DISTINCT jsonb_build_object(
              'category', skill.category,
              'rating', skill.rating
            )
          ) FILTER (WHERE skill.category IS NOT NULL),
          '[]'::json
        ) as skill_ratings
      FROM students s
      INNER JOIN enrollments e ON s.id = e.student_id
      LEFT JOIN class_sessions cs ON e.course_id = cs.course_id
      LEFT JOIN attendances a ON s.id = a.student_id AND cs.id = a.session_id
      LEFT JOIN parsed_student_feedback pf ON s.id = pf.student_id
      LEFT JOIN LATERAL (
        SELECT 'attitude_efforts' as category, a.attitude_efforts as rating
        WHERE a.attitude_efforts IS NOT NULL
        UNION ALL
        SELECT 'asking_questions', a.asking_questions
        WHERE a.asking_questions IS NOT NULL
        UNION ALL
        SELECT 'application_skills', a.application_skills
        WHERE a.application_skills IS NOT NULL
        UNION ALL
        SELECT 'application_feedback', a.application_feedback
        WHERE a.application_feedback IS NOT NULL
      ) skill ON true
      WHERE e.course_id = $1
      GROUP BY s.id, s.student_number, s.name, s.grade_level, s.school, 
               e.enrollment_date, e.start_lesson, e.end_lesson, e.status
      ORDER BY s.name
    `;

    const studentsResult = await executeQuery(studentsQuery, [courseId]);

    // Get recent sessions
    const recentSessionsQuery = `
      SELECT 
        cs.id,
        cs.date as session_date,
        1 as session_number,
        cs.notes as topic,
        cs.status,
        COUNT(DISTINCT a.student_id) as attendance_count,
        COALESCE(AVG((COALESCE(a.attitude_rating, 0) + COALESCE(a.questions_rating, 0) + 
             COALESCE(a.skills_rating, 0) + COALESCE(a.feedback_rating, 0)) / 
             NULLIF(
               (CASE WHEN a.attitude_rating IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN a.questions_rating IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN a.skills_rating IS NOT NULL THEN 1 ELSE 0 END +
                CASE WHEN a.feedback_rating IS NOT NULL THEN 1 ELSE 0 END), 0
             )
        ), 0) as avg_rating
      FROM class_sessions cs
      LEFT JOIN attendances a ON cs.id = a.session_id
      WHERE cs.course_id = $1
      GROUP BY cs.id, cs.date, cs.notes, cs.status
      ORDER BY cs.date DESC
      LIMIT 5
    `;

    const recentSessionsResult = await executeQuery(recentSessionsQuery, [courseId]);

    // Calculate metrics
    const totalStudents = studentsResult.rows.length;
    const avgAttendanceRate = totalStudents > 0 
      ? studentsResult.rows.reduce((sum, s) => {
          const rate = s.attendance_count > 0 ? (s.present_count / s.attendance_count) * 100 : 0;
          return sum + rate;
        }, 0) / totalStudents
      : 0;

    const avgGrowthScore = studentsResult.rows.reduce((sum, s) => 
      sum + (parseFloat(s.avg_performance) || 0), 0
    ) / (totalStudents || 1);

    // Get activity count for last 7 days
    const activityQuery = `
      SELECT COUNT(*) as activity_count
      FROM (
        SELECT created_at FROM attendances 
        WHERE session_id IN (SELECT id FROM class_sessions WHERE course_id = $1)
        AND created_at > NOW() - INTERVAL '7 days'
        UNION ALL
        SELECT created_at FROM parsed_student_feedback
        WHERE student_id IN (SELECT student_id FROM enrollments WHERE course_id = $1)
        AND created_at > NOW() - INTERVAL '7 days'
      ) as activities
    `;

    const activityResult = await executeQuery(activityQuery, [courseId]);

    return NextResponse.json({
      course: {
        id: course.id,
        courseCode: course.course_code,
        courseName: course.course_name,
        courseLevel: course.course_level,
        courseType: course.course_type,
        studentCount: course.student_count,
        enrolledCount: parseInt(course.enrolled_count),
        startTime: course.start_time,
        endTime: course.end_time,
        dayOfWeek: course.day_of_week || [],
        isActive: course.is_active,
        status: course.status,
        totalSessions: parseInt(course.total_sessions),
        avgRating: parseFloat(course.avg_rating) || 0,
        schedule: formatSchedule(course.start_time, course.end_time, course.day_of_week)
      },
      metrics: {
        totalStudents,
        avgAttendanceRate: Math.round(avgAttendanceRate * 10) / 10,
        avgGrowthScore: Math.round(avgGrowthScore * 10) / 10,
        recentActivity: parseInt(activityResult.rows[0].activity_count)
      },
      students: studentsResult.rows.map(student => ({
        id: student.id,
        studentId: student.student_id_external,
        name: student.name,
        grade: student.grade,
        school: student.school,
        enrollmentDate: student.enrollment_date,
        startLesson: student.start_lesson,
        endLesson: student.end_lesson,
        enrollmentStatus: student.enrollment_status,
        metrics: {
          attendanceRate: student.attendance_count > 0 
            ? Math.round((student.present_count / student.attendance_count) * 100) 
            : 0,
          attendanceCount: parseInt(student.attendance_count),
          presentCount: parseInt(student.present_count),
          avgPerformance: parseFloat(student.avg_performance) || 0,
          feedbackCount: parseInt(student.feedback_count),
          lastFeedbackDate: student.last_feedback_date,
          skillRatings: student.skill_ratings
        },
        growthTrend: calculateGrowthTrend(student),
        focusAreas: identifyFocusAreas(student.skill_ratings)
      })),
      recentSessions: recentSessionsResult.rows.map(session => ({
        id: session.id,
        date: session.session_date,
        sessionNumber: session.session_number,
        topic: session.topic,
        status: session.status,
        attendanceCount: parseInt(session.attendance_count),
        avgRating: parseFloat(session.avg_rating) || 0
      }))
    });

  } catch (error) {
    console.error('Error fetching course details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch course details' }, 
      { status: 500 }
    );
  }
}

function formatSchedule(startTime: string | null, endTime: string | null, dayOfWeek: any): string {
  if (!startTime || !endTime) return 'Not scheduled';
  
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Handle different formats of dayOfWeek
  let dayArray: number[] = [];
  if (dayOfWeek) {
    if (Array.isArray(dayOfWeek)) {
      dayArray = dayOfWeek;
    } else if (typeof dayOfWeek === 'string') {
      // PostgreSQL might return array as string like "{1,2,3}"
      try {
        dayArray = JSON.parse(dayOfWeek.replace(/^\{/, '[').replace(/\}$/, ']'));
      } catch {
        // If JSON parsing fails, try to parse as PostgreSQL array format
        const matches = dayOfWeek.match(/\d+/g);
        if (matches) {
          dayArray = matches.map(Number);
        }
      }
    }
  }
  
  const dayStr = dayArray.length > 0 
    ? dayArray.map(d => days[d]).join(', ') 
    : 'Daily';
    
  return `${dayStr} ${startTime} - ${endTime}`;
}

function calculateGrowthTrend(student: any): 'improving' | 'stable' | 'declining' {
  // Simple trend calculation based on performance
  // In a real implementation, this would analyze historical data
  const avgPerformance = parseFloat(student.avg_performance) || 0;
  if (avgPerformance >= 4) return 'improving';
  if (avgPerformance >= 3) return 'stable';
  return 'declining';
}

function identifyFocusAreas(skillRatings: any): string[] {
  if (!Array.isArray(skillRatings)) return [];
  
  // Identify skills with lower ratings that need focus
  const focusAreas: string[] = [];
  const categoryNames: Record<string, string> = {
    'attitude_efforts': 'Attitude & Efforts',
    'asking_questions': 'Asking Questions',
    'application_skills': 'Application of Skills',
    'application_feedback': 'Application of Feedback'
  };
  
  skillRatings.forEach((skill: any) => {
    if (skill.rating < 3 && categoryNames[skill.category]) {
      focusAreas.push(categoryNames[skill.category]);
    }
  });
  
  return focusAreas.slice(0, 2); // Return top 2 focus areas
}