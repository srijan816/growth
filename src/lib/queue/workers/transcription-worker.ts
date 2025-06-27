import { Worker, Job } from 'bullmq';
import { TranscriptionJobData, JobType } from '../queue-manager';
import { transcribeAudio } from '@/lib/transcription-service';
import { executeQuery } from '@/lib/postgres';
import fs from 'fs/promises';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

async function processTranscription(job: Job<TranscriptionJobData>) {
  const { recordingId, audioFilePath, studentId, sessionId } = job.data;
  
  await job.updateProgress(5);
  
  try {
    // Verify audio file exists
    await fs.access(audioFilePath);
    await job.updateProgress(10);
    
    // Update recording status to processing
    await executeQuery(
      `UPDATE speech_recordings 
       SET status = 'processing', updated_at = NOW() 
       WHERE id = $1`,
      [recordingId]
    );
    
    await job.updateProgress(15);
    
    // Perform transcription
    console.log(`Starting transcription for recording ${recordingId}`);
    const transcriptionResult = await transcribeAudio(audioFilePath, {
      language: 'en',
      model: 'gpt-4o-mini-transcribe',
      prompt: 'This is a student debate speech recording.',
    });
    
    await job.updateProgress(70);
    
    // Extract transcription text
    const transcriptionText = transcriptionResult.text || transcriptionResult.transcription || '';
    
    if (!transcriptionText) {
      throw new Error('Transcription returned empty text');
    }
    
    // Update recording with transcription
    await executeQuery(
      `UPDATE speech_recordings 
       SET transcription = $1, 
           status = 'transcribed',
           updated_at = NOW() 
       WHERE id = $2`,
      [transcriptionText, recordingId]
    );
    
    await job.updateProgress(85);
    
    // Optional: Trigger AI feedback generation
    // This could be added to a separate queue
    const shouldGenerateFeedback = process.env.AUTO_GENERATE_FEEDBACK === 'true';
    
    if (shouldGenerateFeedback) {
      // Add to AI feedback queue
      console.log(`Queuing AI feedback generation for recording ${recordingId}`);
    }
    
    await job.updateProgress(100);
    
    return {
      success: true,
      recordingId,
      transcriptionLength: transcriptionText.length,
      wordCount: transcriptionText.split(/\s+/).length,
      timestamp: new Date().toISOString(),
    };
    
  } catch (error) {
    // Update recording status to failed
    await executeQuery(
      `UPDATE speech_recordings 
       SET status = 'transcription_failed',
           error_message = $1,
           updated_at = NOW() 
       WHERE id = $2`,
      [error instanceof Error ? error.message : 'Unknown error', recordingId]
    );
    
    console.error('Transcription job failed:', error);
    throw error;
  }
}

// Create and export the worker
export const transcriptionWorker = new Worker<TranscriptionJobData>(
  JobType.TRANSCRIPTION,
  processTranscription,
  {
    connection: redisConfig,
    concurrency: 3, // Process 3 jobs concurrently
    limiter: {
      max: 20,
      duration: 60000, // Max 20 jobs per minute
    },
  }
);

// Worker event handlers
transcriptionWorker.on('completed', (job) => {
  console.log(`Transcription job ${job.id} completed successfully`);
});

transcriptionWorker.on('failed', (job, err) => {
  console.error(`Transcription job ${job?.id} failed:`, err);
});

transcriptionWorker.on('progress', (job, progress) => {
  console.log(`Transcription job ${job.id} progress: ${progress}%`);
});