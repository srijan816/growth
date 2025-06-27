import { Queue, Worker, ConnectionOptions } from 'bullmq';
import Redis from 'ioredis';

// Redis connection configuration
const redisConfig: ConnectionOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

// Create Redis connection with error handling
let connection: Redis;
try {
  connection = new Redis({
    ...redisConfig,
    lazyConnect: true,
    enableOfflineQueue: false,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 0,
  });
  
  connection.on('error', (err) => {
    console.warn('Redis connection error:', err.message);
  });
} catch (error) {
  console.warn('Redis not available, queue functionality disabled');
  connection = null as any;
}

// Define job types
export enum JobType {
  AI_ANALYSIS = 'ai-analysis',
  TRANSCRIPTION = 'transcription',
  EXCEL_IMPORT = 'excel-import',
  FEEDBACK_PARSING = 'feedback-parsing',
  DOCUMENT_GENERATION = 'document-generation',
  BATCH_ANALYSIS = 'batch-analysis',
}

// Define job data interfaces
export interface AIAnalysisJobData {
  studentId: string;
  feedbackIds: string[];
  analysisType: 'growth' | 'recommendations' | 'patterns';
}

export interface TranscriptionJobData {
  recordingId: string;
  audioFilePath: string;
  studentId: string;
  sessionId: string;
}

export interface ExcelImportJobData {
  filePath: string;
  userId: string;
  importType: 'students' | 'courses' | 'schedules';
}

export interface FeedbackParsingJobData {
  filePath: string;
  instructor: string;
  courseCode: string;
}

// Create queues for different job types (only if Redis is available)
export const queues = connection ? {
  aiAnalysis: new Queue<AIAnalysisJobData>(JobType.AI_ANALYSIS, { connection }),
  transcription: new Queue<TranscriptionJobData>(JobType.TRANSCRIPTION, { connection }),
  excelImport: new Queue<ExcelImportJobData>(JobType.EXCEL_IMPORT, { connection }),
  feedbackParsing: new Queue<FeedbackParsingJobData>(JobType.FEEDBACK_PARSING, { connection }),
} : {} as any;

// Note: QueueScheduler is deprecated in newer versions of BullMQ
// Job scheduling is now handled automatically by the queues

// Helper function to add jobs with standard options
export async function addJob<T>(
  queue: Queue<T>,
  data: T,
  options?: {
    priority?: number;
    delay?: number;
    attempts?: number;
    backoff?: {
      type: 'exponential' | 'fixed';
      delay: number;
    };
  }
) {
  const defaultOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // Keep completed jobs for 1 hour
      count: 100, // Keep last 100 completed jobs
    },
    removeOnFail: {
      age: 24 * 3600, // Keep failed jobs for 24 hours
    },
  };

  return await queue.add(
    `${queue.name}-${Date.now()}`,
    data,
    { ...defaultOptions, ...options }
  );
}

// Job status tracking
export async function getJobStatus(queueName: string, jobId: string) {
  const queue = Object.values(queues).find(q => q.name === queueName);
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
  }

  const job = await queue.getJob(jobId);
  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress;
  const result = job.returnvalue;
  const failedReason = job.failedReason;

  return {
    id: job.id,
    name: job.name,
    data: job.data,
    state,
    progress,
    result,
    failedReason,
    createdAt: new Date(job.timestamp),
    processedAt: job.processedOn ? new Date(job.processedOn) : null,
    finishedAt: job.finishedOn ? new Date(job.finishedOn) : null,
  };
}

// Graceful shutdown
export async function closeQueues() {
  await Promise.all([
    ...Object.values(queues).map(q => q.close()),
    connection.quit(),
  ]);
}