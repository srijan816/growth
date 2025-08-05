import { SecureQueryBuilder, QueryCondition } from '../query-builder';
import { DatabaseConnection } from '../connection';

// Mock the connection module
jest.mock('../connection', () => {
  const mockDb = {
    validateTable: jest.fn((table: string) => {
      const allowed = ['users', 'students', 'courses', 'enrollments'];
      if (!allowed.includes(table)) {
        throw new Error(`Invalid table name: ${table}`);
      }
      return table;
    }),
    query: jest.fn(),
    transaction: jest.fn(),
  };
  
  return {
    DatabaseConnection: jest.fn(() => mockDb),
    db: mockDb,
  };
});

describe('SecureQueryBuilder', () => {
  let qb: SecureQueryBuilder;
  let mockDb: any;
  
  beforeEach(() => {
    mockDb = require('../connection').db;
    jest.clearAllMocks();
    qb = new SecureQueryBuilder(mockDb);
  });

  describe('findOne', () => {
    it('should build correct query with simple conditions', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ id: 1, name: 'John' }] });
      
      const result = await qb.findOne('users', { id: 1, active: true });
      
      expect(mockDb.validateTable).toHaveBeenCalledWith('users');
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1 AND active = $2 LIMIT 1',
        [1, true],
        { useReplica: undefined }
      );
      expect(result).toEqual({ id: 1, name: 'John' });
    });

    it('should handle null values correctly', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      
      await qb.findOne('users', { deleted_at: null });
      
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE deleted_at IS NULL LIMIT 1',
        [],
        { useReplica: undefined }
      );
    });

    it('should support query conditions with operators', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      
      const conditions: QueryCondition[] = [
        { column: 'age', operator: '>', value: 18 },
        { column: 'status', operator: '!=', value: 'deleted' },
      ];
      
      await qb.findOne('users', conditions);
      
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE age > $1 AND status != $2 LIMIT 1',
        [18, 'deleted'],
        { useReplica: undefined }
      );
    });

    it('should use read replica when specified', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      
      await qb.findOne('users', { id: 1 }, { useReplica: true });
      
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        { useReplica: true }
      );
    });

    it('should throw error for invalid table names', async () => {
      await expect(
        qb.findOne('invalid_table', { id: 1 })
      ).rejects.toThrow('Invalid table name: invalid_table');
    });
  });

  describe('findMany', () => {
    it('should build query with ordering and limit', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      
      await qb.findMany('users', { active: true }, {
        orderBy: 'created_at',
        orderDirection: 'DESC',
        limit: 10,
        offset: 20,
      });
      
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE active = $1 ORDER BY created_at DESC LIMIT 10 OFFSET 20',
        [true],
        { useReplica: undefined }
      );
    });

    it('should handle IN operator', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      
      const conditions: QueryCondition[] = [
        { column: 'status', operator: 'IN', value: ['active', 'pending'] },
      ];
      
      await qb.findMany('users', conditions);
      
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE status IN ($1, $2)',
        ['active', 'pending'],
        { useReplica: undefined }
      );
    });

    it('should handle array values in simple conditions', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      
      await qb.findMany('users', { role: ['admin', 'moderator'] });
      
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE role IN ($1, $2)',
        ['admin', 'moderator'],
        { useReplica: undefined }
      );
    });
  });

  describe('insertOne', () => {
    it('should build correct INSERT query', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ id: 1, name: 'John', email: 'john@example.com' }] });
      
      const result = await qb.insertOne('users', {
        name: 'John',
        email: 'john@example.com',
      });
      
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users (name, email)'),
        ['John', 'john@example.com']
      );
      expect(mockDb.query.mock.calls[0][0]).toMatch(/VALUES \(\$1, \$2\)/);
      expect(mockDb.query.mock.calls[0][0]).toMatch(/RETURNING \*/);
      expect(result).toEqual({ id: 1, name: 'John', email: 'john@example.com' });
    });

    it('should support custom returning columns', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ id: 1 }] });
      
      await qb.insertOne('users', { name: 'John' }, ['id']);
      
      expect(mockDb.query.mock.calls[0][0]).toMatch(/RETURNING id$/);
    });
  });

  describe('insertMany', () => {
    it('should build correct bulk INSERT query', async () => {
      mockDb.query.mockResolvedValue({ rows: [
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ]});
      
      const result = await qb.insertMany('users', [
        { name: 'John', active: true },
        { name: 'Jane', active: false },
      ]);
      
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users (name, active)'),
        ['John', true, 'Jane', false]
      );
      expect(mockDb.query.mock.calls[0][0]).toMatch(/VALUES \(\$1, \$2\), \(\$3, \$4\)/);
      expect(result).toHaveLength(2);
    });

    it('should handle empty array', async () => {
      const result = await qb.insertMany('users', []);
      
      expect(mockDb.query).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('updateOne', () => {
    it('should build correct UPDATE query', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ id: 1, name: 'John Updated' }] });
      
      const result = await qb.updateOne(
        'users',
        { id: 1 },
        { name: 'John Updated' }
      );
      
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        [1, 'John Updated']
      );
      expect(mockDb.query.mock.calls[0][0]).toMatch(/SET name = \$1, updated_at = NOW\(\)/);
      expect(mockDb.query.mock.calls[0][0]).toMatch(/WHERE id = \$2/);
      expect(result).toEqual({ id: 1, name: 'John Updated' });
    });

    it('should handle complex conditions', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      
      const conditions: QueryCondition[] = [
        { column: 'id', operator: '=', value: 1 },
        { column: 'status', operator: '!=', value: 'deleted' },
      ];
      
      await qb.updateOne('users', conditions, { name: 'Updated' });
      
      expect(mockDb.query.mock.calls[0][0]).toMatch(/WHERE id = \$2 AND status != \$3/);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        ['Updated', 1, 'deleted']
      );
    });
  });

  describe('deleteOne', () => {
    it('should build correct DELETE query', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ id: 1 }] });
      
      const result = await qb.deleteOne('users', { id: 1 });
      
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM users WHERE id = $1 RETURNING *'),
        [1]
      );
      expect(result).toEqual({ id: 1 });
    });
  });

  describe('deleteMany', () => {
    it('should return count and deleted records', async () => {
      mockDb.query.mockResolvedValue({ 
        rows: [{ id: 1 }, { id: 2 }],
        rowCount: 2 
      });
      
      const result = await qb.deleteMany('users', { status: 'inactive' });
      
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM users WHERE status = $1'),
        ['inactive']
      );
      expect(result).toEqual({
        count: 2,
        deleted: [{ id: 1 }, { id: 2 }]
      });
    });
  });

  describe('count', () => {
    it('should build correct COUNT query', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ count: '42' }] });
      
      const result = await qb.count('users', { active: true });
      
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM users WHERE active = $1',
        [true],
        { useReplica: true }
      );
      expect(result).toBe(42);
    });

    it('should handle count without conditions', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ count: '100' }] });
      
      const result = await qb.count('users');
      
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM users',
        [],
        { useReplica: true }
      );
      expect(result).toBe(100);
    });
  });

  describe('exists', () => {
    it('should check existence correctly', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ exists: true }] });
      
      const result = await qb.exists('users', { email: 'john@example.com' });
      
      expect(mockDb.query.mock.calls[0][0]).toMatch(/SELECT EXISTS\(/);
      expect(mockDb.query.mock.calls[0][0]).toMatch(/SELECT 1 FROM users WHERE email = \$1/);
      expect(result).toBe(true);
    });
  });

  describe('transaction', () => {
    it('should execute transaction with transactional query builder', async () => {
      const mockClient = { query: jest.fn() };
      mockDb.transaction.mockImplementation(async (callback: any) => {
        return callback(mockClient);
      });
      
      mockClient.query.mockResolvedValue({ rows: [{ id: 1 }] });
      
      const result = await qb.transaction(async (txQb) => {
        // Note: In real implementation, txQb would use the transaction client
        return { success: true };
      });
      
      expect(mockDb.transaction).toHaveBeenCalled();
      expect(result).toEqual({ success: true });
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in table names', async () => {
      await expect(
        qb.findOne('users; DROP TABLE users; --', { id: 1 })
      ).rejects.toThrow('Invalid table name');
    });

    it('should safely parameterize user input', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      
      // Attempt SQL injection in values
      await qb.findOne('users', { 
        name: "'; DROP TABLE users; --",
        email: "admin' OR '1'='1"
      });
      
      // Values should be safely parameterized
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.any(String),
        ["'; DROP TABLE users; --", "admin' OR '1'='1"],
        expect.any(Object)
      );
    });

    it('should handle LIKE operator safely', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });
      
      const conditions: QueryCondition[] = [
        { column: 'name', operator: 'LIKE', value: '%john%' },
      ];
      
      await qb.findMany('users', conditions);
      
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE name LIKE $1',
        ['%john%'],
        { useReplica: undefined }
      );
    });
  });
});