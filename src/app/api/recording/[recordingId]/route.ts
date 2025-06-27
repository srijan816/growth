import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { storageService } from '@/lib/storage-service';
import { executeQuery } from '@/lib/postgres';

interface RouteParams {
  params: Promise<{ recordingId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { recordingId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recording details with related data
    const result = await executeQuery(`
      SELECT sr.*, s.name as student_name, u.name as instructor_name,
             st.id as transcription_id, st.transcription_text, st.confidence_score,
             st.word_count, st.speaking_rate, st.provider, st.processing_duration_seconds,
             agf.id as feedback_id, agf.feedback_type, agf.status as feedback_status,
             agf.strengths, agf.improvement_areas, agf.rubric_scores, agf.teacher_comments,
             agf.confidence_metrics, agf.reviewed_by, agf.reviewed_at,
             reviewer.name as reviewer_name
      FROM speech_recordings sr
      JOIN students s ON sr.student_id = s.id
      JOIN users u ON sr.instructor_id = u.id
      LEFT JOIN speech_transcriptions st ON sr.id = st.recording_id
      LEFT JOIN ai_generated_feedback agf ON sr.id = agf.recording_id
      LEFT JOIN users reviewer ON agf.reviewed_by = reviewer.id
      WHERE sr.id = $1 AND sr.instructor_id = $2
    `, [recordingId, session.user.id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    const row = result.rows[0];

    // Get file URL for playback
    const fileUrl = await storageService.getFileUrl(recordingId, 60); // 1 hour expiry

    const recording = {
      id: row.id,
      studentId: row.student_id,
      studentName: row.student_name,
      sessionId: row.session_id,
      instructorId: row.instructor_id,
      instructorName: row.instructor_name,
      audioFilePath: row.audio_file_path,
      originalFilename: row.original_filename,
      fileSizeBytes: row.file_size_bytes,
      durationSeconds: row.duration_seconds,
      mimeType: row.mime_type,
      speechTopic: row.speech_topic,
      motion: row.motion,
      speechType: row.speech_type,
      programType: row.program_type,
      status: row.status,
      transcriptionProvider: row.transcription_provider,
      recordingMetadata: row.recording_metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      fileUrl,
      transcription: row.transcription_id ? {
        id: row.transcription_id,
        text: row.transcription_text,
        confidence: row.confidence_score,
        wordCount: row.word_count,
        speakingRate: row.speaking_rate,
        provider: row.provider,
        processingDuration: row.processing_duration_seconds,
      } : null,
      feedback: row.feedback_id ? {
        id: row.feedback_id,
        type: row.feedback_type,
        status: row.feedback_status,
        strengths: row.strengths,
        improvementAreas: row.improvement_areas,
        rubricScores: row.rubric_scores,
        teacherComments: row.teacher_comments,
        confidenceMetrics: row.confidence_metrics,
        reviewedBy: row.reviewed_by,
        reviewedAt: row.reviewed_at,
        reviewerName: row.reviewer_name,
      } : null,
    };

    return NextResponse.json({ recording });

  } catch (error) {
    console.error('Error fetching recording details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recording details' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { recordingId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { speechTopic, motion, speechType, programType } = body;

    // Update recording metadata
    const result = await executeQuery(`
      UPDATE speech_recordings 
      SET speech_topic = COALESCE($1, speech_topic),
          motion = COALESCE($2, motion),
          speech_type = COALESCE($3, speech_type),
          program_type = COALESCE($4, program_type),
          updated_at = NOW()
      WHERE id = $5 AND instructor_id = $6
      RETURNING *
    `, [speechTopic, motion, speechType, programType, recordingId, session.user.id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      recording: result.rows[0],
      message: 'Recording updated successfully' 
    });

  } catch (error) {
    console.error('Error updating recording:', error);
    return NextResponse.json(
      { error: 'Failed to update recording' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { recordingId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if recording exists and belongs to user
    const checkResult = await executeQuery(
      'SELECT id FROM speech_recordings WHERE id = $1 AND instructor_id = $2',
      [recordingId, session.user.id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    // Delete file from storage
    await storageService.deleteFile(recordingId);

    // Database cascade will handle related records (transcriptions, feedback, etc.)
    await executeQuery(
      'DELETE FROM speech_recordings WHERE id = $1',
      [recordingId]
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Recording deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting recording:', error);
    return NextResponse.json(
      { error: 'Failed to delete recording' },
      { status: 500 }
    );
  }
}