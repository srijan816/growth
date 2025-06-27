import { aiAnalysisWorker } from './ai-analysis-worker';
import { transcriptionWorker } from './transcription-worker';
import { excelImportWorker } from './excel-import-worker';

// Export all workers
export const workers = {
  aiAnalysis: aiAnalysisWorker,
  transcription: transcriptionWorker,
  excelImport: excelImportWorker,
};

// Start all workers
export function startWorkers() {
  console.log('Starting background job workers...');
  
  // Workers are automatically started when imported
  // Log worker status
  Object.entries(workers).forEach(([name, worker]) => {
    console.log(`✅ ${name} worker started`);
    
    // Add global error handling
    worker.on('error', (error) => {
      console.error(`❌ ${name} worker error:`, error);
    });
  });
}

// Graceful shutdown
export async function stopWorkers() {
  console.log('Stopping background job workers...');
  
  await Promise.all(
    Object.entries(workers).map(async ([name, worker]) => {
      await worker.close();
      console.log(`✅ ${name} worker stopped`);
    })
  );
}

// Handle process termination
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down workers...');
  await stopWorkers();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down workers...');
  await stopWorkers();
  process.exit(0);
});