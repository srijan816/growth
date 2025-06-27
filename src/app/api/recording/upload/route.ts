import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { storageService } from '@/lib/storage-service';
import { transcriptionService } from '@/lib/transcription-service';
import { aiFeedbackGenerator } from '@/lib/ai-feedback-generator';
import { executeQuery } from '@/lib/postgres';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const studentId = formData.get('studentId') as string;
    const sessionId = formData.get('sessionId') as string | null;
    const speechTopic = formData.get('speechTopic') as string;
    const motion = formData.get('motion') as string;
    const speechType = formData.get('speechType') as string || 'debate';
    const programType = formData.get('programType') as string || 'PSD';
    const transcriptionProvider = formData.get('transcriptionProvider') as string || 'openai';
    // const previewTranscription = formData.get('previewTranscription') as string || '';
    // const duration = parseInt(formData.get('duration') as string || '0');
    const autoGenerateFeedback = formData.get('autoGenerateFeedback') === 'true';
    const feedbackType = formData.get('feedbackType') as string || 'secondary';

    if (!audioFile || !studentId) {
      return NextResponse.json(
        { error: 'Audio file and student ID are required' }, 
        { status: 400 }
      );
    }

    // Validate file type and size
    const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/mp4', 'audio/webm', 'audio/ogg'];
    if (!allowedTypes.includes(audioFile.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload audio files only.' },
        { status: 400 }
      );
    }

    const maxSizeBytes = 100 * 1024 * 1024; // 100MB
    if (audioFile.size > maxSizeBytes) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 100MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Create recording record in database
    const recordingResult = await executeQuery(
      `INSERT INTO speech_recordings (
        id, student_id, session_id, instructor_id, audio_file_path,
        original_filename, file_size_bytes, mime_type, speech_topic,
        motion, speech_type, program_type, status, transcription_provider,
        recording_metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        uuidv4(),
        studentId,
        sessionId,
        session.user.id,
        '', // Will be updated after upload
        audioFile.name,
        audioFile.size,
        audioFile.type,
        speechTopic,
        motion,
        speechType,
        programType,
        'uploading',
        transcriptionProvider,
        JSON.stringify({
          uploadedAt: new Date().toISOString(),
          userAgent: request.headers.get('user-agent'),
          contentLength: audioFile.size,
        }),
      ]
    );

    const recording = recordingResult.rows[0];

    try {
      // Upload file to storage
      const uploadResult = await storageService.uploadAudioFile(
        recording.id,
        buffer,
        audioFile.name,
        audioFile.type
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      // Update recording with file path
      await executeQuery(
        'UPDATE speech_recordings SET audio_file_path = $1, status = $2 WHERE id = $3',
        [uploadResult.file!.filePath, 'uploaded', recording.id]
      );

      // Start transcription process
      const transcriptionResult = await transcriptionService.transcribeRecording(
        recording.id,
        transcriptionProvider as any
      );

      let feedbackResult = null;

      // Generate AI feedback if requested and transcription succeeded
      if (autoGenerateFeedback && transcriptionResult.success) {
        try {
          feedbackResult = await aiFeedbackGenerator.generateFeedbackFromRecording(
            recording.id,
            {
              feedbackType: feedbackType as 'primary' | 'secondary',
              includeTranscript: true,
            }
          );
        } catch (error) {
          console.error('AI feedback generation failed:', error);
          // Don't fail the entire request if feedback generation fails
        }
      }

      return NextResponse.json({
        success: true,
        recording: {
          id: recording.id,
          status: recording.status,
          originalFilename: recording.original_filename,
          fileSizeBytes: recording.file_size_bytes,
          speechTopic: recording.speech_topic,
          motion: recording.motion,
          fileUrl: uploadResult.url,
        },
        transcription: transcriptionResult.success ? {
          id: transcriptionResult.transcriptionId,
          text: transcriptionResult.text,
          confidence: transcriptionResult.confidence,
          wordCount: transcriptionResult.wordCount,
          speakingRate: transcriptionResult.speakingRate,
        } : null,
        feedback: feedbackResult?.success ? {
          id: feedbackResult.feedbackId,
          type: feedbackType,
          generated: true,
        } : null,
        message: 'Recording uploaded successfully',
      });

    } catch (error) {
      // Clean up failed recording
      await executeQuery('DELETE FROM speech_recordings WHERE id = $1', [recording.id]);
      throw error;
    }

  } catch (error) {
    console.error('Recording upload error:', error);
    return NextResponse.json(
      { 
        error: 'Upload failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const sessionId = searchParams.get('sessionId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = `
      SELECT sr.*, s.name as student_name, u.name as instructor_name,
             st.transcription_text, st.confidence_score,
             agf.status as feedback_status, agf.feedback_type
      FROM speech_recordings sr
      JOIN students s ON sr.student_id = s.id
      JOIN users u ON sr.instructor_id = u.id
      LEFT JOIN speech_transcriptions st ON sr.id = st.recording_id
      LEFT JOIN ai_generated_feedback agf ON sr.id = agf.recording_id
      WHERE sr.instructor_id = $1
    `;
    
    const params = [session.user.id];
    let paramCount = 1;

    if (studentId) {
      paramCount++;
      query += ` AND sr.student_id = $${paramCount}`;
      params.push(studentId);
    }

    if (sessionId) {
      paramCount++;
      query += ` AND sr.session_id = $${paramCount}`;
      params.push(sessionId);
    }

    query += ` ORDER BY sr.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await executeQuery(query, params);

    const recordings = result.rows.map((row: any) => ({
      id: row.id,
      studentName: row.student_name,
      instructorName: row.instructor_name,
      originalFilename: row.original_filename,
      fileSizeBytes: row.file_size_bytes,
      durationSeconds: row.duration_seconds,
      speechTopic: row.speech_topic,
      motion: row.motion,
      speechType: row.speech_type,
      programType: row.program_type,
      status: row.status,
      transcriptionProvider: row.transcription_provider,
      createdAt: row.created_at,
      hasTranscription: !!row.transcription_text,
      transcriptionConfidence: row.confidence_score,
      feedbackStatus: row.feedback_status,
      feedbackType: row.feedback_type,
    }));

    return NextResponse.json({
      recordings,
      pagination: {
        limit,
        offset,
        total: recordings.length, // Would need separate count query for exact total
      },
    });

  } catch (error) {
    console.error('Error fetching recordings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recordings' },
      { status: 500 }
    );
  }
}