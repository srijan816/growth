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

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');

    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 });
    }

    // Get students enrolled in the course - ensuring unique students by name
    // This handles cases where same student might have multiple records
    const studentsQuery = `
      SELECT DISTINCT ON (u.name)
        s.id,
        u.name,
        e.id as enrollment_id,
        e.status as enrollment_status
      FROM students s
      JOIN users u ON s.id = u.id
      JOIN enrollments e ON s.id = e.student_id
      WHERE e.course_id = $1 
        AND e.status = 'active'
        AND u.role = 'student'
      ORDER BY u.name, s.created_at DESC, s.id DESC
    `;

    const result = await db.query(studentsQuery, [courseId]);

    const students = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      enrollment_id: row.enrollment_id,
      enrollment_status: row.enrollment_status
    }));

    return NextResponse.json({ 
      success: true, 
      students 
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
