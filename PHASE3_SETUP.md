# Phase 3: AI-Powered Feedback Generation Platform - Setup Guide

## Overview

Phase 3 transforms the Capstone Evolve platform into a complete AI-powered feedback generation and analysis ecosystem. The platform now supports:

- **Web-based audio recording** with mobile support
- **Multi-provider transcription** (AssemblyAI, Whisper Local, Whisper API)
- **AI-generated feedback** using Google Gemini 2.5
- **Word document generation** matching existing feedback templates
- **Integrated analytics** combining manual and AI-generated feedback

## Architecture

### New Database Tables

The following tables were added in migration `20250626232032_add_speech_recording_tables.sql`:

- `speech_recordings` - Core recording metadata and processing status
- `speech_transcriptions` - Transcription results from various providers
- `ai_generated_feedback` - AI-generated feedback with confidence metrics
- `recording_sessions` - Batch recording session management
- `audio_file_storage` - File storage tracking across providers

### New Services

1. **StorageService** (`src/lib/storage-service.ts`)
   - Flexible file storage (local with cloud migration path)
   - Supports AWS S3, Google Cloud, Azure (infrastructure ready)

2. **TranscriptionService** (`src/lib/transcription-service.ts`)
   - AssemblyAI integration (production ready)
   - Whisper Local support (requires setup)
   - OpenAI Whisper API support (requires API key)

3. **AIFeedbackGenerator** (`src/lib/ai-feedback-generator.ts`)
   - Google Gemini 2.5 integration
   - Primary and Secondary feedback templates
   - Confidence metrics and quality scoring

4. **DocumentGenerator** (`src/lib/document-generator.ts`)
   - Word document generation using docx library
   - Matches existing feedback template formats

### New API Endpoints

- `POST /api/recording/upload` - Upload and process recordings
- `GET /api/recording/upload` - List recordings with filters
- `GET /api/recording/[recordingId]` - Get recording details
- `PATCH /api/recording/[recordingId]` - Update recording metadata
- `DELETE /api/recording/[recordingId]` - Delete recording
- `POST /api/recording/[recordingId]/transcribe` - Start transcription
- `GET /api/recording/[recordingId]/transcribe` - Get transcription status
- `POST /api/recording/[recordingId]/feedback` - Generate AI feedback
- `GET /api/recording/[recordingId]/feedback` - Get feedback details
- `PATCH /api/recording/[recordingId]/feedback` - Review/edit feedback

### New UI Components

- `AudioRecorder` - Web-based recording with mobile support
- `RecordingDashboard` - Main interface with tabs and stats
- `RecordingsList` - Browse and filter recordings
- `FeedbackViewer` - View and edit AI-generated feedback

## Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# Transcription Services
ASSEMBLYAI_API_KEY=your_assemblyai_api_key_here
WHISPER_SERVER_URL=http://localhost:8000  # For local Whisper
OPENAI_API_KEY=your_openai_api_key_here   # For Whisper API

# Google Gemini (reuses existing keys)
GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_API_KEY_1=your_gemini_key_1_here   # Optional: additional keys
GEMINI_API_KEY_2=your_gemini_key_2_here   # Optional: for rate limiting
GEMINI_API_KEY_3=your_gemini_key_3_here   # Optional: load balancing
GEMINI_API_KEY_4=your_gemini_key_4_here   # Optional: redundancy

# File Storage
AUDIO_UPLOAD_PATH=./uploads/audio          # Local storage path
AUDIO_BASE_URL=/api/audio/files           # Base URL for file access

# Cloud Storage (Optional)
AWS_S3_BUCKET=your_s3_bucket_name
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

GOOGLE_CLOUD_BUCKET=your_gcs_bucket_name
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_KEY_FILENAME=path/to/service-account.json

AZURE_ACCOUNT_NAME=your_azure_account
AZURE_ACCOUNT_KEY=your_azure_key
AZURE_CONTAINER_NAME=your_container_name
```

## Setup Instructions

### 1. Database Migration

The Phase 3 tables were automatically created. Verify they exist:

```bash
psql -d growth_compass -c "\dt" | grep -E "(speech_|ai_|recording_|audio_)"
```

You should see:
- `ai_generated_feedback`
- `audio_file_storage`
- `recording_sessions`
- `speech_recordings`
- `speech_transcriptions`

### 2. AssemblyAI Setup (Recommended)

1. Sign up at [AssemblyAI](https://www.assemblyai.com/)
2. Get your API key from the dashboard
3. Add to `.env.local`:
   ```bash
   ASSEMBLYAI_API_KEY=your_api_key_here
   ```

### 3. Create Upload Directory

```bash
mkdir -p uploads/audio
chmod 755 uploads/audio
```

### 4. Test the Installation

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/dashboard/recording`

3. Test audio recording (requires microphone permissions)

4. Upload a test recording and verify:
   - Transcription completes successfully
   - AI feedback is generated
   - Files are stored properly

## Features

### Recording Workflow

1. **Record Speech**
   - Web-based audio recording with real-time visualization
   - Mobile-optimized interface
   - Multiple audio format support (WebM, MP3, WAV)
   - Recording quality settings (high/medium/low)

2. **Automatic Processing**
   - Upload to configurable storage (local/cloud)
   - Transcription via selected provider
   - AI feedback generation using Gemini 2.5
   - Word document generation (optional)

3. **Review and Edit**
   - View AI-generated feedback
   - Edit feedback content
   - Mark as reviewed by instructor
   - Export to Word documents

### Feedback Templates

**Primary Feedback (Elementary):**
- Strengths and improvement areas
- Age-appropriate language
- Encouragement-focused

**Secondary Feedback (Middle/High School):**
- 8-point rubric scoring (1-5 scale)
- Detailed teacher comments
- Theory application assessment

### AI Quality Metrics

- **Overall Score** - Combined confidence metric
- **Content Relevance** - How well feedback matches speech
- **Rubric Accuracy** - Scoring consistency
- **Feedback Quality** - Actionable advice rating

## Troubleshooting

### Common Issues

1. **Microphone Permission Denied**
   - Ensure HTTPS in production
   - Check browser permissions
   - Try different browsers

2. **Transcription Fails**
   - Verify API keys are correct
   - Check audio file format and size
   - Ensure network connectivity

3. **Storage Issues**
   - Verify upload directory permissions
   - Check available disk space
   - For cloud storage, verify credentials

4. **AI Feedback Generation Fails**
   - Confirm Gemini API key is valid
   - Check if transcription completed first
   - Verify network connectivity to Google APIs

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=true
NODE_ENV=development
```

### File Size Limits

- Maximum audio file size: 100MB
- Recommended duration: 2-10 minutes
- Supported formats: WAV, MP3, WebM, OGG

## Performance Optimization

### Server Requirements

- **Minimum**: 8GB RAM, 2 CPU cores
- **Recommended**: 16GB RAM, 4 CPU cores
- **Storage**: 10GB+ for audio files (varies by usage)

### Optimization Tips

1. **Use AssemblyAI** for best transcription speed/quality
2. **Enable compression** for audio uploads
3. **Implement caching** for frequent API calls
4. **Monitor storage usage** and implement cleanup policies

## Security Considerations

1. **Audio Data Privacy**
   - Student recordings contain sensitive information
   - Implement proper access controls
   - Consider encryption for stored files

2. **API Key Security**
   - Never commit API keys to version control
   - Use environment variables for all credentials
   - Rotate keys regularly

3. **File Upload Security**
   - Validate file types and sizes
   - Scan for malicious content
   - Implement rate limiting

## Future Enhancements

### Phase 3.2: Advanced Features
- Real-time transcription during recording
- Speech pattern analysis (pace, pauses, confidence)
- Batch processing for multiple students
- Advanced analytics and reporting

### Phase 3.3: Integration
- Integration with existing attendance system
- Unified growth tracking across all data sources
- Parent portal for accessing AI-generated feedback
- Mobile app for iOS/Android

### Phase 3.4: AI Improvements
- Custom training on school-specific feedback patterns
- Multi-language support
- Voice coaching and pronunciation feedback
- Automated rubric customization

## Support

For technical issues:
1. Check the console for error messages
2. Verify environment variables are set
3. Test with a simple recording first
4. Check database connectivity
5. Review API rate limits

The Phase 3 implementation provides a solid foundation for AI-powered feedback generation while maintaining compatibility with existing systems and workflows.