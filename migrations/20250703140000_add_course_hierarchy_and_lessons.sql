-- Course hierarchy and division structure
CREATE TABLE IF NOT EXISTS course_divisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) NOT NULL UNIQUE,
  order_index INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grade_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID NOT NULL REFERENCES course_divisions(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  min_grade INT NOT NULL,
  max_grade INT NOT NULL,
  order_index INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(division_id, name)
);

CREATE TABLE IF NOT EXISTS skill_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_type VARCHAR(20) NOT NULL,
  level_code VARCHAR(10) NOT NULL,
  display_name VARCHAR(50) NOT NULL,
  description TEXT,
  order_index INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(program_type, level_code)
);

CREATE TABLE IF NOT EXISTS course_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  grade_group_id UUID NOT NULL REFERENCES grade_groups(id) ON DELETE CASCADE,
  skill_level_id UUID NOT NULL REFERENCES skill_levels(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course_id, grade_group_id, skill_level_id)
);

-- Lesson management tables
CREATE TABLE IF NOT EXISTS lesson_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_config_id UUID NOT NULL REFERENCES course_configurations(id) ON DELETE CASCADE,
  lesson_number INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  objectives TEXT,
  materials TEXT,
  duration_minutes INT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(course_config_id, lesson_number)
);

CREATE TABLE IF NOT EXISTS lesson_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  lesson_plan_id UUID NOT NULL REFERENCES lesson_plans(id) ON DELETE CASCADE,
  session_id UUID REFERENCES class_sessions(id) ON DELETE SET NULL,
  speech_recording_url TEXT,
  worksheet_url TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  feedback_document_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Onboarding tracking tables
CREATE TABLE IF NOT EXISTS onboarding_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
  completed_steps JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS onboarding_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES onboarding_sessions(id) ON DELETE CASCADE,
  step VARCHAR(50) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  validation_status VARCHAR(50) NOT NULL DEFAULT 'pending',
  validation_errors JSONB,
  rows_processed INT DEFAULT 0,
  rows_succeeded INT DEFAULT 0,
  rows_failed INT DEFAULT 0,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_grade_groups_division_id ON grade_groups(division_id);
CREATE INDEX idx_course_configurations_course_id ON course_configurations(course_id);
CREATE INDEX idx_course_configurations_grade_group_id ON course_configurations(grade_group_id);
CREATE INDEX idx_course_configurations_skill_level_id ON course_configurations(skill_level_id);
CREATE INDEX idx_lesson_plans_course_config_id ON lesson_plans(course_config_id);
CREATE INDEX idx_lesson_submissions_student_id ON lesson_submissions(student_id);
CREATE INDEX idx_lesson_submissions_lesson_plan_id ON lesson_submissions(lesson_plan_id);
CREATE INDEX idx_onboarding_uploads_session_id ON onboarding_uploads(session_id);

-- Insert default divisions and grade groups
INSERT INTO course_divisions (name, order_index) VALUES 
  ('Primary', 1),
  ('Secondary', 2)
ON CONFLICT (name) DO NOTHING;

-- Insert grade groups for Primary division
INSERT INTO grade_groups (division_id, name, min_grade, max_grade, order_index)
SELECT 
  cd.id,
  gg.name,
  gg.min_grade,
  gg.max_grade,
  gg.order_index
FROM course_divisions cd
CROSS JOIN (VALUES 
  ('G3-4', 3, 4, 1),
  ('G5-6', 5, 6, 2)
) AS gg(name, min_grade, max_grade, order_index)
WHERE cd.name = 'Primary'
ON CONFLICT (division_id, name) DO NOTHING;

-- Insert grade groups for Secondary division
INSERT INTO grade_groups (division_id, name, min_grade, max_grade, order_index)
SELECT 
  cd.id,
  gg.name,
  gg.min_grade,
  gg.max_grade,
  gg.order_index
FROM course_divisions cd
CROSS JOIN (VALUES 
  ('G7-9', 7, 9, 3),
  ('G7-12', 7, 12, 4)
) AS gg(name, min_grade, max_grade, order_index)
WHERE cd.name = 'Secondary'
ON CONFLICT (division_id, name) DO NOTHING;

-- Insert skill levels for PSD program
INSERT INTO skill_levels (program_type, level_code, display_name, description, order_index) VALUES
  ('PSD', 'I', 'PSD I', 'Beginners - Introduction to Public Speaking & Debate', 1),
  ('PSD', 'II', 'PSD II', 'Intermediate - Building Confidence and Skills', 2),
  ('PSD', 'III', 'PSD III', 'Advanced - Competitive Debate Techniques', 3),
  ('PSD', 'JOT', 'Junior Official Team', 'Elite - Junior Competition Team (Future: Official Team B)', 4),
  ('PSD', 'OT', 'Official Team', 'Elite - Senior Competition Team (Future: Official Team A)', 5),
  ('Writing', 'I', 'Writing I', 'Introduction to Academic Writing', 1),
  ('Writing', 'II', 'Writing II', 'Advanced Essay and Creative Writing', 2),
  ('RAPS', 'I', 'RAPS I', 'Introduction to Research & Problem Solving', 1),
  ('RAPS', 'II', 'RAPS II', 'Advanced Analytical Thinking', 2),
  ('Critical', 'I', 'Critical Thinking I', 'Foundations of Logical Reasoning', 1),
  ('Critical', 'II', 'Critical Thinking II', 'Advanced Argumentation', 2)
ON CONFLICT (program_type, level_code) DO NOTHING;