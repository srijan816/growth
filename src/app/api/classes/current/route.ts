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

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 8);
    const currentDayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

    const coursesResult = await db.query(`
      SELECT 
        c.id, c.code, c.name, c.program_type, c.day_of_week, c.start_time, c.end_time,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) as student_count
      FROM courses c
      WHERE c.instructor_id = $1
      AND c.status = 'active'
      AND c.day_of_week = ANY($2)
      ORDER BY c.start_time
    `, [session.user.id, [currentDayOfWeek, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']]);

    const courses = coursesResult.rows;

    const processedCourses = courses?.map(course => {
      const courseTime = course.start_time;
      const endTime = course.end_time || '23:59:59';
      const isToday = course.day_of_week === currentDayOfWeek;
      
      let status: 'next' | 'ongoing' | 'completed' | 'upcoming' = 'upcoming';
      
      if (isToday) {
        const courseStart = new Date(`${today}T${courseTime}`);
        const courseEnd = new Date(`${today}T${endTime}`);
        const nowTime = new Date(`${today}T${currentTime}`);
        
        if (nowTime >= courseStart && nowTime <= courseEnd) {
          status = 'ongoing';
        } else if (courseStart > nowTime && (courseStart.getTime() - nowTime.getTime()) <= 30 * 60 * 1000) {
          status = 'next';
        } else if (nowTime > courseEnd) {
          status = 'completed';
        }
      }
      
      return {
        id: course.id,
        course_code: course.code,
        program_name: course.name,
        day_of_week: course.day_of_week,
        start_time: course.start_time,
        status,
        student_count: course.student_count,
        next_session_date: today
      };
    }) || [];

    const sortedCourses = processedCourses.sort((a, b) => {
      const statusOrder = { ongoing: 0, next: 1, upcoming: 2, completed: 3 };
      
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) {
        return statusDiff;
      }
      
      return a.start_time.localeCompare(b.start_time);
    });

    return NextResponse.json({ courses: sortedCourses });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
