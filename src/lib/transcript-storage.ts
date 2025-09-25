import fs from 'fs/promises';
import path from 'path';
import { executeQuery } from './postgres';
import { v4 as uuidv4 } from 'uuid';

export interface TranscriptMetadata {
  id: string;
  recordingId: string;
  studentId: string;
  studentName: string;
  sessionDate: Date;
  speechTopic: string;
  motion: string;
  speechType: string;
  duration: number;
  wordCount: number;
  speakerSegments?: Array<{
    speaker: string;
    transcript: string;
    startTime: number;
    endTime?: number;
  }>;
}

export class TranscriptStorage {
  private basePath: string;

  constructor() {
    this.basePath = path.resolve(
      process.cwd(), 
      process.env.TRANSCRIPT_PATH || './data/recordings/transcripts'
    );
  }

  /**
   * Save transcript to both filesystem and database
   */
  async saveTranscript(
    recordingId: string,
    transcriptText: string,
    metadata: Partial<TranscriptMetadata>
  ): Promise<{ success: boolean; transcriptId?: string; error?: string }> {
    try {
      // Ensure transcript directory exists
      await fs.mkdir(this.basePath, { recursive: true });

      const transcriptId = uuidv4();
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${timestamp}_${recordingId}_transcript.txt`;
      const filepath = path.join(this.basePath, filename);

      // Save to filesystem
      await fs.writeFile(filepath, transcriptText, 'utf8');
      console.log(`📝 Transcript saved to: ${filepath}`);

      // Save metadata to database
      await executeQuery(
        `INSERT INTO speech_transcriptions (
          id, recording_id, transcription_text, transcription_provider,
          confidence_score, word_count, speaking_rate, language_code,
          file_path, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (recording_id) 
        DO UPDATE SET 
          transcription_text = EXCLUDED.transcription_text,
          updated_at = CURRENT_TIMESTAMP,
          file_path = EXCLUDED.file_path`,
        [
          transcriptId,
          recordingId,
          transcriptText,
          metadata.provider || 'gpt-4o-mini',
          metadata.confidence || 0.95,
          metadata.wordCount || transcriptText.split(/\s+/).length,
          metadata.speakingRate || 150,
          metadata.language || 'en',
          filepath,
          JSON.stringify({
            studentName: metadata.studentName,
            speechTopic: metadata.speechTopic,
            motion: metadata.motion,
            speechType: metadata.speechType,
            speakerSegments: metadata.speakerSegments || []
          })
        ]
      );

      // Also save a formatted version with metadata
      const formattedContent = this.formatTranscriptWithMetadata(transcriptText, metadata);
      const formattedFilename = `${timestamp}_${recordingId}_formatted.md`;
      const formattedPath = path.join(this.basePath, formattedFilename);
      await fs.writeFile(formattedPath, formattedContent, 'utf8');
      console.log(`📄 Formatted transcript saved to: ${formattedPath}`);

      return { success: true, transcriptId };
    } catch (error) {
      console.error('Error saving transcript:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to save transcript' 
      };
    }
  }

  /**
   * Retrieve transcript from storage
   */
  async getTranscript(recordingId: string): Promise<{
    text?: string;
    metadata?: any;
    filepath?: string;
    error?: string;
  }> {
    try {
      // First try to get from database
      const result = await executeQuery(
        `SELECT st.*, sr.student_id, s.name as student_name,
                sr.speech_topic, sr.motion, sr.speech_type, sr.duration_seconds
         FROM speech_transcriptions st
         JOIN speech_recordings sr ON st.recording_id = sr.id
         LEFT JOIN students s ON sr.student_id = s.id
         WHERE st.recording_id = $1`,
        [recordingId]
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          text: row.transcription_text,
          metadata: {
            ...JSON.parse(row.metadata || '{}'),
            studentName: row.student_name,
            speechTopic: row.speech_topic,
            motion: row.motion,
            speechType: row.speech_type,
            duration: row.duration_seconds,
            wordCount: row.word_count,
            confidence: row.confidence_score,
            provider: row.transcription_provider
          },
          filepath: row.file_path
        };
      }

      // Try to find file in filesystem
      const files = await fs.readdir(this.basePath);
      const transcriptFile = files.find(f => f.includes(recordingId) && f.endsWith('_transcript.txt'));
      
      if (transcriptFile) {
        const filepath = path.join(this.basePath, transcriptFile);
        const text = await fs.readFile(filepath, 'utf8');
        return { text, filepath };
      }

      return { error: 'Transcript not found' };
    } catch (error) {
      console.error('Error retrieving transcript:', error);
      return { error: error instanceof Error ? error.message : 'Failed to retrieve transcript' };
    }
  }

  /**
   * Get all transcripts for a student
   */
  async getStudentTranscripts(studentId: string): Promise<any[]> {
    try {
      const result = await executeQuery(
        `SELECT st.*, sr.speech_topic, sr.motion, sr.speech_type, 
                sr.created_at as recording_date, s.name as student_name
         FROM speech_transcriptions st
         JOIN speech_recordings sr ON st.recording_id = sr.id
         JOIN students s ON sr.student_id = s.id
         WHERE sr.student_id = $1
         ORDER BY sr.created_at DESC`,
        [studentId]
      );

      return result.rows.map(row => ({
        recordingId: row.recording_id,
        transcriptId: row.id,
        studentName: row.student_name,
        speechTopic: row.speech_topic,
        motion: row.motion,
        speechType: row.speech_type,
        recordingDate: row.recording_date,
        wordCount: row.word_count,
        confidence: row.confidence_score,
        provider: row.transcription_provider,
        hasFile: !!row.file_path
      }));
    } catch (error) {
      console.error('Error fetching student transcripts:', error);
      return [];
    }
  }

  /**
   * Export transcript as different formats
   */
  async exportTranscript(
    recordingId: string, 
    format: 'txt' | 'md' | 'json' | 'pdf' = 'txt'
  ): Promise<{ content?: string; filename?: string; error?: string }> {
    try {
      const { text, metadata } = await this.getTranscript(recordingId);
      if (!text) {
        return { error: 'Transcript not found' };
      }

      const timestamp = new Date().toISOString().split('T')[0];
      let content: string;
      let filename: string;

      switch (format) {
        case 'md':
          content = this.formatTranscriptWithMetadata(text, metadata);
          filename = `transcript_${timestamp}_${metadata?.studentName || 'unknown'}.md`;
          break;
        
        case 'json':
          content = JSON.stringify({ text, metadata }, null, 2);
          filename = `transcript_${timestamp}_${metadata?.studentName || 'unknown'}.json`;
          break;
        
        case 'pdf':
          // Would require a PDF library like puppeteer or pdfkit
          return { error: 'PDF export not yet implemented' };
        
        case 'txt':
        default:
          content = text;
          filename = `transcript_${timestamp}_${metadata?.studentName || 'unknown'}.txt`;
      }

      return { content, filename };
    } catch (error) {
      console.error('Error exporting transcript:', error);
      return { error: error instanceof Error ? error.message : 'Export failed' };
    }
  }

  /**
   * Format transcript with metadata for better readability
   */
  private formatTranscriptWithMetadata(text: string, metadata: any): string {
    const lines = [
      '# Speech Transcript',
      '',
      '## Metadata',
      `- **Student**: ${metadata.studentName || 'Unknown'}`,
      `- **Date**: ${new Date().toLocaleDateString()}`,
      `- **Topic**: ${metadata.speechTopic || 'N/A'}`,
      `- **Motion**: ${metadata.motion || 'N/A'}`,
      `- **Type**: ${metadata.speechType || 'Speech'}`,
      `- **Duration**: ${metadata.duration ? `${Math.floor(metadata.duration / 60)}:${(metadata.duration % 60).toString().padStart(2, '0')}` : 'N/A'}`,
      `- **Word Count**: ${metadata.wordCount || text.split(/\s+/).length}`,
      '',
      '## Transcript',
      ''
    ];

    // Add speaker segments if available
    if (metadata.speakerSegments && metadata.speakerSegments.length > 0) {
      lines.push('### Speaker Segments');
      lines.push('');
      metadata.speakerSegments.forEach((segment: any) => {
        lines.push(`**${segment.speaker}** (${this.formatTime(segment.startTime)}${segment.endTime ? ` - ${this.formatTime(segment.endTime)}` : ''})`);
        lines.push('');
        lines.push(segment.transcript);
        lines.push('');
      });
    } else {
      // Add the plain transcript
      lines.push(text);
    }

    lines.push('');
    lines.push('---');
    lines.push(`*Generated on ${new Date().toISOString()}*`);

    return lines.join('\n');
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Search transcripts by keyword
   */
  async searchTranscripts(
    keyword: string,
    filters?: {
      studentId?: string;
      startDate?: Date;
      endDate?: Date;
      speechType?: string;
    }
  ): Promise<any[]> {
    try {
      let query = `
        SELECT st.*, sr.student_id, sr.speech_topic, sr.motion, 
               sr.speech_type, sr.created_at as recording_date,
               s.name as student_name
        FROM speech_transcriptions st
        JOIN speech_recordings sr ON st.recording_id = sr.id
        LEFT JOIN students s ON sr.student_id = s.id
        WHERE st.transcription_text ILIKE $1
      `;
      
      const params: any[] = [`%${keyword}%`];
      let paramCount = 1;

      if (filters?.studentId) {
        paramCount++;
        query += ` AND sr.student_id = $${paramCount}`;
        params.push(filters.studentId);
      }

      if (filters?.startDate) {
        paramCount++;
        query += ` AND sr.created_at >= $${paramCount}`;
        params.push(filters.startDate);
      }

      if (filters?.endDate) {
        paramCount++;
        query += ` AND sr.created_at <= $${paramCount}`;
        params.push(filters.endDate);
      }

      if (filters?.speechType) {
        paramCount++;
        query += ` AND sr.speech_type = $${paramCount}`;
        params.push(filters.speechType);
      }

      query += ' ORDER BY sr.created_at DESC';

      const result = await executeQuery(query, params);

      return result.rows.map(row => ({
        recordingId: row.recording_id,
        transcriptId: row.id,
        studentName: row.student_name,
        speechTopic: row.speech_topic,
        motion: row.motion,
        speechType: row.speech_type,
        recordingDate: row.recording_date,
        excerpt: this.getExcerpt(row.transcription_text, keyword),
        wordCount: row.word_count,
        confidence: row.confidence_score
      }));
    } catch (error) {
      console.error('Error searching transcripts:', error);
      return [];
    }
  }

  private getExcerpt(text: string, keyword: string): string {
    const index = text.toLowerCase().indexOf(keyword.toLowerCase());
    if (index === -1) return text.substring(0, 150) + '...';
    
    const start = Math.max(0, index - 50);
    const end = Math.min(text.length, index + keyword.length + 100);
    
    return (start > 0 ? '...' : '') + 
           text.substring(start, end) + 
           (end < text.length ? '...' : '');
  }
}

// Export singleton instance
export const transcriptStorage = new TranscriptStorage();