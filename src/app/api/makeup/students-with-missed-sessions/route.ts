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

    const sessionsResult = await db.query(`
      SELECT cs.id, cs.session_date, cs.lesson_number, cs.topic, cs.course_id, c.code, c.name
      FROM class_sessions cs
      JOIN courses c ON cs.course_id = c.id
      WHERE c.instructor_id = $1 AND cs.status = 'completed'
      ORDER BY cs.session_date DESC
    `, [session.user.id]);
    const sessions = sessionsResult.rows;

    const courseIds = sessions?.map(s => s.course_id) || [];
    if (courseIds.length === 0) {
      return NextResponse.json({ students: [] });
    }

    const enrollmentsResult = await db.query(`
      SELECT e.id, e.student_id, e.course_id, u.name as student_name, c.code as course_code, c.name as course_name
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN users u ON s.id = u.id
      JOIN courses c ON e.course_id = c.id
      WHERE e.course_id = ANY($1) AND e.status = 'active'
    `, [courseIds]);
    const enrollments = enrollmentsResult.rows;

    const attendancesResult = await db.query('SELECT enrollment_id, session_id, status FROM attendances WHERE session_id = ANY($1)', [sessions?.map(s => s.id) || []]);
    const attendances = attendancesResult.rows;

    const studentsWithMissedSessions: any[] = [];
    const attendanceMap = new Map();
    
    attendances?.forEach(att => {
      attendanceMap.set(`${att.enrollment_id}-${att.session_id}`, att.status);
    });

    const studentEnrollments = new Map();
    enrollments?.forEach(enrollment => {
      const studentId = enrollment.student_id;
      if (!studentEnrollments.has(studentId)) {
        studentEnrollments.set(studentId, []);
      }
      studentEnrollments.get(studentId).push(enrollment);
    });

    studentEnrollments.forEach((studentEnrollmentsList, studentId) => {
      studentEnrollmentsList.forEach((enrollment: any) => {
        const missedSessions: any[] = [];
        
        const courseSessions = sessions?.filter(s => s.course_id === enrollment.course_id) || [];
        
        courseSessions.forEach(session => {
          const attendanceKey = `${enrollment.id}-${session.id}`;
          const attendanceStatus = attendanceMap.get(attendanceKey);
          
          if (!attendanceStatus || attendanceStatus === 'absent') {
            missedSessions.push({
              session_id: session.id,
              session_date: session.session_date,
              lesson_number: session.lesson_number,
              topic: session.topic
            });
          }
        });

        if (missedSessions.length > 0) {
          studentsWithMissedSessions.push({
            id: studentId,
            name: enrollment.student_name,
            enrollment_id: enrollment.id,
            course_name: enrollment.course_name,
            course_code: enrollment.course_code,
            missed_sessions: missedSessions
          });
        }
      });
    });

    return NextResponse.json({ students: studentsWithMissedSessions });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
