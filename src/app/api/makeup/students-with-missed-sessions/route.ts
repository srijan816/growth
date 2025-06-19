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

    // Get all class sessions for instructor's courses
    const { data: sessions, error: sessionsError } = await supabase
      .from('class_sessions')
      .select(`
        id,
        session_date,
        lesson_number,
        topic,
        course_id,
        courses!inner(
          id,
          code,
          name,
          instructor_id
        )
      `)
      .eq('courses.instructor_id', session.user.id)
      .eq('status', 'completed')
      .order('session_date', { ascending: false });

    if (sessionsError) {
      console.error('Database error:', sessionsError);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    // Get all enrollments for instructor's courses
    const courseIds = sessions?.map(s => s.course_id) || [];
    if (courseIds.length === 0) {
      return NextResponse.json({ students: [] });
    }

    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        course_id,
        students!inner(
          id,
          users!students_id_fkey(
            id,
            name
          )
        ),
        courses!inner(
          id,
          code,
          name
        )
      `)
      .in('course_id', courseIds)
      .eq('status', 'active');

    if (enrollmentsError) {
      console.error('Database error:', enrollmentsError);
      return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 });
    }

    // Get all attendance records
    const { data: attendances, error: attendanceError } = await supabase
      .from('attendances')
      .select('enrollment_id, session_id, status')
      .in('session_id', sessions?.map(s => s.id) || []);

    if (attendanceError) {
      console.error('Database error:', attendanceError);
      return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 });
    }

    // Process data to find students with missed sessions
    const studentsWithMissedSessions: any[] = [];
    const attendanceMap = new Map();
    
    // Create attendance lookup map
    attendances?.forEach(att => {
      attendanceMap.set(`${att.enrollment_id}-${att.session_id}`, att.status);
    });

    // Group enrollments by student
    const studentEnrollments = new Map();
    enrollments?.forEach(enrollment => {
      const studentId = enrollment.students.users.id;
      if (!studentEnrollments.has(studentId)) {
        studentEnrollments.set(studentId, []);
      }
      studentEnrollments.get(studentId).push(enrollment);
    });

    // Check each student's attendance
    studentEnrollments.forEach((studentEnrollmentsList, studentId) => {
      studentEnrollmentsList.forEach((enrollment: any) => {
        const missedSessions: any[] = [];
        
        // Find sessions for this course
        const courseSessions = sessions?.filter(s => s.course_id === enrollment.course_id) || [];
        
        courseSessions.forEach(session => {
          const attendanceKey = `${enrollment.id}-${session.id}`;
          const attendanceStatus = attendanceMap.get(attendanceKey);
          
          // If no attendance record or marked as absent, it's a missed session
          if (!attendanceStatus || attendanceStatus === 'absent') {
            missedSessions.push({
              session_id: session.id,
              session_date: session.session_date,
              lesson_number: session.lesson_number,
              topic: session.topic
            });
          }
        });

        // Add student if they have missed sessions
        if (missedSessions.length > 0) {
          studentsWithMissedSessions.push({
            id: enrollment.students.users.id,
            name: enrollment.students.users.name,
            enrollment_id: enrollment.id,
            course_name: enrollment.courses.name,
            course_code: enrollment.courses.code,
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