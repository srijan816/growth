-- Performance optimization indexes for Growth Compass

-- Attendance queries optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendances_student_created 
ON attendances(student_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendances_session_student 
ON attendances(session_id, student_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_attendances_status 
ON attendances(status) WHERE status != 'present';

-- Class sessions optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_sessions_course_date 
ON class_sessions(course_id, session_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_class_sessions_date 
ON class_sessions(session_date);

-- Students optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_grade_level 
ON students(grade_level);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_students_section 
ON students(section);

-- Parsed feedback optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parsed_feedback_student_created 
ON parsed_student_feedback(student_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_parsed_feedback_course 
ON parsed_student_feedback(course_name);

-- Enrollments optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollments_student_active 
ON enrollments(student_id) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_enrollments_course_active 
ON enrollments(course_id) WHERE status = 'active';

-- Courses optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_status_day 
ON courses(status, day_of_week) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_courses_instructor 
ON courses(instructor_id);

-- Users optimization
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_role 
ON users(role);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower 
ON users(LOWER(email));

-- AI recommendations optimization (if exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ai_recommendations') THEN
    CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_recommendations_student_created 
    ON ai_recommendations(student_name, created_at DESC);
  END IF;
END $$;

-- Partial indexes for common queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_courses 
ON courses(id) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recent_attendance 
ON attendances(created_at DESC) WHERE created_at > NOW() - INTERVAL '30 days';

-- Analyze tables to update statistics
ANALYZE attendances;
ANALYZE class_sessions;
ANALYZE students;
ANALYZE enrollments;
ANALYZE courses;
ANALYZE users;
ANALYZE parsed_student_feedback;