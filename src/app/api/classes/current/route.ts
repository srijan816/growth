import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 8);
    const currentDayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

    // Get courses for today and upcoming classes
    const { data: courses, error } = await supabase
      .from('courses')
      .select(`
        id,
        code,
        name,
        program_type,
        day_of_week,
        start_time,
        enrollments!inner(
          id,
          students!inner(
            id,
            users!students_id_fkey(
              name
            )
          )
        )
      `)
      .eq('instructor_id', session.user.id)
      .eq('status', 'active')
      .in('day_of_week', [currentDayOfWeek, 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])
      .order('start_time');

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
    }

    // Process courses and determine their status
    const processedCourses = courses?.map(course => {
      const courseTime = course.start_time;
      const endTime = course.end_time || '23:59:59';
      const isToday = course.day_of_week === currentDayOfWeek;
      
      let status: 'next' | 'ongoing' | 'completed' | 'upcoming' = 'upcoming';
      
      if (isToday) {
        const courseStart = new Date(`${today}T${courseTime}`);
        const courseEnd = new Date(`${today}T${endTime}`);
        const nowTime = new Date(`${today}T${currentTime}`);
        
        // Check if class is ongoing
        if (nowTime >= courseStart && nowTime <= courseEnd) {
          status = 'ongoing';
        }
        // Check if class is next (within 30 minutes)
        else if (courseStart > nowTime && (courseStart.getTime() - nowTime.getTime()) <= 30 * 60 * 1000) {
          status = 'next';
        }
        // Check if class is completed
        else if (nowTime > courseEnd) {
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
        student_count: course.enrollments?.length || 0,
        next_session_date: today // For today's classes, use today's date
      };
    }) || [];

    // Sort by priority and time: ongoing, next, then chronological order
    const sortedCourses = processedCourses.sort((a, b) => {
      const statusOrder = { ongoing: 0, next: 1, upcoming: 2, completed: 3 };
      
      // First, sort by status priority
      const statusDiff = statusOrder[a.status] - statusOrder[b.status];
      if (statusDiff !== 0) {
        return statusDiff;
      }
      
      // Then sort by time (chronological order)
      return a.start_time.localeCompare(b.start_time);
    });

    return NextResponse.json({ courses: sortedCourses });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}