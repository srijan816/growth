import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/postgres';
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

    // Get enrolled students for the course
    // courseId could be either UUID or course code, so we need to handle both
    // Using DISTINCT ON (u.name) to ensure unique students by name (handles duplicate records)
    const studentsQuery = `
      SELECT DISTINCT ON (u.name)
        u.id,
        u.name,
        u.email,
        s.student_number,
        e.id as enrollment_id,
        c.code as course_code,
        c.name as course_name,
        s.created_at
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      JOIN students s ON e.student_id = s.id
      JOIN users u ON s.id = u.id
      WHERE (c.id::text = $1 OR c.code = $1)
        AND e.status = 'active'
        AND u.role = 'student'
      ORDER BY u.name, s.created_at DESC, u.id DESC
    `;

    const result = await executeQuery(studentsQuery, [courseId]);

    if (!result.rows.length) {
      // If no students found, return empty array
      return NextResponse.json({ 
        students: [],
        message: `No students found for course: ${courseId}`
      });
    }

    // Format students for the debate team setup
    // Use the actual user ID as the unique identifier
    const students = result.rows.map(row => ({
      id: row.id, // Use actual user ID as the unique identifier
      name: row.name,
      email: row.email,
      studentNumber: row.student_number,
      enrollmentId: row.enrollment_id,
      courseCode: row.course_code,
      courseName: row.course_name
    }));

    return NextResponse.json({ 
      students,
      total: students.length,
      courseId: courseId
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch students',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}