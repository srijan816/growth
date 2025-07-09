import { executeQuery } from './postgres';
import { storageService } from './storage-service';

export type TranscriptionProvider = 'openai';

export interface TranscriptionConfig {
  openai: {
    apiKey: string;
    baseUrl?: string;
  };
}

export interface TranscriptionOptions {
  language?: string;
  speaker_labels?: boolean;
  auto_punctuation?: boolean;
  filter_profanity?: boolean;
  format_text?: boolean;
  word_boost?: string[];
  boost_param?: 'low' | 'default' | 'high';
}

export interface TranscriptionResult {
  success: boolean;
  transcriptionId?: string;
  text?: string;
  confidence?: number;
  wordCount?: number;
  speakingRate?: number; // words per minute
  processingTime?: number; // seconds
  error?: string;
  providerJobId?: string;
  providerResponse?: any;
}

export interface TranscriptionStatus {
  id: string;
  recordingId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  provider: TranscriptionProvider;
  progress?: number;
  error?: string;
}

export class TranscriptionService {
  private config: TranscriptionConfig;

  constructor(config?: TranscriptionConfig) {
    this.config = {
      openai: {
        apiKey: process.env.OPENAI_API_KEY || '',
        baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      },
      ...config,
    };
  }

  /**
   * Transcribe an audio recording
   */
  async transcribeRecording(
    recordingId: string,
    provider: TranscriptionProvider = 'openai',
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    try {
      // Get audio file URL
      const audioUrl = await storageService.getFileUrl(recordingId);
      if (!audioUrl) {
        return { success: false, error: 'Audio file not found' };
      }

      // Use OpenAI for transcription
      const result = await this.transcribeWithOpenAI(recordingId, audioUrl, options);

      // Store transcription result in database
      if (result.success && result.text) {
        await this.storeTranscriptionResult(recordingId, provider, result);
      }

      return result;
    } catch (error) {
      console.error('Transcription error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transcription failed',
      };
    }
  }

  /**
   * Get transcription status
   */
  async getTranscriptionStatus(recordingId: string): Promise<TranscriptionStatus | null> {
    try {
      const result = await executeQuery(
        `SELECT st.*, sr.status as recording_status 
         FROM speech_transcriptions st 
         JOIN speech_recordings sr ON st.recording_id = sr.id 
         WHERE st.recording_id = $1 
         ORDER BY st.created_at DESC 
         LIMIT 1`,
        [recordingId]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      let status: 'queued' | 'processing' | 'completed' | 'failed' = 'queued';
      
      if (row.transcription_text) {
        status = 'completed';
      } else if (row.provider_job_id) {
        status = 'processing';
      }

      return {
        id: row.id,
        recordingId: row.recording_id,
        status,
        provider: row.provider,
        error: row.error,
      };
    } catch (error) {
      console.error('Error getting transcription status:', error);
      return null;
    }
  }


  // Private method for OpenAI transcription

  private async transcribeWithOpenAI(
    recordingId: string,
    audioUrl: string,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    if (!this.config.openai?.apiKey) {
      return { success: false, error: 'OpenAI API key not configured' };
    }

    try {
      const startTime = Date.now();

      // Get the audio file URL from storage
      const audioFileUrl = await storageService.getFileUrl(recordingId);
      if (!audioFileUrl) {
        return { success: false, error: 'Could not retrieve audio file URL' };
      }

      // Download the file from the URL
      const audioResponse = await fetch(audioFileUrl);
      if (!audioResponse.ok) {
        return { success: false, error: 'Could not download audio file' };
      }

      const audioBuffer = await audioResponse.arrayBuffer();
      const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });

      // Create form data for OpenAI API
      const formData = new FormData();
      formData.append('file', audioBlob, `recording-${recordingId}.wav`);
      formData.append('model', 'gpt-4o-mini-transcribe');
      formData.append('response_format', 'verbose_json');

      const response = await fetch(`${this.config.openai.baseUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.openai.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      const processingTime = Math.floor((Date.now() - startTime) / 1000);
      const wordCount = result.text?.split(/\s+/).filter(word => word.length > 0).length || 0;
      const speakingRate = result.duration && result.duration > 0
        ? Math.round((wordCount / result.duration) * 60) 
        : 0;

      return {
        success: true,
        text: result.text || '',
        confidence: result.segments?.reduce((acc, seg) => acc + (seg.no_speech_prob || 0), 0) / (result.segments?.length || 1) || 0.95,
        wordCount,
        speakingRate,
        processingTime,
        providerResponse: result,
      };
    } catch (error) {
      console.error('OpenAI transcription error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OpenAI transcription failed',
      };
    }
  }

  private async storeTranscriptionResult(
    recordingId: string,
    provider: TranscriptionProvider,
    result: TranscriptionResult
  ): Promise<string> {
    const transcriptionResult = await executeQuery(
      `INSERT INTO speech_transcriptions (
        recording_id, transcription_text, confidence_score, provider,
        provider_job_id, provider_response, transcription_started_at,
        transcription_completed_at, processing_duration_seconds,
        word_count, speaking_rate
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [
        recordingId,
        result.text,
        result.confidence,
        provider,
        result.providerJobId,
        JSON.stringify(result.providerResponse),
        new Date(Date.now() - (result.processingTime || 0) * 1000).toISOString(),
        new Date().toISOString(),
        result.processingTime,
        result.wordCount,
        result.speakingRate,
      ]
    );

    // Update recording status
    await executeQuery(
      'UPDATE speech_recordings SET status = $1 WHERE id = $2',
      ['transcribed', recordingId]
    );

    return transcriptionResult.rows[0].id;
  }

  private async updateTranscriptionResult(
    transcriptionId: string,
    result: any
  ): Promise<void> {
    await executeQuery(
      `UPDATE speech_transcriptions SET 
        transcription_text = $1,
        confidence_score = $2,
        transcription_completed_at = $3,
        word_count = $4,
        speaking_rate = $5
       WHERE id = $6`,
      [
        result.text,
        result.confidence,
        new Date().toISOString(),
        result.wordCount,
        result.speakingRate,
        transcriptionId,
      ]
    );
  }
}

// Export singleton instance
export const transcriptionService = new TranscriptionService();

// Helper functions
export async function getTranscriptionStats(): Promise<{
  total: number;
  byProvider: Record<TranscriptionProvider, number>;
  avgConfidence: number;
  avgProcessingTime: number;
}> {
  const result = await executeQuery(`
    SELECT 
      provider,
      COUNT(*) as count,
      AVG(confidence_score) as avg_confidence,
      AVG(processing_duration_seconds) as avg_processing_time
    FROM speech_transcriptions 
    WHERE transcription_text IS NOT NULL
    GROUP BY provider
  `);

  const stats = {
    total: 0,
    byProvider: {} as Record<TranscriptionProvider, number>,
    avgConfidence: 0,
    avgProcessingTime: 0,
  };

  let totalConfidence = 0;
  let totalProcessingTime = 0;

  for (const row of result.rows) {
    const count = parseInt(row.count);
    stats.total += count;
    stats.byProvider[row.provider as TranscriptionProvider] = count;
    totalConfidence += parseFloat(row.avg_confidence || '0') * count;
    totalProcessingTime += parseFloat(row.avg_processing_time || '0') * count;
  }

  if (stats.total > 0) {
    stats.avgConfidence = totalConfidence / stats.total;
    stats.avgProcessingTime = totalProcessingTime / stats.total;
  }

  return stats;
}