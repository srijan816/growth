import { NextRequest, NextResponse } from 'next/server';
import { db, findOne, insertOne } from '@/lib/postgres';
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

    let classSession = await findOne('class_sessions', { course_id, session_date });

    let sessionId: string;

    if (!classSession) {
      classSession = await insertOne('class_sessions', {
        course_id,
        session_date,
        lesson_number: '1', // You may want to auto-increment this
        instructor_id: session.user.id,
        status: 'completed'
      });
    }
    sessionId = classSession.id;

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

    await db.transaction(async (client) => {
        for (const record of attendanceRecords) {
            await client.query(`
                INSERT INTO attendances (enrollment_id, session_id, status, star_rating_1, star_rating_2, star_rating_3, star_rating_4, recorded_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (enrollment_id, session_id) DO UPDATE SET
                status = EXCLUDED.status,
                star_rating_1 = EXCLUDED.star_rating_1,
                star_rating_2 = EXCLUDED.star_rating_2,
                star_rating_3 = EXCLUDED.star_rating_3,
                star_rating_4 = EXCLUDED.star_rating_4,
                recorded_at = EXCLUDED.recorded_at
            `, [record.enrollment_id, record.session_id, record.status, record.star_rating_1, record.star_rating_2, record.star_rating_3, record.star_rating_4, record.recorded_at]);
        }
    });

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
