-- Phase 3: Add speech recording and AI feedback generation tables
-- Migration: 20250626232032_add_speech_recording_tables.sql

-- Create enums for speech recordings
CREATE TYPE transcription_provider AS ENUM ('assemblyai', 'whisper_local', 'whisper_api');
CREATE TYPE recording_status AS ENUM ('uploading', 'uploaded', 'transcribing', 'transcribed', 'feedback_generating', 'feedback_generated', 'completed', 'failed');
CREATE TYPE feedback_generation_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'reviewed');

-- Speech recordings table
CREATE TABLE IF NOT EXISTS speech_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES class_sessions(id) ON DELETE SET NULL,
    instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Audio file metadata
    audio_file_path TEXT NOT NULL,
    original_filename TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    duration_seconds DECIMAL(8,2),
    mime_type TEXT DEFAULT 'audio/wav',
    
    -- Speech context
    speech_topic TEXT,
    motion TEXT,
    speech_type TEXT DEFAULT 'debate', -- debate, presentation, discussion
    program_type TEXT, -- PSD, Writing, RAPS, Critical Thinking
    
    -- Processing status
    status recording_status DEFAULT 'uploading',
    transcription_provider transcription_provider DEFAULT 'assemblyai',
    
    -- Metadata
    recording_metadata JSONB DEFAULT '{}'::jsonb, -- device info, quality settings, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Speech transcriptions table
CREATE TABLE IF NOT EXISTS speech_transcriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES speech_recordings(id) ON DELETE CASCADE,
    
    -- Transcription content
    transcription_text TEXT NOT NULL,
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Provider-specific data
    provider transcription_provider NOT NULL,
    provider_job_id TEXT, -- External job ID for tracking
    provider_response JSONB, -- Full API response for debugging
    
    -- Processing time tracking
    transcription_started_at TIMESTAMP WITH TIME ZONE,
    transcription_completed_at TIMESTAMP WITH TIME ZONE,
    processing_duration_seconds INTEGER,
    
    -- Metadata
    word_count INTEGER,
    speaking_rate DECIMAL(5,2), -- words per minute
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- AI generated feedback table
CREATE TABLE IF NOT EXISTS ai_generated_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES speech_recordings(id) ON DELETE CASCADE,
    transcription_id UUID NOT NULL REFERENCES speech_transcriptions(id) ON DELETE CASCADE,
    
    -- Generated content
    feedback_type TEXT NOT NULL CHECK (feedback_type IN ('primary', 'secondary')),
    transcription_text TEXT NOT NULL, -- Copy of transcription for context
    
    -- Primary feedback structure
    strengths TEXT[], -- Array of strength points
    improvement_areas TEXT[], -- Array of improvement suggestions
    
    -- Secondary feedback structure  
    rubric_scores JSONB, -- Same structure as existing rubric_scores
    teacher_comments TEXT,
    
    -- Document generation
    generated_document_path TEXT, -- Path to generated Word document
    document_generated_at TIMESTAMP WITH TIME ZONE,
    
    -- AI metadata
    model_version TEXT NOT NULL, -- e.g., "gemini-2.5-flash"
    generation_prompt TEXT, -- Prompt used for generation
    generation_metadata JSONB DEFAULT '{}'::jsonb, -- Model parameters, tokens, etc.
    confidence_metrics JSONB DEFAULT '{}'::jsonb, -- Quality scores from AI
    
    -- Status tracking
    status feedback_generation_status DEFAULT 'pending',
    generation_started_at TIMESTAMP WITH TIME ZONE,
    generation_completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Human review
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    instructor_modifications JSONB DEFAULT '{}'::jsonb, -- Track what instructor changed
    
    -- Integration with existing system
    unique_id TEXT UNIQUE NOT NULL, -- For compatibility with existing feedback system
    motion TEXT,
    topic TEXT,
    duration TEXT, -- MM:SS format for compatibility
    instructor TEXT, -- Instructor name for compatibility
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Recording sessions table (for batch recording management)
CREATE TABLE IF NOT EXISTS recording_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    instructor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id UUID REFERENCES class_sessions(id) ON DELETE SET NULL,
    
    -- Session context
    session_name TEXT NOT NULL,
    motion TEXT,
    topic TEXT,
    program_type TEXT, -- PSD, Writing, RAPS, Critical Thinking
    
    -- Batch processing
    total_recordings INTEGER DEFAULT 0,
    completed_recordings INTEGER DEFAULT 0,
    failed_recordings INTEGER DEFAULT 0,
    
    -- Settings
    transcription_provider transcription_provider DEFAULT 'assemblyai',
    auto_generate_feedback BOOLEAN DEFAULT true,
    feedback_type TEXT DEFAULT 'secondary' CHECK (feedback_type IN ('primary', 'secondary')),
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- File storage tracking table
CREATE TABLE IF NOT EXISTS audio_file_storage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recording_id UUID NOT NULL REFERENCES speech_recordings(id) ON DELETE CASCADE,
    
    -- Storage location
    storage_type TEXT NOT NULL CHECK (storage_type IN ('local', 'aws_s3', 'google_cloud', 'azure')),
    file_path TEXT NOT NULL,
    bucket_name TEXT, -- For cloud storage
    region TEXT, -- For cloud storage
    
    -- File metadata
    original_filename TEXT NOT NULL,
    stored_filename TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    content_hash TEXT, -- For integrity checking
    
    -- Access control
    is_public BOOLEAN DEFAULT false,
    signed_url_expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for performance
CREATE INDEX idx_speech_recordings_student ON speech_recordings(student_id);
CREATE INDEX idx_speech_recordings_instructor ON speech_recordings(instructor_id);
CREATE INDEX idx_speech_recordings_session ON speech_recordings(session_id);
CREATE INDEX idx_speech_recordings_status ON speech_recordings(status);
CREATE INDEX idx_speech_recordings_created ON speech_recordings(created_at);

CREATE INDEX idx_transcriptions_recording ON speech_transcriptions(recording_id);
CREATE INDEX idx_transcriptions_provider ON speech_transcriptions(provider);
CREATE INDEX idx_transcriptions_confidence ON speech_transcriptions(confidence_score);

CREATE INDEX idx_ai_feedback_recording ON ai_generated_feedback(recording_id);
CREATE INDEX idx_ai_feedback_transcription ON ai_generated_feedback(transcription_id);
CREATE INDEX idx_ai_feedback_status ON ai_generated_feedback(status);
CREATE INDEX idx_ai_feedback_type ON ai_generated_feedback(feedback_type);
CREATE INDEX idx_ai_feedback_unique_id ON ai_generated_feedback(unique_id);
CREATE INDEX idx_ai_feedback_reviewed ON ai_generated_feedback(reviewed_by);

CREATE INDEX idx_recording_sessions_instructor ON recording_sessions(instructor_id);
CREATE INDEX idx_recording_sessions_session ON recording_sessions(session_id);
CREATE INDEX idx_recording_sessions_status ON recording_sessions(status);

CREATE INDEX idx_audio_storage_recording ON audio_file_storage(recording_id);
CREATE INDEX idx_audio_storage_type ON audio_file_storage(storage_type);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_speech_recordings_updated_at 
    BEFORE UPDATE ON speech_recordings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_generated_feedback_updated_at 
    BEFORE UPDATE ON ai_generated_feedback 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recording_sessions_updated_at 
    BEFORE UPDATE ON recording_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create views for analytics
CREATE OR REPLACE VIEW speech_recording_analytics AS
SELECT 
    sr.instructor_id,
    u.name as instructor_name,
    COUNT(*) as total_recordings,
    COUNT(CASE WHEN sr.status = 'completed' THEN 1 END) as completed_recordings,
    COUNT(CASE WHEN sr.status = 'failed' THEN 1 END) as failed_recordings,
    AVG(sr.duration_seconds) as avg_duration_seconds,
    SUM(sr.duration_seconds) as total_duration_seconds,
    COUNT(DISTINCT sr.student_id) as unique_students,
    DATE_TRUNC('month', sr.created_at) as month
FROM speech_recordings sr
JOIN users u ON sr.instructor_id = u.id
GROUP BY sr.instructor_id, u.name, DATE_TRUNC('month', sr.created_at);

CREATE OR REPLACE VIEW ai_feedback_quality_metrics AS
SELECT 
    agf.instructor_id,
    u.name as instructor_name,
    agf.feedback_type,
    COUNT(*) as total_generated,
    COUNT(CASE WHEN agf.status = 'completed' THEN 1 END) as completed_feedback,
    COUNT(CASE WHEN agf.reviewed_by IS NOT NULL THEN 1 END) as reviewed_feedback,
    AVG((agf.confidence_metrics->>'overall_score')::decimal) as avg_confidence_score,
    agf.model_version,
    DATE_TRUNC('month', agf.created_at) as month
FROM ai_generated_feedback agf
JOIN speech_recordings sr ON agf.recording_id = sr.id
JOIN users u ON sr.instructor_id = u.id
GROUP BY agf.instructor_id, u.name, agf.feedback_type, agf.model_version, DATE_TRUNC('month', agf.created_at);

-- Comments for documentation
COMMENT ON TABLE speech_recordings IS 'Core table for storing speech recording metadata and processing status';
COMMENT ON TABLE speech_transcriptions IS 'Stores transcription results from various providers (AssemblyAI, Whisper)';
COMMENT ON TABLE ai_generated_feedback IS 'AI-generated feedback documents that integrate with existing feedback system';
COMMENT ON TABLE recording_sessions IS 'Batch recording session management for classroom workflows';
COMMENT ON TABLE audio_file_storage IS 'Tracks file storage locations across local and cloud storage providers';

COMMENT ON COLUMN ai_generated_feedback.unique_id IS 'Unique identifier compatible with existing feedback system for seamless integration';
COMMENT ON COLUMN ai_generated_feedback.rubric_scores IS 'JSON object storing 8-point rubric scores (rubric_1 through rubric_8) with values 1-5 or 0 for N/A';
COMMENT ON COLUMN speech_recordings.recording_metadata IS 'JSON metadata including device info, recording settings, and quality parameters';