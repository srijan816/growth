#!/usr/bin/env python3
"""Create all database tables directly"""

import paramiko

VPS_HOST = "62.171.175.130"
VPS_USER = "root"
VPS_PASSWORD = "63r4k5PS"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("Connecting to VPS...")
    ssh.connect(VPS_HOST, 22, VPS_USER, VPS_PASSWORD)
    print("Connected! Creating database tables...")
    
    # Create SQL script with all tables
    create_tables_sql = """sudo -u postgres psql growth_compass << 'EOF'
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create ENUM types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'instructor', 'admin', 'parent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'makeup', 'excused');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'withdrawn', 'pending');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE course_status AS ENUM ('active', 'completed', 'cancelled', 'draft');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'student',
    image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    student_number VARCHAR(50) UNIQUE NOT NULL,
    grade_level VARCHAR(10),
    parent_email VARCHAR(255),
    parent_phone VARCHAR(20),
    date_of_birth DATE,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    instructor_id UUID REFERENCES users(id),
    day_of_week VARCHAR(20),
    start_time TIME,
    duration_minutes INTEGER DEFAULT 60,
    room VARCHAR(50),
    max_students INTEGER DEFAULT 20,
    status course_status DEFAULT 'active',
    term VARCHAR(50),
    is_intensive BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    completion_date DATE,
    status enrollment_status DEFAULT 'active',
    final_grade VARCHAR(10),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, course_id)
);

-- Class sessions table
CREATE TABLE IF NOT EXISTS class_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    topic VARCHAR(255),
    description TEXT,
    homework TEXT,
    materials TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, session_date)
);

-- Attendances table
CREATE TABLE IF NOT EXISTS attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
    status attendance_status DEFAULT 'present',
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    attitude_efforts DECIMAL(2,1) CHECK (attitude_efforts >= 0 AND attitude_efforts <= 4),
    asking_questions DECIMAL(2,1) CHECK (asking_questions >= 0 AND asking_questions <= 4),
    application_skills DECIMAL(2,1) CHECK (application_skills >= 0 AND application_skills <= 4),
    application_feedback DECIMAL(2,1) CHECK (application_feedback >= 0 AND application_feedback <= 4),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, session_id)
);

-- Parsed student feedback table
CREATE TABLE IF NOT EXISTS parsed_student_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES class_sessions(id),
    course_id UUID REFERENCES courses(id),
    feedback_date DATE,
    speech_topic TEXT,
    motion TEXT,
    side VARCHAR(20),
    speech_type VARCHAR(50),
    speaker_position VARCHAR(50),
    content_score DECIMAL(3,1),
    style_score DECIMAL(3,1),
    strategy_score DECIMAL(3,1),
    poi_score DECIMAL(3,1),
    total_score DECIMAL(4,1),
    rank INTEGER,
    raw_scores JSONB,
    instructor_name VARCHAR(255),
    best_moments TEXT,
    needs_improvement TEXT,
    parsed_feedback JSONB,
    original_file_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Speech recordings table
CREATE TABLE IF NOT EXISTS speech_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES class_sessions(id),
    instructor_id UUID REFERENCES users(id),
    audio_file_path TEXT,
    duration_seconds INTEGER,
    speech_topic TEXT,
    motion TEXT,
    speech_type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI generated feedback table
CREATE TABLE IF NOT EXISTS ai_generated_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID REFERENCES speech_recordings(id) ON DELETE CASCADE,
    transcription TEXT,
    rubric_scores JSONB,
    strengths TEXT,
    improvement_areas TEXT,
    teacher_comments TEXT,
    model_version VARCHAR(50),
    confidence_score DECIMAL(3,2),
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Growth metrics table
CREATE TABLE IF NOT EXISTS growth_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    metric_type VARCHAR(100),
    metric_date DATE,
    value DECIMAL(10,2),
    percentile INTEGER,
    trend VARCHAR(20),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_course_id ON class_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_date ON class_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_attendances_student_id ON attendances(student_id);
CREATE INDEX IF NOT EXISTS idx_attendances_session_id ON attendances(session_id);
CREATE INDEX IF NOT EXISTS idx_parsed_feedback_student_id ON parsed_student_feedback(student_id);
CREATE INDEX IF NOT EXISTS idx_growth_metrics_student_id ON growth_metrics(student_id);

-- Verify tables were created
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

EOF"""
    
    print("  Creating all database tables...")
    stdin, stdout, stderr = ssh.exec_command(create_tables_sql, get_pty=True)
    output = stdout.read().decode()
    error = stderr.read().decode()
    
    print("Output:")
    print(output)
    
    if error and "NOTICE" not in error:
        print("Errors:")
        print(error)
    
    print("\n✅ Database tables created successfully!")
    
finally:
    ssh.close()