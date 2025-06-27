import { GoogleGenerativeAI } from '@google/generative-ai';
import { executeQuery } from './postgres';
import { transcriptionService } from './transcription-service';

export interface PrimaryFeedbackData {
  studentName: string;
  topic: string;
  motion: string;
  strengths: string[];
  improvements: string[];
  duration: string;
  instructor: string;
  speechDuration: string;
  transcriptionConfidence: number;
}

export interface SecondaryFeedbackData {
  studentName: string;
  motion: string;
  rubricScores: {
    rubric_1: number; // Duration management (1-5 or 0 for N/A)
    rubric_2: number; // Point of Information
    rubric_3: number; // Style/persuasion
    rubric_4: number; // Argument completeness
    rubric_5: number; // Theory application
    rubric_6: number; // Rebuttal effectiveness
    rubric_7: number; // Teammate support
    rubric_8: number; // Feedback application
  };
  teacherComments: string;
  speechDuration: string;
  instructor: string;
  topic: string;
  transcriptionConfidence: number;
}

export interface FeedbackGenerationOptions {
  feedbackType: 'primary' | 'secondary';
  includeTranscript?: boolean;
  customPrompt?: string;
  modelVersion?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface FeedbackGenerationResult {
  success: boolean;
  feedbackId?: string;
  primaryFeedback?: PrimaryFeedbackData;
  secondaryFeedback?: SecondaryFeedbackData;
  error?: string;
  confidenceMetrics?: {
    overallScore: number;
    contentRelevance: number;
    rubricAccuracy: number;
    feedbackQuality: number;
  };
}

export class AIFeedbackGenerator {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
    });
  }

  /**
   * Generate feedback from a speech recording
   */
  async generateFeedbackFromRecording(
    recordingId: string,
    options: FeedbackGenerationOptions
  ): Promise<FeedbackGenerationResult> {
    try {
      // Get recording and transcription data
      const recordingData = await this.getRecordingData(recordingId);
      if (!recordingData) {
        return { success: false, error: 'Recording not found' };
      }

      const transcription = await this.getTranscriptionData(recordingId);
      if (!transcription) {
        return { success: false, error: 'Transcription not available' };
      }

      // Generate feedback based on type
      let result: FeedbackGenerationResult;
      
      if (options.feedbackType === 'primary') {
        result = await this.generatePrimaryFeedback(recordingData, transcription, options);
      } else {
        result = await this.generateSecondaryFeedback(recordingData, transcription, options);
      }

      // Store generated feedback in database
      if (result.success) {
        const feedbackId = await this.storeFeedbackResult(recordingId, transcription.id, result, options);
        result.feedbackId = feedbackId;
      }

      return result;
    } catch (error) {
      console.error('Feedback generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Feedback generation failed',
      };
    }
  }

  /**
   * Generate primary feedback (elementary level)
   */
  private async generatePrimaryFeedback(
    recordingData: any,
    transcription: any,
    options: FeedbackGenerationOptions
  ): Promise<FeedbackGenerationResult> {
    const prompt = this.buildPrimaryFeedbackPrompt(recordingData, transcription, options);

    try {
      const response = await this.model.generateContent(prompt);
      const responseText = response.response.text();
      
      // Parse the structured response
      const feedback = this.parsePrimaryFeedbackResponse(responseText, recordingData, transcription);
      
      if (!feedback) {
        return { success: false, error: 'Failed to parse AI response' };
      }

      // Calculate confidence metrics
      const confidenceMetrics = this.calculateConfidenceMetrics(responseText, transcription);

      return {
        success: true,
        primaryFeedback: feedback,
        confidenceMetrics,
      };
    } catch (error) {
      return { success: false, error: `AI generation failed: ${error}` };
    }
  }

  /**
   * Generate secondary feedback (middle/high school level)
   */
  private async generateSecondaryFeedback(
    recordingData: any,
    transcription: any,
    options: FeedbackGenerationOptions
  ): Promise<FeedbackGenerationResult> {
    const prompt = this.buildSecondaryFeedbackPrompt(recordingData, transcription, options);

    try {
      const response = await this.model.generateContent(prompt);
      const responseText = response.response.text();
      
      // Parse the structured response
      const feedback = this.parseSecondaryFeedbackResponse(responseText, recordingData, transcription);
      
      if (!feedback) {
        return { success: false, error: 'Failed to parse AI response' };
      }

      // Calculate confidence metrics
      const confidenceMetrics = this.calculateConfidenceMetrics(responseText, transcription);

      return {
        success: true,
        secondaryFeedback: feedback,
        confidenceMetrics,
      };
    } catch (error) {
      return { success: false, error: `AI generation failed: ${error}` };
    }
  }

  /**
   * Build primary feedback prompt
   */
  private buildPrimaryFeedbackPrompt(recordingData: any, transcription: any, options: FeedbackGenerationOptions): string {
    const transcript = options.includeTranscript !== false ? transcription.transcription_text : '[Transcript not included]';
    
    return `You are an experienced debate instructor providing feedback to an elementary student (grades 3-6). 

**Student Information:**
- Name: ${recordingData.student_name}
- Motion/Topic: ${recordingData.motion || recordingData.speech_topic || 'Not specified'}
- Speech Duration: ${recordingData.duration_seconds ? Math.floor(recordingData.duration_seconds / 60) + ':' + String(Math.floor(recordingData.duration_seconds % 60)).padStart(2, '0') : 'Unknown'}
- Program: ${recordingData.program_type || 'PSD'}

**Speech Transcript:**
${transcript}

**Transcription Confidence:** ${Math.round((transcription.confidence_score || 0) * 100)}%

**Instructions:**
Generate feedback in the exact format used for primary students. Focus on:
1. Age-appropriate language and encouragement
2. Specific, actionable feedback
3. Balance of strengths and growth areas
4. Concrete examples from the speech

**Required Response Format (JSON):**
{
  "strengths": [
    "Specific strength 1 with evidence from speech",
    "Specific strength 2 with evidence from speech",
    "Specific strength 3 with evidence from speech"
  ],
  "improvements": [
    "Specific improvement 1 with actionable advice",
    "Specific improvement 2 with actionable advice",
    "Specific improvement 3 with actionable advice"
  ]
}

**Guidelines:**
- Each strength/improvement should be 1-2 sentences
- Use encouraging, positive language appropriate for elementary age
- Reference specific moments from the transcript when possible
- Focus on fundamental speaking skills: volume, clarity, confidence, organization
- Avoid complex debate theory or advanced concepts

Generate the feedback now:`;
  }

  /**
   * Build secondary feedback prompt
   */
  private buildSecondaryFeedbackPrompt(recordingData: any, transcription: any, options: FeedbackGenerationOptions): string {
    const transcript = options.includeTranscript !== false ? transcription.transcription_text : '[Transcript not included]';
    
    return `You are an experienced debate instructor providing feedback to a middle/high school student using the 8-point rubric system.

**Student Information:**
- Name: ${recordingData.student_name}
- Motion: ${recordingData.motion || recordingData.speech_topic || 'Not specified'}
- Speech Duration: ${recordingData.duration_seconds ? Math.floor(recordingData.duration_seconds / 60) + ':' + String(Math.floor(recordingData.duration_seconds % 60)).padStart(2, '0') : 'Unknown'}
- Program: ${recordingData.program_type || 'PSD'}

**Speech Transcript:**
${transcript}

**Transcription Confidence:** ${Math.round((transcription.confidence_score || 0) * 100)}%

**8-Point Rubric (Rate 1-5 or 0 for N/A):**
1. Student spoke for the duration of specified time frame
2. Student offered/accepted point of information
3. Student spoke in stylistic/persuasive manner
4. Student's argument is complete (Claims/Evidence)
5. Student argument reflects theory application
6. Student's rebuttal is effective
7. Student ably supported teammate
8. Student applied feedback from previous debates

**Required Response Format (JSON):**
{
  "rubricScores": {
    "rubric_1": [1-5 or 0],
    "rubric_2": [1-5 or 0],
    "rubric_3": [1-5 or 0],
    "rubric_4": [1-5 or 0],
    "rubric_5": [1-5 or 0],
    "rubric_6": [1-5 or 0],
    "rubric_7": [1-5 or 0],
    "rubric_8": [1-5 or 0]
  },
  "teacherComments": "Detailed paragraph-form feedback addressing strengths, areas for improvement, and specific examples from the speech. Include actionable advice for future speeches."
}

**Scoring Guidelines:**
- 5: Exceptional performance
- 4: Strong performance with minor areas for improvement
- 3: Adequate performance meeting expectations
- 2: Below expectations with clear areas for improvement
- 1: Significant improvement needed
- 0: Not applicable or not demonstrated

**Analysis Instructions:**
- Base scores on evidence from the transcript
- Use 0 (N/A) only when the rubric item is truly not applicable to this speech type
- Teacher comments should be 100-200 words, professional yet encouraging
- Reference specific moments from the transcript
- Include both strengths and areas for growth

Generate the feedback now:`;
  }

  /**
   * Parse primary feedback response
   */
  private parsePrimaryFeedbackResponse(responseText: string, recordingData: any, transcription: any): PrimaryFeedbackData | null {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        studentName: recordingData.student_name,
        topic: recordingData.speech_topic || recordingData.motion || 'Speech Topic',
        motion: recordingData.motion || recordingData.speech_topic || 'Speech Topic',
        strengths: parsed.strengths || [],
        improvements: parsed.improvements || [],
        duration: recordingData.duration_seconds ? 
          Math.floor(recordingData.duration_seconds / 60) + ':' + 
          String(Math.floor(recordingData.duration_seconds % 60)).padStart(2, '0') : 'Unknown',
        instructor: recordingData.instructor_name || 'AI Generated',
        speechDuration: recordingData.duration_seconds ? 
          Math.floor(recordingData.duration_seconds / 60) + ':' + 
          String(Math.floor(recordingData.duration_seconds % 60)).padStart(2, '0') : 'Unknown',
        transcriptionConfidence: transcription.confidence_score || 0,
      };
    } catch (error) {
      console.error('Error parsing primary feedback response:', error);
      return null;
    }
  }

  /**
   * Parse secondary feedback response
   */
  private parseSecondaryFeedbackResponse(responseText: string, recordingData: any, transcription: any): SecondaryFeedbackData | null {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        studentName: recordingData.student_name,
        motion: recordingData.motion || recordingData.speech_topic || 'Speech Motion',
        rubricScores: parsed.rubricScores || {
          rubric_1: 3, rubric_2: 3, rubric_3: 3, rubric_4: 3,
          rubric_5: 3, rubric_6: 3, rubric_7: 3, rubric_8: 3
        },
        teacherComments: parsed.teacherComments || 'AI-generated feedback based on speech analysis.',
        speechDuration: recordingData.duration_seconds ? 
          Math.floor(recordingData.duration_seconds / 60) + ':' + 
          String(Math.floor(recordingData.duration_seconds % 60)).padStart(2, '0') : 'Unknown',
        instructor: recordingData.instructor_name || 'AI Generated',
        topic: recordingData.speech_topic || recordingData.motion || 'Speech Topic',
        transcriptionConfidence: transcription.confidence_score || 0,
      };
    } catch (error) {
      console.error('Error parsing secondary feedback response:', error);
      return null;
    }
  }

  /**
   * Calculate confidence metrics for feedback quality
   */
  private calculateConfidenceMetrics(responseText: string, transcription: any): {
    overallScore: number;
    contentRelevance: number;
    rubricAccuracy: number;
    feedbackQuality: number;
  } {
    // Basic heuristic scoring - could be enhanced with more sophisticated NLP
    const transcriptionConfidence = transcription.confidence_score || 0;
    const responseLength = responseText.length;
    const hasSpecificExamples = /speech|said|mentioned|stated/i.test(responseText);
    const hasActionableAdvice = /should|could|try|practice|improve|focus/i.test(responseText);
    
    // Simple scoring algorithm
    let contentRelevance = transcriptionConfidence;
    let feedbackQuality = 0.7;
    
    if (hasSpecificExamples) feedbackQuality += 0.1;
    if (hasActionableAdvice) feedbackQuality += 0.1;
    if (responseLength > 200) feedbackQuality += 0.1;
    
    const rubricAccuracy = 0.8; // Default - could be enhanced with validation
    const overallScore = (contentRelevance + feedbackQuality + rubricAccuracy) / 3;

    return {
      overallScore: Math.min(overallScore, 1.0),
      contentRelevance,
      rubricAccuracy,
      feedbackQuality: Math.min(feedbackQuality, 1.0),
    };
  }

  /**
   * Get recording data from database
   */
  private async getRecordingData(recordingId: string): Promise<any> {
    const result = await executeQuery(`
      SELECT sr.*, s.name as student_name, u.name as instructor_name, 
             cls.name as class_name, cls.code as class_code
      FROM speech_recordings sr
      JOIN students s ON sr.student_id = s.id
      JOIN users u ON sr.instructor_id = u.id
      LEFT JOIN sessions sess ON sr.session_id = sess.id
      LEFT JOIN courses cls ON sess.course_id = cls.id
      WHERE sr.id = $1
    `, [recordingId]);

    return result.rows[0] || null;
  }

  /**
   * Get transcription data from database
   */
  private async getTranscriptionData(recordingId: string): Promise<any> {
    const result = await executeQuery(
      'SELECT * FROM speech_transcriptions WHERE recording_id = $1 ORDER BY created_at DESC LIMIT 1',
      [recordingId]
    );

    return result.rows[0] || null;
  }

  /**
   * Store feedback result in database
   */
  private async storeFeedbackResult(
    recordingId: string,
    transcriptionId: string,
    result: FeedbackGenerationResult,
    options: FeedbackGenerationOptions
  ): Promise<string> {
    const feedback = result.primaryFeedback || result.secondaryFeedback;
    if (!feedback) throw new Error('No feedback data to store');

    // Generate unique ID for compatibility with existing system
    const timestamp = Date.now();
    const studentName = feedback.studentName.replace(/\s+/g, '_');
    const motion = (feedback.motion || 'speech').substring(0, 50).replace(/\s+/g, '_');
    const uniqueId = `AI_${studentName}_${options.feedbackType}_${timestamp}_${motion}`;

    const insertResult = await executeQuery(
      `INSERT INTO ai_generated_feedback (
        recording_id, transcription_id, feedback_type, transcription_text,
        strengths, improvement_areas, rubric_scores, teacher_comments,
        model_version, generation_prompt, confidence_metrics,
        status, generation_started_at, generation_completed_at,
        unique_id, motion, topic, duration, instructor
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) 
      RETURNING id`,
      [
        recordingId,
        transcriptionId,
        options.feedbackType,
        result.primaryFeedback?.transcriptionConfidence ? 'Included' : 'Not included',
        result.primaryFeedback ? result.primaryFeedback.strengths : null,
        result.primaryFeedback ? result.primaryFeedback.improvements : null,
        result.secondaryFeedback ? JSON.stringify(result.secondaryFeedback.rubricScores) : null,
        result.secondaryFeedback ? result.secondaryFeedback.teacherComments : 
          result.primaryFeedback ? `Strengths: ${result.primaryFeedback.strengths.join('; ')}. Areas for improvement: ${result.primaryFeedback.improvements.join('; ')}.` : null,
        'gemini-2.5-flash',
        'AI-generated using structured prompts',
        JSON.stringify(result.confidenceMetrics),
        'completed',
        new Date().toISOString(),
        new Date().toISOString(),
        uniqueId,
        feedback.motion,
        'topic' in feedback ? feedback.topic : feedback.motion,
        feedback.speechDuration,
        feedback.instructor,
      ]
    );

    // Update recording status
    await executeQuery(
      'UPDATE speech_recordings SET status = $1 WHERE id = $2',
      ['feedback_generated', recordingId]
    );

    return insertResult.rows[0].id;
  }
}

// Export singleton instance
export const aiFeedbackGenerator = new AIFeedbackGenerator();

// Helper functions
export async function getFeedbackGenerationStats(): Promise<{
  totalGenerated: number;
  byType: Record<string, number>;
  avgConfidence: number;
  reviewRate: number;
}> {
  const result = await executeQuery(`
    SELECT 
      feedback_type,
      COUNT(*) as count,
      AVG((confidence_metrics->>'overallScore')::decimal) as avg_confidence,
      COUNT(CASE WHEN reviewed_by IS NOT NULL THEN 1 END) as reviewed_count
    FROM ai_generated_feedback 
    WHERE status = 'completed'
    GROUP BY feedback_type
  `);

  const stats = {
    totalGenerated: 0,
    byType: {} as Record<string, number>,
    avgConfidence: 0,
    reviewRate: 0,
  };

  let totalConfidence = 0;
  let totalReviewed = 0;

  for (const row of result.rows) {
    const count = parseInt(row.count);
    const reviewedCount = parseInt(row.reviewed_count || '0');
    
    stats.totalGenerated += count;
    stats.byType[row.feedback_type] = count;
    totalConfidence += parseFloat(row.avg_confidence || '0') * count;
    totalReviewed += reviewedCount;
  }

  if (stats.totalGenerated > 0) {
    stats.avgConfidence = totalConfidence / stats.totalGenerated;
    stats.reviewRate = totalReviewed / stats.totalGenerated;
  }

  return stats;
}