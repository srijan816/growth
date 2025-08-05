import { DatabaseConnection } from '../connection';
import { Pool } from 'pg';

// Mock pg module
jest.mock('pg', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  
  const mockPool = {
    connect: jest.fn().mockResolvedValue(mockClient),
    query: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
    totalCount: 10,
    idleCount: 5,
    waitingCount: 0,
  };
  
  return {
    Pool: jest.fn(() => mockPool),
    mockClient,
    mockPool,
  };
});

describe('DatabaseConnection', () => {
  let db: DatabaseConnection;
  let mockPool: any;
  let mockClient: any;
  
  beforeEach(() => {
    // Clear singleton instance
    (DatabaseConnection as any).instance = null;
    
    // Get mocks
    const pg = require('pg');
    mockPool = pg.mockPool;
    mockClient = pg.mockClient;
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Set up environment
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
    
    db = DatabaseConnection.getInstance();
  });
  
  afterEach(() => {
    delete process.env.DATABASE_URL;
    delete process.env.DATABASE_READ_URL;
  });

  describe('Connection Configuration', () => {
    it('should use DATABASE_URL when available', () => {
      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionString: 'postgresql://test:test@localhost:5432/test_db',
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
          statement_timeout: 30000,
          query_timeout: 30000,
          application_name: 'growth-compass',
        })
      );
    });

    it('should fall back to individual env vars when DATABASE_URL is not set', () => {
      delete process.env.DATABASE_URL;
      process.env.POSTGRES_HOST = 'custom-host';
      process.env.POSTGRES_PORT = '5433';
      process.env.POSTGRES_DB = 'custom_db';
      
      (DatabaseConnection as any).instance = null;
      const customDb = DatabaseConnection.getInstance();
      
      expect(Pool).toHaveBeenLastCalledWith(
        expect.objectContaining({
          host: 'custom-host',
          port: 5433,
          database: 'custom_db',
        })
      );
    });

    it('should configure SSL for production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      (DatabaseConnection as any).instance = null;
      const prodDb = DatabaseConnection.getInstance();
      
      expect(Pool).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ssl: { rejectUnauthorized: false }
        })
      );
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should set up read replica when DATABASE_READ_URL is provided', () => {
      process.env.DATABASE_READ_URL = 'postgresql://read:read@localhost:5432/test_db';
      
      (DatabaseConnection as any).instance = null;
      const dbWithReplica = DatabaseConnection.getInstance();
      
      expect(Pool).toHaveBeenCalledTimes(2); // Main pool + read pool
    });
  });

  describe('Table Validation', () => {
    it('should validate allowed tables', () => {
      expect(db.validateTable('users')).toBe('users');
      expect(db.validateTable('students')).toBe('students');
      expect(db.validateTable('courses')).toBe('courses');
    });

    it('should throw error for invalid tables', () => {
      expect(() => db.validateTable('invalid_table')).toThrow('Invalid table name: invalid_table');
      expect(() => db.validateTable('DROP TABLE users')).toThrow('Invalid table name: DROP TABLE users');
      expect(() => db.validateTable('')).toThrow('Invalid table name: ');
    });
  });

  describe('Query Execution', () => {
    beforeEach(() => {
      mockClient.query.mockResolvedValue({ rows: [{ id: 1 }], rowCount: 1 });
    });

    it('should execute queries with proper connection handling', async () => {
      const result = await db.query('SELECT * FROM users WHERE id = $1', [1]);
      
      expect(mockPool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT * FROM users WHERE id = $1', [1]);
      expect(mockClient.release).toHaveBeenCalled();
      expect(result.rows).toEqual([{ id: 1 }]);
    });

    it('should release connection on query error', async () => {
      mockClient.query.mockRejectedValue(new Error('Query failed'));
      
      await expect(db.query('SELECT * FROM users')).rejects.toThrow('Query failed');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should use read replica for SELECT queries when available', async () => {
      process.env.DATABASE_READ_URL = 'postgresql://read:read@localhost:5432/test_db';
      
      (DatabaseConnection as any).instance = null;
      const dbWithReplica = DatabaseConnection.getInstance();
      
      // Get the read pool mock
      const readPoolMock = (Pool as any).mock.results[1].value;
      readPoolMock.connect = jest.fn().mockResolvedValue(mockClient);
      
      await dbWithReplica.query('SELECT * FROM users');
      
      expect(readPoolMock.connect).toHaveBeenCalled();
    });

    it('should use main pool for non-SELECT queries even with replica', async () => {
      process.env.DATABASE_READ_URL = 'postgresql://read:read@localhost:5432/test_db';
      
      (DatabaseConnection as any).instance = null;
      const dbWithReplica = DatabaseConnection.getInstance();
      
      await dbWithReplica.query('INSERT INTO users (name) VALUES ($1)', ['test']);
      
      expect(mockPool.connect).toHaveBeenCalled();
    });
  });

  describe('Transaction Support', () => {
    it('should handle successful transactions', async () => {
      mockClient.query.mockResolvedValue({ rows: [] });
      
      const result = await db.transaction(async (client) => {
        await client.query('INSERT INTO users (name) VALUES ($1)', ['test']);
        return 'success';
      });
      
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('INSERT INTO users (name) VALUES ($1)', ['test']);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toBe('success');
    });

    it('should rollback on transaction error', async () => {
      mockClient.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockRejectedValueOnce(new Error('Insert failed')); // INSERT
      
      await expect(
        db.transaction(async (client) => {
          await client.query('INSERT INTO users (name) VALUES ($1)', ['test']);
        })
      ).rejects.toThrow('Insert failed');
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('Query Metrics', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockClient.query.mockResolvedValue({ rows: [] });
    });
    
    afterEach(() => {
      jest.useRealTimers();
    });

    it('should track query metrics', async () => {
      await db.query('SELECT * FROM users');
      
      const metrics = db.getQueryMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        query: 'SELECT * FROM users',
        duration: expect.any(Number),
        timestamp: expect.any(Date),
      });
    });

    it('should identify slow queries', async () => {
      // Mock a slow query
      mockClient.query.mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve({ rows: [] }), 2000);
        });
      });
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      await db.query('SELECT * FROM large_table');
      jest.runAllTimers();
      
      const slowQueries = db.getSlowQueries(1000);
      expect(slowQueries).toHaveLength(1);
      
      consoleSpy.mockRestore();
    });

    it('should limit stored metrics to 1000 queries', async () => {
      // Execute 1100 queries
      for (let i = 0; i < 1100; i++) {
        await db.query(`SELECT ${i}`);
      }
      
      const metrics = db.getQueryMetrics();
      expect(metrics).toHaveLength(1000);
      expect(metrics[0].query).toBe('SELECT 100'); // First 100 should be dropped
    });
  });

  describe('Health Check', () => {
    it('should report healthy when connection works', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });
      
      const health = await db.healthCheck();
      
      expect(health).toEqual({
        healthy: true,
        writePool: true,
        readPool: true,
        latency: expect.any(Number),
      });
    });

    it('should report unhealthy when connection fails', async () => {
      mockPool.query.mockRejectedValue(new Error('Connection failed'));
      
      const health = await db.healthCheck();
      
      expect(health.healthy).toBe(false);
      expect(health.writePool).toBe(false);
    });

    it('should check both pools when read replica exists', async () => {
      process.env.DATABASE_READ_URL = 'postgresql://read:read@localhost:5432/test_db';
      
      (DatabaseConnection as any).instance = null;
      const dbWithReplica = DatabaseConnection.getInstance();
      
      // Mock different responses for each pool
      const readPoolMock = (Pool as any).mock.results[1].value;
      mockPool.query.mockResolvedValue({ rows: [] }); // Write pool healthy
      readPoolMock.query = jest.fn().mockRejectedValue(new Error('Read pool down')); // Read pool unhealthy
      
      const health = await dbWithReplica.healthCheck();
      
      expect(health).toEqual({
        healthy: false,
        writePool: true,
        readPool: false,
        latency: expect.any(Number),
      });
    });
  });

  describe('Pool Monitoring', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });
    
    afterEach(() => {
      jest.useRealTimers();
    });

    it('should emit warning when pool is exhausted', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Mock exhausted pool
      mockPool.idleCount = 0;
      mockPool.waitingCount = 5;
      
      // Trigger monitoring interval
      jest.advanceTimersByTime(30000);
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[POOL-WRITE] Pool exhausted'),
        expect.any(String)
      );
      
      consoleSpy.mockRestore();
    });
  });
});