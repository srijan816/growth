-- Add grade history tracking
CREATE TABLE IF NOT EXISTS grade_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  previous_grade VARCHAR(50),
  new_grade VARCHAR(50) NOT NULL,
  transition_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_student_grade_transition UNIQUE (student_id, transition_date)
);

-- Add indexes for performance
CREATE INDEX idx_grade_history_student_id ON grade_history(student_id);
CREATE INDEX idx_grade_history_transition_date ON grade_history(transition_date);

-- Add a field to track original enrollment grade
ALTER TABLE students ADD COLUMN IF NOT EXISTS original_grade VARCHAR(50);

-- Backfill original_grade with current grade_level
UPDATE students SET original_grade = grade_level WHERE original_grade IS NULL;