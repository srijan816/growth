import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { courseId } = await params;
    const supabase = createClient();

    // Get enrolled students for the course
    const { data: enrollments, error } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        students!inner(
          id,
          users!students_id_fkey(
            id,
            name
          )
        )
      `)
      .eq('course_id', courseId)
      .eq('status', 'active');

    // Get today's date for checking makeup students
    const today = new Date().toISOString().split('T')[0];

    // Get makeup students for today's session of this course
    const { data: makeupAttendances, error: makeupError } = await supabase
      .from('attendances')
      .select(`
        enrollment_id,
        enrollments!inner(
          id,
          students!inner(
            id,
            users!students_id_fkey(
              id,
              name
            )
          ),
          courses!inner(
            code,
            name
          )
        ),
        class_sessions!inner(
          session_date,
          course_id
        )
      `)
      .eq('status', 'makeup')
      .eq('class_sessions.course_id', courseId)
      .eq('class_sessions.session_date', today);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
    }

    // Format regular enrolled students
    const regularStudents = enrollments?.map(enrollment => ({
      id: enrollment.students.users.id,
      name: enrollment.students.users.name,
      enrollment_id: enrollment.id,
      attendance_status: 'present', // Default status
      is_makeup_student: false,
      star_ratings: {
        attitude_efforts: 0,
        asking_questions: 0,
        skills_content: 0,
        feedback_application: 0
      }
    })) || [];

    // Format makeup students
    const makeupStudents = makeupAttendances?.map(attendance => ({
      id: attendance.enrollments.students.users.id,
      name: attendance.enrollments.students.users.name,
      enrollment_id: attendance.enrollment_id,
      attendance_status: 'makeup' as const,
      is_makeup_student: true,
      original_course: `${attendance.enrollments.courses.code} - ${attendance.enrollments.courses.name}`,
      star_ratings: {
        attitude_efforts: 0,
        asking_questions: 0,
        skills_content: 0,
        feedback_application: 0
      }
    })) || [];

    // Combine and sort all students
    const allStudents = [...regularStudents, ...makeupStudents]
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ students: allStudents });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}