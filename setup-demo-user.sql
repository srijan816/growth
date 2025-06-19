-- Setup script for demo user with correct password hash
-- Password: changeme123
-- This hash was generated with bcrypt using cost factor 12

-- First, delete any existing sample data
DELETE FROM student_metrics_tracker;
DELETE FROM attendances;
DELETE FROM class_sessions;
DELETE FROM enrollments;
DELETE FROM courses;
DELETE FROM students;
DELETE FROM users WHERE email IN ('instructor@example.com', 'student1@example.com', 'student2@example.com');

-- Insert demo instructor with proper password hash for "changeme123"
INSERT INTO users (id, email, name, role, password_hash) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'instructor@example.com', 'Test Instructor', 'instructor', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaQJaO7/VoFd2h/Z1vGh.8l4O');

-- Insert sample students
INSERT INTO users (id, email, name, role, password_hash) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'student1@example.com', 'Jean Ho', 'student', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaQJaO7/VoFd2h/Z1vGh.8l4O'),
('550e8400-e29b-41d4-a716-446655440002', 'student2@example.com', 'Rohan Maliah', 'student', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaQJaO7/VoFd2h/Z1vGh.8l4O');

-- Create student records
INSERT INTO students (id, student_number) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'STU001'),
('550e8400-e29b-41d4-a716-446655440002', 'STU002');

-- Create sample course
INSERT INTO courses (id, code, name, program_type, level, grade_range, day_of_week, start_time, instructor_id) VALUES
('550e8400-e29b-41d4-a716-446655440100', '02IPDEC2401', 'Thursday G5-6 PSD I', 'PSD I', 'Primary', 'G5-6', 'Thursday', '18:00:00', '550e8400-e29b-41d4-a716-446655440000');

-- Create enrollments
INSERT INTO enrollments (student_id, course_id, enrollment_date, status) VALUES
('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440100', '2024-01-15', 'active'),
('550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440100', '2024-01-15', 'active');