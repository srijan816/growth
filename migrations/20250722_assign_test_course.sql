-- Assign one Tuesday course to test@instructor.com for testing purposes
-- This allows the test instructor to see classes on the dashboard

DO $$
DECLARE
    test_instructor_id UUID;
    tuesday_course_id UUID;
BEGIN
    -- Get test instructor ID
    SELECT id INTO test_instructor_id 
    FROM users 
    WHERE email = 'test@instructor.com' 
    LIMIT 1;
    
    -- Get the Tuesday course 02IPDEB2401
    SELECT id INTO tuesday_course_id
    FROM courses
    WHERE code = '02IPDEB2401'
    LIMIT 1;
    
    IF test_instructor_id IS NOT NULL AND tuesday_course_id IS NOT NULL THEN
        -- Update the course to be assigned to test instructor
        UPDATE courses 
        SET instructor_id = test_instructor_id
        WHERE id = tuesday_course_id;
        
        RAISE NOTICE 'Assigned course 02IPDEB2401 to test@instructor.com';
    ELSE
        RAISE NOTICE 'Could not find test instructor or course';
    END IF;
END
$$;

-- Also ensure the course has proper end time
UPDATE courses 
SET end_time = (start_time + INTERVAL '90 minutes')::time
WHERE code = '02IPDEB2401' 
  AND end_time IS NULL;