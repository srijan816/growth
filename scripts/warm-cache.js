#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { warmupCache, checkCacheHealth } = require('../src/lib/cache/cache-manager');
const { executeQuery } = require('../src/lib/postgres');

async function warmCache() {
  console.log('🔥 Starting cache warming process...');
  
  try {
    // Check Redis connection
    const cacheHealthy = await checkCacheHealth();
    if (!cacheHealthy) {
      console.error('❌ Redis is not available. Exiting...');
      process.exit(1);
    }
    
    console.log('✅ Redis connection established');
    
    // Get all active instructors
    const instructorsResult = await executeQuery(`
      SELECT DISTINCT u.id, u.name
      FROM users u
      JOIN courses c ON c.instructor_id = u.id
      WHERE u.role = 'instructor' AND c.status = 'active'
    `);
    
    const instructors = instructorsResult.rows;
    console.log(`📊 Found ${instructors.length} active instructors`);
    
    // Warm cache for each instructor
    for (const instructor of instructors) {
      console.log(`  Warming cache for ${instructor.name}...`);
      
      // Get instructor's courses
      const coursesResult = await executeQuery(`
        SELECT id FROM courses 
        WHERE instructor_id = $1 AND status = 'active'
      `, [instructor.id]);
      
      const courseIds = coursesResult.rows.map(r => r.id);
      
      // Warm up caches
      await warmupCache(instructor.id, courseIds);
      
      console.log(`  ✅ Cached data for ${courseIds.length} courses`);
    }
    
    console.log('🎉 Cache warming completed successfully!');
    
  } catch (error) {
    console.error('❌ Cache warming failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  warmCache().then(() => {
    process.exit(0);
  });
}

module.exports = { warmCache };