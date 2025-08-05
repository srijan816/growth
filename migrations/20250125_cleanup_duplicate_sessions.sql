-- Migration: Clean up duplicate class_sessions entries
-- This removes duplicate sessions that were accidentally created

-- First, let's see what duplicates exist
CREATE TEMP TABLE duplicate_sessions AS
SELECT 
  course_id,
  session_date,
  start_time,
  COUNT(*) as duplicate_count,
  MIN(created_at) as earliest_created,
  array_agg(id ORDER BY created_at) as session_ids
FROM class_sessions
GROUP BY course_id, session_date, start_time
HAVING COUNT(*) > 1;

-- Show summary of duplicates
DO $$
DECLARE
  total_duplicates INTEGER;
  affected_courses INTEGER;
BEGIN
  SELECT COUNT(*) INTO affected_courses FROM duplicate_sessions;
  SELECT SUM(duplicate_count - 1) INTO total_duplicates FROM duplicate_sessions;
  
  RAISE NOTICE 'Found % duplicate sessions across % course/date combinations', 
    COALESCE(total_duplicates, 0), COALESCE(affected_courses, 0);
END $$;

-- Delete duplicate sessions, keeping the earliest created one
DELETE FROM class_sessions cs
USING duplicate_sessions ds
WHERE cs.course_id = ds.course_id
  AND cs.session_date = ds.session_date
  AND cs.start_time = ds.start_time
  AND cs.id != ds.session_ids[1]; -- Keep the first (earliest) session

-- Add a unique constraint to prevent future duplicates
ALTER TABLE class_sessions 
ADD CONSTRAINT unique_course_session_date_time 
UNIQUE (course_id, session_date, start_time);

-- Clean up temp table
DROP TABLE duplicate_sessions;

-- Verify no duplicates remain
DO $$
DECLARE
  remaining_duplicates INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_duplicates
  FROM (
    SELECT course_id, session_date, start_time
    FROM class_sessions
    GROUP BY course_id, session_date, start_time
    HAVING COUNT(*) > 1
  ) AS dup_check;
  
  IF remaining_duplicates > 0 THEN
    RAISE EXCEPTION 'Cleanup failed: % duplicate groups remain', remaining_duplicates;
  ELSE
    RAISE NOTICE 'Cleanup successful: No duplicates remain';
  END IF;
END $$;