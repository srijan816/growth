import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/database/connection';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    console.log('[Course API] Starting request');
    
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('[Course API] No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('[Course API] Session user:', session.user.name);

    const { courseId } = await context.params;
    console.log('[Course API] Course Code:', courseId);

    // Get course details - using course code
    const courseQuery = `
      SELECT 
        c.id,
        c.code as course_code,
        c.name as course_name,
        c.level as course_level,
        COALESCE(c.program_type, c.course_type, 'PSD') as course_type,
        COALESCE(c.max_students, c.student_count, 0) as student_count,
        c.start_time,
        c.end_time,
        c.day_of_week,
        LOWER(c.status) = 'active' as is_active,
        c.status,
        c.created_at,
        COUNT(DISTINCT e.student_id) as enrolled_count,
        COUNT(DISTINCT cs.id) as total_sessions,
        COALESCE(AVG(
          (
            COALESCE(a.attitude_efforts, 0) + 
            COALESCE(a.asking_questions, 0) + 
            COALESCE(a.application_skills, 0) + 
            COALESCE(a.application_feedback, 0)
          ) / GREATEST(
            (CASE WHEN a.attitude_efforts IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN a.asking_questions IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN a.application_skills IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN a.application_feedback IS NOT NULL THEN 1 ELSE 0 END),
            1
          )
        ), 0) as avg_rating
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      LEFT JOIN class_sessions cs ON c.id = cs.course_id
      LEFT JOIN attendances a ON cs.id = a.session_id
      WHERE c.code = $1
      GROUP BY c.id
    `;

    const courseResult = await db.query(courseQuery, [courseId]);
    
    console.log('[Course API] Course query executed, rows:', courseResult.rows.length);
    
    if (courseResult.rows.length === 0) {
      console.log('[Course API] Course not found for ID:', courseId);
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    const course = courseResult.rows[0];
    const courseDbId = course.id; // Store the database ID for subsequent queries
    console.log('[Course API] Found course:', course.course_code, '-', course.course_name);

    // Get enrolled students with their metrics (aggregating duplicate names)
    const studentsQuery = `
      WITH enrolled_students AS (
        -- Get all enrolled students with preference for records with grade info
        SELECT DISTINCT ON (u.name)
          s.id,
          s.student_number,
          u.name,
          s.grade_level,
          s.school,
          e.enrollment_date,
          e.start_lesson,
          e.end_lesson,
          e.status as enrollment_status
        FROM students s
        INNER JOIN users u ON s.id = u.id
        INNER JOIN enrollments e ON s.id = e.student_id AND e.course_id = $1
        ORDER BY u.name, 
                 CASE WHEN s.grade_level IS NOT NULL THEN 0 ELSE 1 END,
                 CASE WHEN s.student_number NOT LIKE 'STU%' THEN 0 ELSE 1 END
      ),
      name_to_student_ids AS (
        -- Map names to all their student IDs for aggregation
        SELECT 
          u.name,
          array_agg(s.id) as student_ids
        FROM students s
        INNER JOIN users u ON s.id = u.id
        INNER JOIN enrollments e ON s.id = e.student_id AND e.course_id = $1
        GROUP BY u.name
      ),
      aggregated_attendance AS (
        -- Aggregate attendance across all student IDs for same name
        SELECT 
          nsi.name,
          COUNT(DISTINCT a.id) as attendance_count,
          COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.id END) as present_count,
          AVG(
            (
              COALESCE(a.attitude_efforts, 0) + 
              COALESCE(a.asking_questions, 0) + 
              COALESCE(a.application_skills, 0) + 
              COALESCE(a.application_feedback, 0)
            ) / GREATEST(
              (CASE WHEN a.attitude_efforts IS NOT NULL THEN 1 ELSE 0 END) +
              (CASE WHEN a.asking_questions IS NOT NULL THEN 1 ELSE 0 END) +
              (CASE WHEN a.application_skills IS NOT NULL THEN 1 ELSE 0 END) +
              (CASE WHEN a.application_feedback IS NOT NULL THEN 1 ELSE 0 END),
              1
            )
          ) as avg_performance,
          JSON_AGG(
            DISTINCT jsonb_build_object(
              'category', skill_cat.category,
              'rating', skill_cat.rating
            )
          ) FILTER (WHERE skill_cat.category IS NOT NULL) as skill_ratings
        FROM name_to_student_ids nsi
        CROSS JOIN LATERAL unnest(nsi.student_ids) as sid
        LEFT JOIN attendances a ON a.student_id = sid
        LEFT JOIN class_sessions cs ON a.session_id = cs.id AND cs.course_id = $1
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
        ) skill_cat ON true
        GROUP BY nsi.name
      ),
      aggregated_feedback AS (
        -- Aggregate feedback across all student IDs for same name
        SELECT 
          nsi.name,
          COUNT(DISTINCT pf.id) as feedback_count,
          MAX(pf.created_at) as last_feedback_date
        FROM name_to_student_ids nsi
        CROSS JOIN LATERAL unnest(nsi.student_ids) as sid
        LEFT JOIN parsed_student_feedback pf ON pf.student_id = sid
        GROUP BY nsi.name
      )
      SELECT 
        es.id,
        es.student_number as student_id_external,
        es.name,
        es.grade_level as grade,
        es.school,
        es.enrollment_date,
        es.start_lesson,
        es.end_lesson,
        es.enrollment_status,
        COALESCE(aa.attendance_count, 0) as attendance_count,
        COALESCE(aa.present_count, 0) as present_count,
        COALESCE(aa.avg_performance, 0) as avg_performance,
        COALESCE(af.feedback_count, 0) as feedback_count,
        af.last_feedback_date,
        COALESCE(aa.skill_ratings, '[]'::json) as skill_ratings
      FROM enrolled_students es
      LEFT JOIN aggregated_attendance aa ON es.name = aa.name
      LEFT JOIN aggregated_feedback af ON es.name = af.name
      ORDER BY es.name
    `;

    const studentsResult = await db.query(studentsQuery, [courseDbId]);

    // Get recent sessions
    const recentSessionsQuery = `
      SELECT 
        cs.id,
        cs.session_date as session_date,
        1 as session_number,
        cs.notes as topic,
        cs.status,
        COUNT(DISTINCT a.student_id) as attendance_count,
        COALESCE(AVG(
          (
            COALESCE(a.attitude_efforts, 0) + 
            COALESCE(a.asking_questions, 0) + 
            COALESCE(a.application_skills, 0) + 
            COALESCE(a.application_feedback, 0)
          ) / GREATEST(
            (CASE WHEN a.attitude_efforts IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN a.asking_questions IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN a.application_skills IS NOT NULL THEN 1 ELSE 0 END) +
            (CASE WHEN a.application_feedback IS NOT NULL THEN 1 ELSE 0 END),
            1
          )
        ), 0) as avg_rating
      FROM class_sessions cs
      LEFT JOIN attendances a ON cs.id = a.session_id
      WHERE cs.course_id = $1
      GROUP BY cs.id, cs.session_date, cs.notes, cs.status
      ORDER BY cs.session_date DESC
      LIMIT 5
    `;

    const recentSessionsResult = await db.query(recentSessionsQuery, [courseDbId]);

    // Calculate metrics (using unique students by name)
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

    const activityResult = await db.query(activityQuery, [courseDbId]);

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
        dayOfWeek: course.day_of_week,
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
    console.error('[Course API] Error fetching course details:', error);
    console.error('[Course API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { error: 'Failed to fetch course details' }, 
      { status: 500 }
    );
  }
}

function formatSchedule(startTime: string | null, endTime: string | null, dayOfWeek: any): string {
  if (!startTime) return 'Not scheduled';
  
  // Format times to HH:MM
  const formatTime = (time: string) => {
    if (!time) return '';
    return time.substring(0, 5);
  };
  
  const start = formatTime(startTime);
  const end = endTime ? formatTime(endTime) : '';
  
  // Handle different formats of dayOfWeek
  let dayStr = '';
  if (dayOfWeek) {
    if (typeof dayOfWeek === 'string') {
      // Simple string format: "Tuesday", "Monday", etc.
      dayStr = dayOfWeek;
    } else if (Array.isArray(dayOfWeek)) {
      // Array of day numbers
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      dayStr = dayOfWeek.map(d => days[d] || '').filter(Boolean).join(', ');
    }
  }
  
  if (!dayStr) dayStr = 'Daily';
  
  return end ? `${dayStr} ${start} - ${end}` : `${dayStr} ${start}`;
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