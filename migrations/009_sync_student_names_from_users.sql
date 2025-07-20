-- Sync student names from users table to students table
-- This migration updates the students table with names from the users table

-- First, update students that have matching IDs with users
UPDATE students s
SET 
  name = u.name,
  email = u.email
FROM users u
WHERE u.id = s.id
AND u.role = 'student';

-- Also update any students where email matches
UPDATE students s
SET 
  name = u.name,
  email = u.email
FROM users u
WHERE u.email = s.email
AND u.role = 'student'
AND s.name IS NULL;

-- Log how many students were updated
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM students
  WHERE name IS NOT NULL;
  
  RAISE NOTICE 'Updated % student records with names from users table', updated_count;
END $$;