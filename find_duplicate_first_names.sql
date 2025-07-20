-- Query to find students with duplicate first names
-- This helps identify potential name conflicts when matching feedback to students

WITH student_names AS (
    -- Get all students with their full names and extract first names
    SELECT 
        u.id,
        u.name as full_name,
        -- Extract first name (everything before the first space)
        SPLIT_PART(u.name, ' ', 1) as first_name
    FROM users u
    INNER JOIN students s ON u.id = s.id
    WHERE u.role = 'student'
),
duplicate_first_names AS (
    -- Find first names that appear more than once
    SELECT 
        first_name,
        COUNT(*) as count
    FROM student_names
    GROUP BY first_name
    HAVING COUNT(*) > 1
)
-- Show all students who share the same first name
SELECT 
    sn.first_name,
    sn.full_name,
    sn.id as student_id,
    dfn.count as students_with_same_first_name
FROM student_names sn
INNER JOIN duplicate_first_names dfn ON sn.first_name = dfn.first_name
ORDER BY sn.first_name, sn.full_name;

-- Alternative query that shows a summary grouped by first name
/*
SELECT 
    SPLIT_PART(u.name, ' ', 1) as first_name,
    STRING_AGG(u.name, ', ' ORDER BY u.name) as full_names,
    COUNT(*) as count
FROM users u
INNER JOIN students s ON u.id = s.id
WHERE u.role = 'student'
GROUP BY SPLIT_PART(u.name, ' ', 1)
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, first_name;
*/