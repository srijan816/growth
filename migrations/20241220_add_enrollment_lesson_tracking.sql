-- Add lesson tracking columns to enrollments table
ALTER TABLE enrollments
ADD COLUMN IF NOT EXISTS start_lesson VARCHAR(100),
ADD COLUMN IF NOT EXISTS end_lesson VARCHAR(100);

-- Add course_type column to courses table if not exists
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS course_type VARCHAR(100);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_students_student_number ON students(student_number);
CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code);