import { NextRequest, NextResponse } from 'next/server';
import { db, findOne, insertOne } from '@/lib/postgres';
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

    const processedEntries = [];

    for (const entry of entries) {
      try {
        const enrollment = await findOne('enrollments', { id: entry.original_enrollment_id });

        if (!enrollment) {
          console.error('Failed to find enrollment:', entry.original_enrollment_id);
          continue;
        }

        const makeupAttendance = await insertOne('attendances', {
          enrollment_id: enrollment.id,
          session_id: entry.makeup_class_id,
          status: 'makeup',
          makeup_session_id: entry.missed_session_id,
          star_rating_1: 0,
          star_rating_2: 0,
          star_rating_3: 0,
          star_rating_4: 0,
          notes: `Makeup for missed session on ${entry.missed_session_date}`,
          recorded_at: new Date().toISOString()
        });

        await db.query(`
          INSERT INTO attendances (enrollment_id, session_id, status, makeup_session_id, recorded_at)
          VALUES ($1, $2, 'absent', $3, NOW())
          ON CONFLICT (enrollment_id, session_id) DO UPDATE SET
          status = EXCLUDED.status,
          makeup_session_id = EXCLUDED.makeup_session_id,
          recorded_at = EXCLUDED.recorded_at
        `, [enrollment.id, entry.missed_session_id, entry.makeup_class_id]);

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
