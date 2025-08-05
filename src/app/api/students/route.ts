import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/database/connection';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const instructorName = session.user.name || 'Unknown';
    
    console.log(`Fetching students for instructor: ${instructorName}`);

    // Get all students with their enrollments, feedback count, and average star ratings
    const query = `
      WITH student_ratings AS (
        SELECT 
          s.id,
          AVG(
            (COALESCE(a.attitude_efforts, 0) + 
             COALESCE(a.asking_questions, 0) + 
             COALESCE(a.application_skills, 0) + 
             COALESCE(a.application_feedback, 0))::DECIMAL / 4.0
          ) as avg_star_rating,
          COUNT(DISTINCT cs.id) as attended_sessions,
          MAX(cs.session_date) as last_activity_date
        FROM students s
        LEFT JOIN attendances a ON s.id = a.student_id
        LEFT JOIN class_sessions cs ON a.session_id = cs.id
        WHERE a.status = 'present'
        GROUP BY s.id
      ),
      student_makeups AS (
        SELECT 
          s.id,
          COUNT(*) as makeup_count
        FROM students s
        LEFT JOIN attendances a ON s.id = a.student_id
        LEFT JOIN class_sessions cs ON a.session_id = cs.id
        WHERE a.status = 'absent' 
        AND cs.session_date < CURRENT_DATE
        GROUP BY s.id
      )
      SELECT 
        s.id,
        s.student_number as student_id_external,
        u.name,
        s.grade_level as grade,
        s.school,
        COUNT(DISTINCT e.course_id) as course_count,
        COUNT(DISTINCT pf.id) as feedback_count,
        ARRAY_AGG(DISTINCT c.course_code) FILTER (WHERE c.course_code IS NOT NULL) as course_codes,
        ARRAY_AGG(DISTINCT c.course_name) FILTER (WHERE c.course_name IS NOT NULL) as course_names,
        MAX(pf.parsed_at) as last_feedback_date,
        COALESCE(sr.avg_star_rating, 3.0) as star_average,
        COALESCE(sr.attended_sessions, 0) as attended_sessions,
        COALESCE(sr.last_activity_date, CURRENT_DATE) as last_activity,
        COALESCE(sm.makeup_count, 0) as makeup_count,
        CASE 
          WHEN s.grade_level LIKE '%Grade%' THEN
            CASE 
              WHEN CAST(REGEXP_REPLACE(s.grade_level, '[^0-9]', '', 'g') AS INTEGER) <= 6 THEN 'primary'
              ELSE 'secondary'
            END
          ELSE 'secondary'
        END as level
      FROM students s
      INNER JOIN users u ON s.id = u.id
      LEFT JOIN enrollments e ON s.id = e.student_id
      LEFT JOIN courses c ON e.course_id = c.id
      LEFT JOIN parsed_student_feedback pf ON s.id = pf.student_id
      LEFT JOIN student_ratings sr ON s.id = sr.id
      LEFT JOIN student_makeups sm ON s.id = sm.id
      GROUP BY s.id, s.student_number, u.name, s.grade_level, s.school, 
               sr.avg_star_rating, sr.attended_sessions, sr.last_activity_date, sm.makeup_count
      ORDER BY u.name
    `;

    const result = await db.query(query);
    
    // Log query results for debugging
    console.log(`Students API: Found ${result.rows.length} students`);
    if (result.rows.length > 0) {
      console.log('First student raw data:', {
        id: result.rows[0].id,
        student_id_external: result.rows[0].student_id_external,
        name: result.rows[0].name
      });
    }
    
    // Transform the data to match the expected structure
    const students = result.rows.map(row => ({
      id: row.student_id_external || row.id,
      name: row.name || 'Unknown Student',
      level: row.level,
      grade: row.grade || 'Grade Unknown',
      courses: row.course_codes || [],
      starAverage: parseFloat(row.star_average) || 3.0,
      feedbackSessions: parseInt(row.feedback_count) || 0,
      lastActivity: row.last_activity ? new Date(row.last_activity).toLocaleDateString() : new Date().toLocaleDateString(),
      needsMakeup: parseInt(row.makeup_count) > 0,
      focusAreas: generateFocusAreas(row),
      homeworkCompleted: Math.random() > 0.3, // Placeholder - would need homework tracking
      isHidden: false,
      isDeparted: false
    }));

    return NextResponse.json(students);

  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

// Helper function to generate focus areas based on student data
function generateFocusAreas(student: any): string[] {
  const areas = [
    'Public Speaking Confidence',
    'Argument Structure',
    'Critical Analysis',
    'Team Collaboration',
    'Research Skills',
    'Presentation Skills',
    'Debate Technique',
    'Writing Clarity',
    'Time Management',
    'Vocabulary Building'
  ];
  
  // Use student data to deterministically select focus areas
  const starAvg = parseFloat(student.star_average) || 3.0;
  const name = student.name || 'Unknown Student';
  const hash = name.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0);
  
  if (starAvg < 2.5) {
    return areas.slice(0, 3); // More focus areas for struggling students
  } else if (starAvg < 3.5) {
    return areas.slice(hash % 3, (hash % 3) + 2);
  } else {
    return areas.slice(hash % 5, (hash % 5) + 1);
  }
}

