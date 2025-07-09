-- Migration: Add essential tables for dashboard functionality
-- This adds only the necessary tables without complex foreign key dependencies

-- Add essential columns to existing students table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='name') THEN
        ALTER TABLE students ADD COLUMN name VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='email') THEN
        ALTER TABLE students ADD COLUMN email VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='school') THEN
        ALTER TABLE students ADD COLUMN school VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='grade_level') THEN
        ALTER TABLE students ADD COLUMN grade_level VARCHAR(20);
    END IF;
END $$;

-- Basic instructors table without complex constraints
CREATE TABLE IF NOT EXISTS instructors (
    instructor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    specializations TEXT[] DEFAULT ARRAY[]::TEXT[],
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Simple classes table that can work with existing data
CREATE TABLE IF NOT EXISTS dashboard_classes (
    class_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_code VARCHAR(50) UNIQUE NOT NULL,
    class_name TEXT NOT NULL,
    program_type VARCHAR(20) NOT NULL,
    level VARCHAR(20) NOT NULL DEFAULT 'PRIMARY',
    instructor_name VARCHAR(255),
    current_unit INTEGER DEFAULT 1,
    current_lesson INTEGER DEFAULT 1,
    total_units INTEGER DEFAULT 8,
    lessons_per_unit INTEGER DEFAULT 4,
    schedule_day_of_week INTEGER,
    schedule_start_time TIME,
    schedule_end_time TIME,
    duration_minutes INTEGER DEFAULT 90,
    location VARCHAR(255),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Simple enrollments without foreign keys initially
CREATE TABLE IF NOT EXISTS dashboard_enrollments (
    enrollment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    class_id UUID NOT NULL,
    student_name VARCHAR(255),
    class_code VARCHAR(50),
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active',
    attendance_rate DECIMAL(5,2) DEFAULT 0.0,
    participation_score DECIMAL(5,2) DEFAULT 0.0,
    progress_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Student achievements 
CREATE TABLE IF NOT EXISTS student_achievements (
    achievement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    student_name VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    achievement_type VARCHAR(50) DEFAULT 'academic',
    date_earned DATE NOT NULL DEFAULT CURRENT_DATE,
    evidence_type VARCHAR(20),
    evidence_content TEXT,
    evidence_url TEXT,
    related_class_code VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Activity log for recent activity
CREATE TABLE IF NOT EXISTS activity_log (
    activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_type VARCHAR(50) NOT NULL,
    student_id UUID,
    student_name VARCHAR(255),
    class_code VARCHAR(50),
    class_name VARCHAR(255),
    instructor_name VARCHAR(255),
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Program metrics summary for dashboard
CREATE TABLE IF NOT EXISTS program_metrics_summary (
    metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_type VARCHAR(20) NOT NULL,
    total_students INTEGER DEFAULT 0,
    total_classes INTEGER DEFAULT 0,
    average_attendance DECIMAL(5,2) DEFAULT 0.0,
    average_growth DECIMAL(5,2) DEFAULT 0.0,
    recent_feedback_count INTEGER DEFAULT 0,
    top_performers INTEGER DEFAULT 0,
    needs_attention INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0.0,
    trend_direction VARCHAR(10) DEFAULT 'stable',
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(program_type)
);

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_dashboard_classes_program_type ON dashboard_classes(program_type);
CREATE INDEX IF NOT EXISTS idx_dashboard_classes_schedule_day ON dashboard_classes(schedule_day_of_week);
CREATE INDEX IF NOT EXISTS idx_dashboard_enrollments_student_id ON dashboard_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_dashboard_enrollments_class_id ON dashboard_enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_achievements_student_id ON student_achievements(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);

-- Insert sample instructor data
INSERT INTO instructors (name, email, specializations, permissions) 
VALUES 
    ('Test Instructor', 'test@instructor.com', ARRAY['PSD', 'WRITING', 'RAPS', 'CRITICAL'], 
     '{"canViewAllStudents": true, "canEditStudentData": true, "canManageClasses": true, "canViewAnalytics": true, "canExportData": true}'),
    ('Srijan', 'srijan@example.com', ARRAY['PSD', 'WRITING'], 
     '{"canViewAllStudents": true, "canEditStudentData": true, "canManageClasses": true, "canViewAnalytics": true, "canExportData": true}')
ON CONFLICT (email) DO NOTHING;

-- Insert sample program metrics
INSERT INTO program_metrics_summary (program_type, total_students, total_classes, average_attendance, average_growth, completion_rate, trend_direction)
VALUES 
    ('PSD', 156, 12, 87.5, 23.8, 78.2, 'up'),
    ('WRITING', 94, 8, 91.2, 28.4, 84.6, 'up'),
    ('RAPS', 72, 6, 85.8, 21.3, 73.5, 'stable'),
    ('CRITICAL', 58, 5, 88.9, 25.7, 81.3, 'up')
ON CONFLICT (program_type) DO UPDATE SET
    total_students = EXCLUDED.total_students,
    total_classes = EXCLUDED.total_classes,
    average_attendance = EXCLUDED.average_attendance,
    average_growth = EXCLUDED.average_growth,
    completion_rate = EXCLUDED.completion_rate,
    trend_direction = EXCLUDED.trend_direction,
    last_calculated = CURRENT_TIMESTAMP;

-- Insert some sample activity log entries
INSERT INTO activity_log (activity_type, student_name, class_name, description) VALUES
    ('feedback', 'Alex Chen', 'PSD Advanced', 'New feedback uploaded for debate performance'),
    ('achievement', 'Sarah Kim', NULL, 'Earned "Excellent Presenter" achievement'),
    ('enrollment', 'Mike Rodriguez', 'Critical Thinking Primary', 'New student enrollment');