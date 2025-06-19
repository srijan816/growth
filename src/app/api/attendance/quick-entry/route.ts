import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface AttendanceEntry {
  enrollment_id: string;
  status: 'present' | 'absent' | 'makeup';
  star_rating_1: number;
  star_rating_2: number;
  star_rating_3: number;
  star_rating_4: number;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { course_id, session_date, students } = body as {
      course_id: string;
      session_date: string;
      students: AttendanceEntry[];
    };

    if (!course_id || !session_date || !students || !Array.isArray(students)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const supabase = createClient();

    // Start a transaction
    const { data: existingSession, error: sessionCheckError } = await supabase
      .from('class_sessions')
      .select('id')
      .eq('course_id', course_id)
      .eq('session_date', session_date)
      .single();

    let sessionId: string;

    if (sessionCheckError && sessionCheckError.code === 'PGRST116') {
      // Session doesn't exist, create it
      const { data: newSession, error: createError } = await supabase
        .from('class_sessions')
        .insert({
          course_id,
          session_date,
          lesson_number: '1', // You may want to auto-increment this
          instructor_id: session.user.id,
          status: 'completed'
        })
        .select('id')
        .single();

      if (createError) {
        console.error('Failed to create session:', createError);
        return NextResponse.json({ error: 'Failed to create class session' }, { status: 500 });
      }

      sessionId = newSession.id;
    } else if (sessionCheckError) {
      console.error('Session check error:', sessionCheckError);
      return NextResponse.json({ error: 'Failed to check session' }, { status: 500 });
    } else {
      sessionId = existingSession.id;
    }

    // Prepare attendance records
    const attendanceRecords = students.map(student => ({
      enrollment_id: student.enrollment_id,
      session_id: sessionId,
      status: student.status,
      star_rating_1: student.star_rating_1,
      star_rating_2: student.star_rating_2,
      star_rating_3: student.star_rating_3,
      star_rating_4: student.star_rating_4,
      recorded_at: new Date().toISOString()
    }));

    // Insert attendance records (upsert to handle duplicates)
    const { error: attendanceError } = await supabase
      .from('attendances')
      .upsert(attendanceRecords, {
        onConflict: 'enrollment_id,session_id',
        ignoreDuplicates: false
      });

    if (attendanceError) {
      console.error('Failed to insert attendance:', attendanceError);
      return NextResponse.json({ error: 'Failed to save attendance' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Attendance saved successfully',
      session_id: sessionId,
      records_saved: attendanceRecords.length
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}