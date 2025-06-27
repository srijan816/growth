-- Fix student_feedback_summary view to consolidate students across instructors
-- This fixes the React key duplication issue where students like "Charlotte" 
-- appear multiple times when they have feedback from different instructors

-- Drop the existing view
DROP VIEW IF EXISTS student_feedback_summary;

-- Create new consolidated view that groups only by student_name
CREATE OR REPLACE VIEW student_feedback_summary AS
SELECT 
    student_name,
    -- Consolidate all instructors who have provided feedback for this student
    STRING_AGG(DISTINCT instructor, ', ' ORDER BY instructor) as instructors,
    -- Use the instructor with the most feedback sessions as the primary instructor
    (
        SELECT instructor 
        FROM parsed_student_feedback p2 
        WHERE p2.student_name = p1.student_name 
          AND p2.instructor IS NOT NULL
        GROUP BY instructor 
        ORDER BY COUNT(*) DESC 
        LIMIT 1
    ) as primary_instructor,
    COUNT(*) as total_feedback_sessions,
    COUNT(DISTINCT class_code) as unique_classes,
    STRING_AGG(DISTINCT class_code, ', ' ORDER BY class_code) as class_codes,
    STRING_AGG(DISTINCT class_name, ', ' ORDER BY class_name) as class_names,
    STRING_AGG(DISTINCT feedback_type, ', ' ORDER BY feedback_type) as feedback_types,
    MIN(unit_number::decimal) as earliest_unit,
    MAX(unit_number::decimal) as latest_unit,
    MAX(parsed_at) as last_updated
FROM parsed_student_feedback p1
WHERE instructor IS NOT NULL
GROUP BY student_name;

-- Create an index to improve performance on the primary instructor lookup
CREATE INDEX IF NOT EXISTS idx_parsed_feedback_student_instructor 
    ON parsed_student_feedback(student_name, instructor);

-- Create a view for instructor-specific student assignments (for permission filtering)
CREATE OR REPLACE VIEW student_instructor_assignments AS
SELECT 
    student_name,
    instructor,
    COUNT(*) as feedback_count,
    -- Mark the instructor with the most feedback as primary
    CASE WHEN ROW_NUMBER() OVER (PARTITION BY student_name ORDER BY COUNT(*) DESC) = 1 
         THEN true 
         ELSE false 
    END as is_primary_instructor
FROM parsed_student_feedback
WHERE instructor IS NOT NULL
GROUP BY student_name, instructor;