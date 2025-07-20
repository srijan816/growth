import { NextResponse } from 'next/server';
import { db } from '@/lib/postgres';

export async function GET() {
  try {
    // Get all students with their enrollments and course information
    const studentsQuery = `
      SELECT 
        s.id as student_id,
        u.name as student_name,
        c.id as course_id,
        c.code as course_code,
        c.name as course_name,
        i.name as instructor_name
      FROM students s
      INNER JOIN users u ON s.id = u.id
      INNER JOIN enrollments e ON s.id = e.student_id
      INNER JOIN courses c ON e.course_id = c.id
      LEFT JOIN users i ON c.instructor_id = i.id
      ORDER BY u.name
    `;

    const result = await db.query(studentsQuery);
    const students = result.rows;

    // Process the data to find name collisions
    const studentsByFirstName = new Map<string, any[]>();
    const processedStudents = new Map<string, any>();
    
    students.forEach(row => {
      const fullName = row.student_name || '';
      const firstName = fullName.split(' ')[0].toLowerCase();
      
      // Create or update student record
      if (!processedStudents.has(row.student_id)) {
        processedStudents.set(row.student_id, {
          id: row.student_id,
          fullName,
          firstName: fullName.split(' ')[0],
          courses: []
        });
      }
      
      // Add course enrollment
      processedStudents.get(row.student_id).courses.push({
        courseCode: row.course_code,
        courseName: row.course_name,
        instructorName: row.instructor_name || 'No instructor assigned'
      });
    });

    // Convert to array and group by first name
    const studentArray = Array.from(processedStudents.values());
    
    studentArray.forEach(student => {
      const firstName = student.firstName.toLowerCase();
      if (!studentsByFirstName.has(firstName)) {
        studentsByFirstName.set(firstName, []);
      }
      studentsByFirstName.get(firstName)?.push(student);
    });

    // Find all first names with duplicates
    const nameCollisions = Array.from(studentsByFirstName.entries())
      .filter(([_, students]) => students.length > 1)
      .map(([firstName, students]) => ({
        firstName: students[0].firstName,
        count: students.length,
        students: students.map(s => ({
          id: s.id,
          fullName: s.fullName,
          courses: s.courses.map((c: any) => `${c.courseCode} (${c.instructorName})`).join(', ')
        }))
      }))
      .sort((a, b) => b.count - a.count);

    // Get instructor stats
    const instructorQuery = `
      SELECT 
        i.name as instructor_name,
        COUNT(DISTINCT c.id) as course_count,
        COUNT(DISTINCT e.student_id) as student_count
      FROM users i
      INNER JOIN courses c ON c.instructor_id = i.id
      INNER JOIN enrollments e ON e.course_id = c.id
      WHERE i.role = 'instructor'
      GROUP BY i.id, i.name
      ORDER BY i.name
    `;

    const instructorResult = await db.query(instructorQuery);
    const instructors = instructorResult.rows;

    // Since you mentioned the dashboard is all Srijan's classes, let's find Srijan
    const srijanInstructor = instructors.find(i => 
      i.instructor_name?.toLowerCase().includes('srijan')
    );

    return NextResponse.json({
      totalStudents: processedStudents.size,
      nameCollisions,
      instructors,
      srijanInfo: srijanInstructor || { message: "No instructor named 'Srijan' found" },
      note: "Showing all students and name collisions. Since you mentioned the dashboard shows Srijan's classes, all students should be in Srijan's classes."
    });

  } catch (error) {
    console.error('Error in student name analysis:', error);
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 });
  }
}