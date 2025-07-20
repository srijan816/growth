import { NextResponse } from 'next/server';
import { db } from '@/lib/postgres';

export async function GET() {
  try {
    // First, let's check how many users are students
    const studentUsersQuery = `
      SELECT COUNT(*) as count 
      FROM users 
      WHERE role = 'student'
    `;
    const studentUsersResult = await db.query(studentUsersQuery);

    // Check students table
    const studentsTableQuery = `
      SELECT COUNT(*) as count 
      FROM students
    `;
    const studentsTableResult = await db.query(studentsTableQuery);

    // Check enrollments
    const enrollmentsQuery = `
      SELECT COUNT(*) as count 
      FROM enrollments
    `;
    const enrollmentsResult = await db.query(enrollmentsQuery);

    // Get all student users with their names
    const allStudentUsersQuery = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        s.id as student_record_id
      FROM users u
      LEFT JOIN students s ON u.id = s.id
      WHERE u.role = 'student'
      ORDER BY u.name
    `;
    const allStudentUsersResult = await db.query(allStudentUsersQuery);

    // Process to find duplicates by first name
    const studentsByFirstName = new Map<string, any[]>();
    
    allStudentUsersResult.rows.forEach(user => {
      const fullName = user.name || '';
      const firstName = fullName.split(' ')[0].toLowerCase();
      
      if (!studentsByFirstName.has(firstName)) {
        studentsByFirstName.set(firstName, []);
      }
      
      studentsByFirstName.get(firstName)?.push({
        id: user.id,
        fullName: user.name,
        email: user.email,
        hasStudentRecord: !!user.student_record_id
      });
    });

    // Find name collisions
    const nameCollisions = Array.from(studentsByFirstName.entries())
      .filter(([_, students]) => students.length > 1)
      .map(([firstName, students]) => ({
        firstName: students[0].fullName.split(' ')[0],
        count: students.length,
        students: students
      }))
      .sort((a, b) => b.count - a.count);

    // Get students with enrollments in Srijan's courses
    const srijanStudentsQuery = `
      SELECT 
        u.id,
        u.name as student_name,
        u.email,
        STRING_AGG(c.code || ' - ' || c.name, ', ' ORDER BY c.code) as courses
      FROM users u
      INNER JOIN students s ON u.id = s.id
      INNER JOIN enrollments e ON s.id = e.student_id
      INNER JOIN courses c ON e.course_id = c.id
      INNER JOIN users i ON c.instructor_id = i.id
      WHERE i.name = 'Srijan' AND u.role = 'student'
      GROUP BY u.id, u.name, u.email
      ORDER BY u.name
    `;
    const srijanStudentsResult = await db.query(srijanStudentsQuery);

    // Process Srijan's students for name collisions
    const srijanStudentsByFirstName = new Map<string, any[]>();
    
    srijanStudentsResult.rows.forEach(student => {
      const fullName = student.student_name || '';
      const firstName = fullName.split(' ')[0].toLowerCase();
      
      if (!srijanStudentsByFirstName.has(firstName)) {
        srijanStudentsByFirstName.set(firstName, []);
      }
      
      srijanStudentsByFirstName.get(firstName)?.push({
        id: student.id,
        fullName: student.student_name,
        email: student.email,
        courses: student.courses
      });
    });

    // Find Srijan's students with name collisions
    const srijanNameCollisions = Array.from(srijanStudentsByFirstName.entries())
      .filter(([_, students]) => students.length > 1)
      .map(([firstName, students]) => ({
        firstName: students[0].fullName.split(' ')[0],
        count: students.length,
        students: students
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      diagnostics: {
        totalUserStudents: studentUsersResult.rows[0].count,
        totalStudentRecords: studentsTableResult.rows[0].count,
        totalEnrollments: enrollmentsResult.rows[0].count,
        totalStudentUsers: allStudentUsersResult.rows.length
      },
      allStudentNameCollisions: nameCollisions,
      srijanStudents: {
        total: srijanStudentsResult.rows.length,
        nameCollisions: srijanNameCollisions,
        allStudents: srijanStudentsResult.rows
      }
    });

  } catch (error) {
    console.error('Error in detailed student analysis:', error);
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 });
  }
}