import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { aiFeedbackGenerator } from '@/lib/ai-feedback-generator';
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
      feedbackType = 'secondary',
      includeTranscript = true,
      customPrompt,
      modelVersion = 'gemini-2.5-flash',
      temperature = 0.7,
      maxTokens = 2048,
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

    // Check if transcription exists
    const transcriptionResult = await executeQuery(
      'SELECT id, transcription_text FROM speech_transcriptions WHERE recording_id = $1',
      [recordingId]
    );

    if (transcriptionResult.rows.length === 0 || !transcriptionResult.rows[0].transcription_text) {
      return NextResponse.json({
        error: 'Transcription required',
        message: 'Please transcribe the recording before generating feedback',
      }, { status: 400 });
    }

    // Check if feedback already exists
    const existingFeedback = await executeQuery(
      'SELECT id, feedback_type, status FROM ai_generated_feedback WHERE recording_id = $1',
      [recordingId]
    );

    if (existingFeedback.rows.length > 0) {
      const existing = existingFeedback.rows[0];
      if (existing.status === 'completed') {
        return NextResponse.json({
          success: true,
          message: 'Feedback already exists',
          feedback: {
            id: existing.id,
            type: existing.feedback_type,
            alreadyExists: true,
          },
        });
      }
    }

    // Generate AI feedback
    const feedbackResult = await aiFeedbackGenerator.generateFeedbackFromRecording(
      recordingId,
      {
        feedbackType: feedbackType as 'primary' | 'secondary',
        includeTranscript,
        customPrompt,
        modelVersion,
        temperature,
        maxTokens,
      }
    );

    if (!feedbackResult.success) {
      return NextResponse.json({
        error: 'Feedback generation failed',
        details: feedbackResult.error,
      }, { status: 500 });
    }

    // Update recording status
    await executeQuery(
      'UPDATE speech_recordings SET status = $1 WHERE id = $2',
      ['feedback_generated', recordingId]
    );

    return NextResponse.json({
      success: true,
      feedback: {
        id: feedbackResult.feedbackId,
        type: feedbackType,
        primaryFeedback: feedbackResult.primaryFeedback,
        secondaryFeedback: feedbackResult.secondaryFeedback,
        confidenceMetrics: feedbackResult.confidenceMetrics,
      },
      message: 'Feedback generated successfully',
    });

  } catch (error) {
    console.error('Feedback generation API error:', error);
    return NextResponse.json(
      { 
        error: 'Feedback generation failed', 
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

    // Get feedback details
    const result = await executeQuery(`
      SELECT agf.*, sr.instructor_id, s.name as student_name,
             reviewer.name as reviewer_name
      FROM ai_generated_feedback agf
      JOIN speech_recordings sr ON agf.recording_id = sr.id
      JOIN students s ON sr.student_id = s.id
      LEFT JOIN users reviewer ON agf.reviewed_by = reviewer.id
      WHERE agf.recording_id = $1 AND sr.instructor_id = $2
      ORDER BY agf.created_at DESC
      LIMIT 1
    `, [recordingId, session.user.id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    const feedback = result.rows[0];

    return NextResponse.json({
      feedback: {
        id: feedback.id,
        recordingId: feedback.recording_id,
        transcriptionId: feedback.transcription_id,
        feedbackType: feedback.feedback_type,
        studentName: feedback.student_name,
        transcriptionText: feedback.transcription_text,
        strengths: feedback.strengths,
        improvementAreas: feedback.improvement_areas,
        rubricScores: feedback.rubric_scores,
        teacherComments: feedback.teacher_comments,
        generatedDocumentPath: feedback.generated_document_path,
        documentGeneratedAt: feedback.document_generated_at,
        modelVersion: feedback.model_version,
        generationPrompt: feedback.generation_prompt,
        generationMetadata: feedback.generation_metadata,
        confidenceMetrics: feedback.confidence_metrics,
        status: feedback.status,
        generationStartedAt: feedback.generation_started_at,
        generationCompletedAt: feedback.generation_completed_at,
        reviewedBy: feedback.reviewed_by,
        reviewedAt: feedback.reviewed_at,
        reviewerName: feedback.reviewer_name,
        instructorModifications: feedback.instructor_modifications,
        uniqueId: feedback.unique_id,
        motion: feedback.motion,
        topic: feedback.topic,
        duration: feedback.duration,
        instructor: feedback.instructor,
        createdAt: feedback.created_at,
        updatedAt: feedback.updated_at,
      },
    });

  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch feedback' },
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
    const { 
      strengths,
      improvementAreas,
      rubricScores,
      teacherComments,
      markAsReviewed = false,
    } = body;

    // Get feedback record
    const feedbackResult = await executeQuery(`
      SELECT agf.id, agf.instructor_modifications, sr.instructor_id
      FROM ai_generated_feedback agf
      JOIN speech_recordings sr ON agf.recording_id = sr.id
      WHERE agf.recording_id = $1 AND sr.instructor_id = $2
    `, [recordingId, session.user.id]);

    if (feedbackResult.rows.length === 0) {
      return NextResponse.json({ error: 'Feedback not found' }, { status: 404 });
    }

    const existingFeedback = feedbackResult.rows[0];
    const existingModifications = existingFeedback.instructor_modifications || {};

    // Track what was modified
    const modifications = {
      ...existingModifications,
      modifiedAt: new Date().toISOString(),
      modifiedBy: session.user.id,
      changes: {
        ...existingModifications.changes || {},
      },
    };

    if (strengths) modifications.changes.strengths = true;
    if (improvementAreas) modifications.changes.improvementAreas = true;
    if (rubricScores) modifications.changes.rubricScores = true;
    if (teacherComments) modifications.changes.teacherComments = true;

    // Update feedback
    const updateResult = await executeQuery(`
      UPDATE ai_generated_feedback 
      SET 
        strengths = COALESCE($1, strengths),
        improvement_areas = COALESCE($2, improvement_areas),
        rubric_scores = COALESCE($3, rubric_scores),
        teacher_comments = COALESCE($4, teacher_comments),
        instructor_modifications = $5,
        reviewed_by = CASE WHEN $6 THEN $7 ELSE reviewed_by END,
        reviewed_at = CASE WHEN $6 THEN NOW() ELSE reviewed_at END,
        updated_at = NOW()
      WHERE id = $8
      RETURNING *
    `, [
      strengths,
      improvementAreas,
      rubricScores ? JSON.stringify(rubricScores) : null,
      teacherComments,
      JSON.stringify(modifications),
      markAsReviewed,
      session.user.id,
      existingFeedback.id,
    ]);

    return NextResponse.json({
      success: true,
      feedback: updateResult.rows[0],
      message: 'Feedback updated successfully',
    });

  } catch (error) {
    console.error('Error updating feedback:', error);
    return NextResponse.json(
      { error: 'Failed to update feedback' },
      { status: 500 }
    );
  }
}