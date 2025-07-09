import Queue from 'bull';
import Redis from 'ioredis';

// Redis connection
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  lazyConnect: true,
};

// Create Redis instance
export const redis = new Redis(redisConfig);

// Queue definitions
export const feedbackQueue = new Queue('feedback processing', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 10,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

export const transcriptionQueue = new Queue('speech transcription', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 5,
    removeOnFail: 20,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

export const analyticsQueue = new Queue('analytics processing', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 5,
    removeOnFail: 10,
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 3000,
    },
  },
});

export const notificationQueue = new Queue('notifications', {
  redis: redisConfig,
  defaultJobOptions: {
    removeOnComplete: 20,
    removeOnFail: 5,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
  },
});

// Job types
export interface FeedbackProcessingJob {
  type: 'parse_document' | 'generate_ai_feedback' | 'batch_analyze';
  data: {
    documentPath?: string;
    studentId?: string;
    courseId?: string;
    audioFileUrl?: string;
    batchIds?: string[];
    uploadId?: string;
    metadata?: Record<string, any>;
  };
  priority?: number;
  delay?: number;
}

export interface TranscriptionJob {
  type: 'transcribe_audio' | 'chunk_audio' | 'process_realtime';
  data: {
    audioFileUrl: string;
    studentId: string;
    sessionId: string;
    format: 'wav' | 'mp3' | 'webm';
    language?: string;
    speakerCount?: number;
    metadata?: Record<string, any>;
  };
}

export interface AnalyticsJob {
  type: 'calculate_growth_metrics' | 'generate_reports' | 'update_dashboards';
  data: {
    studentIds?: string[];
    courseIds?: string[];
    dateRange?: {
      start: Date;
      end: Date;
    };
    reportType?: string;
    metadata?: Record<string, any>;
  };
}

export interface NotificationJob {
  type: 'email' | 'sms' | 'push' | 'webhook';
  data: {
    recipients: string[];
    template: string;
    variables: Record<string, any>;
    priority: 'low' | 'normal' | 'high' | 'urgent';
    metadata?: Record<string, any>;
  };
}

// Queue management class
export class QueueManager {
  private static instance: QueueManager;
  
  private constructor() {
    this.setupEventHandlers();
  }
  
  public static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }
  
  async addFeedbackJob(job: FeedbackProcessingJob): Promise<Queue.Job> {
    return feedbackQueue.add(job.type, job.data, {
      priority: job.priority || 0,
      delay: job.delay || 0,
    });
  }
  
  async addTranscriptionJob(job: TranscriptionJob): Promise<Queue.Job> {
    return transcriptionQueue.add(job.type, job.data);
  }
  
  async addAnalyticsJob(job: AnalyticsJob): Promise<Queue.Job> {
    return analyticsQueue.add(job.type, job.data);
  }
  
  async addNotificationJob(job: NotificationJob): Promise<Queue.Job> {
    return notificationQueue.add(job.type, job.data, {
      priority: this.getPriorityValue(job.data.priority),
    });
  }
  
  async addBulkFeedbackJobs(jobs: FeedbackProcessingJob[]): Promise<Queue.Job[]> {
    const bulkData = jobs.map(job => ({
      name: job.type,
      data: job.data,
      opts: {
        priority: job.priority || 0,
        delay: job.delay || 0,
      },
    }));
    
    return feedbackQueue.addBulk(bulkData);
  }
  
  async getQueueStats() {
    const [feedbackStats, transcriptionStats, analyticsStats, notificationStats] = await Promise.all([
      this.getStats(feedbackQueue),
      this.getStats(transcriptionQueue),
      this.getStats(analyticsQueue),
      this.getStats(notificationQueue),
    ]);
    
    return {
      feedback: feedbackStats,
      transcription: transcriptionStats,
      analytics: analyticsStats,
      notification: notificationStats,
    };
  }
  
  private async getStats(queue: Queue.Queue) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaiting(),
      queue.getActive(),
      queue.getCompleted(),
      queue.getFailed(),
      queue.getDelayed(),
    ]);
    
    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      total: waiting.length + active.length + completed.length + failed.length + delayed.length,
    };
  }
  
  async pauseQueue(queueName: 'feedback' | 'transcription' | 'analytics' | 'notification') {
    const queue = this.getQueue(queueName);
    await queue.pause();
  }
  
  async resumeQueue(queueName: 'feedback' | 'transcription' | 'analytics' | 'notification') {
    const queue = this.getQueue(queueName);
    await queue.resume();
  }
  
  async cleanQueue(queueName: 'feedback' | 'transcription' | 'analytics' | 'notification', grace: number = 0) {
    const queue = this.getQueue(queueName);
    await queue.clean(grace, 'completed');
    await queue.clean(grace, 'failed');
  }
  
  async retryFailedJobs(queueName: 'feedback' | 'transcription' | 'analytics' | 'notification') {
    const queue = this.getQueue(queueName);
    const failedJobs = await queue.getFailed();
    
    for (const job of failedJobs) {
      await job.retry();
    }
    
    return failedJobs.length;
  }
  
  private getQueue(queueName: string): Queue.Queue {
    switch (queueName) {
      case 'feedback':
        return feedbackQueue;
      case 'transcription':
        return transcriptionQueue;
      case 'analytics':
        return analyticsQueue;
      case 'notification':
        return notificationQueue;
      default:
        throw new Error(`Unknown queue: ${queueName}`);
    }
  }
  
  private getPriorityValue(priority: string): number {
    switch (priority) {
      case 'urgent':
        return 10;
      case 'high':
        return 5;
      case 'normal':
        return 0;
      case 'low':
        return -5;
      default:
        return 0;
    }
  }
  
  private setupEventHandlers() {
    [feedbackQueue, transcriptionQueue, analyticsQueue, notificationQueue].forEach(queue => {
      queue.on('error', (error) => {
        console.error(`Queue ${queue.name} error:`, error);
      });
      
      queue.on('failed', (job, err) => {
        console.error(`Job ${job.id} in queue ${queue.name} failed:`, err);
      });
      
      queue.on('stalled', (job) => {
        console.warn(`Job ${job.id} in queue ${queue.name} stalled`);
      });
    });
  }
  
  async shutdown() {
    console.log('Shutting down queue manager...');
    
    await Promise.all([
      feedbackQueue.close(),
      transcriptionQueue.close(),
      analyticsQueue.close(),
      notificationQueue.close(),
    ]);
    
    await redis.disconnect();
    console.log('Queue manager shutdown complete');
  }
}

export const queueManager = QueueManager.getInstance();