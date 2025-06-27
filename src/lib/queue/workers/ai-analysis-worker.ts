import { Worker, Job } from 'bullmq';
import { AIAnalysisJobData, JobType } from '../queue-manager';
import { geminiAnalyzeStudent } from '@/lib/gemini-analysis';
import { generateAIRecommendations } from '@/lib/ai-recommendations';
import { executeQuery } from '@/lib/postgres';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

async function processAIAnalysis(job: Job<AIAnalysisJobData>) {
  const { studentId, feedbackIds, analysisType } = job.data;
  
  // Update job progress
  await job.updateProgress(10);
  
  try {
    // Fetch student data
    const studentQuery = `
      SELECT u.name, u.email, s.student_number 
      FROM users u 
      JOIN students s ON s.id = u.id 
      WHERE u.id = $1
    `;
    const studentResult = await executeQuery(studentQuery, [studentId]);
    
    if (!studentResult.rows[0]) {
      throw new Error(`Student not found: ${studentId}`);
    }
    
    const student = studentResult.rows[0];
    await job.updateProgress(20);
    
    // Fetch feedback data
    const feedbackQuery = `
      SELECT * FROM parsed_student_feedback 
      WHERE unique_id = ANY($1::text[])
      ORDER BY created_at DESC
    `;
    const feedbackResult = await executeQuery(feedbackQuery, [feedbackIds]);
    
    await job.updateProgress(40);
    
    let result;
    
    switch (analysisType) {
      case 'growth':
        // Analyze growth patterns
        result = await geminiAnalyzeStudent(
          student.name,
          feedbackResult.rows,
          'growth-analysis'
        );
        await job.updateProgress(80);
        break;
        
      case 'recommendations':
        // Generate AI recommendations
        result = await generateAIRecommendations({
          studentName: student.name,
          feedbackData: feedbackResult.rows,
          focusAreas: ['skill-development', 'next-steps'],
        });
        await job.updateProgress(80);
        break;
        
      case 'patterns':
        // Analyze patterns across feedback
        result = await geminiAnalyzeStudent(
          student.name,
          feedbackResult.rows,
          'pattern-recognition'
        );
        await job.updateProgress(80);
        break;
        
      default:
        throw new Error(`Unknown analysis type: ${analysisType}`);
    }
    
    // Store results in database
    const insertQuery = `
      INSERT INTO ai_analysis_results (
        student_id,
        analysis_type,
        result_data,
        created_at
      ) VALUES ($1, $2, $3, NOW())
      RETURNING id
    `;
    
    const insertResult = await executeQuery(insertQuery, [
      studentId,
      analysisType,
      JSON.stringify(result),
    ]);
    
    await job.updateProgress(100);
    
    return {
      success: true,
      analysisId: insertResult.rows[0].id,
      studentName: student.name,
      analysisType,
      timestamp: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error('AI Analysis job failed:', error);
    throw error;
  }
}

// Create and export the worker
export const aiAnalysisWorker = new Worker<AIAnalysisJobData>(
  JobType.AI_ANALYSIS,
  processAIAnalysis,
  {
    connection: redisConfig,
    concurrency: 2, // Process 2 jobs concurrently
    limiter: {
      max: 10,
      duration: 60000, // Max 10 jobs per minute (API rate limiting)
    },
  }
);

// Worker event handlers
aiAnalysisWorker.on('completed', (job) => {
  console.log(`AI Analysis job ${job.id} completed successfully`);
});

aiAnalysisWorker.on('failed', (job, err) => {
  console.error(`AI Analysis job ${job?.id} failed:`, err);
});

aiAnalysisWorker.on('progress', (job, progress) => {
  console.log(`AI Analysis job ${job.id} progress: ${progress}%`);
});