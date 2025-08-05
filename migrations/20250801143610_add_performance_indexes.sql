-- Migration: Add performance indexes and optimizations
-- This migration adds missing indexes identified in the database audit

-- Critical missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendances_created_at ON attendances(created_at);
CREATE INDEX IF NOT EXISTS idx_class_sessions_session_date ON class_sessions(session_date);
CREATE INDEX IF NOT EXISTS idx_parsed_feedback_student_id ON parsed_student_feedback(student_id);

-- Partial index for active enrollments (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_enrollments_status_active ON enrollments(status) WHERE status = 'active';

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_attendance_student_session ON attendances(student_id, session_id);
CREATE INDEX IF NOT EXISTS idx_feedback_student_date ON parsed_student_feedback(student_id, parsed_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_course_date ON class_sessions(course_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_enrollment_student_course ON enrollments(student_id, course_id) WHERE status = 'active';

-- Indexes for attendance analytics
CREATE INDEX IF NOT EXISTS idx_attendance_ratings ON attendances(attitude_efforts, asking_questions, application_skills, application_feedback) WHERE status = 'present';
CREATE INDEX IF NOT EXISTS idx_attendance_marked_by ON attendances(marked_by, created_at DESC);

-- Indexes for feedback search and filtering
CREATE INDEX IF NOT EXISTS idx_feedback_class_code ON parsed_student_feedback(class_code);
CREATE INDEX IF NOT EXISTS idx_feedback_instructor ON parsed_student_feedback(instructor) WHERE instructor IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_unit_lesson ON parsed_student_feedback(unit_number, lesson_number);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON parsed_student_feedback(feedback_type);

-- Indexes for user/student lookup
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role) WHERE role != 'student';
CREATE INDEX IF NOT EXISTS idx_students_number ON students(student_number) WHERE student_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade_level);

-- Indexes for course scheduling
CREATE INDEX IF NOT EXISTS idx_courses_day ON courses(day_of_week) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_program ON courses(program_type) WHERE status = 'active';

-- Create materialized view for student metrics (for dashboard performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS student_metrics_mv AS
SELECT 
  s.id,
  s.student_number,
  u.name,
  u.email,
  s.grade_level,
  s.school,
  COUNT(DISTINCT e.course_id) FILTER (WHERE e.status = 'active') as active_courses,
  COUNT(DISTINCT e.course_id) as total_courses,
  COALESCE(AVG(
    CASE WHEN a.status = 'present' THEN
      (COALESCE(a.attitude_efforts, 0) + 
       COALESCE(a.asking_questions, 0) + 
       COALESCE(a.application_skills, 0) + 
       COALESCE(a.application_feedback, 0))::DECIMAL / 4.0
    END
  ), 3.0) as avg_star_rating,
  COUNT(DISTINCT cs.id) FILTER (WHERE a.status = 'present') as attended_sessions,
  COUNT(DISTINCT cs.id) FILTER (WHERE a.status = 'absent' AND cs.session_date < CURRENT_DATE) as missed_sessions,
  COUNT(DISTINCT pf.id) as feedback_count,
  MAX(GREATEST(cs.session_date, pf.parsed_at)) as last_activity,
  NOW() as last_refreshed
FROM students s
INNER JOIN users u ON s.id = u.id
LEFT JOIN enrollments e ON s.id = e.student_id
LEFT JOIN attendances a ON s.id = a.student_id
LEFT JOIN class_sessions cs ON a.session_id = cs.id
LEFT JOIN parsed_student_feedback pf ON s.id = pf.student_id
GROUP BY s.id, s.student_number, u.name, u.email, s.grade_level, s.school;

-- Create indexes on the materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_metrics_mv_id ON student_metrics_mv(id);
CREATE INDEX IF NOT EXISTS idx_student_metrics_mv_grade ON student_metrics_mv(grade_level);
CREATE INDEX IF NOT EXISTS idx_student_metrics_mv_rating ON student_metrics_mv(avg_star_rating);

-- Create materialized view for course analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS course_analytics_mv AS
SELECT 
  c.id as course_id,
  c.course_code,
  c.course_name,
  c.program_type,
  c.level,
  c.day_of_week,
  c.instructor_id,
  COUNT(DISTINCT e.student_id) FILTER (WHERE e.status = 'active') as active_students,
  COUNT(DISTINCT e.student_id) as total_students,
  COUNT(DISTINCT cs.id) as total_sessions,
  COUNT(DISTINCT cs.id) FILTER (WHERE cs.status = 'completed') as completed_sessions,
  COALESCE(AVG(
    CASE WHEN a.status = 'present' THEN 1.0 ELSE 0.0 END
  ) * 100, 0) as attendance_rate,
  NOW() as last_refreshed
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id
LEFT JOIN class_sessions cs ON c.id = cs.course_id
LEFT JOIN attendances a ON cs.id = a.session_id
WHERE c.status = 'active'
GROUP BY c.id, c.course_code, c.course_name, c.program_type, c.level, c.day_of_week, c.instructor_id;

-- Create indexes on course analytics view
CREATE UNIQUE INDEX IF NOT EXISTS idx_course_analytics_mv_id ON course_analytics_mv(course_id);
CREATE INDEX IF NOT EXISTS idx_course_analytics_mv_program ON course_analytics_mv(program_type);
CREATE INDEX IF NOT EXISTS idx_course_analytics_mv_instructor ON course_analytics_mv(instructor_id);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views() RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY student_metrics_mv;
  REFRESH MATERIALIZED VIEW CONCURRENTLY course_analytics_mv;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION refresh_analytics_views() IS 'Refreshes all analytics materialized views. Should be called periodically (e.g., every hour) via cron or scheduled job.';

-- Analyze tables to update statistics after adding indexes
ANALYZE attendances;
ANALYZE class_sessions;
ANALYZE parsed_student_feedback;
ANALYZE enrollments;
ANALYZE students;
ANALYZE users;
ANALYZE courses;