import { notFound } from 'next/navigation'
import { db } from '@/lib/database/connection'
import CourseDetailClient from './course-detail-client'

interface CourseDetailPageProps {
  params: Promise<{ courseId: string }>
}

async function getCourseData(courseCode: string) {
  try {
    // Get course details - now using course code instead of ID
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
        c.status = 'active' as is_active,
        c.status,
        c.created_at,
        COUNT(DISTINCT e.student_id) as enrolled_count,
        COUNT(DISTINCT cs.id) as total_sessions,
        0 as avg_rating
      FROM courses c
      LEFT JOIN enrollments e ON c.id = e.course_id
      LEFT JOIN class_sessions cs ON c.id = cs.course_id
      WHERE c.code = $1
      GROUP BY c.id, c.code, c.name, c.level, c.program_type, c.course_type, 
               c.max_students, c.student_count, c.start_time, c.end_time, 
               c.day_of_week, c.status, c.created_at
    `;

    const courseResult = await db.query(courseQuery, [courseCode]);
    
    if (courseResult.rows.length === 0) {
      return null;
    }

    const course = courseResult.rows[0];
    const courseDbId = course.id; // Store the database ID for subsequent queries
    
    // Calculate average rating separately to avoid GROUP BY issues
    const avgRatingQuery = `
      SELECT AVG(
        (COALESCE(a.attitude_efforts, 0) + 
         COALESCE(a.asking_questions, 0) + 
         COALESCE(a.application_skills, 0) + 
         COALESCE(a.application_feedback, 0)) / 4.0
      ) as avg_rating
      FROM attendances a
      JOIN class_sessions cs ON a.session_id = cs.id
      WHERE cs.course_id = $1
        AND (a.attitude_efforts IS NOT NULL 
          OR a.asking_questions IS NOT NULL 
          OR a.application_skills IS NOT NULL 
          OR a.application_feedback IS NOT NULL)
    `;
    const avgRatingResult = await db.query(avgRatingQuery, [courseDbId]);
    course.avg_rating = avgRatingResult.rows[0]?.avg_rating || 0;

    // Get enrolled students with their metrics
    const studentsQuery = `
      WITH student_feedback AS (
        SELECT 
          pf.student_id,
          COUNT(DISTINCT pf.id) as feedback_count,
          MAX(pf.created_at) as last_feedback_date
        FROM parsed_student_feedback pf
        WHERE pf.student_id IN (
          SELECT student_id FROM enrollments WHERE course_id = $1
        )
        GROUP BY pf.student_id
      ),
      student_attendance AS (
        SELECT 
          a.student_id,
          COUNT(DISTINCT a.id) as attendance_count,
          COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.id END) as present_count,
          AVG(a.attitude_efforts) as avg_attitude,
          AVG(a.asking_questions) as avg_questions,
          AVG(a.application_skills) as avg_skills,
          AVG(a.application_feedback) as avg_feedback,
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
          ) as avg_performance
        FROM attendances a
        JOIN class_sessions cs ON a.session_id = cs.id
        WHERE cs.course_id = $1
        GROUP BY a.student_id
      ),
      filtered_students AS (
        SELECT DISTINCT ON (u.name)
          s.id,
          u.name as name,
          u.email as email,
          COALESCE(s.grade_level, s.grade, s.original_grade) as grade,
          s.student_number,
          s.student_id_external,
          s.school,
          CASE 
            WHEN COALESCE(s.grade_level, s.grade, s.original_grade) LIKE 'Grade %' 
            THEN CAST(SUBSTRING(COALESCE(s.grade_level, s.grade, s.original_grade) FROM 'Grade (\d+)') AS INTEGER)
            ELSE NULL
          END as grade_num
        FROM students s
        INNER JOIN users u ON s.id = u.id
        INNER JOIN enrollments e ON s.id = e.student_id AND e.course_id = $1
        WHERE u.role = 'student'
        ORDER BY u.name, s.created_at DESC, s.id DESC
      )
      SELECT 
        fs.id,
        COALESCE(fs.student_number, fs.student_id_external) as student_id_external,
        fs.name as name,
        fs.grade,
        fs.school,
        e.enrollment_date,
        e.start_lesson,
        e.end_lesson,
        e.status as enrollment_status,
        COALESCE(sa.attendance_count, 0) as attendance_count,
        COALESCE(sa.present_count, 0) as present_count,
        COALESCE(sa.avg_performance, 0) as avg_performance,
        COALESCE(sf.feedback_count, 0) as feedback_count,
        sf.last_feedback_date,
        CASE 
          WHEN sa.student_id IS NOT NULL THEN
            JSON_BUILD_ARRAY(
              JSON_BUILD_OBJECT('category', 'attitude_efforts', 'rating', sa.avg_attitude),
              JSON_BUILD_OBJECT('category', 'asking_questions', 'rating', sa.avg_questions),
              JSON_BUILD_OBJECT('category', 'application_skills', 'rating', sa.avg_skills),
              JSON_BUILD_OBJECT('category', 'application_feedback', 'rating', sa.avg_feedback)
            )
          ELSE '[]'::json
        END as skill_ratings
      FROM filtered_students fs
      INNER JOIN enrollments e ON fs.id = e.student_id AND e.course_id = $1
      LEFT JOIN student_feedback sf ON fs.id = sf.student_id
      LEFT JOIN student_attendance sa ON fs.id = sa.student_id
      WHERE fs.name IS NOT NULL
        -- Grade-level filtering based on course code
        AND (
          ($1 IN (SELECT id FROM courses WHERE code LIKE '%DEB%') AND fs.grade_num BETWEEN 3 AND 4) OR
          ($1 IN (SELECT id FROM courses WHERE code LIKE '%DEC%') AND fs.grade_num BETWEEN 5 AND 6) OR
          ($1 IN (SELECT id FROM courses WHERE code LIKE '%DED%') AND fs.grade_num BETWEEN 7 AND 9) OR
          ($1 IN (SELECT id FROM courses WHERE code LIKE '%DEE%') AND fs.grade_num BETWEEN 10 AND 12) OR
          fs.grade_num IS NULL -- Allow students without grade info as fallback
        )
      ORDER BY fs.name
    `;

    const studentsResult = await db.query(studentsQuery, [courseDbId]);
    
    // Sort students by name after deduplication
    const students = studentsResult.rows.sort((a, b) => 
      (a.name || '').localeCompare(b.name || '')
    );

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
          CASE 
            WHEN a.attitude_efforts IS NULL AND a.asking_questions IS NULL 
                 AND a.application_skills IS NULL AND a.application_feedback IS NULL 
            THEN NULL
            ELSE (COALESCE(a.attitude_efforts, 0) + COALESCE(a.asking_questions, 0) + 
                  COALESCE(a.application_skills, 0) + COALESCE(a.application_feedback, 0)) / 
                 NULLIF(
                   (CASE WHEN a.attitude_efforts IS NOT NULL THEN 1 ELSE 0 END +
                    CASE WHEN a.asking_questions IS NOT NULL THEN 1 ELSE 0 END +
                    CASE WHEN a.application_skills IS NOT NULL THEN 1 ELSE 0 END +
                    CASE WHEN a.application_feedback IS NOT NULL THEN 1 ELSE 0 END), 0
                 )
          END
        ), 0) as avg_rating
      FROM class_sessions cs
      LEFT JOIN attendances a ON cs.id = a.session_id
      WHERE cs.course_id = $1
      GROUP BY cs.id, cs.session_date, cs.notes, cs.status
      ORDER BY cs.session_date DESC
      LIMIT 5
    `;

    const recentSessionsResult = await db.query(recentSessionsQuery, [courseDbId]);

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

    const activityResult = await db.query(activityQuery, [courseDbId]);

    return {
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
      students: students.map(student => ({
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
    };

  } catch (error) {
    console.error('Error fetching course data:', error)
    return null
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
      dayStr = dayOfWeek;
    } else if (Array.isArray(dayOfWeek)) {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      dayStr = dayOfWeek.map(d => days[d] || '').filter(Boolean).join(', ');
    }
  }
  
  if (!dayStr) dayStr = 'Daily';
  
  return end ? `${dayStr} ${start} - ${end}` : `${dayStr} ${start}`;
}

function calculateGrowthTrend(student: any): 'improving' | 'stable' | 'declining' {
  const avgPerformance = parseFloat(student.avg_performance) || 0;
  if (avgPerformance >= 4) return 'improving';
  if (avgPerformance >= 3) return 'stable';
  return 'declining';
}

function identifyFocusAreas(skillRatings: any): string[] {
  if (!Array.isArray(skillRatings)) return [];
  
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
  
  return focusAreas.slice(0, 2);
}

export default async function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { courseId } = await params
  const courseData = await getCourseData(courseId)

  if (!courseData) {
    notFound()
  }

  return <CourseDetailClient courseData={courseData} />
}