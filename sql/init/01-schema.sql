-- Growth Compass Database Schema
-- PostgreSQL version with instructor attribution

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
CREATE TYPE user_role AS ENUM ('instructor', 'student', 'parent');
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'makeup');
CREATE TYPE course_status AS ENUM ('active', 'completed', 'cancelled');
CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'withdrawn');
CREATE TYPE session_status AS ENUM ('scheduled', 'completed', 'cancelled');

-- Users table (base for all user types)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role user_role NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Students table (extends users)
CREATE TABLE students (
    id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    student_number VARCHAR(50) UNIQUE,
    parent_id UUID REFERENCES users(id),
    emergency_contact JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Courses table
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    program_type VARCHAR(100) NOT NULL,
    level VARCHAR(50) NOT NULL,
    grade_range VARCHAR(20) NOT NULL,
    day_of_week VARCHAR(20) NOT NULL,
    start_time TIME NOT NULL,
    instructor_id UUID NOT NULL REFERENCES users(id),
    term_type VARCHAR(50) NOT NULL DEFAULT 'regular',
    max_students INTEGER NOT NULL DEFAULT 15,
    status course_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enrollments table (many-to-many relationship between students and courses)
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrollment_date DATE NOT NULL,
    status enrollment_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, course_id)
);

-- Class sessions table
CREATE TABLE class_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    topic VARCHAR(255),
    unit_number VARCHAR(20),
    lesson_number VARCHAR(20),
    status session_status NOT NULL DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendances table with 4-category rating system
CREATE TABLE attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    status attendance_status NOT NULL,
    -- Four rating categories (1-5 stars each)
    attitude_efforts INTEGER CHECK (attitude_efforts >= 1 AND attitude_efforts <= 5),
    asking_questions INTEGER CHECK (asking_questions >= 1 AND asking_questions <= 5),
    application_skills INTEGER CHECK (application_skills >= 1 AND application_skills <= 5),
    application_feedback INTEGER CHECK (application_feedback >= 1 AND application_feedback <= 5),
    notes TEXT,
    marked_by UUID REFERENCES users(id),
    marked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, session_id)
);

-- **MAIN FEEDBACK TABLE** - This is where instructor attribution is crucial
CREATE TABLE parsed_student_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
    html_content TEXT,
    best_aspects TEXT,
    improvement_areas TEXT,
    teacher_comments TEXT,
    rubric_scores JSONB,
    duration TEXT,
    file_path TEXT NOT NULL,
    unique_id TEXT UNIQUE,
    
    -- **INSTRUCTOR ATTRIBUTION FIELD** - This is the key field we need!
    instructor TEXT NOT NULL,
    
    parsed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feedback parsing status tracking
CREATE TABLE feedback_parsing_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    total_files_processed INTEGER DEFAULT 0,
    total_feedback_records INTEGER DEFAULT 0,
    total_students INTEGER DEFAULT 0,
    parsing_started_at TIMESTAMP WITH TIME ZONE,
    parsing_completed_at TIMESTAMP WITH TIME ZONE,
    parsing_errors TEXT[],
    is_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Growth metrics tracking
CREATE TABLE growth_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    metric_type VARCHAR(50) NOT NULL,
    applicable_programs JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student metrics tracker
CREATE TABLE student_metrics_tracker (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    metric_id UUID NOT NULL REFERENCES growth_metrics(id) ON DELETE CASCADE,
    current_level DECIMAL(3,1) CHECK (current_level >= 0 AND current_level <= 10),
    target_level DECIMAL(3,1) CHECK (target_level >= 0 AND target_level <= 10),
    last_assessment_date DATE,
    last_assessment_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, metric_id)
);

-- Submissions table
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES class_sessions(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    submission_type VARCHAR(50) NOT NULL,
    file_path TEXT,
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    feedback TEXT,
    grade VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Recommendations tables
CREATE TABLE recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    growth_area TEXT NOT NULL,
    priority TEXT CHECK (priority IN ('high', 'medium', 'low')) NOT NULL,
    category TEXT CHECK (category IN ('skill-building', 'practice', 'mindset', 'technique')) NOT NULL,
    recommendation TEXT NOT NULL,
    specific_actions TEXT[] NOT NULL DEFAULT '{}',
    timeframe TEXT NOT NULL,
    measurable_goals TEXT[] NOT NULL DEFAULT '{}',
    resources TEXT[] NOT NULL DEFAULT '{}',
    instructor_notes TEXT,
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    status TEXT CHECK (status IN ('active', 'completed', 'archived')) NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE recommendation_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recommendation_id UUID NOT NULL REFERENCES recommendations(id) ON DELETE CASCADE,
    status TEXT CHECK (status IN ('improved', 'stable', 'needs_attention')) NOT NULL,
    evidence TEXT NOT NULL,
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    progress_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE student_analysis_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    analysis_type TEXT NOT NULL,
    analysis_data JSONB NOT NULL,
    program_type TEXT,
    feedback_session_count INTEGER,
    analysis_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_students_parent_id ON students(parent_id);
CREATE INDEX idx_courses_instructor_id ON courses(instructor_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX idx_class_sessions_course_id ON class_sessions(course_id);
CREATE INDEX idx_class_sessions_date ON class_sessions(session_date);
CREATE INDEX idx_attendances_student_id ON attendances(student_id);
CREATE INDEX idx_attendances_session_id ON attendances(session_id);

-- **CRITICAL INDEXES FOR FEEDBACK AND INSTRUCTOR FILTERING**
CREATE INDEX idx_parsed_feedback_student_name ON parsed_student_feedback(student_name);
CREATE INDEX idx_parsed_feedback_instructor ON parsed_student_feedback(instructor);
CREATE INDEX idx_parsed_feedback_class_code ON parsed_student_feedback(class_code);
CREATE INDEX idx_parsed_feedback_unit_number ON parsed_student_feedback(unit_number);
CREATE INDEX idx_parsed_feedback_type ON parsed_student_feedback(feedback_type);
CREATE INDEX idx_parsed_feedback_student_instructor ON parsed_student_feedback(student_name, instructor);

CREATE INDEX idx_recommendations_student_id ON recommendations(student_id);
CREATE INDEX idx_recommendations_status ON recommendations(status);
CREATE INDEX idx_recommendation_progress_recommendation_id ON recommendation_progress(recommendation_id);

-- Create useful views
CREATE OR REPLACE VIEW student_feedback_summary AS
SELECT 
    student_name,
    instructor,
    COUNT(*) as total_feedback_sessions,
    MIN(unit_number::decimal) as earliest_unit,
    MAX(unit_number::decimal) as latest_unit,
    STRING_AGG(DISTINCT class_code, ', ' ORDER BY class_code) as class_codes,
    STRING_AGG(DISTINCT class_name, ', ' ORDER BY class_name) as class_names,
    STRING_AGG(DISTINCT feedback_type, ', ') as feedback_types,
    MAX(parsed_at) as last_updated
FROM parsed_student_feedback
GROUP BY student_name, instructor
ORDER BY total_feedback_sessions DESC;

-- Function to get chronological feedback for a student
CREATE OR REPLACE FUNCTION get_student_chronological_feedback(p_student_name TEXT, p_instructor TEXT DEFAULT NULL)
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
    instructor TEXT,
    parsed_at TIMESTAMP WITH TIME ZONE
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
        psf.instructor,
        psf.parsed_at
    FROM parsed_student_feedback psf
    WHERE LOWER(psf.student_name) LIKE LOWER('%' || p_student_name || '%')
    AND (p_instructor IS NULL OR psf.instructor = p_instructor)
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

-- Add comments for documentation
COMMENT ON TABLE parsed_student_feedback IS 'Main feedback table with instructor attribution';
COMMENT ON COLUMN parsed_student_feedback.instructor IS 'Instructor who provided the feedback, extracted from file path';
COMMENT ON TABLE users IS 'Base user table for all system users';
COMMENT ON TABLE students IS 'Student-specific data extending users table';
COMMENT ON TABLE courses IS 'Course offerings with scheduling information';
COMMENT ON TABLE enrollments IS 'Student enrollments in courses (many-to-many)';
COMMENT ON TABLE class_sessions IS 'Individual class sessions for each course';
COMMENT ON TABLE attendances IS 'Attendance records with 4-category star ratings';
COMMENT ON TABLE growth_metrics IS 'Trackable skill metrics for student growth';
COMMENT ON TABLE student_metrics_tracker IS 'Student progress on specific metrics';
COMMENT ON TABLE submissions IS 'Student work submissions and feedback';