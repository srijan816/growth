import { NextRequest, NextResponse } from 'next/server';
import { db, findOne, insertOne } from '@/lib/postgres';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface AttendanceEntry {
  enrollment_id: string;
  student_name: string;
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

    // Get student IDs from enrollment IDs
    const enrollmentIds = students.map(s => s.enrollment_id).filter(Boolean);
    const enrollmentResult = await db.query(`
      SELECT e.id as enrollment_id, e.student_id, u.name as student_name
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN users u ON s.id = u.id
      WHERE e.id = ANY($1)
    `, [enrollmentIds]);
    
    const enrollmentMap = new Map(enrollmentResult.rows.map(row => [row.enrollment_id, row]));

    const attendanceRecords = students.map(student => {
      const enrollment = enrollmentMap.get(student.enrollment_id);
      if (!enrollment) {
        console.warn(`No enrollment found for ID: ${student.enrollment_id}`);
        return null;
      }
      
      return {
        student_id: enrollment.student_id,
        session_id: sessionId,
        status: student.status,
        attitude_efforts: student.star_rating_1,
        asking_questions: student.star_rating_2,
        application_skills: student.star_rating_3,
        application_feedback: student.star_rating_4,
        created_at: new Date(),
        updated_at: new Date()
      };
    }).filter(Boolean);

    await db.transaction(async (client) => {
        for (const record of attendanceRecords) {
            if (!record) continue;
            
            await client.query(`
                INSERT INTO attendances (
                    student_id, session_id, status, 
                    attitude_efforts, asking_questions, application_skills, application_feedback,
                    created_at, updated_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (student_id, session_id) DO UPDATE SET
                    status = EXCLUDED.status,
                    attitude_efforts = EXCLUDED.attitude_efforts,
                    asking_questions = EXCLUDED.asking_questions,
                    application_skills = EXCLUDED.application_skills,
                    application_feedback = EXCLUDED.application_feedback,
                    updated_at = EXCLUDED.updated_at
            `, [
                record.student_id, 
                record.session_id, 
                record.status, 
                record.attitude_efforts, 
                record.asking_questions, 
                record.application_skills, 
                record.application_feedback,
                record.created_at,
                record.updated_at
            ]);
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
