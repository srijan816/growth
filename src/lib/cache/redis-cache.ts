import Redis from 'ioredis';

// Cache configuration
const CACHE_TTL = {
  GROWTH_DATA: 3600,      // 1 hour
  STUDENT_LIST: 1800,     // 30 minutes  
  ATTENDANCE: 900,        // 15 minutes
  FEEDBACK: 3600,         // 1 hour
  DASHBOARD: 600,         // 10 minutes
} as const;

class CacheService {
  private redis: Redis | null = null;
  private enabled: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      // Only enable Redis if configured
      if (process.env.REDIS_HOST) {
        this.redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          maxRetriesPerRequest: 3,
          retryStrategy: (times) => {
            if (times > 3) return null;
            return Math.min(times * 100, 3000);
          }
        });

        this.redis.on('connect', () => {
          console.log('✅ Redis cache connected');
          this.enabled = true;
        });

        this.redis.on('error', (err) => {
          console.warn('Redis cache error:', err.message);
          this.enabled = false;
        });
      } else {
        console.log('ℹ️ Redis cache disabled (no REDIS_HOST configured)');
      }
    } catch (error) {
      console.warn('Failed to initialize Redis cache:', error);
      this.enabled = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled || !this.redis) return null;

    try {
      const data = await this.redis.get(key);
      if (data) {
        console.log(`Cache HIT: ${key}`);
        return JSON.parse(data);
      }
      console.log(`Cache MISS: ${key}`);
      return null;
    } catch (error) {
      console.warn(`Cache GET error for ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.enabled || !this.redis) return;

    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.redis.setex(key, ttl, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
      console.log(`Cache SET: ${key} (TTL: ${ttl || 'none'})`);
    } catch (error) {
      console.warn(`Cache SET error for ${key}:`, error);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    if (!this.enabled || !this.redis) return;

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
        console.log(`Cache INVALIDATED: ${keys.length} keys matching ${pattern}`);
      }
    } catch (error) {
      console.warn(`Cache invalidation error for ${pattern}:`, error);
    }
  }

  async flush(): Promise<void> {
    if (!this.enabled || !this.redis) return;

    try {
      await this.redis.flushdb();
      console.log('Cache FLUSHED: All keys removed');
    } catch (error) {
      console.warn('Cache flush error:', error);
    }
  }

  // Convenience methods for common cache keys
  getCacheKey = {
    growth: (studentId: string, timeframe: string) => 
      `growth:${studentId}:${timeframe}`,
    
    studentList: (instructorId?: string) => 
      instructorId ? `students:instructor:${instructorId}` : 'students:all',
    
    attendance: (studentId: string, date: string) => 
      `attendance:${studentId}:${date}`,
    
    feedback: (studentId: string) => 
      `feedback:${studentId}`,
    
    dashboard: (userId: string) => 
      `dashboard:${userId}`,
    
    course: (courseId: string) => 
      `course:${courseId}`,
    
    session: (sessionId: string) => 
      `session:${sessionId}`
  };

  getTTL(type: keyof typeof CACHE_TTL): number {
    return CACHE_TTL[type];
  }
}

// Export singleton instance
export const cache = new CacheService();

// Decorator for caching method results
export function Cacheable(keyGenerator: (...args: any[]) => string, ttl?: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = keyGenerator(...args);
      
      // Try to get from cache
      const cached = await cache.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);
      
      // Store in cache
      if (result !== null && result !== undefined) {
        await cache.set(cacheKey, result, ttl);
      }

      return result;
    };

    return descriptor;
  };
}