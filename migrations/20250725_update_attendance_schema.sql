-- Migration: Update attendance schema to support decimal ratings (0-4 with 0.5 increments)
-- This migration ensures the attendances table properly supports the Excel data format

DO $$
BEGIN
    -- First, check if we need to update the rating columns to support decimal values
    -- The Excel data uses 0-4 scale with 0.5 increments, not 1-5 integers
    
    -- Update attitude_efforts column to support decimal values
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' AND column_name = 'attitude_efforts'
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE attendances ALTER COLUMN attitude_efforts TYPE DECIMAL(3,1);
        ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_attitude_efforts_check;
        ALTER TABLE attendances ADD CONSTRAINT attendances_attitude_efforts_check 
            CHECK (attitude_efforts >= 0 AND attitude_efforts <= 4 AND (attitude_efforts * 2) = FLOOR(attitude_efforts * 2));
    END IF;
    
    -- Update asking_questions column to support decimal values
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' AND column_name = 'asking_questions'
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE attendances ALTER COLUMN asking_questions TYPE DECIMAL(3,1);
        ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_asking_questions_check;
        ALTER TABLE attendances ADD CONSTRAINT attendances_asking_questions_check 
            CHECK (asking_questions >= 0 AND asking_questions <= 4 AND (asking_questions * 2) = FLOOR(asking_questions * 2));
    END IF;
    
    -- Update application_skills column to support decimal values
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' AND column_name = 'application_skills'
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE attendances ALTER COLUMN application_skills TYPE DECIMAL(3,1);
        ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_application_skills_check;
        ALTER TABLE attendances ADD CONSTRAINT attendances_application_skills_check 
            CHECK (application_skills >= 0 AND application_skills <= 4 AND (application_skills * 2) = FLOOR(application_skills * 2));
    END IF;
    
    -- Update application_feedback column to support decimal values
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' AND column_name = 'application_feedback'
        AND data_type = 'integer'
    ) THEN
        ALTER TABLE attendances ALTER COLUMN application_feedback TYPE DECIMAL(3,1);
        ALTER TABLE attendances DROP CONSTRAINT IF EXISTS attendances_application_feedback_check;
        ALTER TABLE attendances ADD CONSTRAINT attendances_application_feedback_check 
            CHECK (application_feedback >= 0 AND application_feedback <= 4 AND (application_feedback * 2) = FLOOR(application_feedback * 2));
    END IF;
    
    -- Ensure we have the correct column names (not the old migration names)
    -- Handle potential column name mismatches from different migrations
    
    -- Check if we have old column names and rename them
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' AND column_name = 'attitude_rating'
    ) THEN
        ALTER TABLE attendances RENAME COLUMN attitude_rating TO attitude_efforts;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' AND column_name = 'asking_questions_rating'
    ) THEN
        ALTER TABLE attendances RENAME COLUMN asking_questions_rating TO asking_questions;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' AND column_name = 'application_rating'
    ) THEN
        ALTER TABLE attendances RENAME COLUMN application_rating TO application_skills;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' AND column_name = 'feedback_rating'
    ) THEN
        ALTER TABLE attendances RENAME COLUMN feedback_rating TO application_feedback;
    END IF;
    
    -- Add unit_number and lesson_number columns to class_sessions if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'class_sessions' AND column_name = 'unit_number'
    ) THEN
        ALTER TABLE class_sessions ADD COLUMN unit_number VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'class_sessions' AND column_name = 'lesson_number'
    ) THEN
        ALTER TABLE class_sessions ADD COLUMN lesson_number VARCHAR(20);
    END IF;
    
    -- Add import metadata columns to track data source
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' AND column_name = 'import_source'
    ) THEN
        ALTER TABLE attendances ADD COLUMN import_source VARCHAR(100) DEFAULT 'manual';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendances' AND column_name = 'import_batch_id'
    ) THEN
        ALTER TABLE attendances ADD COLUMN import_batch_id UUID;
    END IF;

END
$$;

-- Add helpful indexes for attendance queries
CREATE INDEX IF NOT EXISTS idx_attendances_student_session ON attendances(student_id, session_id);
CREATE INDEX IF NOT EXISTS idx_attendances_session_date ON attendances(session_id);
CREATE INDEX IF NOT EXISTS idx_attendances_import_batch ON attendances(import_batch_id) WHERE import_batch_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN attendances.attitude_efforts IS 'Attitude & Efforts rating (0-4 with 0.5 increments)';
COMMENT ON COLUMN attendances.asking_questions IS 'Asking Questions rating (0-4 with 0.5 increments)';
COMMENT ON COLUMN attendances.application_skills IS 'Application of Skills/Content rating (0-4 with 0.5 increments)';
COMMENT ON COLUMN attendances.application_feedback IS 'Application of Feedback rating (0-4 with 0.5 increments)';
COMMENT ON COLUMN attendances.import_source IS 'Source of attendance data (manual, excel_import, etc.)';
COMMENT ON COLUMN attendances.import_batch_id IS 'Batch ID for tracking bulk imports';
