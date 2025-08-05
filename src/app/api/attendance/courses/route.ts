import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/postgres';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get courses with their current lesson progression
    const coursesQuery = `
      WITH course_progress AS (
        SELECT 
          c.id,
          c.code,
          c.name,
          c.day_of_week,
          c.start_time,
          c.end_time,
          COUNT(DISTINCT e.student_id) as student_count,
          COALESCE(MAX(CAST(cs.unit_number AS INTEGER)), 9) as max_unit,
          COALESCE(MAX(CAST(cs.lesson_number AS INTEGER)), 4) as max_lesson
        FROM courses c
        LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
        LEFT JOIN class_sessions cs ON c.id = cs.course_id
        WHERE c.code IN ('02IPDEB2401', '02IPDEC2402', '02IPDEC2404')
        GROUP BY c.id, c.code, c.name, c.day_of_week, c.start_time, c.end_time
      )
      SELECT 
        *,
        CASE
          WHEN max_unit < 10 THEN 10
          WHEN max_unit = 10 AND max_lesson < 5 THEN 10
          WHEN max_unit = 10 AND max_lesson >= 5 THEN 11
          WHEN max_unit = 11 AND max_lesson < 4 THEN 11
          ELSE 11
        END as next_unit,
        CASE
          WHEN max_unit < 10 THEN 1
          WHEN max_unit = 10 AND max_lesson < 5 THEN max_lesson + 1
          WHEN max_unit = 10 AND max_lesson >= 5 THEN 1
          WHEN max_unit = 11 AND max_lesson < 4 THEN max_lesson + 1
          ELSE 4
        END as next_lesson
      FROM course_progress
      ORDER BY
        CASE day_of_week
          WHEN 'Tuesday' THEN 1
          WHEN 'Wednesday' THEN 2
          WHEN 'Thursday' THEN 3
          WHEN 'Friday' THEN 4
          WHEN 'Saturday' THEN 5
          ELSE 6
        END,
        start_time
    `;

    const result = await db.query(coursesQuery);

    const courses = result.rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      day_of_week: row.day_of_week,
      start_time: row.start_time,
      end_time: row.end_time,
      student_count: parseInt(row.student_count),
      current_unit: row.max_unit,
      current_lesson: row.max_lesson,
      next_unit: row.next_unit,
      next_lesson: row.next_lesson
    }));

    return NextResponse.json({ 
      success: true, 
      courses 
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
