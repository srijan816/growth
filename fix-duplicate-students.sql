-- Fix duplicate student enrollments in the same course
-- This script will identify and remove duplicate enrollments where the same person 
-- (by name) is enrolled multiple times in the same course with different student IDs

-- First, let's identify the duplicates
WITH duplicate_enrollments AS (
  SELECT 
    c.code as course_code,
    c.name as course_name,
    u.name as student_name,
    COUNT(DISTINCT s.id) as student_count,
    ARRAY_AGG(DISTINCT s.id ORDER BY s.created_at DESC, s.id) as student_ids,
    ARRAY_AGG(DISTINCT e.id ORDER BY e.enrollment_date DESC, e.id) as enrollment_ids
  FROM courses c
  JOIN enrollments e ON c.id = e.course_id
  JOIN students s ON e.student_id = s.id
  JOIN users u ON s.id = u.id
  WHERE u.role = 'student'
  GROUP BY c.code, c.name, u.name
  HAVING COUNT(DISTINCT s.id) > 1
)
SELECT * FROM duplicate_enrollments
ORDER BY course_code, student_name;

-- To fix: Keep only the most recent student record for each name in each course
-- This will delete enrollments for older duplicate student records

-- Step 1: Delete enrollments for duplicate students (keeping the most recent)
DELETE FROM enrollments e
WHERE EXISTS (
  SELECT 1
  FROM enrollments e2
  JOIN students s1 ON e.student_id = s1.id
  JOIN students s2 ON e2.student_id = s2.id
  JOIN users u1 ON s1.id = u1.id
  JOIN users u2 ON s2.id = u2.id
  WHERE e.course_id = e2.course_id
    AND u1.name = u2.name
    AND u1.role = 'student'
    AND u2.role = 'student'
    AND s1.id != s2.id
    AND (
      s1.created_at < s2.created_at 
      OR (s1.created_at = s2.created_at AND s1.id < s2.id)
    )
    AND e.student_id = s1.id
);

-- Verify the fix
WITH verification AS (
  SELECT 
    c.code as course_code,
    u.name as student_name,
    COUNT(DISTINCT s.id) as student_count
  FROM courses c
  JOIN enrollments e ON c.id = e.course_id
  JOIN students s ON e.student_id = s.id
  JOIN users u ON s.id = u.id
  WHERE u.role = 'student'
  GROUP BY c.code, u.name
  HAVING COUNT(DISTINCT s.id) > 1
)
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ Success! No more duplicate student enrollments in courses'
    ELSE '⚠️ Still have ' || COUNT(*) || ' duplicate cases to resolve'
  END as result
FROM verification;