import { db } from './src/lib/postgres';

async function checkSpecificCourse() {
  const courseCode = '02OPDEC2401';
  
  console.log(`\n=== CHECKING COURSE: ${courseCode} ===\n`);
  
  try {
    // 1. First check raw enrollments for this course
    const rawEnrollmentsQuery = `
      SELECT 
        u.name as student_name,
        s.id as student_id,
        s.created_at,
        u.email,
        s.student_number,
        e.id as enrollment_id,
        e.enrollment_date
      FROM courses c
      JOIN enrollments e ON c.id = e.course_id
      JOIN students s ON e.student_id = s.id
      JOIN users u ON s.id = u.id
      WHERE c.code = $1 
        AND u.role = 'student'
        AND e.status = 'active'
      ORDER BY u.name, s.created_at DESC
    `;
    
    const rawResult = await db.query(rawEnrollmentsQuery, [courseCode]);
    
    console.log(`Total raw enrollments: ${rawResult.rows.length}`);
    
    // Group by name to find duplicates
    const nameGroups = new Map<string, any[]>();
    rawResult.rows.forEach(row => {
      if (!nameGroups.has(row.student_name)) {
        nameGroups.set(row.student_name, []);
      }
      nameGroups.get(row.student_name)!.push(row);
    });
    
    // Show duplicates
    console.log('\n=== STUDENTS WITH MULTIPLE RECORDS ===');
    let duplicateCount = 0;
    nameGroups.forEach((students, name) => {
      if (students.length > 1) {
        duplicateCount++;
        console.log(`\n${name}: ${students.length} records`);
        students.forEach(s => {
          console.log(`  - ID: ${s.student_id}, Email: ${s.email || 'N/A'}, Number: ${s.student_number || 'N/A'}, Created: ${s.created_at}`);
        });
      }
    });
    
    if (duplicateCount === 0) {
      console.log('No duplicate student names found in raw data.');
    }
    
    // 2. Test the actual query from the course page
    console.log('\n=== TESTING COURSE PAGE QUERY ===\n');
    
    const coursePageQuery = `
      WITH student_feedback AS (
        SELECT 
          pf.student_id,
          COUNT(DISTINCT pf.id) as feedback_count,
          MAX(pf.created_at) as last_feedback_date
        FROM parsed_student_feedback pf
        WHERE pf.student_id IN (
          SELECT s.id 
          FROM students s
          JOIN enrollments e ON s.id = e.student_id
          JOIN courses c ON e.course_id = c.id
          WHERE c.code = $1
        )
        GROUP BY pf.student_id
      ),
      student_attendance AS (
        SELECT 
          a.student_id,
          COUNT(DISTINCT a.id) as attendance_count,
          COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.id END) as present_count,
          AVG(a.attitude_efforts) as avg_attitude,
          AVG(a.asking_questions) as avg_questions,
          AVG(a.application_skills) as avg_skills,
          AVG(a.application_feedback) as avg_feedback
        FROM attendances a
        JOIN class_sessions cs ON a.session_id = cs.id
        JOIN courses c ON cs.course_id = c.id
        WHERE c.code = $1
        GROUP BY a.student_id
      ),
      filtered_students AS (
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
        WHERE c.code = $1 
          AND u.role = 'student'
          AND e.status = 'active'
        ORDER BY u.name, s.created_at DESC, s.id DESC
      )
      SELECT 
        fs.id,
        fs.name,
        fs.email,
        fs.grade,
        COALESCE(fs.student_number, fs.student_id_external) as student_identifier,
        COALESCE(sf.feedback_count, 0) as feedback_count,
        COALESCE(sa.attendance_count, 0) as attendance_count,
        COALESCE(sa.present_count, 0) as present_count
      FROM filtered_students fs
      LEFT JOIN student_feedback sf ON fs.id = sf.student_id
      LEFT JOIN student_attendance sa ON fs.id = sa.student_id
      ORDER BY fs.name
    `;
    
    const pageResult = await db.query(coursePageQuery, [courseCode]);
    
    console.log(`Total students after DISTINCT ON: ${pageResult.rows.length}\n`);
    
    // Check for duplicates in the final result
    const finalNameCount = new Map<string, number>();
    const finalDuplicates: any[] = [];
    
    pageResult.rows.forEach(row => {
      const count = (finalNameCount.get(row.name) || 0) + 1;
      finalNameCount.set(row.name, count);
      if (count > 1) {
        finalDuplicates.push(row);
      }
    });
    
    if (finalDuplicates.length > 0) {
      console.log('⚠️  STILL HAVE DUPLICATES IN FINAL RESULT:');
      finalDuplicates.forEach(dup => {
        console.log(`  - ${dup.name} (ID: ${dup.id})`);
      });
    } else {
      console.log('✅ No duplicates in the final query result!');
    }
    
    // Show first 10 students
    console.log('\nFirst 10 students in the result:');
    pageResult.rows.slice(0, 10).forEach((row, i) => {
      console.log(`${i + 1}. ${row.name} (${row.student_identifier || 'No ID'}) - Feedback: ${row.feedback_count}, Attendance: ${row.attendance_count}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkSpecificCourse();