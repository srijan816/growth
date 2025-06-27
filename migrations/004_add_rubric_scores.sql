-- Add rubric scores column to store extracted scoring data
ALTER TABLE parsed_student_feedback 
ADD COLUMN rubric_scores JSONB DEFAULT NULL;

-- Add index for rubric scores queries
CREATE INDEX IF NOT EXISTS idx_parsed_feedback_rubric_scores 
ON parsed_student_feedback USING GIN (rubric_scores);

-- Add comment explaining the column
COMMENT ON COLUMN parsed_student_feedback.rubric_scores IS 
'JSON object storing rubric scores extracted from bold formatting in Word documents. Keys are rubric_1, rubric_2, etc. with values 1-5.';