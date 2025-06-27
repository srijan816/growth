import { NextRequest, NextResponse } from 'next/server';
import { db, findOne, insertOne } from '@/lib/postgres';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    if (!date) {
      return NextResponse.json({ error: 'Date parameter required' }, { status: 400 });
    }

    const targetDate = new Date(date);
    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' });

    const coursesResult = await db.query(`
      SELECT c.id, c.code, c.name, c.program_type, c.day_of_week, c.start_time, c.max_students,
             (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as student_count
      FROM courses c
      WHERE c.instructor_id = $1 AND c.status = 'active' AND c.day_of_week = $2
    `, [session.user.id, dayOfWeek]);
    const courses = coursesResult.rows;

    const availableClasses: any[] = [];

    for (const course of courses || []) {
      let classSession = await findOne('class_sessions', { course_id: course.id, session_date: date });

      let sessionId: string;
      let lessonNumber = '1';
      let topic: string | null = null;

      if (!classSession) {
        const lastSessionResult = await db.query('SELECT lesson_number FROM class_sessions WHERE course_id = $1 ORDER BY session_date DESC LIMIT 1', [course.id]);
        const lastSession = lastSessionResult.rows[0];

        if (lastSession) {
          const lastLessonNum = parseFloat(lastSession.lesson_number);
          lessonNumber = (lastLessonNum + 1).toString();
        }

        classSession = await insertOne('class_sessions', {
          course_id: course.id,
          session_date: date,
          lesson_number: lessonNumber,
          instructor_id: session.user.id,
          status: 'scheduled'
        });
      }
      
      sessionId = classSession.id;
      lessonNumber = classSession.lesson_number;
      topic = classSession.topic;

      const makeupAttendancesResult = await db.query('SELECT COUNT(*) FROM attendances WHERE session_id = $1 AND status = \'makeup\'', [sessionId]);
      const makeupCount = parseInt(makeupAttendancesResult.rows[0].count, 10);

      const currentEnrollments = course.student_count || 0;
      const availableSpots = course.max_students - currentEnrollments - makeupCount;

      if (availableSpots > 0) {
        availableClasses.push({
          id: sessionId,
          course_code: course.code,
          course_name: course.name,
          day_of_week: course.day_of_week,
          start_time: course.start_time,
          session_date: date,
          lesson_number: lessonNumber,
          topic: topic,
          available_spots: availableSpots
        });
      }
    }

    availableClasses.sort((a, b) => a.start_time.localeCompare(b.start_time));

    return NextResponse.json({ classes: availableClasses });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
