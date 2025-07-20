-- Update feedback storage to properly link to student IDs

-- Create a function to match student names to student IDs
CREATE OR REPLACE FUNCTION link_feedback_to_students() RETURNS void AS $$
BEGIN
  -- Update existing feedback records by matching student names
  UPDATE parsed_student_feedback pf
  SET student_id = s.id
  FROM students s
  WHERE LOWER(TRIM(pf.student_name)) = LOWER(TRIM(s.name))
    AND pf.student_id IS NULL;
    
  -- Log unmatched feedback
  INSERT INTO activity_log (action_type, entity_type, details, created_at)
  SELECT 
    'feedback_linking_failed',
    'feedback',
    jsonb_build_object(
      'student_name', student_name,
      'class_code', class_code,
      'reason', 'No matching student found'
    ),
    NOW()
  FROM parsed_student_feedback
  WHERE student_id IS NULL
  LIMIT 100;
END;
$$ LANGUAGE plpgsql;

-- Create a view to show feedback with student details
CREATE OR REPLACE VIEW feedback_with_students AS
SELECT 
  pf.*,
  s.student_id_external,
  s.grade,
  s.school,
  c.course_name,
  c.course_level,
  c.course_type
FROM parsed_student_feedback pf
LEFT JOIN students s ON pf.student_id = s.id
LEFT JOIN courses c ON pf.class_code = c.course_code;