-- Add unique_id column to parsed_student_feedback table
ALTER TABLE parsed_student_feedback 
ADD COLUMN IF NOT EXISTS unique_id TEXT;

-- Create index on unique_id for better query performance
CREATE INDEX IF NOT EXISTS idx_parsed_student_feedback_unique_id 
ON parsed_student_feedback(unique_id);

-- Create index on student_name + feedback_type for name collision queries
CREATE INDEX IF NOT EXISTS idx_parsed_student_feedback_name_type 
ON parsed_student_feedback(student_name, feedback_type);