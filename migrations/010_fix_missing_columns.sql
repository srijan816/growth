-- Fix missing columns that are causing errors

-- 1. Add student_number column to students table if it doesn't exist
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS student_number VARCHAR(50) UNIQUE;

-- 2. Add grade_level column to students table if it doesn't exist (used by some queries)
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS grade_level VARCHAR(20);

-- 3. Add max_students column to courses table
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS max_students INTEGER DEFAULT 20;

-- 4. Add status column to courses table (if it doesn't exist)
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

-- 5. Ensure activity_log table has proper columns
-- First check if it exists, if not create it
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID UNIQUE DEFAULT gen_random_uuid(),
    type VARCHAR(50) DEFAULT 'activity',
    activity_type VARCHAR(50),
    student_id UUID REFERENCES students(id),
    student_name VARCHAR(255),
    class_id UUID REFERENCES courses(id),
    class_code VARCHAR(50),
    class_name VARCHAR(255),
    instructor_id UUID REFERENCES users(id),
    instructor_name VARCHAR(255),
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Update existing activity_log records to use class_id instead of class_code for joins
-- Only run this if class_code column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'activity_log' AND column_name = 'class_code'
    ) THEN
        UPDATE activity_log al
        SET class_id = c.id
        FROM courses c
        WHERE al.class_code = c.code
          AND al.class_id IS NULL;
    END IF;
END $$;

-- 7. Create indexes that were attempted in previous migrations
CREATE INDEX IF NOT EXISTS idx_students_student_number ON students(student_number);
CREATE INDEX IF NOT EXISTS idx_students_grade_level ON students(grade_level);
CREATE INDEX IF NOT EXISTS idx_activity_log_student_id ON activity_log(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_class_id ON activity_log(class_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

-- 8. Add missing columns to parsed_student_feedback if needed
ALTER TABLE parsed_student_feedback
ADD COLUMN IF NOT EXISTS student_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS grade_level VARCHAR(20);

-- 9. Update parsed_student_feedback with student info
UPDATE parsed_student_feedback pf
SET 
  student_number = s.student_number,
  grade_level = s.grade_level
FROM students s
WHERE pf.student_id = s.id
  AND (pf.student_number IS NULL OR pf.grade_level IS NULL);