import { db } from './src/lib/postgres';

async function checkDuplicateNames() {
  try {
    // 1. Find students with duplicate names
    const duplicateNamesQuery = `
      SELECT 
        u.name,
        COUNT(DISTINCT s.id) as student_count,
        ARRAY_AGG(DISTINCT s.id ORDER BY s.id) as student_ids,
        ARRAY_AGG(DISTINCT u.email ORDER BY u.email) as emails,
        ARRAY_AGG(DISTINCT s.student_number ORDER BY s.student_number) as student_numbers,
        ARRAY_AGG(DISTINCT c.code ORDER BY c.code) as enrolled_courses
      FROM users u
      JOIN students s ON u.id = s.id
      LEFT JOIN enrollments e ON s.id = e.student_id
      LEFT JOIN courses c ON e.course_id = c.id
      WHERE u.role = 'student'
      GROUP BY u.name
      HAVING COUNT(DISTINCT s.id) > 1
      ORDER BY COUNT(DISTINCT s.id) DESC, u.name
    `;

    const duplicates = await db.query(duplicateNamesQuery);
    
    console.log(`\n=== STUDENTS WITH DUPLICATE NAMES ===`);
    console.log(`Total duplicate name groups: ${duplicates.rows.length}\n`);
    
    if (duplicates.rows.length > 0) {
      duplicates.rows.forEach(row => {
        console.log(`Name: "${row.name}"`);
        console.log(`Number of different students: ${row.student_count}`);
        console.log(`Student IDs: ${row.student_ids.join(', ')}`);
        console.log(`Emails: ${row.emails.filter(e => e).join(', ') || 'None'}`);
        console.log(`Student Numbers: ${row.student_numbers.filter(s => s).join(', ') || 'None'}`);
        console.log(`Enrolled in courses: ${row.enrolled_courses.filter(c => c).join(', ') || 'None'}`);
        console.log('---');
      });
    }

    // 2. Check for students in same course with same name
    const sameCourseQuery = `
      SELECT 
        c.code as course_code,
        c.name as course_name,
        u.name as student_name,
        COUNT(DISTINCT s.id) as duplicate_count,
        ARRAY_AGG(DISTINCT s.id ORDER BY s.id) as student_ids,
        ARRAY_AGG(DISTINCT u.email ORDER BY u.email) as emails
      FROM courses c
      JOIN enrollments e ON c.id = e.course_id
      JOIN students s ON e.student_id = s.id
      JOIN users u ON s.id = u.id
      WHERE u.role = 'student'
      GROUP BY c.code, c.name, u.name
      HAVING COUNT(DISTINCT s.id) > 1
      ORDER BY c.code, u.name
    `;

    const sameCourse = await db.query(sameCourseQuery);
    
    if (sameCourse.rows.length > 0) {
      console.log(`\n=== SAME NAME STUDENTS IN SAME COURSE ===`);
      console.log(`Total occurrences: ${sameCourse.rows.length}\n`);
      
      sameCourse.rows.forEach(row => {
        console.log(`Course: ${row.course_code} - ${row.course_name}`);
        console.log(`Student Name: "${row.student_name}"`);
        console.log(`Number of students with this name: ${row.duplicate_count}`);
        console.log(`Student IDs: ${row.student_ids.join(', ')}`);
        console.log(`Emails: ${row.emails.filter(e => e).join(', ') || 'None'}`);
        console.log('---');
      });
    } else {
      console.log(`\n✅ No students with same name are enrolled in the same course`);
    }

    // 3. Statistics
    const statsQuery = `
      SELECT 
        COUNT(DISTINCT u.name) as unique_names,
        COUNT(DISTINCT s.id) as total_students,
        COUNT(DISTINCT s.id) - COUNT(DISTINCT u.name) as name_duplicates
      FROM users u
      JOIN students s ON u.id = s.id
      WHERE u.role = 'student'
    `;

    const stats = await db.query(statsQuery);
    console.log(`\n=== NAME STATISTICS ===`);
    console.log(`Total students: ${stats.rows[0].total_students}`);
    console.log(`Unique names: ${stats.rows[0].unique_names}`);
    console.log(`Students sharing names: ${stats.rows[0].name_duplicates}`);

    process.exit(0);
  } catch (error) {
    console.error('Error checking duplicate names:', error);
    process.exit(1);
  }
}

checkDuplicateNames();