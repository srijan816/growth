-- Add session_date column as an alias to date column in class_sessions table
-- This is needed for compatibility with newer queries

-- Add session_date column if it doesn't exist
ALTER TABLE class_sessions 
ADD COLUMN IF NOT EXISTS session_date DATE;

-- Copy data from date column to session_date if it's empty
UPDATE class_sessions 
SET session_date = date 
WHERE session_date IS NULL AND date IS NOT NULL;

-- Make session_date NOT NULL after populating it
ALTER TABLE class_sessions 
ALTER COLUMN session_date SET NOT NULL;

-- Create an index on session_date for performance
CREATE INDEX IF NOT EXISTS idx_class_sessions_session_date ON class_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_class_sessions_course_date ON class_sessions(course_id, session_date);