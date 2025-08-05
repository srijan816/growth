-- Migration: Fix instructor visibility for recording page
-- This ensures that instructors can see their assigned classes

-- First, let's check if we need to update the API query to handle multiple instructor accounts
-- For now, we'll ensure the main Srijan account has the correct role

-- Ensure the main Srijan account has instructor role
UPDATE users 
SET role = 'instructor'
WHERE email = 'srijan@capstoneevolve.com' 
  AND role != 'instructor';

-- Create a view to help with instructor class visibility
CREATE OR REPLACE VIEW instructor_class_sessions AS
SELECT 
  cs.*,
  c.instructor_id,
  c.code as course_code,
  c.name as course_name,
  u.email as instructor_email
FROM class_sessions cs
JOIN courses c ON cs.course_id = c.id
LEFT JOIN users u ON c.instructor_id = u.id::uuid
WHERE c.status = 'active';

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_courses_instructor_id 
ON courses(instructor_id);

-- Add a comment to document the view
COMMENT ON VIEW instructor_class_sessions IS 
'View that joins class_sessions with courses and instructor information for easier querying';

-- Check if we have the correct sample data
DO $$
DECLARE
  srijan_id UUID;
  session_count INTEGER;
BEGIN
  -- Get the main Srijan instructor ID
  SELECT id::uuid INTO srijan_id
  FROM users
  WHERE email = 'srijan@instructor.com'
    AND role = 'instructor'
  LIMIT 1;

  -- Count sessions for this week
  SELECT COUNT(*) INTO session_count
  FROM class_sessions cs
  JOIN courses c ON cs.course_id = c.id
  WHERE c.instructor_id = srijan_id
    AND cs.session_date >= CURRENT_DATE - INTERVAL '3 days'
    AND cs.session_date <= CURRENT_DATE + INTERVAL '3 days';

  RAISE NOTICE 'Srijan has % sessions this week', session_count;
END $$;