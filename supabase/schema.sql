-- Growth Compass Database Schema
-- Created for student growth tracking system

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
    code VARCHAR(50) UNIQUE NOT NULL, -- e.g., '02IPDEC2401'
    name VARCHAR(255) NOT NULL,
    program_type VARCHAR(100) NOT NULL, -- 'PSD I', 'PSD II', 'Aspiring Writers'
    level VARCHAR(50) NOT NULL, -- 'Primary', 'Secondary'
    grade_range VARCHAR(20) NOT NULL, -- 'G3-4', 'G5-6', 'G7-9'
    day_of_week VARCHAR(20) NOT NULL, -- 'Monday', 'Tuesday', etc.
    start_time TIME NOT NULL,
    instructor_id UUID NOT NULL REFERENCES users(id),
    term_type VARCHAR(50) NOT NULL DEFAULT 'regular', -- 'regular', 'summer', 'easter', 'christmas'
    max_students INTEGER NOT NULL DEFAULT 15,
    status course_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enrollments table (many-to-many: students to courses)
CREATE TABLE enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status enrollment_status NOT NULL DEFAULT 'active',
    is_primary_class BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(student_id, course_id)
);

-- Class Sessions table
CREATE TABLE class_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    lesson_number VARCHAR(50) NOT NULL, -- '1.4', 'intensive-day-2'
    topic VARCHAR(255),
    instructor_id UUID NOT NULL REFERENCES users(id), -- For substitute tracking
    status session_status NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Attendances table
CREATE TABLE attendances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    status attendance_status NOT NULL,
    makeup_session_id UUID REFERENCES class_sessions(id), -- If this is a makeup
    star_rating_1 NUMERIC(2,1) CHECK (star_rating_1 >= 0 AND star_rating_1 <= 4),
    star_rating_2 NUMERIC(2,1) CHECK (star_rating_2 >= 0 AND star_rating_2 <= 4),
    star_rating_3 NUMERIC(2,1) CHECK (star_rating_3 >= 0 AND star_rating_3 <= 4),
    star_rating_4 NUMERIC(2,1) CHECK (star_rating_4 >= 0 AND star_rating_4 <= 4),
    notes TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE, -- For offline mode tracking
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(enrollment_id, session_id)
);

-- Growth Metrics table
CREATE TABLE growth_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    metric_type VARCHAR(100) NOT NULL, -- 'speaking', 'content', 'engagement', 'custom'
    applicable_programs JSONB, -- ['PSD I', 'PSD II']
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Student Metrics Tracker table
CREATE TABLE student_metrics_tracker (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    metric_id UUID NOT NULL REFERENCES growth_metrics(id) ON DELETE CASCADE,
    enrollment_id UUID NOT NULL REFERENCES enrollments(id) ON DELETE CASCADE,
    score NUMERIC(3,1) NOT NULL CHECK (score >= 0 AND score <= 10),
    assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    assessed_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Submissions table
CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    assignment_name VARCHAR(255) NOT NULL,
    file_url VARCHAR(500), -- Cloudinary/S3 URL
    file_type VARCHAR(50), -- 'audio', 'video', 'document', 'image'
    feedback_text TEXT,
    grade NUMERIC(5,2),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_courses_instructor ON courses(instructor_id);
CREATE INDEX idx_courses_status ON courses(status);
CREATE INDEX idx_courses_day_time ON courses(day_of_week, start_time);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_course ON enrollments(course_id);
CREATE INDEX idx_enrollments_status ON enrollments(status);
CREATE INDEX idx_sessions_course_date ON class_sessions(course_id, session_date);
CREATE INDEX idx_attendances_enrollment ON attendances(enrollment_id);
CREATE INDEX idx_attendances_session ON attendances(session_id);
CREATE INDEX idx_attendances_date ON attendances(recorded_at);
CREATE INDEX idx_metrics_student ON student_metrics_tracker(student_id);
CREATE INDEX idx_submissions_student ON submissions(student_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_enrollments_updated_at BEFORE UPDATE ON enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON class_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_attendances_updated_at BEFORE UPDATE ON attendances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_submissions_updated_at BEFORE UPDATE ON submissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_metrics_tracker ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (to be refined based on auth setup)
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Instructors can view their students" ON students FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE e.student_id = students.id AND c.instructor_id = auth.uid()
    )
);

-- Insert sample data for testing
INSERT INTO users (id, email, name, role, password_hash) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'instructor@example.com', 'Test Instructor', 'instructor', '$2b$12$example_hash'),
('550e8400-e29b-41d4-a716-446655440001', 'student1@example.com', 'Jean Ho', 'student', '$2b$12$example_hash'),
('550e8400-e29b-41d4-a716-446655440002', 'student2@example.com', 'Rohan Maliah', 'student', '$2b$12$example_hash');

INSERT INTO students (id, student_number) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'STU001'),
('550e8400-e29b-41d4-a716-446655440002', 'STU002');

INSERT INTO courses (id, code, name, program_type, level, grade_range, day_of_week, start_time, instructor_id) VALUES
('550e8400-e29b-41d4-a716-446655440100', '02IPDEC2401', 'Thursday G5-6 PSD I', 'PSD I', 'Primary', 'G5-6', 'Thursday', '18:00:00', '550e8400-e29b-41d4-a716-446655440000');

INSERT INTO enrollments (student_id, course_id, enrollment_date, status) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440100', '2024-01-15', 'active'),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440100', '2024-01-15', 'active');

-- Insert some sample growth metrics
INSERT INTO growth_metrics (name, description, metric_type, applicable_programs) VALUES
('Public Speaking Confidence', 'Overall confidence and poise during presentations', 'speaking', '["PSD I", "PSD II"]'),
('Content Organization', 'Ability to structure and organize ideas clearly', 'content', '["PSD I", "PSD II"]'),
('Audience Engagement', 'Skill in connecting with and engaging the audience', 'engagement', '["PSD I", "PSD II"]'),
('Improvement Mindset', 'Openness to feedback and commitment to growth', 'custom', '["PSD I", "PSD II", "Aspiring Writers"]');

COMMENT ON TABLE users IS 'Base user table for all system users';
COMMENT ON TABLE students IS 'Student-specific data extending users table';
COMMENT ON TABLE courses IS 'Course offerings with scheduling information';
COMMENT ON TABLE enrollments IS 'Student enrollments in courses (many-to-many)';
COMMENT ON TABLE class_sessions IS 'Individual class sessions for each course';
COMMENT ON TABLE attendances IS 'Attendance records with star ratings';
COMMENT ON TABLE growth_metrics IS 'Trackable skill metrics for student growth';
COMMENT ON TABLE student_metrics_tracker IS 'Student progress on specific metrics';
COMMENT ON TABLE submissions IS 'Student work submissions and feedback';