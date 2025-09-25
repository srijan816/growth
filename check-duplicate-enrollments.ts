import { db } from './src/lib/postgres';

async function checkDuplicateEnrollments() {
  try {
    // 1. Check for duplicate enrollments (same student in same course multiple times)
    const duplicatesQuery = `
      SELECT 
        s.id as student_id,
        u.name as student_name,
        c.id as course_id,
        c.code as course_code,
        c.name as course_name,
        COUNT(*) as enrollment_count,
        ARRAY_AGG(e.id ORDER BY e.enrollment_date DESC) as enrollment_ids,
        ARRAY_AGG(e.enrollment_date ORDER BY e.enrollment_date DESC) as enrollment_dates,
        ARRAY_AGG(e.status ORDER BY e.enrollment_date DESC) as enrollment_statuses
      FROM enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN users u ON s.id = u.id
      JOIN courses c ON e.course_id = c.id
      GROUP BY s.id, u.name, c.id, c.code, c.name
      HAVING COUNT(*) > 1
      ORDER BY u.name, c.code
    `;

    const duplicates = await db.query(duplicatesQuery);
    
    console.log(`\n=== DUPLICATE ENROLLMENTS FOUND ===`);
    console.log(`Total duplicate sets: ${duplicates.rows.length}\n`);
    
    if (duplicates.rows.length > 0) {
      duplicates.rows.forEach(row => {
        console.log(`Student: ${row.student_name} (ID: ${row.student_id})`);
        console.log(`Course: ${row.course_code} - ${row.course_name}`);
        console.log(`Enrollment Count: ${row.enrollment_count}`);
        console.log(`Enrollment IDs: ${row.enrollment_ids.join(', ')}`);
        console.log(`Enrollment Dates: ${row.enrollment_dates.join(', ')}`);
        console.log(`Statuses: ${row.enrollment_statuses.join(', ')}`);
        console.log('---');
      });
    }

    // 2. Check overall enrollment statistics
    const statsQuery = `
      SELECT 
        COUNT(*) as total_enrollments,
        COUNT(DISTINCT CONCAT(student_id, '-', course_id)) as unique_combinations,
        COUNT(DISTINCT student_id) as unique_students,
        COUNT(DISTINCT course_id) as unique_courses
      FROM enrollments
    `;

    const stats = await db.query(statsQuery);
    console.log(`\n=== ENROLLMENT STATISTICS ===`);
    console.log(`Total enrollment records: ${stats.rows[0].total_enrollments}`);
    console.log(`Unique student-course combinations: ${stats.rows[0].unique_combinations}`);
    console.log(`Unique students enrolled: ${stats.rows[0].unique_students}`);
    console.log(`Unique courses with enrollments: ${stats.rows[0].unique_courses}`);
    
    const duplicateCount = stats.rows[0].total_enrollments - stats.rows[0].unique_combinations;
    console.log(`\n⚠️  Duplicate enrollment records that need cleanup: ${duplicateCount}`);

    // 3. Sample of affected courses
    const affectedCoursesQuery = `
      SELECT 
        c.code,
        c.name,
        COUNT(DISTINCT e.student_id) as unique_students,
        COUNT(*) as total_enrollments,
        COUNT(*) - COUNT(DISTINCT e.student_id) as duplicate_count
      FROM enrollments e
      JOIN courses c ON e.course_id = c.id
      GROUP BY c.code, c.name
      HAVING COUNT(*) > COUNT(DISTINCT e.student_id)
      ORDER BY duplicate_count DESC
      LIMIT 10
    `;

    const affectedCourses = await db.query(affectedCoursesQuery);
    
    if (affectedCourses.rows.length > 0) {
      console.log(`\n=== COURSES WITH DUPLICATE ENROLLMENTS ===`);
      affectedCourses.rows.forEach(row => {
        console.log(`${row.code} - ${row.name}: ${row.duplicate_count} duplicates (${row.unique_students} unique students, ${row.total_enrollments} total records)`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('Error checking duplicates:', error);
    process.exit(1);
  }
}

checkDuplicateEnrollments();