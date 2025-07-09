-- Update courses table to match DAL expectations
ALTER TABLE courses ADD COLUMN IF NOT EXISTS program_type VARCHAR(20) DEFAULT 'PSD';

-- Rename course columns for consistency (if they don't already exist with correct names)
-- First check if they exist and add them if not
DO $$
BEGIN
    -- Add course_code as alias to code if needed
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'course_code'
    ) THEN
        ALTER TABLE courses ADD COLUMN course_code TEXT;
        UPDATE courses SET course_code = code WHERE course_code IS NULL;
        ALTER TABLE courses ALTER COLUMN course_code SET NOT NULL;
    END IF;

    -- Add course_name as alias to name if needed  
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'course_name'
    ) THEN
        ALTER TABLE courses ADD COLUMN course_name TEXT;
        UPDATE courses SET course_name = name WHERE course_name IS NULL;
        ALTER TABLE courses ALTER COLUMN course_name SET NOT NULL;
    END IF;
END
$$;

-- Update attendance table column names to match DAL
DO $$
BEGIN
    -- Rename asking_questions_rating to questions_rating
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' AND column_name = 'asking_questions_rating'
    ) THEN
        ALTER TABLE attendances RENAME COLUMN asking_questions_rating TO questions_rating;
    END IF;

    -- Rename application_rating to skills_rating
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' AND column_name = 'application_rating'
    ) THEN
        ALTER TABLE attendances RENAME COLUMN application_rating TO skills_rating;
    END IF;

    -- Add marked_at and marked_by columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' AND column_name = 'marked_at'
    ) THEN
        ALTER TABLE attendances ADD COLUMN marked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' AND column_name = 'marked_by'
    ) THEN
        ALTER TABLE attendances ADD COLUMN marked_by UUID REFERENCES users(id);
        -- Set default to recorded_by for existing records
        UPDATE attendances SET marked_by = recorded_by WHERE marked_by IS NULL;
    END IF;
END
$$;

-- Update students table to work with DAL
DO $$
BEGIN
    -- Add parent_id column for student-parent relationship
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'students' AND column_name = 'parent_id'
    ) THEN
        ALTER TABLE students ADD COLUMN parent_id UUID REFERENCES users(id);
    END IF;
END
$$;

-- Update parsed_student_feedback table for consistent column names
DO $$
BEGIN
    -- Add student_id column for proper foreign key relationship
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'parsed_student_feedback' AND column_name = 'student_id'
    ) THEN
        ALTER TABLE parsed_student_feedback ADD COLUMN student_id UUID REFERENCES students(id);
    END IF;

    -- Add class_date column as alias to feedback_date if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'parsed_student_feedback' AND column_name = 'class_date'
    ) THEN
        ALTER TABLE parsed_student_feedback ADD COLUMN class_date DATE;
        -- Copy existing feedback_date to class_date
        UPDATE parsed_student_feedback 
        SET class_date = feedback_date
        WHERE class_date IS NULL;
    END IF;

    -- Ensure rubric_scores column exists as JSONB
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'parsed_student_feedback' AND column_name = 'rubric_scores'
    ) THEN
        ALTER TABLE parsed_student_feedback ADD COLUMN rubric_scores JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Add strengths and improvement_areas columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'parsed_student_feedback' AND column_name = 'strengths'
    ) THEN
        ALTER TABLE parsed_student_feedback ADD COLUMN strengths TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'parsed_student_feedback' AND column_name = 'improvement_areas'
    ) THEN
        ALTER TABLE parsed_student_feedback ADD COLUMN improvement_areas TEXT;
    END IF;

    -- Add teacher_comments column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'parsed_student_feedback' AND column_name = 'teacher_comments'
    ) THEN
        ALTER TABLE parsed_student_feedback ADD COLUMN teacher_comments TEXT;
    END IF;
END
$$;

-- Add enrollment_date column to enrollments if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enrollments' AND column_name = 'enrollment_date'
    ) THEN
        ALTER TABLE enrollments ADD COLUMN enrollment_date DATE DEFAULT CURRENT_DATE;
        UPDATE enrollments SET enrollment_date = enrolled_date WHERE enrollment_date IS NULL;
    END IF;
END
$$;

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_program_type ON courses(program_type);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_attendances_marked_at ON attendances(marked_at);
CREATE INDEX IF NOT EXISTS idx_students_parent_id ON students(parent_id);
CREATE INDEX IF NOT EXISTS idx_parsed_feedback_student_id ON parsed_student_feedback(student_id);
CREATE INDEX IF NOT EXISTS idx_parsed_feedback_class_date ON parsed_student_feedback(class_date);