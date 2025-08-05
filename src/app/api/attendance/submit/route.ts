import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/postgres';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface AttendanceSubmission {
  course_id: string;
  unit_number: number;
  lesson_number: number;
  session_date: string;
  students: {
    student_id: string;
    enrollment_id: string;
    status: 'present' | 'absent' | 'makeup';
    attitude_efforts: number;
    asking_questions: number;
    application_skills: number;
    application_feedback: number;
  }[];
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: AttendanceSubmission = await request.json();
    const { course_id, unit_number, lesson_number, session_date, students } = body;

    if (!course_id || !unit_number || !lesson_number || !session_date || !students || !Array.isArray(students)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    // Start transaction
    await db.query('BEGIN');

    try {
      // Create or find class session
      let sessionResult = await db.query(`
        SELECT id FROM class_sessions 
        WHERE course_id = $1 AND unit_number = $2 AND lesson_number = $3
      `, [course_id, unit_number.toString(), lesson_number.toString()]);

      let sessionId: string;

      if (sessionResult.rows.length === 0) {
        // Create new session
        const createSessionResult = await db.query(`
          INSERT INTO class_sessions (
            course_id, session_date, start_time, end_time, 
            unit_number, lesson_number, status
          ) 
          VALUES ($1, $2, '10:00:00', '11:00:00', $3, $4, 'completed')
          RETURNING id
        `, [course_id, session_date, unit_number.toString(), lesson_number.toString()]);
        
        sessionId = createSessionResult.rows[0].id;
      } else {
        sessionId = sessionResult.rows[0].id;
      }

      // Insert/update attendance records
      for (const student of students) {
        await db.query(`
          INSERT INTO attendances (
            student_id, session_id, status,
            attitude_efforts, asking_questions, application_skills, application_feedback,
            marked_by, marked_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
          ON CONFLICT (student_id, session_id) DO UPDATE SET
            status = EXCLUDED.status,
            attitude_efforts = EXCLUDED.attitude_efforts,
            asking_questions = EXCLUDED.asking_questions,
            application_skills = EXCLUDED.application_skills,
            application_feedback = EXCLUDED.application_feedback,
            marked_by = EXCLUDED.marked_by,
            marked_at = EXCLUDED.marked_at,
            updated_at = NOW()
        `, [
          student.student_id,
          sessionId,
          student.status,
          student.attitude_efforts || null,
          student.asking_questions || null,
          student.application_skills || null,
          student.application_feedback || null,
          session.user.id
        ]);
      }

      await db.query('COMMIT');

      return NextResponse.json({ 
        success: true, 
        message: 'Attendance submitted successfully',
        session_id: sessionId,
        unit_number,
        lesson_number,
        records_saved: students.length
      });

    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
