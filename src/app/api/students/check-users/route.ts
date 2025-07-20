import { NextResponse } from 'next/server';
import { db } from '@/lib/postgres';

export async function GET() {
  try {
    // Check all users and their roles
    const usersQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        s.id as student_id,
        CASE 
          WHEN s.id IS NOT NULL THEN 'Has student record'
          ELSE 'No student record'
        END as student_status
      FROM users u
      LEFT JOIN students s ON u.id = s.id
      ORDER BY u.role, u.name
    `;
    const usersResult = await db.query(usersQuery);

    // Group by role
    const usersByRole = usersResult.rows.reduce((acc, user) => {
      if (!acc[user.role]) {
        acc[user.role] = [];
      }
      acc[user.role].push(user);
      return acc;
    }, {} as Record<string, any[]>);

    // Get students table data with course enrollments
    const studentsDataQuery = `
      SELECT 
        s.id,
        s.student_number,
        COUNT(DISTINCT e.course_id) as course_count,
        STRING_AGG(DISTINCT c.code, ', ' ORDER BY c.code) as course_codes
      FROM students s
      LEFT JOIN enrollments e ON s.id = e.student_id
      LEFT JOIN courses c ON e.course_id = c.id
      GROUP BY s.id, s.student_number
      ORDER BY s.id
    `;
    const studentsDataResult = await db.query(studentsDataQuery);

    // Check for orphaned student records (students without corresponding users)
    const orphanedStudentsQuery = `
      SELECT 
        s.id,
        s.student_number,
        COUNT(e.id) as enrollment_count
      FROM students s
      LEFT JOIN users u ON s.id = u.id
      WHERE u.id IS NULL
      GROUP BY s.id, s.student_number
    `;
    const orphanedStudentsResult = await db.query(orphanedStudentsQuery);

    return NextResponse.json({
      summary: {
        totalUsers: usersResult.rows.length,
        usersByRole: Object.keys(usersByRole).map(role => ({
          role,
          count: usersByRole[role].length
        })),
        totalStudentRecords: studentsDataResult.rows.length,
        orphanedStudentRecords: orphanedStudentsResult.rows.length
      },
      usersByRole,
      studentsTableInfo: studentsDataResult.rows.slice(0, 10), // First 10 for sample
      orphanedStudents: orphanedStudentsResult.rows,
      issue: orphanedStudentsResult.rows.length > 0 ? 
        "Found student records without corresponding user records. This is why we can't see student names." : 
        "No orphaned student records found."
    });

  } catch (error) {
    console.error('Error checking users:', error);
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 });
  }
}