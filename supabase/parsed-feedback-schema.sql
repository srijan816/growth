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
    duration TEXT,
    file_path TEXT NOT NULL,
    parsed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_parsed_feedback_student_name ON parsed_student_feedback(student_name);
CREATE INDEX IF NOT EXISTS idx_parsed_feedback_class_code ON parsed_student_feedback(class_code);
CREATE INDEX IF NOT EXISTS idx_parsed_feedback_unit_number ON parsed_student_feedback(unit_number);
CREATE INDEX IF NOT EXISTS idx_parsed_feedback_type ON parsed_student_feedback(feedback_type);
CREATE INDEX IF NOT EXISTS idx_parsed_feedback_student_unit ON parsed_student_feedback(student_name, unit_number);

-- Create view for student summary
CREATE OR REPLACE VIEW student_feedback_summary AS
SELECT 
    student_name,
    COUNT(*) as total_feedback_sessions,
    MIN(unit_number::decimal) as earliest_unit,
    MAX(unit_number::decimal) as latest_unit,
    STRING_AGG(DISTINCT class_code, ', ' ORDER BY class_code) as class_codes,
    STRING_AGG(DISTINCT class_name, ', ' ORDER BY class_name) as class_names,
    COUNT(DISTINCT feedback_type) as feedback_types_count,
    STRING_AGG(DISTINCT feedback_type, ', ') as feedback_types,
    MAX(parsed_at) as last_updated
FROM parsed_student_feedback
GROUP BY student_name
ORDER BY total_feedback_sessions DESC;

-- Create function to get chronological feedback for a student
CREATE OR REPLACE FUNCTION get_student_chronological_feedback(p_student_name TEXT)
RETURNS TABLE (
    id UUID,
    student_name TEXT,
    class_code TEXT,
    class_name TEXT,
    unit_number TEXT,
    lesson_number TEXT,
    topic TEXT,
    motion TEXT,
    feedback_type TEXT,
    content TEXT,
    best_aspects TEXT,
    improvement_areas TEXT,
    teacher_comments TEXT,
    duration TEXT,
    parsed_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        psf.id,
        psf.student_name,
        psf.class_code,
        psf.class_name,
        psf.unit_number,
        psf.lesson_number,
        psf.topic,
        psf.motion,
        psf.feedback_type,
        psf.content,
        psf.best_aspects,
        psf.improvement_areas,
        psf.teacher_comments,
        psf.duration,
        psf.parsed_at
    FROM parsed_student_feedback psf
    WHERE LOWER(psf.student_name) LIKE LOWER('%' || p_student_name || '%')
    ORDER BY 
        CASE 
            WHEN psf.unit_number ~ '^\d+\.\d+$' THEN 
                CAST(SPLIT_PART(psf.unit_number, '.', 1) AS INTEGER) * 10 + 
                CAST(SPLIT_PART(psf.unit_number, '.', 2) AS INTEGER)
            ELSE 0
        END,
        psf.parsed_at;
END;
$$ LANGUAGE plpgsql;

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

-- Row Level Security (if needed)
ALTER TABLE parsed_student_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_parsing_status ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON parsed_student_feedback TO authenticated;
GRANT ALL ON feedback_parsing_status TO authenticated;
GRANT ALL ON student_feedback_summary TO authenticated;