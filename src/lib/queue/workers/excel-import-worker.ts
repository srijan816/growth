import { Worker, Job } from 'bullmq';
import { ExcelImportJobData, JobType } from '../queue-manager';
import { parseExcelFile } from '@/lib/excel-parser';
import { executeQuery } from '@/lib/postgres';
import fs from 'fs/promises';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

async function processExcelImport(job: Job<ExcelImportJobData>) {
  const { filePath, userId, importType } = job.data;
  
  await job.updateProgress(5);
  
  try {
    // Verify file exists
    await fs.access(filePath);
    await job.updateProgress(10);
    
    // Create import record
    const importResult = await executeQuery(
      `INSERT INTO import_logs (
        user_id, 
        import_type, 
        file_name, 
        status, 
        started_at
      ) VALUES ($1, $2, $3, 'processing', NOW())
      RETURNING id`,
      [userId, importType, filePath.split('/').pop()]
    );
    
    const importId = importResult.rows[0].id;
    await job.updateProgress(15);
    
    // Parse Excel file
    const data = await parseExcelFile(filePath);
    await job.updateProgress(30);
    
    let processedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    switch (importType) {
      case 'students':
        for (const row of data) {
          try {
            await job.updateProgress(30 + (processedCount / data.length) * 60);
            
            // Validate required fields
            if (!row.name || !row.email) {
              errors.push(`Row ${processedCount + 1}: Missing name or email`);
              errorCount++;
              continue;
            }
            
            // Insert or update student
            await executeQuery(
              `INSERT INTO users (name, email, role, created_at)
               VALUES ($1, $2, 'student', NOW())
               ON CONFLICT (email) DO UPDATE 
               SET name = EXCLUDED.name, updated_at = NOW()`,
              [row.name, row.email]
            );
            
            processedCount++;
          } catch (error) {
            errorCount++;
            errors.push(`Row ${processedCount + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        break;
        
      case 'courses':
        for (const row of data) {
          try {
            await job.updateProgress(30 + (processedCount / data.length) * 60);
            
            if (!row.code || !row.name) {
              errors.push(`Row ${processedCount + 1}: Missing course code or name`);
              errorCount++;
              continue;
            }
            
            await executeQuery(
              `INSERT INTO courses (code, name, instructor_id, created_at)
               VALUES ($1, $2, $3, NOW())
               ON CONFLICT (code) DO UPDATE 
               SET name = EXCLUDED.name, updated_at = NOW()`,
              [row.code, row.name, userId]
            );
            
            processedCount++;
          } catch (error) {
            errorCount++;
            errors.push(`Row ${processedCount + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        break;
        
      case 'schedules':
        // Handle schedule imports
        for (const row of data) {
          try {
            await job.updateProgress(30 + (processedCount / data.length) * 60);
            
            // Schedule import logic here
            processedCount++;
          } catch (error) {
            errorCount++;
            errors.push(`Row ${processedCount + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        }
        break;
        
      default:
        throw new Error(`Unknown import type: ${importType}`);
    }
    
    await job.updateProgress(90);
    
    // Update import record
    await executeQuery(
      `UPDATE import_logs 
       SET status = $1,
           processed_count = $2,
           error_count = $3,
           error_details = $4,
           completed_at = NOW()
       WHERE id = $5`,
      [
        errorCount > 0 ? 'completed_with_errors' : 'completed',
        processedCount,
        errorCount,
        errors.length > 0 ? JSON.stringify(errors) : null,
        importId
      ]
    );
    
    // Clean up uploaded file
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('Failed to delete uploaded file:', error);
    }
    
    await job.updateProgress(100);
    
    return {
      success: true,
      importId,
      processedCount,
      errorCount,
      errors: errors.slice(0, 10), // Return first 10 errors
      timestamp: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error('Excel import job failed:', error);
    
    // Update import record as failed
    if (importResult?.rows[0]?.id) {
      await executeQuery(
        `UPDATE import_logs 
         SET status = 'failed',
             error_details = $1,
             completed_at = NOW()
         WHERE id = $2`,
        [
          JSON.stringify([error instanceof Error ? error.message : 'Unknown error']),
          importResult.rows[0].id
        ]
      );
    }
    
    throw error;
  }
}

// Create and export the worker
export const excelImportWorker = new Worker<ExcelImportJobData>(
  JobType.EXCEL_IMPORT,
  processExcelImport,
  {
    connection: redisConfig,
    concurrency: 2, // Process 2 imports concurrently
  }
);

// Worker event handlers
excelImportWorker.on('completed', (job) => {
  console.log(`Excel import job ${job.id} completed successfully`);
});

excelImportWorker.on('failed', (job, err) => {
  console.error(`Excel import job ${job?.id} failed:`, err);
});

excelImportWorker.on('progress', (job, progress) => {
  console.log(`Excel import job ${job.id} progress: ${progress}%`);
});