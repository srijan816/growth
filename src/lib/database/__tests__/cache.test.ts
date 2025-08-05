import { CacheManager } from '../cache';
import { createClient } from 'redis';

// Mock Redis client
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    quit: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
    mGet: jest.fn(),
    multi: jest.fn(),
    info: jest.fn(),
    on: jest.fn(),
  }))
}));

describe('CacheManager', () => {
  let cache: CacheManager;
  let mockRedisClient: any;

  beforeEach(() => {
    mockRedisClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      get: jest.fn(),
      set: jest.fn().mockResolvedValue('OK'),
      setEx: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
      mGet: jest.fn(),
      multi: jest.fn(() => ({
        setEx: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      })),
      info: jest.fn().mockResolvedValue(''),
      on: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockRedisClient);
    cache = new CacheManager('redis://localhost:6379');
    
    // Simulate connected state
    cache['connected'] = true;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should create Redis client with correct configuration', () => {
      expect(createClient).toHaveBeenCalledWith({
        url: 'redis://localhost:6379',
        socket: expect.objectContaining({
          reconnectStrategy: expect.any(Function)
        })
      });
    });

    it('should handle connection events', () => {
      expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockRedisClient.on).toHaveBeenCalledWith('end', expect.any(Function));
    });

    it('should connect when not connected', async () => {
      cache['connected'] = false;
      await cache.connect();
      expect(mockRedisClient.connect).toHaveBeenCalled();
    });

    it('should not reconnect if already connected', async () => {
      cache['connected'] = true;
      await cache.connect();
      expect(mockRedisClient.connect).not.toHaveBeenCalled();
    });
  });

  describe('Basic Operations', () => {
    describe('get', () => {
      it('should retrieve and parse cached values', async () => {
        const testData = { id: 1, name: 'Test' };
        mockRedisClient.get.mockResolvedValue(JSON.stringify(testData));

        const result = await cache.get('test-key');
        
        expect(mockRedisClient.get).toHaveBeenCalledWith('growth_compass:test-key');
        expect(result).toEqual(testData);
      });

      it('should return null for missing keys', async () => {
        mockRedisClient.get.mockResolvedValue(null);

        const result = await cache.get('missing-key');
        
        expect(result).toBeNull();
      });

      it('should handle custom prefix', async () => {
        mockRedisClient.get.mockResolvedValue('null');

        await cache.get('key', { prefix: 'custom:' });
        
        expect(mockRedisClient.get).toHaveBeenCalledWith('custom:key');
      });

      it('should return null when not connected', async () => {
        cache['connected'] = false;
        
        const result = await cache.get('key');
        
        expect(result).toBeNull();
        expect(mockRedisClient.get).not.toHaveBeenCalled();
      });
    });

    describe('set', () => {
      it('should serialize and store values with TTL', async () => {
        const testData = { id: 1, name: 'Test' };
        
        const result = await cache.set('test-key', testData, { ttl: 300 });
        
        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          'growth_compass:test-key',
          300,
          JSON.stringify(testData)
        );
        expect(result).toBe(true);
      });

      it('should store without TTL when ttl is 0', async () => {
        const testData = { id: 1 };
        
        await cache.set('test-key', testData, { ttl: 0 });
        
        expect(mockRedisClient.set).toHaveBeenCalledWith(
          'growth_compass:test-key',
          JSON.stringify(testData)
        );
      });

      it('should use default TTL when not specified', async () => {
        await cache.set('test-key', 'value');
        
        expect(mockRedisClient.setEx).toHaveBeenCalledWith(
          'growth_compass:test-key',
          3600,
          '"value"'
        );
      });

      it('should return false when not connected', async () => {
        cache['connected'] = false;
        
        const result = await cache.set('key', 'value');
        
        expect(result).toBe(false);
        expect(mockRedisClient.setEx).not.toHaveBeenCalled();
      });
    });

    describe('delete', () => {
      it('should delete key and return true on success', async () => {
        mockRedisClient.del.mockResolvedValue(1);
        
        const result = await cache.delete('test-key');
        
        expect(mockRedisClient.del).toHaveBeenCalledWith('growth_compass:test-key');
        expect(result).toBe(true);
      });

      it('should return false when key not found', async () => {
        mockRedisClient.del.mockResolvedValue(0);
        
        const result = await cache.delete('missing-key');
        
        expect(result).toBe(false);
      });
    });

    describe('deletePattern', () => {
      it('should delete keys matching pattern', async () => {
        mockRedisClient.keys.mockResolvedValue([
          'growth_compass:user:1:profile',
          'growth_compass:user:1:settings'
        ]);
        mockRedisClient.del.mockResolvedValue(2);
        
        const result = await cache.deletePattern('user:1:*');
        
        expect(mockRedisClient.keys).toHaveBeenCalledWith('growth_compass:user:1:*');
        expect(mockRedisClient.del).toHaveBeenCalledWith([
          'growth_compass:user:1:profile',
          'growth_compass:user:1:settings'
        ]);
        expect(result).toBe(2);
      });

      it('should return 0 when no keys match', async () => {
        mockRedisClient.keys.mockResolvedValue([]);
        
        const result = await cache.deletePattern('nonexistent:*');
        
        expect(result).toBe(0);
        expect(mockRedisClient.del).not.toHaveBeenCalled();
      });
    });
  });

  describe('Cache Decorator', () => {
    it('should cache function results', async () => {
      const expensiveFunction = jest.fn().mockResolvedValue({ data: 'result' });
      const cachedFunction = cache.cache(expensiveFunction, { ttl: 60 });
      
      mockRedisClient.get.mockResolvedValue(null); // Cache miss
      
      // First call - cache miss
      const result1 = await cachedFunction('arg1', 'arg2');
      expect(expensiveFunction).toHaveBeenCalledWith('arg1', 'arg2');
      expect(mockRedisClient.setEx).toHaveBeenCalled();
      
      // Set up cache hit
      mockRedisClient.get.mockResolvedValue(JSON.stringify({ data: 'result' }));
      expensiveFunction.mockClear();
      
      // Second call - cache hit
      const result2 = await cachedFunction('arg1', 'arg2');
      expect(expensiveFunction).not.toHaveBeenCalled();
      expect(result2).toEqual({ data: 'result' });
    });

    it('should use custom key generator', async () => {
      const fn = jest.fn().mockResolvedValue('result');
      const cachedFn = cache.cache(fn, {
        keyGenerator: (a, b) => `custom:${a}:${b}`
      });
      
      mockRedisClient.get.mockResolvedValue(null);
      
      await cachedFn('foo', 'bar');
      
      expect(mockRedisClient.get).toHaveBeenCalledWith(
        expect.stringContaining('custom:foo:bar')
      );
    });
  });

  describe('Invalidation Helpers', () => {
    it('should invalidate student-related caches', async () => {
      mockRedisClient.keys
        .mockResolvedValueOnce(['growth_compass:student:123:profile'])
        .mockResolvedValueOnce(['growth_compass:attendance:student:123:stats']);
      
      await cache.invalidateStudent('123');
      
      expect(mockRedisClient.keys).toHaveBeenCalledWith('growth_compass:student:123:*');
      expect(mockRedisClient.keys).toHaveBeenCalledWith('growth_compass:*:student:123:*');
    });

    it('should invalidate course-related caches', async () => {
      mockRedisClient.keys
        .mockResolvedValueOnce(['growth_compass:course:456:details'])
        .mockResolvedValueOnce(['growth_compass:enrollment:course:456:students']);
      
      await cache.invalidateCourse('456');
      
      expect(mockRedisClient.keys).toHaveBeenCalledWith('growth_compass:course:456:*');
      expect(mockRedisClient.keys).toHaveBeenCalledWith('growth_compass:*:course:456:*');
    });
  });

  describe('Batch Operations', () => {
    describe('mget', () => {
      it('should get multiple values', async () => {
        const values = [
          JSON.stringify({ id: 1 }),
          null,
          JSON.stringify({ id: 3 })
        ];
        mockRedisClient.mGet.mockResolvedValue(values);
        
        const result = await cache.mget(['key1', 'key2', 'key3']);
        
        expect(mockRedisClient.mGet).toHaveBeenCalledWith([
          'growth_compass:key1',
          'growth_compass:key2',
          'growth_compass:key3'
        ]);
        expect(result).toEqual([
          { id: 1 },
          null,
          { id: 3 }
        ]);
      });

      it('should return null array when not connected', async () => {
        cache['connected'] = false;
        
        const result = await cache.mget(['key1', 'key2']);
        
        expect(result).toEqual([null, null]);
      });
    });

    describe('mset', () => {
      it('should set multiple values with TTL', async () => {
        const items = [
          { key: 'key1', value: { id: 1 }, ttl: 60 },
          { key: 'key2', value: { id: 2 } }
        ];
        
        const result = await cache.mset(items, { ttl: 120 });
        
        const multi = mockRedisClient.multi();
        expect(multi.setEx).toHaveBeenCalledWith(
          'growth_compass:key1',
          60,
          JSON.stringify({ id: 1 })
        );
        expect(multi.setEx).toHaveBeenCalledWith(
          'growth_compass:key2',
          120,
          JSON.stringify({ id: 2 })
        );
        expect(multi.exec).toHaveBeenCalled();
        expect(result).toBe(true);
      });
    });
  });

  describe('Statistics', () => {
    it('should return cache statistics', async () => {
      mockRedisClient.info
        .mockResolvedValueOnce('used_memory:1048576\r\nother_stat:value')
        .mockResolvedValueOnce('keyspace_hits:1000\r\nkeyspace_misses:100');
      
      const stats = await cache.getStats();
      
      expect(stats).toEqual({
        connected: true,
        memoryUsage: 1048576,
        hits: 1000,
        misses: 100
      });
    });

    it('should handle stats errors gracefully', async () => {
      mockRedisClient.info.mockRejectedValue(new Error('Stats error'));
      
      const stats = await cache.getStats();
      
      expect(stats).toEqual({ connected: true });
    });
  });

  describe('Error Handling', () => {
    it('should handle get errors gracefully', async () => {
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));
      
      const result = await cache.get('key');
      
      expect(result).toBeNull();
    });

    it('should handle set errors gracefully', async () => {
      mockRedisClient.setEx.mockRejectedValue(new Error('Redis error'));
      
      const result = await cache.set('key', 'value');
      
      expect(result).toBe(false);
    });

    it('should handle JSON parse errors', async () => {
      mockRedisClient.get.mockResolvedValue('invalid json');
      
      const result = await cache.get('key');
      
      expect(result).toBeNull();
    });
  });
});