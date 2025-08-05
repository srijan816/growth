-- Standardize day_of_week column across tables
-- Ensure it's consistently VARCHAR for day names like "Monday", "Tuesday", etc.

-- First, check and update the courses table
DO $$
BEGIN
    -- If day_of_week is already VARCHAR, we're good
    -- If it's INTEGER[], we need to convert it
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'courses' 
        AND column_name = 'day_of_week' 
        AND data_type = 'ARRAY'
    ) THEN
        -- Add a temporary column
        ALTER TABLE courses ADD COLUMN day_of_week_temp VARCHAR(20);
        
        -- Convert integer array to day names
        UPDATE courses 
        SET day_of_week_temp = 
            CASE 
                WHEN day_of_week[1] = 0 THEN 'Sunday'
                WHEN day_of_week[1] = 1 THEN 'Monday'
                WHEN day_of_week[1] = 2 THEN 'Tuesday'
                WHEN day_of_week[1] = 3 THEN 'Wednesday'
                WHEN day_of_week[1] = 4 THEN 'Thursday'
                WHEN day_of_week[1] = 5 THEN 'Friday'
                WHEN day_of_week[1] = 6 THEN 'Saturday'
                ELSE NULL
            END
        WHERE array_length(day_of_week, 1) > 0;
        
        -- Drop the old column and rename the new one
        ALTER TABLE courses DROP COLUMN day_of_week;
        ALTER TABLE courses RENAME COLUMN day_of_week_temp TO day_of_week;
    END IF;
END
$$;

-- Ensure end_time is populated for all active courses
UPDATE courses 
SET end_time = 
    CASE 
        WHEN name LIKE '%III%' THEN (start_time + INTERVAL '120 minutes')::time
        ELSE (start_time + INTERVAL '90 minutes')::time
    END
WHERE status = 'active' 
  AND start_time IS NOT NULL 
  AND end_time IS NULL;

-- Add index for better performance on day_of_week queries
CREATE INDEX IF NOT EXISTS idx_courses_day_of_week ON courses(day_of_week);

-- Log the current state
DO $$
DECLARE
    tuesday_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tuesday_count 
    FROM courses 
    WHERE status = 'active' 
    AND day_of_week = 'Tuesday';
    
    RAISE NOTICE 'Found % active courses scheduled for Tuesday', tuesday_count;
END
$$;