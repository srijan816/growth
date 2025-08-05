-- Migration: Add function to generate weekly class sessions
-- This function creates class_sessions entries for all active courses for a given week

CREATE OR REPLACE FUNCTION generate_weekly_sessions(
  target_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  created_count INTEGER,
  existing_count INTEGER,
  total_active_courses INTEGER
) AS $$
DECLARE
  week_start DATE;
  week_end DATE;
  created_sessions INTEGER := 0;
  existing_sessions INTEGER := 0;
  active_courses INTEGER := 0;
  course RECORD;
  day_number INTEGER;
  target_session_date DATE;
  session_exists BOOLEAN;
BEGIN
  -- Calculate week boundaries (Sunday to Saturday)
  week_start := date_trunc('week', target_date)::DATE;
  week_end := week_start + INTERVAL '6 days';
  
  -- Count existing sessions for this week
  SELECT COUNT(*) INTO existing_sessions
  FROM class_sessions cs
  WHERE cs.session_date >= week_start AND cs.session_date <= week_end;
  
  -- Count active courses with schedules
  SELECT COUNT(*) INTO active_courses
  FROM courses
  WHERE status = 'active' 
    AND day_of_week IS NOT NULL 
    AND start_time IS NOT NULL;
  
  -- Process each active course
  FOR course IN 
    SELECT id, course_code, day_of_week, start_time
    FROM courses
    WHERE status = 'active' 
      AND day_of_week IS NOT NULL 
      AND start_time IS NOT NULL
  LOOP
    -- Convert day name to number (0=Sunday, 1=Monday, etc.)
    day_number := CASE course.day_of_week
      WHEN 'Sunday' THEN 0
      WHEN 'Monday' THEN 1
      WHEN 'Tuesday' THEN 2
      WHEN 'Wednesday' THEN 3
      WHEN 'Thursday' THEN 4
      WHEN 'Friday' THEN 5
      WHEN 'Saturday' THEN 6
      ELSE NULL
    END;
    
    IF day_number IS NOT NULL THEN
      -- Calculate the date for this course's day of week
      target_session_date := week_start + (day_number || ' days')::INTERVAL;
      
      -- Check if session already exists
      SELECT EXISTS(
        SELECT 1 FROM class_sessions cs
        WHERE cs.course_id = course.id 
          AND cs.session_date = target_session_date
      ) INTO session_exists;
      
      IF NOT session_exists THEN
        -- Insert new session (assuming 2-hour duration)
        INSERT INTO class_sessions (
          course_id, 
          session_date, 
          start_time, 
          end_time,
          status
        ) VALUES (
          course.id,
          target_session_date,
          course.start_time,
          course.start_time + INTERVAL '2 hours',
          'scheduled'
        );
        
        created_sessions := created_sessions + 1;
      END IF;
    END IF;
  END LOOP;
  
  -- Return summary
  RETURN QUERY SELECT 
    created_sessions,
    existing_sessions,
    active_courses;
END;
$$ LANGUAGE plpgsql;

-- Add a comment to document the function
COMMENT ON FUNCTION generate_weekly_sessions(DATE) IS 
'Generates class_sessions entries for all active courses for the week containing the given date. 
Returns the number of sessions created, existing sessions, and total active courses.
Example usage: SELECT * FROM generate_weekly_sessions(); -- for current week
              SELECT * FROM generate_weekly_sessions(''2025-08-01''); -- for specific week';

-- Create an index to improve performance of the session existence check
CREATE INDEX IF NOT EXISTS idx_class_sessions_course_date 
ON class_sessions(course_id, session_date);

-- Run the function for the current week to populate initial data
SELECT * FROM generate_weekly_sessions();