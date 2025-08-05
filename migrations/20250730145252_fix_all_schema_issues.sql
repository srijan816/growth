-- Fix attendances table column names
ALTER TABLE attendances 
  RENAME COLUMN attitude_rating TO attitude_efforts;
  
ALTER TABLE attendances 
  RENAME COLUMN questions_rating TO asking_questions;
  
ALTER TABLE attendances 
  RENAME COLUMN skills_rating TO application_skills;
  
ALTER TABLE attendances 
  RENAME COLUMN feedback_rating TO application_feedback;

-- Add unit_number to class_sessions
ALTER TABLE class_sessions 
  ADD COLUMN IF NOT EXISTS unit_number INTEGER;

-- Generate sessions for all active courses (8 weeks of sessions)
INSERT INTO class_sessions (id, course_id, session_date, date, start_time, end_time, status, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  c.id,
  session_date,
  session_date,
  session_date + c.start_time,
  session_date + c.start_time + interval '1 hour',
  'scheduled',
  NOW(),
  NOW()
FROM courses c
CROSS JOIN LATERAL (
  SELECT generate_series(
    '2025-01-06'::date,  -- Start from Jan 6, 2025
    '2025-02-28'::date,  -- End at Feb 28, 2025
    '1 week'::interval
  )::date AS session_date
) dates
WHERE c.status = 'active'
  AND LOWER(to_char(dates.session_date, 'Day')) LIKE LOWER(c.day_of_week) || '%'
  AND NOT EXISTS (
    SELECT 1 FROM class_sessions cs 
    WHERE cs.course_id = c.id 
    AND cs.session_date = dates.session_date
  );

-- Update unit numbers for sessions
WITH numbered_sessions AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY course_id ORDER BY session_date) as unit_num
  FROM class_sessions
)
UPDATE class_sessions cs
SET unit_number = ns.unit_num
FROM numbered_sessions ns
WHERE cs.id = ns.id;