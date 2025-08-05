-- Add is_intensive column to courses table
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS is_intensive BOOLEAN DEFAULT false;