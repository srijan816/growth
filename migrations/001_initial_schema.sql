-- Initial schema setup
-- This should be run once to set up the database

-- Create attendance_status enum
CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'makeup');

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'instructor',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    parent_name TEXT,
    parent_email TEXT,
    parent_phone TEXT,
    date_of_birth DATE,
    school TEXT,
    grade TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    level TEXT,
    day_of_week TEXT,
    start_time TIME,
    end_time TIME,
    duration_minutes INTEGER,
    instructor_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(student_id, course_id)
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(course_id, date)
);

-- Attendances table with 4-category rating system
CREATE TABLE IF NOT EXISTS attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    status attendance_status NOT NULL,
    attitude_rating INTEGER CHECK (attitude_rating >= 1 AND attitude_rating <= 5),
    asking_questions_rating INTEGER CHECK (asking_questions_rating >= 1 AND asking_questions_rating <= 5),
    application_rating INTEGER CHECK (application_rating >= 1 AND application_rating <= 5),
    feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
    notes TEXT,
    recorded_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(session_id, student_id)
);

-- Feedback parsing tables
CREATE TABLE IF NOT EXISTS parsed_student_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT NOT NULL,
    class_code TEXT NOT NULL,
    class_name TEXT,
    unit_number TEXT NOT NULL,
    lesson_number TEXT,
    date TEXT,
    topic TEXT,
    motion TEXT,
    feedback_type TEXT CHECK (feedback_type IN ('primary', 'secondary')),
    content TEXT NOT NULL,
    raw_content TEXT,
    html_content TEXT,
    duration TEXT,
    file_path TEXT NOT NULL,
    unique_id TEXT UNIQUE NOT NULL,
    instructor TEXT,
    parsed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS feedback_parsing_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_files_processed INTEGER DEFAULT 0,
    total_feedback_records INTEGER DEFAULT 0,
    total_students INTEGER DEFAULT 0,
    parsing_started_at TIMESTAMP WITH TIME ZONE,
    parsing_completed_at TIMESTAMP WITH TIME ZONE,
    parsing_errors JSONB DEFAULT '[]'::jsonb,
    is_complete BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- AI analysis tables
CREATE TABLE IF NOT EXISTS ai_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT NOT NULL,
    recommendation_type TEXT NOT NULL,
    content TEXT NOT NULL,
    priority TEXT DEFAULT 'medium',
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW() + INTERVAL '30 days'),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE IF NOT EXISTS student_analysis_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT UNIQUE NOT NULL,
    analysis_data JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW() + INTERVAL '7 days'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_sessions_course ON sessions(course_id);
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_attendances_session ON attendances(session_id);
CREATE INDEX idx_attendances_student ON attendances(student_id);
CREATE INDEX idx_parsed_feedback_student ON parsed_student_feedback(student_name);
CREATE INDEX idx_parsed_feedback_instructor ON parsed_student_feedback(instructor);
CREATE INDEX idx_parsed_feedback_class ON parsed_student_feedback(class_code);
CREATE INDEX idx_ai_recommendations_student ON ai_recommendations(student_name);
CREATE INDEX idx_analysis_cache_expires ON student_analysis_cache(expires_at);

-- Create views
CREATE OR REPLACE VIEW student_feedback_summary AS
SELECT 
    student_name,
    instructor,
    COUNT(*) as total_feedback_sessions,
    COUNT(DISTINCT class_code) as unique_classes,
    STRING_AGG(DISTINCT class_code, ', ' ORDER BY class_code) as class_codes,
    STRING_AGG(DISTINCT class_name, ', ' ORDER BY class_name) as class_names,
    STRING_AGG(DISTINCT feedback_type, ', ' ORDER BY feedback_type) as feedback_types,
    MIN(unit_number::decimal) as earliest_unit,
    MAX(unit_number::decimal) as latest_unit,
    MAX(parsed_at) as last_updated
FROM parsed_student_feedback
WHERE instructor IS NOT NULL
GROUP BY student_name, instructor;