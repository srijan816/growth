import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { transcriptionService } from '@/lib/transcription-service';
import { executeQuery } from '@/lib/postgres';

interface RouteParams {
  params: Promise<{ recordingId: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { recordingId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      provider = 'assemblyai',
      language = 'en',
      speakerLabels = false,
      autoPunctuation = true,
      filterProfanity = false,
      formatText = true,
      wordBoost = [],
      boostParam = 'default',
    } = body;

    // Check if recording exists and belongs to user
    const recordingResult = await executeQuery(`
      SELECT sr.*, s.name as student_name 
      FROM speech_recordings sr
      JOIN students s ON sr.student_id = s.id
      WHERE sr.id = $1 AND sr.instructor_id = $2
    `, [recordingId, session.user.id]);

    if (recordingResult.rows.length === 0) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    const recording = recordingResult.rows[0];

    // Check if transcription already exists
    const existingTranscription = await executeQuery(
      'SELECT id, transcription_text FROM speech_transcriptions WHERE recording_id = $1',
      [recordingId]
    );

    if (existingTranscription.rows.length > 0 && existingTranscription.rows[0].transcription_text) {
      return NextResponse.json({
        success: true,
        message: 'Transcription already exists',
        transcription: {
          id: existingTranscription.rows[0].id,
          text: existingTranscription.rows[0].transcription_text,
          alreadyExists: true,
        },
      });
    }

    // Start transcription
    const transcriptionResult = await transcriptionService.transcribeRecording(
      recordingId,
      provider as any,
      {
        language,
        speaker_labels: speakerLabels,
        auto_punctuation: autoPunctuation,
        filter_profanity: filterProfanity,
        format_text: formatText,
        word_boost: wordBoost,
        boost_param: boostParam as any,
      }
    );

    if (!transcriptionResult.success) {
      return NextResponse.json({
        error: 'Transcription failed',
        details: transcriptionResult.error,
      }, { status: 500 });
    }

    // Update recording status
    await executeQuery(
      'UPDATE speech_recordings SET status = $1 WHERE id = $2',
      ['transcribing', recordingId]
    );

    return NextResponse.json({
      success: true,
      transcription: {
        id: transcriptionResult.transcriptionId,
        text: transcriptionResult.text,
        confidence: transcriptionResult.confidence,
        wordCount: transcriptionResult.wordCount,
        speakingRate: transcriptionResult.speakingRate,
        processingTime: transcriptionResult.processingTime,
        provider,
      },
      message: 'Transcription completed successfully',
    });

  } catch (error) {
    console.error('Transcription API error:', error);
    return NextResponse.json(
      { 
        error: 'Transcription failed', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { recordingId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get transcription status
    const status = await transcriptionService.getTranscriptionStatus(recordingId);
    
    if (!status) {
      return NextResponse.json({ error: 'Transcription not found' }, { status: 404 });
    }

    // Get full transcription details
    const result = await executeQuery(`
      SELECT st.*, sr.instructor_id
      FROM speech_transcriptions st
      JOIN speech_recordings sr ON st.recording_id = sr.id
      WHERE st.recording_id = $1 AND sr.instructor_id = $2
      ORDER BY st.created_at DESC
      LIMIT 1
    `, [recordingId, session.user.id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Transcription not found' }, { status: 404 });
    }

    const transcription = result.rows[0];

    return NextResponse.json({
      transcription: {
        id: transcription.id,
        recordingId: transcription.recording_id,
        text: transcription.transcription_text,
        confidence: transcription.confidence_score,
        provider: transcription.provider,
        providerJobId: transcription.provider_job_id,
        wordCount: transcription.word_count,
        speakingRate: transcription.speaking_rate,
        processingDuration: transcription.processing_duration_seconds,
        startedAt: transcription.transcription_started_at,
        completedAt: transcription.transcription_completed_at,
        createdAt: transcription.created_at,
      },
      status: status.status,
    });

  } catch (error) {
    console.error('Error fetching transcription:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transcription' },
      { status: 500 }
    );
  }
}