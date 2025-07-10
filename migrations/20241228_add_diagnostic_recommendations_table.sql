-- Create table to store diagnostic analysis and recommendations
CREATE TABLE IF NOT EXISTS diagnostic_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_name TEXT NOT NULL,
    student_id UUID,
    analysis_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    session_count INTEGER NOT NULL,
    
    -- Pattern analysis data
    patterns JSONB NOT NULL,
    
    -- Diagnostic data
    diagnosis JSONB NOT NULL,
    
    -- Recommendations array
    recommendations JSONB NOT NULL,
    
    -- Metadata
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    -- Version tracking for regeneration
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true
);

-- Create indexes for performance
CREATE INDEX idx_diagnostic_recommendations_student_name ON diagnostic_recommendations(student_name);
CREATE INDEX idx_diagnostic_recommendations_student_id ON diagnostic_recommendations(student_id);
CREATE INDEX idx_diagnostic_recommendations_created_at ON diagnostic_recommendations(created_at DESC);
CREATE INDEX idx_diagnostic_recommendations_is_active ON diagnostic_recommendations(is_active);

-- Add composite index for finding latest active recommendation
CREATE INDEX idx_diagnostic_recommendations_student_active 
ON diagnostic_recommendations(student_name, is_active, created_at DESC);

-- Add comment
COMMENT ON TABLE diagnostic_recommendations IS 'Stores AI-generated diagnostic analysis and personalized recommendations for students';