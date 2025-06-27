-- Sample data for Growth Compass
-- Create instructors and sample data

-- Insert instructors
INSERT INTO users (id, email, name, role, password_hash) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'tamkeen@instructor.com', 'Tamkeen', 'instructor', '$2a$10$rOzKqjQvN1Qf6x8y.3zWy.Qd8K7lH9B2dE5vC4nM8tP1xG3j6vQ9r'),
('550e8400-e29b-41d4-a716-446655440001', 'saurav@instructor.com', 'Saurav', 'instructor', '$2a$10$rOzKqjQvN1Qf6x8y.3zWy.Qd8K7lH9B2dE5vC4nM8tP1xG3j6vQ9r'),
('550e8400-e29b-41d4-a716-446655440002', 'srijan@instructor.com', 'Srijan', 'instructor', '$2a$10$rOzKqjQvN1Qf6x8y.3zWy.Qd8K7lH9B2dE5vC4nM8tP1xG3j6vQ9r'),
('550e8400-e29b-41d4-a716-446655440003', 'jami@instructor.com', 'Jami', 'instructor', '$2a$10$rOzKqjQvN1Qf6x8y.3zWy.Qd8K7lH9B2dE5vC4nM8tP1xG3j6vQ9r'),
('550e8400-e29b-41d4-a716-446655440004', 'mai@instructor.com', 'Mai', 'instructor', '$2a$10$rOzKqjQvN1Qf6x8y.3zWy.Qd8K7lH9B2dE5vC4nM8tP1xG3j6vQ9r'),
('550e8400-e29b-41d4-a716-446655440005', 'naveen@instructor.com', 'Naveen', 'instructor', '$2a$10$rOzKqjQvN1Qf6x8y.3zWy.Qd8K7lH9B2dE5vC4nM8tP1xG3j6vQ9r'),
('550e8400-e29b-41d4-a716-446655440006', 'test@instructor.com', 'Test Instructor', 'instructor', '$2a$10$rOzKqjQvN1Qf6x8y.3zWy.Qd8K7lH9B2dE5vC4nM8tP1xG3j6vQ9r');

-- Note: password hash above is for "password" - change in production!

-- Insert sample courses
INSERT INTO courses (id, code, name, program_type, level, grade_range, day_of_week, start_time, instructor_id) VALUES
('550e8400-e29b-41d4-a716-446655440100', '02IPDEC2401', 'Thursday G5-6 PSD I', 'PSD I', 'Primary', 'G5-6', 'Thursday', '18:00:00', '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440101', '01IPDDD2401', 'Tuesday PSD II', 'PSD II', 'Secondary', 'G7-9', 'Tuesday', '18:00:00', '550e8400-e29b-41d4-a716-446655440001'),
('550e8400-e29b-41d4-a716-446655440102', '02IPDEB2403', 'Thursday G3-4 PSD I', 'PSD I', 'Primary', 'G3-4', 'Thursday', '16:30:00', '550e8400-e29b-41d4-a716-446655440002');

-- Insert sample growth metrics
INSERT INTO growth_metrics (name, description, metric_type, applicable_programs) VALUES
('Hook Development', 'Ability to create engaging speech openings', 'speaking', '["PSD I", "PSD II"]'),
('Speech Time Management', 'Managing speech time effectively', 'delivery', '["PSD I", "PSD II"]'),
('Vocal Projection', 'Speaking with appropriate volume and clarity', 'speaking', '["PSD I", "PSD II"]'),
('Clarity & Fluency', 'Speaking clearly and smoothly', 'speaking', '["PSD I", "PSD II"]'),
('Argument Structure & Depth', 'Building logical and detailed arguments', 'content', '["PSD I", "PSD II"]'),
('Rebuttal Skills', 'Responding effectively to opposing arguments', 'debate', '["PSD I", "PSD II"]'),
('Examples & Illustrations', 'Using relevant examples to support points', 'content', '["PSD I", "PSD II"]'),
('Engagement (POIs)', 'Asking and responding to Points of Information', 'engagement', '["PSD I", "PSD II"]'),
('Speech Structure & Organization', 'Organizing speech content logically', 'structure', '["PSD I", "PSD II"]');

-- Create sample feedback parsing status entry
INSERT INTO feedback_parsing_status (total_files_processed, total_feedback_records, total_students, is_complete) VALUES
(0, 0, 0, false);