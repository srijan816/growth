-- Migration: Fix Friday sessions by removing incorrect entries
-- These sessions at 10:00 AM on Friday don't belong to Friday courses

-- Delete sessions for courses that don't run on Friday
DELETE FROM class_sessions cs
USING courses c
WHERE cs.course_id = c.id
  AND cs.session_date = '2025-07-25'  -- Friday
  AND c.day_of_week != 'Friday'
  AND c.instructor_id = '550e8400-e29b-41d4-a716-446655440002';

-- Also delete any sessions at wrong times for Friday courses
DELETE FROM class_sessions cs
USING courses c
WHERE cs.course_id = c.id
  AND cs.session_date = '2025-07-25'  -- Friday
  AND c.day_of_week = 'Friday'
  AND cs.start_time != c.start_time
  AND c.instructor_id = '550e8400-e29b-41d4-a716-446655440002';

-- Verify correct sessions exist for Friday courses
INSERT INTO class_sessions (course_id, session_date, start_time, end_time, status)
SELECT 
  c.id,
  '2025-07-25'::date,
  c.start_time,
  COALESCE(c.end_time, c.start_time + INTERVAL '90 minutes'),
  'scheduled'
FROM courses c
WHERE c.day_of_week = 'Friday'
  AND c.status = 'active'
  AND c.instructor_id = '550e8400-e29b-41d4-a716-446655440002'
  AND NOT EXISTS (
    SELECT 1 
    FROM class_sessions cs 
    WHERE cs.course_id = c.id 
      AND cs.session_date = '2025-07-25'
      AND cs.start_time = c.start_time
  );

-- Log what we did
DO $$
DECLARE
  deleted_count INTEGER;
  inserted_count INTEGER;
BEGIN
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up incorrect Friday sessions and ensured correct ones exist';
END $$;