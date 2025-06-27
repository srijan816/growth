-- ===============================================
-- MANUAL TABLE CREATION
-- ===============================================
-- Copy and paste this entire script into your SQL Editor and run it
-- This will create the required tables for the feedback parsing system

-- Create table to store parsed student feedback data
CREATE TABLE IF NOT EXISTS parsed_student_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT NOT NULL,
    class_code TEXT NOT NULL,
    class_name TEXT NOT NULL,
    unit_number TEXT NOT NULL,
    lesson_number TEXT,
    feedback_date DATE,
    topic TEXT,
    motion TEXT,
    feedback_type TEXT CHECK (feedback_type IN ('primary', 'secondary')),
    content TEXT NOT NULL,
    raw_content TEXT,
    best_aspects TEXT,
    improvement_areas TEXT,
    teacher_comments TEXT,
    rubric_scores JSONB,
    duration TEXT,
    file_path TEXT NOT NULL,
    parsed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create table to track parsing status
CREATE TABLE IF NOT EXISTS feedback_parsing_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_files_processed INTEGER DEFAULT 0,
    total_feedback_records INTEGER DEFAULT 0,
    total_students INTEGER DEFAULT 0,
    parsing_started_at TIMESTAMPTZ,
    parsing_completed_at TIMESTAMPTZ,
    parsing_errors TEXT[],
    is_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_parsed_feedback_student_name ON parsed_student_feedback(student_name);
CREATE INDEX IF NOT EXISTS idx_parsed_feedback_class_code ON parsed_student_feedback(class_code);
CREATE INDEX IF NOT EXISTS idx_parsed_feedback_unit_number ON parsed_student_feedback(unit_number);
CREATE INDEX IF NOT EXISTS idx_parsed_feedback_type ON parsed_student_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_parsed_feedback_student_unit ON parsed_student_feedback(student_name, unit_number);

-- Create view for student summary (optional but helpful)
CREATE OR REPLACE VIEW student_feedback_summary AS
SELECT 
    student_name,
    COUNT(*) as total_feedback_sessions,
    MIN(CASE WHEN unit_number ~ '^[0-9]+\.[0-9]+$' THEN CAST(unit_number AS decimal) ELSE 0 END) as earliest_unit,
    MAX(CASE WHEN unit_number ~ '^[0-9]+\.[0-9]+$' THEN CAST(unit_number AS decimal) ELSE 0 END) as latest_unit,
    STRING_AGG(DISTINCT class_code, ', ' ORDER BY class_code) as class_codes,
    STRING_AGG(DISTINCT class_name, ', ' ORDER BY class_name) as class_names,
    COUNT(DISTINCT feedback_type) as feedback_types_count,
    STRING_AGG(DISTINCT feedback_type, ', ') as feedback_types,
    MAX(parsed_at) as last_updated
FROM parsed_student_feedback
GROUP BY student_name
ORDER BY total_feedback_sessions DESC;

-- Insert a test record to verify table creation
INSERT INTO parsed_student_feedback (
    student_name, class_code, class_name, unit_number, content, feedback_type, file_path
) VALUES (
    'TABLE_CREATION_TEST', 'TEST', 'Test Table Creation', '0.0', 'This is a test record', 'primary', '/test/path'
);

-- Clean up the test record
DELETE FROM parsed_student_feedback WHERE student_name = 'TABLE_CREATION_TEST';

-- Verify tables were created
SELECT 'Tables created successfully!' as status;