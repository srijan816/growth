-- Performance indexes for frequently queried columns
-- This migration adds indexes to improve query performance across the application

-- Users table indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    END IF;
END $$;

-- Students table indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students') THEN
        CREATE INDEX IF NOT EXISTS idx_students_id ON students(id);
    END IF;
END $$;

-- Courses table indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courses') THEN
        CREATE INDEX IF NOT EXISTS idx_courses_code ON courses(code);
        CREATE INDEX IF NOT EXISTS idx_courses_instructor_id ON courses(instructor_id);
    END IF;
END $$;

-- Enrollments table indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'enrollments') THEN
        CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
        CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
        CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
        CREATE INDEX IF NOT EXISTS idx_enrollments_student_course ON enrollments(student_id, course_id);
    END IF;
END $$;

-- Sessions table indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sessions') THEN
        CREATE INDEX IF NOT EXISTS idx_sessions_course_id ON sessions(course_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(session_date);
        CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
        CREATE INDEX IF NOT EXISTS idx_sessions_course_date ON sessions(course_id, session_date);
    END IF;
END $$;

-- Attendances table indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'attendances') THEN
        CREATE INDEX IF NOT EXISTS idx_attendances_session_id ON attendances(session_id);
        CREATE INDEX IF NOT EXISTS idx_attendances_enrollment_id ON attendances(enrollment_id);
        CREATE INDEX IF NOT EXISTS idx_attendances_created_at ON attendances(created_at);
        CREATE INDEX IF NOT EXISTS idx_attendances_status ON attendances(status);
        CREATE INDEX IF NOT EXISTS idx_attendances_session_enrollment ON attendances(session_id, enrollment_id);
    END IF;
END $$;

-- Parsed feedback indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'parsed_student_feedback') THEN
        CREATE INDEX IF NOT EXISTS idx_parsed_feedback_student_name ON parsed_student_feedback(student_name);
        CREATE INDEX IF NOT EXISTS idx_parsed_feedback_instructor ON parsed_student_feedback(instructor);
        CREATE INDEX IF NOT EXISTS idx_parsed_feedback_course_code ON parsed_student_feedback(course_code);
        CREATE INDEX IF NOT EXISTS idx_parsed_feedback_created_at ON parsed_student_feedback(created_at);
        CREATE INDEX IF NOT EXISTS idx_parsed_feedback_unique_id ON parsed_student_feedback(unique_id);
    END IF;
END $$;

-- Speech recordings indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'speech_recordings') THEN
        CREATE INDEX IF NOT EXISTS idx_speech_recordings_student_id ON speech_recordings(student_id);
        CREATE INDEX IF NOT EXISTS idx_speech_recordings_session_id ON speech_recordings(session_id);
        CREATE INDEX IF NOT EXISTS idx_speech_recordings_instructor_id ON speech_recordings(instructor_id);
        CREATE INDEX IF NOT EXISTS idx_speech_recordings_status ON speech_recordings(status);
        CREATE INDEX IF NOT EXISTS idx_speech_recordings_created_at ON speech_recordings(created_at);
    END IF;
END $$;

-- AI generated feedback indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_generated_feedback') THEN
        CREATE INDEX IF NOT EXISTS idx_ai_feedback_recording_id ON ai_generated_feedback(recording_id);
        CREATE INDEX IF NOT EXISTS idx_ai_feedback_generated_at ON ai_generated_feedback(generated_at);
    END IF;
END $$;

-- Custom growth metrics indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_growth_metrics') THEN
        CREATE INDEX IF NOT EXISTS idx_growth_metrics_student_id ON custom_growth_metrics(student_id);
        CREATE INDEX IF NOT EXISTS idx_growth_metrics_program ON custom_growth_metrics(program);
        CREATE INDEX IF NOT EXISTS idx_growth_metrics_recorded_at ON custom_growth_metrics(recorded_at);
        CREATE INDEX IF NOT EXISTS idx_growth_metrics_student_program ON custom_growth_metrics(student_id, program);
    END IF;
END $$;

-- Makeup records indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'makeup_records') THEN
        CREATE INDEX IF NOT EXISTS idx_makeup_student_id ON makeup_records(student_id);
        CREATE INDEX IF NOT EXISTS idx_makeup_missed_session_id ON makeup_records(missed_session_id);
        CREATE INDEX IF NOT EXISTS idx_makeup_makeup_session_id ON makeup_records(makeup_session_id);
        CREATE INDEX IF NOT EXISTS idx_makeup_status ON makeup_records(status);
    END IF;
END $$;

-- Unit mapping indexes (if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'unit_mapping') THEN
        CREATE INDEX IF NOT EXISTS idx_unit_mapping_feedback_id ON unit_mapping(parsed_feedback_id);
        CREATE INDEX IF NOT EXISTS idx_unit_mapping_course_code ON unit_mapping(course_code);
        CREATE INDEX IF NOT EXISTS idx_unit_mapping_unit_lesson ON unit_mapping(unit_number, lesson_number);
    END IF;
END $$;