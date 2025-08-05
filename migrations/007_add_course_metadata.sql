-- Add course metadata columns to match Excel structure
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS course_level VARCHAR(50),
ADD COLUMN IF NOT EXISTS course_type VARCHAR(255),
ADD COLUMN IF NOT EXISTS student_count INTEGER DEFAULT 0;

-- Note: status column already exists in courses table

-- Add enrollment metadata
ALTER TABLE enrollments
ADD COLUMN IF NOT EXISTS start_lesson VARCHAR(255),
ADD COLUMN IF NOT EXISTS end_lesson VARCHAR(255);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_students_student_number ON students(student_number);
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code);
CREATE INDEX IF NOT EXISTS idx_parsed_feedback_student_id ON parsed_student_feedback(student_id);

-- Add column to track which instructor uploaded the data
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS uploaded_by VARCHAR(255);

-- Add import tracking table
CREATE TABLE IF NOT EXISTS course_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_name VARCHAR(255) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  import_type VARCHAR(50) NOT NULL, -- 'courses' or 'students'
  courses_imported INTEGER DEFAULT 0,
  students_imported INTEGER DEFAULT 0,
  errors TEXT,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);