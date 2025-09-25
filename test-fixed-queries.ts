import { db } from './src/lib/postgres';

async function testFixedQueries() {
  try {
    // Test the fixed query for a course with duplicate students
    const testCourseCode = '01IPDED2401'; // This course has students with duplicate names
    
    console.log(`\n=== TESTING FIXED QUERY FOR COURSE: ${testCourseCode} ===\n`);
    
    // Simulate the fixed query from the course page
    const studentsQuery = `
      WITH filtered_students AS (
        SELECT DISTINCT ON (u.name)
          s.id,
          u.name as name,
          u.email as email,
          COALESCE(s.grade_level, s.grade, s.original_grade) as grade,
          s.student_number,
          s.student_id_external,
          s.school
        FROM students s
        INNER JOIN users u ON s.id = u.id
        INNER JOIN enrollments e ON s.id = e.student_id
        INNER JOIN courses c ON e.course_id = c.id
        WHERE c.code = $1 AND u.role = 'student'
        ORDER BY u.name, s.created_at DESC, s.id DESC
      )
      SELECT 
        id,
        name,
        email,
        grade,
        COALESCE(student_number, student_id_external) as student_identifier
      FROM filtered_students
      ORDER BY name
    `;

    const result = await db.query(studentsQuery, [testCourseCode]);
    
    console.log(`Total unique students found: ${result.rows.length}\n`);
    
    // Check for any remaining duplicates
    const nameCount = new Map<string, number>();
    const duplicates: any[] = [];
    
    result.rows.forEach(row => {
      const count = (nameCount.get(row.name) || 0) + 1;
      nameCount.set(row.name, count);
      if (count > 1) {
        duplicates.push(row);
      }
    });
    
    if (duplicates.length > 0) {
      console.log('⚠️  STILL FOUND DUPLICATES:');
      duplicates.forEach(dup => {
        console.log(`  - ${dup.name} (ID: ${dup.id})`);
      });
    } else {
      console.log('✅ No duplicate students found - query is working correctly!');
    }
    
    // List the first 10 students to verify
    console.log('\nFirst 10 students in the course:');
    result.rows.slice(0, 10).forEach((row, index) => {
      console.log(`${index + 1}. ${row.name} (${row.student_identifier || 'No ID'})`);
    });
    
    // Test the attendance API query
    console.log(`\n=== TESTING ATTENDANCE API QUERY ===\n`);
    
    const courseIdQuery = `SELECT id FROM courses WHERE code = $1`;
    const courseResult = await db.query(courseIdQuery, [testCourseCode]);
    const courseId = courseResult.rows[0]?.id;
    
    if (courseId) {
      const attendanceQuery = `
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
      
      const attendanceResult = await db.query(attendanceQuery, [courseId]);
      console.log(`Total students for attendance: ${attendanceResult.rows.length}`);
      
      // Check for duplicates
      const attendanceNameCount = new Map<string, number>();
      const attendanceDuplicates: any[] = [];
      
      attendanceResult.rows.forEach(row => {
        const count = (attendanceNameCount.get(row.name) || 0) + 1;
        attendanceNameCount.set(row.name, count);
        if (count > 1) {
          attendanceDuplicates.push(row);
        }
      });
      
      if (attendanceDuplicates.length > 0) {
        console.log('⚠️  Attendance query still has duplicates:');
        attendanceDuplicates.forEach(dup => {
          console.log(`  - ${dup.name} (ID: ${dup.id})`);
        });
      } else {
        console.log('✅ Attendance query has no duplicates!');
      }
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error testing queries:', error);
    process.exit(1);
  }
}

testFixedQueries();