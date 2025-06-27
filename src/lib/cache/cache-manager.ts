import Redis from 'ioredis';
import { unstable_cache } from 'next/cache';

// Redis client for API-level caching
let redis: Redis;
try {
  redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: 0,
    lazyConnect: true,
    enableOfflineQueue: false,
    retryStrategy: () => null, // Don't retry during build
  });
  
  redis.on('error', (err) => {
    console.warn('Redis caching error:', err.message);
  });
} catch (error) {
  console.warn('Redis not available, caching disabled');
  redis = null as any;
}

// Cache key prefixes
export const CachePrefix = {
  DASHBOARD: 'dashboard:',
  STUDENT: 'student:',
  COURSE: 'course:',
  FEEDBACK: 'feedback:',
  ANALYTICS: 'analytics:',
  SCHEDULE: 'schedule:',
} as const;

// Cache TTL values (in seconds)
export const CacheTTL = {
  SHORT: 60, // 1 minute
  MEDIUM: 300, // 5 minutes
  LONG: 3600, // 1 hour
  DAILY: 86400, // 24 hours
} as const;

// Generic cache get/set functions
export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const cached = await redis.get(key);
    if (!cached) return null;
    return JSON.parse(cached) as T;
  } catch (error) {
    console.warn('Cache get error:', error);
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: any,
  ttl: number = CacheTTL.MEDIUM
): Promise<void> {
  if (!redis) return;
  try {
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.warn('Cache set error:', error);
  }
}

export async function cacheDelete(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.warn('Cache delete error:', error);
  }
}

// Cached database query wrapper
export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl: number = CacheTTL.MEDIUM
): Promise<T> {
  // Try to get from cache first
  const cached = await cacheGet<T>(key);
  if (cached) {
    return cached;
  }

  // Execute query and cache result
  const result = await queryFn();
  await cacheSet(key, result, ttl);
  return result;
}

// Next.js server-side caching wrappers
export const cachedDashboardStats = unstable_cache(
  async (instructorId: string) => {
    const key = `${CachePrefix.DASHBOARD}stats:${instructorId}`;
    return cachedQuery(
      key,
      async () => {
        // Import here to avoid circular dependency
        const { executeQuery } = await import('@/lib/postgres');
        
        const statsQuery = `
          SELECT 
            COUNT(DISTINCT c.id) as total_courses,
            COUNT(DISTINCT e.student_id) as total_students,
            COUNT(DISTINCT s.id) as upcoming_sessions
          FROM courses c
          LEFT JOIN enrollments e ON e.course_id = c.id AND e.status = 'active'
          LEFT JOIN sessions s ON s.course_id = c.id AND s.session_date >= CURRENT_DATE
          WHERE c.instructor_id = $1
        `;
        
        const result = await executeQuery(statsQuery, [instructorId]);
        return result.rows[0];
      },
      CacheTTL.MEDIUM
    );
  },
  ['dashboard-stats'],
  {
    revalidate: 300, // 5 minutes
    tags: ['dashboard'],
  }
);

export const cachedStudentList = unstable_cache(
  async (courseId: string) => {
    const key = `${CachePrefix.COURSE}students:${courseId}`;
    return cachedQuery(
      key,
      async () => {
        const { executeQuery } = await import('@/lib/postgres');
        
        const query = `
          SELECT 
            u.id,
            u.name,
            u.email,
            s.student_number,
            e.id as enrollment_id
          FROM enrollments e
          JOIN students s ON e.student_id = s.id
          JOIN users u ON s.id = u.id
          WHERE e.course_id = $1 AND e.status = 'active'
          ORDER BY u.name
        `;
        
        const result = await executeQuery(query, [courseId]);
        return result.rows;
      },
      CacheTTL.LONG
    );
  },
  ['course-students'],
  {
    revalidate: 3600, // 1 hour
    tags: ['students'],
  }
);

export const cachedFeedbackAnalysis = unstable_cache(
  async (studentId: string, program: string) => {
    const key = `${CachePrefix.ANALYTICS}feedback:${studentId}:${program}`;
    return cachedQuery(
      key,
      async () => {
        const { executeQuery } = await import('@/lib/postgres');
        
        const query = `
          SELECT 
            psf.*,
            um.unit_number,
            um.lesson_number
          FROM parsed_student_feedback psf
          LEFT JOIN unit_mapping um ON psf.unique_id = um.parsed_feedback_id
          WHERE psf.student_name = (
            SELECT name FROM users WHERE id = $1
          )
          AND psf.course_code LIKE $2
          ORDER BY psf.created_at DESC
          LIMIT 10
        `;
        
        const result = await executeQuery(query, [studentId, `%${program}%`]);
        return result.rows;
      },
      CacheTTL.LONG
    );
  },
  ['feedback-analysis'],
  {
    revalidate: 3600, // 1 hour
    tags: ['feedback', 'analytics'],
  }
);

// Cache invalidation helpers
export async function invalidateDashboardCache(instructorId?: string) {
  if (instructorId) {
    await cacheDelete(`${CachePrefix.DASHBOARD}*:${instructorId}`);
  } else {
    await cacheDelete(`${CachePrefix.DASHBOARD}*`);
  }
}

export async function invalidateStudentCache(studentId?: string) {
  if (studentId) {
    await cacheDelete(`${CachePrefix.STUDENT}*:${studentId}`);
  } else {
    await cacheDelete(`${CachePrefix.STUDENT}*`);
  }
}

export async function invalidateCourseCache(courseId?: string) {
  if (courseId) {
    await cacheDelete(`${CachePrefix.COURSE}*:${courseId}`);
  } else {
    await cacheDelete(`${CachePrefix.COURSE}*`);
  }
}

// Batch cache operations
export async function warmupCache(instructorId: string, courseIds: string[]) {
  const promises = [];
  
  // Warm up dashboard stats
  promises.push(cachedDashboardStats(instructorId));
  
  // Warm up course student lists
  for (const courseId of courseIds) {
    promises.push(cachedStudentList(courseId));
  }
  
  await Promise.allSettled(promises);
}

// Redis health check
export async function checkCacheHealth(): Promise<boolean> {
  if (!redis) return false;
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.warn('Redis health check failed:', error);
    return false;
  }
}

// Graceful shutdown
export async function closeCacheConnection() {
  if (redis) {
    await redis.quit();
  }
}