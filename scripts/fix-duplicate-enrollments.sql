-- Find and remove duplicate enrollments, keeping the most recent one
-- First, let's see what duplicates we have
SELECT 
  s.name as student_name,
  c.code as course_code,
  COUNT(*) as enrollment_count,
  STRING_AGG(e.id::text, ', ') as enrollment_ids,
  STRING_AGG(e.enrollment_date::text, ', ') as enrollment_dates
FROM enrollments e
JOIN students s ON e.student_id = s.id
JOIN courses c ON e.course_id = c.id
GROUP BY s.name, c.code, e.student_id, e.course_id
HAVING COUNT(*) > 1
ORDER BY s.name, c.code;

-- Remove duplicate enrollments, keeping the most recent one
DELETE FROM enrollments e1
WHERE EXISTS (
  SELECT 1
  FROM enrollments e2
  WHERE e1.student_id = e2.student_id
    AND e1.course_id = e2.course_id
    AND e1.id != e2.id
    AND (
      e1.enrollment_date < e2.enrollment_date
      OR (e1.enrollment_date = e2.enrollment_date AND e1.id < e2.id)
    )
);

-- Add a unique constraint to prevent future duplicates
-- First check if constraint already exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_student_course_enrollment'
  ) THEN
    ALTER TABLE enrollments 
    ADD CONSTRAINT unique_student_course_enrollment 
    UNIQUE (student_id, course_id);
  END IF;
END $$;

-- Verify the fix
SELECT 
  'After cleanup:' as status,
  COUNT(*) as total_enrollments,
  COUNT(DISTINCT CONCAT(student_id, '-', course_id)) as unique_combinations
FROM enrollments;