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

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    if (!date) {
      return NextResponse.json({ error: 'Date parameter required' }, { status: 400 });
    }

    const supabase = createClient();
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' });

    // Get all courses for the instructor that occur on the specified day
    const { data: courses, error: coursesError } = await supabase
      .from('courses')
      .select(`
        id,
        code,
        name,
        program_type,
        day_of_week,
        start_time,
        max_students,
        enrollments!inner(
          id
        )
      `)
      .eq('instructor_id', session.user.id)
      .eq('status', 'active')
      .eq('day_of_week', dayOfWeek);

    if (coursesError) {
      console.error('Database error:', coursesError);
      return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 });
    }

    // Get or create class sessions for this date
    const availableClasses: any[] = [];

    for (const course of courses || []) {
      // Check if session exists for this date
      let { data: existingSession, error: sessionError } = await supabase
        .from('class_sessions')
        .select('id, lesson_number, topic')
        .eq('course_id', course.id)
        .eq('session_date', date)
        .single();

      let sessionId: string;
      let lessonNumber = '1';
      let topic: string | null = null;

      if (sessionError && sessionError.code === 'PGRST116') {
        // Session doesn't exist, determine next lesson number
        const { data: lastSession } = await supabase
          .from('class_sessions')
          .select('lesson_number')
          .eq('course_id', course.id)
          .order('session_date', { ascending: false })
          .limit(1)
          .single();

        if (lastSession) {
          const lastLessonNum = parseFloat(lastSession.lesson_number);
          lessonNumber = (lastLessonNum + 1).toString();
        }

        // Create new session
        const { data: newSession, error: createError } = await supabase
          .from('class_sessions')
          .insert({
            course_id: course.id,
            session_date: date,
            lesson_number: lessonNumber,
            instructor_id: session.user.id,
            status: 'scheduled'
          })
          .select('id, lesson_number, topic')
          .single();

        if (createError) {
          console.error('Failed to create session:', createError);
          continue;
        }

        sessionId = newSession.id;
        lessonNumber = newSession.lesson_number;
        topic = newSession.topic;
      } else if (sessionError) {
        console.error('Session check error:', sessionError);
        continue;
      } else {
        sessionId = existingSession.id;
        lessonNumber = existingSession.lesson_number;
        topic = existingSession.topic;
      }

      // Count current makeup enrollments for this session
      const { data: makeupAttendances, error: makeupError } = await supabase
        .from('attendances')
        .select('id')
        .eq('session_id', sessionId)
        .eq('status', 'makeup');

      if (makeupError) {
        console.error('Makeup attendance error:', makeupError);
        continue;
      }

      const currentEnrollments = course.enrollments?.length || 0;
      const makeupCount = makeupAttendances?.length || 0;
      const availableSpots = course.max_students - currentEnrollments - makeupCount;

      // Only include classes with available spots
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

    // Sort by start time
    availableClasses.sort((a, b) => a.start_time.localeCompare(b.start_time));

    return NextResponse.json({ classes: availableClasses });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}