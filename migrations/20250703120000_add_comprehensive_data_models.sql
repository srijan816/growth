-- Migration: Add comprehensive data models for classes, students, instructors, and analytics
-- This extends the existing database with new tables for better data organization

-- Instructors table
CREATE TABLE IF NOT EXISTS instructors (
    instructor_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    specializations TEXT[], -- Array of program types: PSD, WRITING, RAPS, CRITICAL
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Classes table (comprehensive class information)
CREATE TABLE IF NOT EXISTS classes (
    class_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_code VARCHAR(50) UNIQUE NOT NULL, -- e.g., "01IPDED2405"
    class_name TEXT NOT NULL,
    program_type VARCHAR(20) NOT NULL CHECK (program_type IN ('PSD', 'WRITING', 'RAPS', 'CRITICAL')),
    level VARCHAR(20) NOT NULL CHECK (level IN ('PRIMARY', 'SECONDARY')),
    class_type VARCHAR(20) NOT NULL DEFAULT 'REGULAR' CHECK (class_type IN ('REGULAR', 'INTENSIVE', 'EXTERNAL')),
    instructor_id UUID NOT NULL REFERENCES instructors(instructor_id),
    current_unit INTEGER DEFAULT 1,
    current_lesson INTEGER DEFAULT 1, -- For tracking 1.1, 1.2, etc.
    total_units INTEGER DEFAULT 8,
    lessons_per_unit INTEGER DEFAULT 4 CHECK (lessons_per_unit IN (4, 5)),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    schedule_day_of_week INTEGER CHECK (schedule_day_of_week BETWEEN 0 AND 6), -- 0 = Sunday
    schedule_start_time TIME,
    schedule_end_time TIME,
    duration_minutes INTEGER DEFAULT 90,
    location VARCHAR(255),
    timezone VARCHAR(50) DEFAULT 'UTC',
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced students table (extends existing if needed)
-- Note: Check if students table already exists and only add missing columns
DO $$ 
BEGIN
    -- Add new columns to existing students table if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='school') THEN
        ALTER TABLE students ADD COLUMN school VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='grade_level') THEN
        ALTER TABLE students ADD COLUMN grade_level VARCHAR(20);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='students' AND column_name='student_id_external') THEN
        ALTER TABLE students ADD COLUMN student_id_external VARCHAR(100) UNIQUE;
    END IF;
END $$;

-- Enrollments table (many-to-many between students and classes)
CREATE TABLE IF NOT EXISTS enrollments (
    enrollment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id),
    class_id UUID NOT NULL REFERENCES classes(class_id),
    enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'withdrawn')),
    attendance_rate DECIMAL(5,2) DEFAULT 0.0,
    participation_score DECIMAL(5,2) DEFAULT 0.0,
    progress_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, class_id)
);

-- Class metrics table (for dashboard analytics)
CREATE TABLE IF NOT EXISTS class_metrics (
    metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID NOT NULL REFERENCES classes(class_id),
    total_students INTEGER NOT NULL DEFAULT 0,
    active_students INTEGER NOT NULL DEFAULT 0,
    average_attendance DECIMAL(5,2) DEFAULT 0.0,
    average_participation DECIMAL(5,2) DEFAULT 0.0,
    completion_rate DECIMAL(5,2) DEFAULT 0.0,
    growth_trend VARCHAR(20) DEFAULT 'stable' CHECK (growth_trend IN ('improving', 'stable', 'declining')),
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(class_id)
);

-- Student achievements table
CREATE TABLE IF NOT EXISTS student_achievements (
    achievement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    achievement_type VARCHAR(50) DEFAULT 'academic' CHECK (achievement_type IN ('academic', 'participation', 'improvement', 'leadership')),
    date_earned DATE NOT NULL DEFAULT CURRENT_DATE,
    evidence_type VARCHAR(20) CHECK (evidence_type IN ('text', 'image', 'link', 'document')),
    evidence_content TEXT,
    evidence_url TEXT,
    related_class_id UUID REFERENCES classes(class_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Uncategorized student data table
CREATE TABLE IF NOT EXISTS student_uncategorized_data (
    data_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    data_type VARCHAR(20) NOT NULL CHECK (data_type IN ('image', 'text', 'document', 'link', 'video')),
    content TEXT NOT NULL,
    url TEXT,
    tags TEXT[],
    upload_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced feedback table (extends existing parsed_student_feedback if needed)
-- Note: This assumes parsed_student_feedback exists - we'll add columns if missing
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='parsed_student_feedback') THEN
        -- Add new columns to existing feedback table if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parsed_student_feedback' AND column_name='feedback_type') THEN
            ALTER TABLE parsed_student_feedback ADD COLUMN feedback_type VARCHAR(20) DEFAULT 'written' CHECK (feedback_type IN ('written', 'verbal', 'assessment'));
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parsed_student_feedback' AND column_name='skill_assessments') THEN
            ALTER TABLE parsed_student_feedback ADD COLUMN skill_assessments JSONB DEFAULT '[]';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parsed_student_feedback' AND column_name='action_items') THEN
            ALTER TABLE parsed_student_feedback ADD COLUMN action_items TEXT[];
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parsed_student_feedback' AND column_name='next_steps') THEN
            ALTER TABLE parsed_student_feedback ADD COLUMN next_steps TEXT[];
        END IF;
    END IF;
END $$;

-- Activity log table (for recent activity tracking)
CREATE TABLE IF NOT EXISTS activity_log (
    activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('feedback', 'achievement', 'enrollment', 'class_completion')),
    student_id UUID REFERENCES students(id),
    class_id UUID REFERENCES classes(class_id),
    instructor_id UUID REFERENCES instructors(instructor_id),
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Program metrics summary table (for dashboard performance)
CREATE TABLE IF NOT EXISTS program_metrics_summary (
    metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program_type VARCHAR(20) NOT NULL CHECK (program_type IN ('PSD', 'WRITING', 'RAPS', 'CRITICAL')),
    total_students INTEGER DEFAULT 0,
    total_classes INTEGER DEFAULT 0,
    average_attendance DECIMAL(5,2) DEFAULT 0.0,
    average_growth DECIMAL(5,2) DEFAULT 0.0,
    recent_feedback_count INTEGER DEFAULT 0,
    top_performers INTEGER DEFAULT 0,
    needs_attention INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0.0,
    trend_direction VARCHAR(10) DEFAULT 'stable' CHECK (trend_direction IN ('up', 'down', 'stable')),
    last_calculated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(program_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_classes_program_type ON classes(program_type);
CREATE INDEX IF NOT EXISTS idx_classes_instructor_id ON classes(instructor_id);
CREATE INDEX IF NOT EXISTS idx_classes_schedule_day ON classes(schedule_day_of_week);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_status ON enrollments(status);
CREATE INDEX IF NOT EXISTS idx_achievements_student_id ON student_achievements(student_id);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON student_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_uncategorized_student_id ON student_uncategorized_data(student_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at columns
DROP TRIGGER IF EXISTS update_instructors_updated_at ON instructors;
CREATE TRIGGER update_instructors_updated_at 
    BEFORE UPDATE ON instructors 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_classes_updated_at ON classes;
CREATE TRIGGER update_classes_updated_at 
    BEFORE UPDATE ON classes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_enrollments_updated_at ON enrollments;
CREATE TRIGGER update_enrollments_updated_at 
    BEFORE UPDATE ON enrollments 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample instructor data (if not exists)
INSERT INTO instructors (name, email, specializations, permissions) 
VALUES 
    ('Test Instructor', 'test@example.com', ARRAY['PSD', 'WRITING', 'RAPS', 'CRITICAL'], 
     '{"canViewAllStudents": true, "canEditStudentData": true, "canManageClasses": true, "canViewAnalytics": true, "canExportData": true}')
ON CONFLICT (email) DO NOTHING;

-- Insert sample program metrics (initial data)
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