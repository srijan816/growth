-- Enhanced Schema for Feedback Data Organization and Growth Tracking
-- Extends existing schema.sql with comprehensive feedback management

-- Create additional custom types for feedback
CREATE TYPE feedback_format AS ENUM ('primary_narrative', 'secondary_rubric', 'mixed');
CREATE TYPE skill_category AS ENUM (
    'time_management',           -- Meeting speech duration requirements
    'interactive_debate',        -- Points of Information (POIs)
    'presentation_skills',       -- Volume, speed, tone, diction, flow
    'argument_structure',        -- Claims, evidence, warrants, impacts, synthesis
    'theory_application',        -- Using class-taught debate concepts
    'rebuttal_skills',          -- Responding to opponent arguments
    'teamwork',                 -- Supporting teammate's case
    'feedback_implementation',   -- Implementing previous feedback
    'hook_development',         -- Opening techniques and engagement
    'signposting',             -- Speech organization and clarity
    'voice_projection',        -- Volume and clarity
    'eye_contact',             -- Physical presentation
    'logical_reasoning',       -- Analysis and critical thinking
    'evidence_usage'           -- Research and support materials
);

-- Feedback Sessions table - Links to specific units/lessons
CREATE TABLE feedback_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    unit_number VARCHAR(20) NOT NULL,         -- '1.1', '2.3', '10.2', etc.
    topic VARCHAR(255),                       -- Motion/topic for the session
    feedback_format feedback_format NOT NULL, -- Which format was used
    session_duration INTERVAL,               -- Actual session length
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student Feedback Records - Individual feedback instances
CREATE TABLE student_feedback_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    feedback_session_id UUID NOT NULL REFERENCES feedback_sessions(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    
    -- Speech timing data
    speech_duration INTERVAL,               -- How long student spoke
    target_duration INTERVAL,              -- How long they should have spoken
    
    -- Narrative feedback (Primary format)
    best_aspects TEXT,                      -- "What was the BEST thing about my speech?"
    improvement_areas TEXT,                 -- "What part of my speech NEEDS IMPROVEMENT?"
    
    -- Instructor notes and observations
    instructor_notes TEXT,
    instructor_id UUID NOT NULL REFERENCES users(id),
    
    -- Meta information
    feedback_date DATE NOT NULL DEFAULT CURRENT_DATE,
    document_source VARCHAR(500),           -- Original document path/name
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(student_id, feedback_session_id)
);

-- Skill Assessments - Detailed skill tracking (Secondary format)
CREATE TABLE skill_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feedback_record_id UUID NOT NULL REFERENCES student_feedback_records(id) ON DELETE CASCADE,
    skill_category skill_category NOT NULL,
    
    -- Rubric scoring (1-5 scale from secondary format)
    rubric_score INTEGER CHECK (rubric_score BETWEEN 1 AND 5),
    
    -- Normalized score for growth tracking (0-10 scale)
    normalized_score NUMERIC(3,1) CHECK (normalized_score >= 0 AND normalized_score <= 10),
    
    -- Qualitative assessment
    skill_notes TEXT,
    observed BOOLEAN NOT NULL DEFAULT true,  -- false if marked as "N/A" or "Unobserved"
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Growth Indicators - Extracted patterns and trends
CREATE TABLE growth_indicators (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    skill_category skill_category NOT NULL,
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    
    -- Progression metrics
    first_assessment_date DATE,
    latest_assessment_date DATE,
    total_assessments INTEGER DEFAULT 0,
    
    -- Growth calculations
    initial_score NUMERIC(3,1),
    current_score NUMERIC(3,1),
    growth_rate NUMERIC(5,2),              -- Points per unit/month
    trend_direction VARCHAR(20),           -- 'improving', 'stable', 'declining'
    
    -- Consistency metrics
    score_variance NUMERIC(5,2),
    consistency_rating VARCHAR(20),        -- 'consistent', 'variable', 'erratic'
    
    -- Focus area identification
    is_strength BOOLEAN DEFAULT false,
    is_growth_area BOOLEAN DEFAULT false,
    priority_level INTEGER CHECK (priority_level BETWEEN 1 AND 5),
    
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(student_id, skill_category, enrollment_id)
);

-- Feedback Themes - Common patterns across feedback
CREATE TABLE feedback_themes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,            -- 'Hook Development', 'Volume Issues'
    description TEXT,
    skill_category skill_category,
    theme_type VARCHAR(50),                -- 'strength', 'challenge', 'improvement'
    keywords JSONB,                        -- ['hook', 'opening', 'engagement']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student Theme Tracking - Which themes appear in student feedback
CREATE TABLE student_theme_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    theme_id UUID NOT NULL REFERENCES feedback_themes(id) ON DELETE CASCADE,
    feedback_record_id UUID NOT NULL REFERENCES student_feedback_records(id) ON DELETE CASCADE,
    
    -- Frequency and context
    mentions_count INTEGER DEFAULT 1,
    first_mentioned DATE,
    last_mentioned DATE,
    resolution_date DATE,                  -- When issue was resolved (if applicable)
    
    -- Sentiment and progress
    sentiment VARCHAR(20),                 -- 'positive', 'neutral', 'concern'
    progress_status VARCHAR(30),           -- 'improving', 'persistent', 'resolved'
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unit Progression Mapping - Maps units to skill expectations
CREATE TABLE unit_progression_mapping (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    program_type VARCHAR(100) NOT NULL,    -- 'PSD I', 'PSD II'
    level VARCHAR(50) NOT NULL,            -- 'Primary', 'Secondary'
    unit_number VARCHAR(20) NOT NULL,      -- '1.1', '2.3', etc.
    
    -- Expected skills for this unit
    focus_skills JSONB,                    -- ['argument_structure', 'presentation_skills']
    skill_expectations JSONB,             -- Expected proficiency levels
    
    -- Prerequisites and progression
    prerequisite_units JSONB,             -- ['1.1', '1.2']
    difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 10),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(program_type, level, unit_number)
);

-- Create indexes for performance
CREATE INDEX idx_feedback_sessions_session ON feedback_sessions(session_id);
CREATE INDEX idx_feedback_sessions_unit ON feedback_sessions(unit_number);
CREATE INDEX idx_student_feedback_student ON student_feedback_records(student_id);
CREATE INDEX idx_student_feedback_session ON student_feedback_records(feedback_session_id);
CREATE INDEX idx_student_feedback_date ON student_feedback_records(feedback_date);
CREATE INDEX idx_skill_assessments_feedback ON skill_assessments(feedback_record_id);
CREATE INDEX idx_skill_assessments_category ON skill_assessments(skill_category);
CREATE INDEX idx_skill_assessments_score ON skill_assessments(normalized_score);
CREATE INDEX idx_growth_indicators_student ON growth_indicators(student_id);
CREATE INDEX idx_growth_indicators_skill ON growth_indicators(skill_category);
CREATE INDEX idx_growth_indicators_trend ON growth_indicators(trend_direction);
CREATE INDEX idx_student_themes_student ON student_theme_tracking(student_id);
CREATE INDEX idx_student_themes_theme ON student_theme_tracking(theme_id);

-- Add updated_at triggers for new tables
CREATE TRIGGER update_feedback_records_updated_at 
    BEFORE UPDATE ON student_feedback_records 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for common queries

-- Student Progress Overview
CREATE VIEW student_progress_overview AS
SELECT 
    s.id as student_id,
    u.name as student_name,
    c.code as course_code,
    c.name as course_name,
    COUNT(sfr.id) as total_feedback_sessions,
    MIN(sfr.feedback_date) as first_feedback,
    MAX(sfr.feedback_date) as latest_feedback,
    AVG(sa.normalized_score) as average_score,
    COUNT(DISTINCT sa.skill_category) as skills_assessed
FROM students s
JOIN users u ON s.id = u.id
JOIN enrollments e ON s.id = e.student_id
JOIN courses c ON e.course_id = c.id
LEFT JOIN student_feedback_records sfr ON s.id = sfr.student_id
LEFT JOIN skill_assessments sa ON sfr.id = sa.feedback_record_id
WHERE sa.observed = true
GROUP BY s.id, u.name, c.code, c.name;

-- Skill Progression Timeline
CREATE VIEW skill_progression_timeline AS
SELECT 
    gi.student_id,
    u.name as student_name,
    gi.skill_category,
    gi.initial_score,
    gi.current_score,
    gi.growth_rate,
    gi.trend_direction,
    gi.total_assessments,
    gi.first_assessment_date,
    gi.latest_assessment_date
FROM growth_indicators gi
JOIN students s ON gi.student_id = s.id
JOIN users u ON s.id = u.id
ORDER BY gi.student_id, gi.skill_category;

-- Unit Performance Analysis
CREATE VIEW unit_performance_analysis AS
SELECT 
    fs.unit_number,
    c.program_type,
    c.level,
    COUNT(sfr.id) as total_students,
    AVG(sa.normalized_score) as average_performance,
    COUNT(DISTINCT sa.skill_category) as skills_assessed,
    COUNT(CASE WHEN sa.normalized_score >= 7 THEN 1 END) as high_performers,
    COUNT(CASE WHEN sa.normalized_score < 5 THEN 1 END) as needs_support
FROM feedback_sessions fs
JOIN class_sessions cs ON fs.session_id = cs.id
JOIN courses c ON cs.course_id = c.id
JOIN student_feedback_records sfr ON fs.id = sfr.feedback_session_id
JOIN skill_assessments sa ON sfr.id = sa.feedback_record_id
WHERE sa.observed = true
GROUP BY fs.unit_number, c.program_type, c.level
ORDER BY fs.unit_number;

-- Enable RLS for new tables
ALTER TABLE feedback_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_feedback_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_theme_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_progression_mapping ENABLE ROW LEVEL SECURITY;

-- Sample RLS policies (extend as needed)
CREATE POLICY "Instructors can view their student feedback" 
    ON student_feedback_records FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM enrollments e
            JOIN courses c ON e.course_id = c.id
            WHERE e.student_id = student_feedback_records.student_id 
            AND c.instructor_id = auth.uid()
        )
    );

-- Insert sample feedback themes based on our analysis
INSERT INTO feedback_themes (name, description, skill_category, theme_type, keywords) VALUES
('Hook Development', 'Needs improvement in creating engaging speech openings', 'hook_development', 'challenge', '["hook", "opening", "start", "beginning", "engage"]'),
('Volume Issues', 'Speech volume needs adjustment for audience clarity', 'voice_projection', 'challenge', '["volume", "loud", "quiet", "projection", "hear"]'),
('Strong Signposting', 'Excellent at organizing and signaling speech structure', 'signposting', 'strength', '["signpost", "structure", "organize", "clear", "firstly"]'),
('Time Management', 'Consistent issues with meeting speech duration targets', 'time_management', 'challenge', '["time", "duration", "short", "long", "finish"]'),
('Confident Delivery', 'Shows strong confidence and poise during presentations', 'presentation_skills', 'strength', '["confident", "poise", "comfortable", "natural"]'),
('Feedback Implementation', 'Successfully applies previous feedback in new speeches', 'feedback_implementation', 'improvement', '["applied", "implemented", "improved", "worked on"]'),
('Argument Structure', 'Well-developed logical argument construction', 'argument_structure', 'strength', '["argument", "logic", "structure", "claims", "evidence"]'),
('Eye Contact', 'Needs development in maintaining audience connection', 'eye_contact', 'challenge', '["eye contact", "audience", "look", "connect"]');

-- Insert unit progression mapping for PSD I program
INSERT INTO unit_progression_mapping (program_type, level, unit_number, focus_skills, skill_expectations, prerequisite_units, difficulty_level) VALUES
('PSD I', 'Primary', '1.1', '["presentation_skills", "hook_development", "time_management"]', '{"presentation_skills": 3, "hook_development": 2, "time_management": 3}', '[]', 1),
('PSD I', 'Primary', '1.2', '["presentation_skills", "argument_structure", "signposting"]', '{"presentation_skills": 4, "argument_structure": 3, "signposting": 3}', '["1.1"]', 2),
('PSD I', 'Primary', '2.1', '["argument_structure", "evidence_usage", "logical_reasoning"]', '{"argument_structure": 4, "evidence_usage": 3, "logical_reasoning": 3}', '["1.1", "1.2"]', 3),
('PSD I', 'Primary', '3.1', '["rebuttal_skills", "interactive_debate", "theory_application"]', '{"rebuttal_skills": 3, "interactive_debate": 3, "theory_application": 4}', '["2.1"]', 4),
('PSD I', 'Secondary', '1.1', '["presentation_skills", "argument_structure", "logical_reasoning"]', '{"presentation_skills": 4, "argument_structure": 4, "logical_reasoning": 3}', '[]', 2),
('PSD I', 'Secondary', '2.1', '["rebuttal_skills", "interactive_debate", "theory_application"]', '{"rebuttal_skills": 4, "interactive_debate": 4, "theory_application": 4}', '["1.1"]', 4);

-- Add comments for documentation
COMMENT ON TABLE feedback_sessions IS 'Links feedback to specific class sessions and units';
COMMENT ON TABLE student_feedback_records IS 'Individual student feedback instances with narrative content';
COMMENT ON TABLE skill_assessments IS 'Detailed skill-by-skill assessments with rubric scores';
COMMENT ON TABLE growth_indicators IS 'Calculated growth trends and progression metrics';
COMMENT ON TABLE feedback_themes IS 'Common feedback patterns and themes for analysis';
COMMENT ON TABLE student_theme_tracking IS 'Tracks which themes appear in individual student feedback';
COMMENT ON TABLE unit_progression_mapping IS 'Expected skill levels and progression by unit';

COMMENT ON VIEW student_progress_overview IS 'Summary of each student''s feedback and progress';
COMMENT ON VIEW skill_progression_timeline IS 'Individual skill development over time';
COMMENT ON VIEW unit_performance_analysis IS 'Class performance analysis by unit';