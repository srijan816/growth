-- Add schedule fields to courses table
ALTER TABLE courses
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS day_of_week INTEGER[], -- Array of integers 0-6 (Sunday-Saturday)
ADD COLUMN IF NOT EXISTS schedule_updated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS schedule_updated_by VARCHAR(255);

-- Add index for faster schedule queries
CREATE INDEX IF NOT EXISTS idx_courses_schedule ON courses (is_active, start_time, end_time);

-- Add comments for documentation
COMMENT ON COLUMN courses.start_time IS 'Daily start time for this course';
COMMENT ON COLUMN courses.end_time IS 'Daily end time for this course';
COMMENT ON COLUMN courses.is_active IS 'Whether this course is currently active and should appear in schedules';
COMMENT ON COLUMN courses.day_of_week IS 'Array of day numbers (0=Sunday, 1=Monday, etc.) when course is held';
COMMENT ON COLUMN courses.schedule_updated_at IS 'When the schedule was last updated';
COMMENT ON COLUMN courses.schedule_updated_by IS 'Name of instructor who last updated the schedule';