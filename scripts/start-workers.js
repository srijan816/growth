#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Check if Redis is configured
if (!process.env.REDIS_HOST) {
  console.warn('⚠️  REDIS_HOST not configured, using localhost');
  process.env.REDIS_HOST = 'localhost';
}

if (!process.env.REDIS_PORT) {
  console.warn('⚠️  REDIS_PORT not configured, using 6379');
  process.env.REDIS_PORT = '6379';
}

console.log('🚀 Starting Capstone Evolve background workers...');
console.log(`📍 Redis connection: ${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`);

// Import and start workers
import('../src/lib/queue/workers/index.ts')
  .then(({ startWorkers }) => {
    startWorkers();
    console.log('✅ All workers started successfully');
  })
  .catch((error) => {
    console.error('❌ Failed to start workers:', error);
    process.exit(1);
  });

// Keep process alive
process.stdin.resume();