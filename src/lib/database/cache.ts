import { createClient, RedisClientType } from 'redis';
import { createHash } from 'crypto';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  compress?: boolean;
}

export class CacheManager {
  private client: RedisClientType;
  private connected: boolean = false;
  private defaultTTL: number = 3600; // 1 hour
  private keyPrefix: string = 'growth_compass:';

  constructor(redisUrl?: string) {
    this.client = createClient({
      url: redisUrl || process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis: Max reconnection attempts reached');
            return false;
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.connected = false;
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
      this.connected = true;
    });

    this.client.on('ready', () => {
      console.log('Redis Client Ready');
      this.connected = true;
    });

    this.client.on('end', () => {
      console.log('Redis Client Disconnected');
      this.connected = false;
    });
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.client.quit();
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  private generateKey(key: string, prefix?: string): string {
    const finalPrefix = prefix || this.keyPrefix;
    return `${finalPrefix}${key}`;
  }

  private generateCacheKey(identifier: string, params?: any): string {
    if (!params) {
      return identifier;
    }
    
    // Create a consistent hash of the parameters
    const paramString = JSON.stringify(params, Object.keys(params).sort());
    const hash = createHash('md5').update(paramString).digest('hex');
    return `${identifier}:${hash}`;
  }

  async get<T>(key: string, options?: CacheOptions): Promise<T | null> {
    if (!this.connected) {
      console.warn('Redis not connected, skipping cache get');
      return null;
    }

    try {
      const fullKey = this.generateKey(key, options?.prefix);
      const value = await this.client.get(fullKey);
      
      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<boolean> {
    if (!this.connected) {
      console.warn('Redis not connected, skipping cache set');
      return false;
    }

    try {
      const fullKey = this.generateKey(key, options?.prefix);
      const ttl = options?.ttl || this.defaultTTL;
      const serialized = JSON.stringify(value);
      
      if (ttl > 0) {
        await this.client.setEx(fullKey, ttl, serialized);
      } else {
        await this.client.set(fullKey, serialized);
      }
      
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async delete(key: string, options?: CacheOptions): Promise<boolean> {
    if (!this.connected) {
      return false;
    }

    try {
      const fullKey = this.generateKey(key, options?.prefix);
      const result = await this.client.del(fullKey);
      return result > 0;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async deletePattern(pattern: string, options?: CacheOptions): Promise<number> {
    if (!this.connected) {
      return 0;
    }

    try {
      const fullPattern = this.generateKey(pattern, options?.prefix);
      const keys = await this.client.keys(fullPattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      return await this.client.del(keys);
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return 0;
    }
  }

  async flush(prefix?: string): Promise<void> {
    if (!this.connected) {
      return;
    }

    try {
      if (prefix) {
        await this.deletePattern(`${prefix}*`);
      } else {
        // Only flush keys with our default prefix
        await this.deletePattern('*', { prefix: this.keyPrefix });
      }
    } catch (error) {
      console.error('Cache flush error:', error);
    }
  }

  // Decorator for caching function results
  cache<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    options?: CacheOptions & { keyGenerator?: (...args: Parameters<T>) => string }
  ): T {
    const self = this;
    
    return (async function(...args: Parameters<T>): Promise<ReturnType<T>> {
      // Generate cache key
      const key = options?.keyGenerator 
        ? options.keyGenerator(...args)
        : self.generateCacheKey(fn.name, args);
      
      // Try to get from cache
      const cached = await self.get<ReturnType<T>>(key, options);
      if (cached !== null) {
        return cached;
      }
      
      // Execute function
      const result = await fn(...args);
      
      // Store in cache
      await self.set(key, result, options);
      
      return result;
    }) as T;
  }

  // Invalidation helpers
  async invalidateStudent(studentId: string): Promise<void> {
    await this.deletePattern(`student:${studentId}:*`);
    await this.deletePattern(`*:student:${studentId}:*`);
  }

  async invalidateCourse(courseId: string): Promise<void> {
    await this.deletePattern(`course:${courseId}:*`);
    await this.deletePattern(`*:course:${courseId}:*`);
  }

  async invalidateInstructor(instructorId: string): Promise<void> {
    await this.deletePattern(`instructor:${instructorId}:*`);
    await this.deletePattern(`*:instructor:${instructorId}:*`);
  }

  // Batch operations
  async mget<T>(keys: string[], options?: CacheOptions): Promise<(T | null)[]> {
    if (!this.connected || keys.length === 0) {
      return keys.map(() => null);
    }

    try {
      const fullKeys = keys.map(k => this.generateKey(k, options?.prefix));
      const values = await this.client.mGet(fullKeys);
      
      return values.map(v => v ? JSON.parse(v) as T : null);
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  async mset<T>(items: { key: string; value: T; ttl?: number }[], options?: CacheOptions): Promise<boolean> {
    if (!this.connected || items.length === 0) {
      return false;
    }

    try {
      const pipeline = this.client.multi();
      
      for (const item of items) {
        const fullKey = this.generateKey(item.key, options?.prefix);
        const ttl = item.ttl || options?.ttl || this.defaultTTL;
        const serialized = JSON.stringify(item.value);
        
        if (ttl > 0) {
          pipeline.setEx(fullKey, ttl, serialized);
        } else {
          pipeline.set(fullKey, serialized);
        }
      }
      
      await pipeline.exec();
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      return false;
    }
  }

  // Statistics
  async getStats(): Promise<{
    connected: boolean;
    memoryUsage?: number;
    keys?: number;
    hits?: number;
    misses?: number;
  }> {
    if (!this.connected) {
      return { connected: false };
    }

    try {
      const info = await this.client.info('memory');
      const stats = await this.client.info('stats');
      
      // Parse Redis INFO output
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const keysMatch = stats.match(/keyspace_hits:(\d+)/);
      const missesMatch = stats.match(/keyspace_misses:(\d+)/);
      
      return {
        connected: true,
        memoryUsage: memoryMatch ? parseInt(memoryMatch[1]) : undefined,
        hits: keysMatch ? parseInt(keysMatch[1]) : undefined,
        misses: missesMatch ? parseInt(missesMatch[1]) : undefined,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return { connected: this.connected };
    }
  }
}

// Create singleton instance
let cacheInstance: CacheManager | null = null;

export function getCache(): CacheManager {
  if (!cacheInstance) {
    cacheInstance = new CacheManager();
    // Auto-connect in background
    cacheInstance.connect().catch(err => {
      console.error('Failed to connect to Redis:', err);
    });
  }
  return cacheInstance;
}

// Export convenience functions
export const cache = getCache();