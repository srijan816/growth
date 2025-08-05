-- Add missing columns to parsed_student_feedback table for comprehensive feedback storage

-- Add metadata column for storing additional feedback information
ALTER TABLE parsed_student_feedback 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add original_file_path column if not exists
ALTER TABLE parsed_student_feedback 
ADD COLUMN IF NOT EXISTS original_file_path TEXT;

-- Add instructor_id column for future instructor relationship
ALTER TABLE parsed_student_feedback 
ADD COLUMN IF NOT EXISTS instructor_id UUID REFERENCES users(id);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_parsed_feedback_student_id ON parsed_student_feedback(student_id);
CREATE INDEX IF NOT EXISTS idx_parsed_feedback_instructor ON parsed_student_feedback(instructor);
CREATE INDEX IF NOT EXISTS idx_parsed_feedback_metadata ON parsed_student_feedback USING GIN(metadata);

-- Add comment explaining the metadata column
COMMENT ON COLUMN parsed_student_feedback.metadata IS 
'JSON object storing additional feedback metadata including motion, duration, file path, and other extracted information';

COMMENT ON COLUMN parsed_student_feedback.original_file_path IS 
'Original file path where the feedback was extracted from';

COMMENT ON COLUMN parsed_student_feedback.instructor_id IS 
'Foreign key to users table for instructor (future use when instructors are added as users)';