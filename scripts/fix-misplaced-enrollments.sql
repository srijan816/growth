-- Fix misplaced enrollments where students are in wrong grade-level courses
-- This script removes incorrect enrollments while preserving correct ones

-- First, let's identify all misplaced enrollments
WITH misplaced_enrollments AS (
  SELECT 
    e.id as enrollment_id,
    s.id as student_id,
    s.name as student_name,
    COALESCE(s.grade_level, s.grade, s.original_grade) as student_grade,
    c.code as course_code,
    c.name as course_name,
    CASE 
      -- Extract grade number from student's grade
      WHEN COALESCE(s.grade_level, s.grade, s.original_grade) LIKE 'Grade %' 
      THEN CAST(SUBSTRING(COALESCE(s.grade_level, s.grade, s.original_grade) FROM 'Grade (\d+)') AS INTEGER)
      ELSE NULL
    END as grade_num,
    CASE 
      -- Determine expected grade range from course code
      WHEN c.code LIKE '%DEB%' OR c.name LIKE '%G3-4%' THEN 'G3-4'
      WHEN c.code LIKE '%DEC%' OR c.name LIKE '%G5-6%' THEN 'G5-6'
      WHEN c.code LIKE '%DED%' OR c.name LIKE '%G7-9%' THEN 'G7-9'
      WHEN c.code LIKE '%DEE%' OR c.name LIKE '%G10-12%' THEN 'G10-12'
      ELSE 'Unknown'
    END as course_level
  FROM enrollments e
  JOIN students s ON e.student_id = s.id
  JOIN courses c ON e.course_id = c.id
  WHERE s.email IS NULL OR s.email = ''  -- Focus on duplicate records without emails
)
SELECT 
  enrollment_id,
  student_name,
  student_grade,
  grade_num,
  course_code,
  course_level,
  CASE 
    WHEN course_level = 'G3-4' AND (grade_num < 3 OR grade_num > 4) THEN 'MISPLACED'
    WHEN course_level = 'G5-6' AND (grade_num < 5 OR grade_num > 6) THEN 'MISPLACED'
    WHEN course_level = 'G7-9' AND (grade_num < 7 OR grade_num > 9) THEN 'MISPLACED'
    WHEN course_level = 'G10-12' AND (grade_num < 10 OR grade_num > 12) THEN 'MISPLACED'
    ELSE 'OK'
  END as status
FROM misplaced_enrollments
WHERE grade_num IS NOT NULL
ORDER BY status DESC, student_name, course_code;

-- Delete misplaced enrollments for G5-6 courses (02IPDEC2401)
DELETE FROM enrollments
WHERE id IN (
  SELECT e.id
  FROM enrollments e
  JOIN students s ON e.student_id = s.id
  JOIN courses c ON e.course_id = c.id
  WHERE c.code = '02IPDEC2401'
    AND s.name IN ('Jamie Wun Yau Tam', 'Janelle Wu', 'Michelle Fan')
    AND (s.email IS NULL OR s.email = '')
);

-- Delete all misplaced enrollments based on grade mismatch
DELETE FROM enrollments
WHERE id IN (
  WITH grade_check AS (
    SELECT 
      e.id,
      s.name,
      CASE 
        WHEN COALESCE(s.grade_level, s.grade, s.original_grade) LIKE 'Grade %' 
        THEN CAST(SUBSTRING(COALESCE(s.grade_level, s.grade, s.original_grade) FROM 'Grade (\d+)') AS INTEGER)
        ELSE NULL
      END as grade_num,
      c.code,
      CASE 
        WHEN c.code LIKE '%DEB%' OR c.name LIKE '%G3-4%' THEN 'G3-4'
        WHEN c.code LIKE '%DEC%' OR c.name LIKE '%G5-6%' THEN 'G5-6'
        WHEN c.code LIKE '%DED%' OR c.name LIKE '%G7-9%' THEN 'G7-9'
        WHEN c.code LIKE '%DEE%' OR c.name LIKE '%G10-12%' THEN 'G10-12'
        ELSE 'Unknown'
      END as course_level
    FROM enrollments e
    JOIN students s ON e.student_id = s.id
    JOIN courses c ON e.course_id = c.id
    WHERE (s.email IS NULL OR s.email = '')  -- Only target duplicate records
  )
  SELECT id FROM grade_check
  WHERE (
    (course_level = 'G3-4' AND (grade_num < 3 OR grade_num > 4)) OR
    (course_level = 'G5-6' AND (grade_num < 5 OR grade_num > 6)) OR
    (course_level = 'G7-9' AND (grade_num < 7 OR grade_num > 9)) OR
    (course_level = 'G10-12' AND (grade_num < 10 OR grade_num > 12))
  )
);

-- Verify the cleanup
SELECT 
  c.code,
  c.name,
  COUNT(DISTINCT s.name) as unique_students,
  STRING_AGG(DISTINCT 
    CASE 
      WHEN COALESCE(s.grade_level, s.grade, s.original_grade) NOT LIKE '%5%' 
       AND COALESCE(s.grade_level, s.grade, s.original_grade) NOT LIKE '%6%'
       AND c.code LIKE '%DEC%'
      THEN s.name || ' (' || COALESCE(s.grade_level, s.grade, s.original_grade) || ')'
      ELSE NULL
    END, ', '
  ) as misplaced_students
FROM courses c
JOIN enrollments e ON c.id = e.course_id
JOIN students s ON e.student_id = s.id
WHERE c.code = '02IPDEC2401'
GROUP BY c.id, c.code, c.name;