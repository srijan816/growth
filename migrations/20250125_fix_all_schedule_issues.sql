-- Migration: Fix all schedule issues for Srijan
-- 1. Remove Monday sessions (holiday)
-- 2. Remove intensive courses from showing on calendar
-- 3. Fix incorrect day assignments in class_sessions

-- First, delete all Monday sessions for Srijan
DELETE FROM class_sessions cs
USING courses c
WHERE cs.course_id = c.id
  AND cs.session_date IN ('2025-07-21', '2025-07-28', '2025-08-04', '2025-08-11')  -- Mondays
  AND c.instructor_id = '550e8400-e29b-41d4-a716-446655440002';

-- Add a column to mark intensive courses (if it doesn't exist)
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_intensive BOOLEAN DEFAULT FALSE;

-- Mark intensive courses
UPDATE courses
SET is_intensive = TRUE
WHERE instructor_id = '550e8400-e29b-41d4-a716-446655440002'
  AND (
    name ILIKE '%intensive%' 
    OR code IN ('02IPBJU2502', '02IPCJY2502', '02IPDBEP2503', '02IPDBXP2401', '02IPDCEP2502')
  );

-- Delete incorrect sessions where course is scheduled for wrong day
-- Tuesday: Remove Wednesday/Thursday courses showing on Tuesday
DELETE FROM class_sessions cs
USING courses c
WHERE cs.course_id = c.id
  AND cs.session_date = '2025-07-22'  -- Tuesday
  AND c.day_of_week NOT IN ('Tuesday')
  AND c.instructor_id = '550e8400-e29b-41d4-a716-446655440002';

-- Wednesday: Remove courses that don't belong to Wednesday
DELETE FROM class_sessions cs
USING courses c
WHERE cs.course_id = c.id
  AND cs.session_date = '2025-07-23'  -- Wednesday
  AND c.day_of_week NOT IN ('Wednesday')
  AND c.instructor_id = '550e8400-e29b-41d4-a716-446655440002';

-- Thursday: Remove courses that don't belong to Thursday
DELETE FROM class_sessions cs
USING courses c
WHERE cs.course_id = c.id
  AND cs.session_date = '2025-07-24'  -- Thursday
  AND c.day_of_week NOT IN ('Thursday')
  AND c.instructor_id = '550e8400-e29b-41d4-a716-446655440002';

-- Saturday: Remove Friday course (02IPDEC2402) showing on Saturday
DELETE FROM class_sessions cs
WHERE cs.course_id IN (
  SELECT id FROM courses 
  WHERE code = '02IPDEC2402' 
    AND day_of_week = 'Friday'
)
AND cs.session_date = '2025-07-26';  -- Saturday

-- Now ensure correct sessions exist for each day
-- Tuesday
INSERT INTO class_sessions (course_id, session_date, start_time, end_time, status)
SELECT 
  c.id,
  '2025-07-22'::date,
  c.start_time,
  COALESCE(c.end_time, c.start_time + INTERVAL '90 minutes'),
  'scheduled'
FROM courses c
WHERE c.day_of_week = 'Tuesday'
  AND c.status = 'active'
  AND c.instructor_id = '550e8400-e29b-41d4-a716-446655440002'
  AND NOT EXISTS (
    SELECT 1 FROM class_sessions cs 
    WHERE cs.course_id = c.id 
      AND cs.session_date = '2025-07-22'
      AND cs.start_time = c.start_time
  );

-- Wednesday
INSERT INTO class_sessions (course_id, session_date, start_time, end_time, status)
SELECT 
  c.id,
  '2025-07-23'::date,
  c.start_time,
  COALESCE(c.end_time, c.start_time + INTERVAL '90 minutes'),
  'scheduled'
FROM courses c
WHERE c.day_of_week = 'Wednesday'
  AND c.status = 'active'
  AND c.instructor_id = '550e8400-e29b-41d4-a716-446655440002'
  AND NOT EXISTS (
    SELECT 1 FROM class_sessions cs 
    WHERE cs.course_id = c.id 
      AND cs.session_date = '2025-07-23'
      AND cs.start_time = c.start_time
  );

-- Thursday
INSERT INTO class_sessions (course_id, session_date, start_time, end_time, status)
SELECT 
  c.id,
  '2025-07-24'::date,
  c.start_time,
  COALESCE(c.end_time, c.start_time + INTERVAL '90 minutes'),
  'scheduled'
FROM courses c
WHERE c.day_of_week = 'Thursday'
  AND c.status = 'active'
  AND c.instructor_id = '550e8400-e29b-41d4-a716-446655440002'
  AND NOT EXISTS (
    SELECT 1 FROM class_sessions cs 
    WHERE cs.course_id = c.id 
      AND cs.session_date = '2025-07-24'
      AND cs.start_time = c.start_time
  );

-- Log summary
DO $$
DECLARE
  intensive_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO intensive_count 
  FROM courses 
  WHERE is_intensive = TRUE 
    AND instructor_id = '550e8400-e29b-41d4-a716-446655440002';
  
  RAISE NOTICE 'Schedule cleanup completed:';
  RAISE NOTICE '- Removed Monday sessions (holiday)';
  RAISE NOTICE '- Marked % intensive courses', intensive_count;
  RAISE NOTICE '- Fixed day-of-week mismatches in sessions';
  RAISE NOTICE '- Ensured correct sessions exist for each active course';
END $$;