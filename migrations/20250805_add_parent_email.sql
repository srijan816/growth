-- Add parent email field to students table for parent portal access
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS parent_email VARCHAR(255);

-- Create index for faster parent portal lookups
CREATE INDEX IF NOT EXISTS idx_students_parent_email ON students(parent_email);

-- Add sample parent emails for testing
UPDATE students 
SET parent_email = 'parent@example.com' 
WHERE student_number IN ('S001', 'S002') 
AND parent_email IS NULL;