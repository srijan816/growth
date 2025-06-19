import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface MakeupEntry {
  student_id: string;
  student_name: string;
  original_enrollment_id: string;
  makeup_class_id: string;
  makeup_class_name: string;
  makeup_session_date: string;
  missed_session_id: string;
  missed_session_date: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { entries } = body as { entries: MakeupEntry[] };

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const supabase = createClient();

    // Process each makeup entry
    const processedEntries = [];

    for (const entry of entries) {
      try {
        // Get the original enrollment details
        const { data: enrollment, error: enrollmentError } = await supabase
          .from('enrollments')
          .select('id, student_id, course_id')
          .eq('id', entry.original_enrollment_id)
          .single();

        if (enrollmentError || !enrollment) {
          console.error('Failed to find enrollment:', enrollmentError);
          continue;
        }

        // Create makeup attendance record
        const { data: makeupAttendance, error: attendanceError } = await supabase
          .from('attendances')
          .insert({
            enrollment_id: enrollment.id,
            session_id: entry.makeup_class_id, // This is actually the makeup session ID
            status: 'makeup',
            makeup_session_id: entry.missed_session_id,
            star_rating_1: 0, // Default values, will be updated when attendance is taken
            star_rating_2: 0,
            star_rating_3: 0,
            star_rating_4: 0,
            notes: `Makeup for missed session on ${entry.missed_session_date}`,
            recorded_at: new Date().toISOString()
          })
          .select('id')
          .single();

        if (attendanceError) {
          console.error('Failed to create makeup attendance:', attendanceError);
          continue;
        }

        // Update the original missed session to mark it as having a makeup scheduled
        const { error: updateError } = await supabase
          .from('attendances')
          .upsert({
            enrollment_id: enrollment.id,
            session_id: entry.missed_session_id,
            status: 'absent',
            makeup_session_id: entry.makeup_class_id,
            recorded_at: new Date().toISOString()
          }, {
            onConflict: 'enrollment_id,session_id'
          });

        if (updateError) {
          console.error('Failed to update missed session:', updateError);
          // Don't continue here as the makeup was still created
        }

        processedEntries.push({
          student_name: entry.student_name,
          makeup_attendance_id: makeupAttendance.id,
          makeup_session_date: entry.makeup_session_date,
          missed_session_date: entry.missed_session_date
        });

      } catch (entryError) {
        console.error('Error processing makeup entry:', entryError);
        continue;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Successfully scheduled ${processedEntries.length} makeup sessions`,
      processed_entries: processedEntries
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}