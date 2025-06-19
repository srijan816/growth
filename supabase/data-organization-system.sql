-- Data Organization and Mapping System
-- Maps existing feedback data structure to growth tracking schema

-- Create temporary staging tables for data import
CREATE TABLE temp_feedback_import (
    id SERIAL PRIMARY KEY,
    original_file_path TEXT NOT NULL,
    course_folder_name TEXT NOT NULL,      -- e.g., "Friday - 6 - 7.5 - 02IPDEC2402 - PSD I"
    unit_folder TEXT NOT NULL,             -- e.g., "1.1", "Unit 5"
    student_identifier TEXT NOT NULL,      -- File name or extracted student name
    feedback_content TEXT,                 -- Raw feedback text
    feedback_format TEXT NOT NULL,         -- 'primary_narrative' or 'secondary_rubric'
    processing_status TEXT DEFAULT 'pending', -- 'pending', 'processed', 'error'
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Course code extraction and mapping
CREATE TABLE course_code_mapping (
    id SERIAL PRIMARY KEY,
    folder_name TEXT UNIQUE NOT NULL,
    extracted_course_code TEXT NOT NULL,
    day_of_week TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    program_type TEXT NOT NULL,
    level TEXT NOT NULL,
    confidence_score NUMERIC(3,2) DEFAULT 1.0, -- How confident we are in this mapping
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Student name normalization and deduplication
CREATE TABLE student_name_mapping (
    id SERIAL PRIMARY KEY,
    original_name TEXT NOT NULL,
    normalized_name TEXT NOT NULL,
    confidence_score NUMERIC(3,2) DEFAULT 1.0,
    is_duplicate BOOLEAN DEFAULT false,
    canonical_student_id UUID REFERENCES students(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Unit number standardization
CREATE TABLE unit_mapping (
    id SERIAL PRIMARY KEY,
    original_unit TEXT NOT NULL,           -- e.g., "Unit 5", "5.1", "1.1"
    standardized_unit TEXT NOT NULL,       -- e.g., "5.1", "1.1"
    unit_sequence INTEGER,                 -- Ordering: 1, 2, 3...
    program_type TEXT NOT NULL,
    level TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(original_unit, program_type, level)
);

-- Insert known course mappings based on our analysis
INSERT INTO course_code_mapping (folder_name, extracted_course_code, day_of_week, time_slot, program_type, level) VALUES
('Friday - 6 - 7.5 - 02IPDEC2402 - PSD I', '02IPDEC2402', 'Friday', '18:00-19:30', 'PSD I', 'Primary'),
('Thursday - 6 - 7.5 - 02IPDEC2401 - PSD I', '02IPDEC2401', 'Thursday', '18:00-19:30', 'PSD I', 'Primary'),
('Saturday - 1.5 - 3 PM - 02IPDEC2404 - PSD I', '02IPDEC2404', 'Saturday', '13:30-15:00', 'PSD I', 'Primary'),
('Saturday - 9.5- 11 - 02IPDDC2402 - PSD II', '02IPDDC2402', 'Saturday', '09:30-11:00', 'PSD II', 'Primary'),
('Saturday 11 - 12.5 - 02IPDEC2403 - PSD I', '02IPDEC2403', 'Saturday', '11:00-12:30', 'PSD I', 'Primary'),
('Tuesday - 4_30 - 6_00 PM - G3-4 - 02IPDEB2401', '02IPDEB2401', 'Tuesday', '16:30-18:00', 'Beginner', 'Primary'),
('Wednesday - 4.5-6 - 02OPDEC2401 - PSD I', '02OPDEC2401', 'Wednesday', '16:30-18:00', 'PSD I', 'Primary'),
('Saturday - 3_00 - 4_30 - 01IPDED2404 - PSD I', '01IPDED2404', 'Saturday', '15:00-16:30', 'PSD I', 'Secondary'),
('Saturday - 4_45- 6_15 PM - 01IPDED2405 - PSD I', '01IPDED2405', 'Saturday', '16:45-18:15', 'PSD I', 'Secondary'),
('Wednesday - 6 - 7.5 - 01IPDED2401 - PSD I', '01IPDED2401', 'Wednesday', '18:00-19:30', 'PSD I', 'Secondary'),
('Thursday - 4_30 - 6_00 - 01IPDED2406 - PSD I', '01IPDED2406', 'Thursday', '16:30-18:00', 'PSD I', 'Secondary');

-- Insert unit mappings for standardization
INSERT INTO unit_mapping (original_unit, standardized_unit, unit_sequence, program_type, level) VALUES
-- Primary PSD I units
('1.1', '1.1', 1, 'PSD I', 'Primary'),
('1.2', '1.2', 2, 'PSD I', 'Primary'),
('1.3', '1.3', 3, 'PSD I', 'Primary'),
('1.4', '1.4', 4, 'PSD I', 'Primary'),
('2.1', '2.1', 5, 'PSD I', 'Primary'),
('2.2', '2.2', 6, 'PSD I', 'Primary'),
('2.3', '2.3', 7, 'PSD I', 'Primary'),
('2.4', '2.4', 8, 'PSD I', 'Primary'),
('3.1', '3.1', 9, 'PSD I', 'Primary'),
('3.2', '3.2', 10, 'PSD I', 'Primary'),
('3.3', '3.3', 11, 'PSD I', 'Primary'),
('3.4', '3.4', 12, 'PSD I', 'Primary'),
('4.1', '4.1', 13, 'PSD I', 'Primary'),
('4.2', '4.2', 14, 'PSD I', 'Primary'),
('4.3', '4.3', 15, 'PSD I', 'Primary'),
('4.4', '4.4', 16, 'PSD I', 'Primary'),
('Unit 5', '5.1', 17, 'PSD I', 'Primary'),
('5.1', '5.1', 17, 'PSD I', 'Primary'),
('5.2', '5.2', 18, 'PSD I', 'Primary'),
('5.3', '5.3', 19, 'PSD I', 'Primary'),
('5.4', '5.4', 20, 'PSD I', 'Primary'),
('Unit 6', '6.1', 21, 'PSD I', 'Primary'),
('6.1', '6.1', 21, 'PSD I', 'Primary'),
('6.2', '6.2', 22, 'PSD I', 'Primary'),
('6.3', '6.3', 23, 'PSD I', 'Primary'),
('6.4', '6.4', 24, 'PSD I', 'Primary'),
('Unit 7', '7.1', 25, 'PSD I', 'Primary'),
('7.1', '7.1', 25, 'PSD I', 'Primary'),
('7.2', '7.2', 26, 'PSD I', 'Primary'),
('7.3', '7.3', 27, 'PSD I', 'Primary'),
('7.4', '7.4', 28, 'PSD I', 'Primary'),
('Unit 8', '8.1', 29, 'PSD I', 'Primary'),
('8.1', '8.1', 29, 'PSD I', 'Primary'),
('8.2', '8.2', 30, 'PSD I', 'Primary'),
('8.3', '8.3', 31, 'PSD I', 'Primary'),
('8.4', '8.4', 32, 'PSD I', 'Primary'),
('Unit 9', '9.1', 33, 'PSD I', 'Primary'),
('9.1', '9.1', 33, 'PSD I', 'Primary'),
('9.2', '9.2', 34, 'PSD I', 'Primary'),
('9.3', '9.3', 35, 'PSD I', 'Primary'),
('9.4', '9.4', 36, 'PSD I', 'Primary'),
('Unit 10', '10.1', 37, 'PSD I', 'Primary'),
('10.1', '10.1', 37, 'PSD I', 'Primary'),
('10.2', '10.2', 38, 'PSD I', 'Primary'),
('10.3', '10.3', 39, 'PSD I', 'Primary'),
-- Secondary PSD I units (similar pattern)
('1.1', '1.1', 1, 'PSD I', 'Secondary'),
('1.2', '1.2', 2, 'PSD I', 'Secondary'),
('1.3', '1.3', 3, 'PSD I', 'Secondary'),
('1.4', '1.4', 4, 'PSD I', 'Secondary'),
('2.1', '2.1', 5, 'PSD I', 'Secondary'),
('2.2', '2.2', 6, 'PSD I', 'Secondary'),
('2.3', '2.3', 7, 'PSD I', 'Secondary'),
('2.4', '2.4', 8, 'PSD I', 'Secondary'),
-- PSD II units
('1.1', '1.1', 1, 'PSD II', 'Primary'),
('1.2', '1.2', 2, 'PSD II', 'Primary'),
('1.3', '1.3', 3, 'PSD II', 'Primary'),
('1.4', '1.4', 4, 'PSD II', 'Primary');

-- Function to normalize student names
CREATE OR REPLACE FUNCTION normalize_student_name(input_name TEXT) 
RETURNS TEXT AS $$
BEGIN
    -- Remove common prefixes and suffixes
    input_name := TRIM(input_name);
    input_name := REGEXP_REPLACE(input_name, '^Copy of ', '', 'i');
    input_name := REGEXP_REPLACE(input_name, ' - Unit.*$', '', 'i');
    input_name := REGEXP_REPLACE(input_name, ' - Feedback.*$', '', 'i');
    input_name := REGEXP_REPLACE(input_name, ' Feedback.*$', '', 'i');
    input_name := REGEXP_REPLACE(input_name, '\s+', ' ', 'g');
    
    -- Handle special cases that are not names
    IF input_name ~ '^\d+\.\d+' THEN  -- Starts with unit number like "1.1"
        RETURN NULL;
    END IF;
    
    IF input_name ~ 'Feedback$' AND length(input_name) < 15 THEN  -- Generic feedback files
        RETURN NULL;
    END IF;
    
    RETURN TRIM(input_name);
END;
$$ LANGUAGE plpgsql;

-- Function to extract course information from folder name
CREATE OR REPLACE FUNCTION extract_course_info(folder_name TEXT)
RETURNS TABLE (
    course_code TEXT,
    day_of_week TEXT,
    time_slot TEXT,
    program_type TEXT,
    level TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ccm.extracted_course_code,
        ccm.day_of_week,
        ccm.time_slot,
        ccm.program_type,
        ccm.level
    FROM course_code_mapping ccm
    WHERE ccm.folder_name = extract_course_info.folder_name;
END;
$$ LANGUAGE plpgsql;

-- Function to standardize unit numbers
CREATE OR REPLACE FUNCTION standardize_unit(unit_text TEXT, prog_type TEXT, level_val TEXT)
RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    SELECT um.standardized_unit INTO result
    FROM unit_mapping um
    WHERE um.original_unit = unit_text 
    AND um.program_type = prog_type 
    AND um.level_val = level_val;
    
    -- If no mapping found, try to extract unit pattern
    IF result IS NULL THEN
        -- Extract patterns like "1.1", "10.2" etc.
        result := (regexp_matches(unit_text, '(\d+\.\d+)'))[1];
        
        -- If still no pattern, return the original
        IF result IS NULL THEN
            result := unit_text;
        END IF;
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Data validation and quality functions
CREATE OR REPLACE FUNCTION validate_feedback_data()
RETURNS TABLE (
    validation_type TEXT,
    issue_count BIGINT,
    sample_issues TEXT[]
) AS $$
BEGIN
    -- Check for unmapped course codes
    RETURN QUERY
    SELECT 
        'unmapped_courses'::TEXT,
        COUNT(*)::BIGINT,
        ARRAY_AGG(DISTINCT tfi.course_folder_name)
    FROM temp_feedback_import tfi
    LEFT JOIN course_code_mapping ccm ON tfi.course_folder_name = ccm.folder_name
    WHERE ccm.id IS NULL;
    
    -- Check for invalid student names
    RETURN QUERY
    SELECT 
        'invalid_student_names'::TEXT,
        COUNT(*)::BIGINT,
        ARRAY_AGG(DISTINCT tfi.student_identifier LIMIT 5)
    FROM temp_feedback_import tfi
    WHERE normalize_student_name(tfi.student_identifier) IS NULL;
    
    -- Check for unmapped units
    RETURN QUERY
    SELECT 
        'unmapped_units'::TEXT,
        COUNT(*)::BIGINT,
        ARRAY_AGG(DISTINCT tfi.unit_folder LIMIT 5)
    FROM temp_feedback_import tfi
    LEFT JOIN course_code_mapping ccm ON tfi.course_folder_name = ccm.folder_name
    LEFT JOIN unit_mapping um ON (tfi.unit_folder = um.original_unit 
                                  AND ccm.program_type = um.program_type 
                                  AND ccm.level = um.level)
    WHERE um.id IS NULL AND ccm.id IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Growth calculation functions
CREATE OR REPLACE FUNCTION calculate_student_growth(
    p_student_id UUID,
    p_skill_category skill_category,
    p_enrollment_id UUID
) RETURNS void AS $$
DECLARE
    v_scores NUMERIC[];
    v_dates DATE[];
    v_initial_score NUMERIC(3,1);
    v_current_score NUMERIC(3,1);
    v_growth_rate NUMERIC(5,2);
    v_trend_direction TEXT;
    v_variance NUMERIC(5,2);
    v_consistency TEXT;
    v_total_assessments INTEGER;
    v_first_date DATE;
    v_latest_date DATE;
BEGIN
    -- Get all scores and dates for this student/skill
    SELECT 
        ARRAY_AGG(sa.normalized_score ORDER BY sfr.feedback_date),
        ARRAY_AGG(sfr.feedback_date ORDER BY sfr.feedback_date),
        COUNT(*),
        MIN(sfr.feedback_date),
        MAX(sfr.feedback_date)
    INTO v_scores, v_dates, v_total_assessments, v_first_date, v_latest_date
    FROM skill_assessments sa
    JOIN student_feedback_records sfr ON sa.feedback_record_id = sfr.id
    WHERE sfr.student_id = p_student_id 
    AND sa.skill_category = p_skill_category
    AND sfr.enrollment_id = p_enrollment_id
    AND sa.observed = true;
    
    -- Skip if insufficient data
    IF v_total_assessments < 2 THEN
        RETURN;
    END IF;
    
    -- Calculate metrics
    v_initial_score := v_scores[1];
    v_current_score := v_scores[array_upper(v_scores, 1)];
    
    -- Calculate growth rate (points per month)
    v_growth_rate := (v_current_score - v_initial_score) / 
                     GREATEST(EXTRACT(EPOCH FROM (v_latest_date - v_first_date)) / (30 * 24 * 3600), 1);
    
    -- Determine trend direction
    IF v_growth_rate > 0.2 THEN
        v_trend_direction := 'improving';
    ELSIF v_growth_rate < -0.2 THEN
        v_trend_direction := 'declining';
    ELSE
        v_trend_direction := 'stable';
    END IF;
    
    -- Calculate variance for consistency
    SELECT variance(unnest) INTO v_variance FROM unnest(v_scores);
    
    IF v_variance < 0.5 THEN
        v_consistency := 'consistent';
    ELSIF v_variance < 1.5 THEN
        v_consistency := 'variable';
    ELSE
        v_consistency := 'erratic';
    END IF;
    
    -- Insert or update growth indicators
    INSERT INTO growth_indicators (
        student_id, skill_category, enrollment_id,
        first_assessment_date, latest_assessment_date, total_assessments,
        initial_score, current_score, growth_rate, trend_direction,
        score_variance, consistency_rating,
        is_strength, is_growth_area, priority_level,
        last_calculated
    ) VALUES (
        p_student_id, p_skill_category, p_enrollment_id,
        v_first_date, v_latest_date, v_total_assessments,
        v_initial_score, v_current_score, v_growth_rate, v_trend_direction,
        v_variance, v_consistency,
        (v_current_score >= 7.0), (v_current_score < 5.0 OR v_trend_direction = 'declining'),
        CASE 
            WHEN v_current_score < 4.0 THEN 5  -- Critical
            WHEN v_current_score < 5.0 THEN 4  -- High
            WHEN v_trend_direction = 'declining' THEN 3  -- Medium
            ELSE 2  -- Low
        END,
        NOW()
    )
    ON CONFLICT (student_id, skill_category, enrollment_id)
    DO UPDATE SET
        latest_assessment_date = EXCLUDED.latest_assessment_date,
        total_assessments = EXCLUDED.total_assessments,
        current_score = EXCLUDED.current_score,
        growth_rate = EXCLUDED.growth_rate,
        trend_direction = EXCLUDED.trend_direction,
        score_variance = EXCLUDED.score_variance,
        consistency_rating = EXCLUDED.consistency_rating,
        is_strength = EXCLUDED.is_strength,
        is_growth_area = EXCLUDED.is_growth_area,
        priority_level = EXCLUDED.priority_level,
        last_calculated = EXCLUDED.last_calculated;
END;
$$ LANGUAGE plpgsql;

-- Batch processing function for all students
CREATE OR REPLACE FUNCTION recalculate_all_growth_indicators() 
RETURNS INTEGER AS $$
DECLARE
    rec RECORD;
    processed_count INTEGER := 0;
BEGIN
    -- Calculate growth for all student/skill/enrollment combinations
    FOR rec IN 
        SELECT DISTINCT 
            sfr.student_id, 
            sa.skill_category, 
            sfr.enrollment_id
        FROM student_feedback_records sfr
        JOIN skill_assessments sa ON sfr.id = sa.feedback_record_id
        WHERE sa.observed = true
    LOOP
        PERFORM calculate_student_growth(rec.student_id, rec.skill_category, rec.enrollment_id);
        processed_count := processed_count + 1;
    END LOOP;
    
    RETURN processed_count;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for temporary tables
CREATE INDEX idx_temp_feedback_course ON temp_feedback_import(course_folder_name);
CREATE INDEX idx_temp_feedback_unit ON temp_feedback_import(unit_folder);
CREATE INDEX idx_temp_feedback_student ON temp_feedback_import(student_identifier);
CREATE INDEX idx_temp_feedback_status ON temp_feedback_import(processing_status);

-- Comments
COMMENT ON TABLE temp_feedback_import IS 'Staging table for importing raw feedback data';
COMMENT ON TABLE course_code_mapping IS 'Maps folder names to standardized course information';
COMMENT ON TABLE student_name_mapping IS 'Normalizes and deduplicates student names';
COMMENT ON TABLE unit_mapping IS 'Standardizes unit numbering across programs';
COMMENT ON FUNCTION normalize_student_name(TEXT) IS 'Cleans and normalizes student names from file names';
COMMENT ON FUNCTION calculate_student_growth IS 'Calculates growth metrics for individual student skills';
COMMENT ON FUNCTION recalculate_all_growth_indicators IS 'Batch recalculation of all growth indicators';