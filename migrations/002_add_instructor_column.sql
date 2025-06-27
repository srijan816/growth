-- Add instructor column to users table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'instructor_name'
    ) THEN
        ALTER TABLE users ADD COLUMN instructor_name TEXT;
    END IF;
END $$;

-- Update the student feedback summary view to handle NULL instructors
CREATE OR REPLACE VIEW student_feedback_summary AS
SELECT 
    student_name,
    COALESCE(instructor, 'Unassigned') as instructor,
    COUNT(*) as total_feedback_sessions,
    COUNT(DISTINCT class_code) as unique_classes,
    STRING_AGG(DISTINCT class_code, ', ' ORDER BY class_code) as class_codes,
    STRING_AGG(DISTINCT class_name, ', ' ORDER BY class_name) as class_names,
    STRING_AGG(DISTINCT feedback_type, ', ' ORDER BY feedback_type) as feedback_types,
    MIN(unit_number::decimal) as earliest_unit,
    MAX(unit_number::decimal) as latest_unit,
    MAX(parsed_at) as last_updated
FROM parsed_student_feedback
GROUP BY student_name, instructor;