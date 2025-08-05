import { MigrationRunner } from '../migration-runner';
import fs from 'fs/promises';
import path from 'path';
import { Pool } from 'pg';

// Mock pg module
jest.mock('pg');

// Mock fs module
jest.mock('fs/promises', () => ({
  readdir: jest.fn(),
  readFile: jest.fn(),
}));

describe('MigrationRunner', () => {
  let runner: MigrationRunner;
  let mockPool: any;
  let mockClient: any;
  
  beforeEach(() => {
    mockClient = {
      query: jest.fn(),
      release: jest.fn(),
    };
    
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockClient),
      query: jest.fn(),
      end: jest.fn(),
    };
    
    (Pool as any).mockImplementation(() => mockPool);
    
    runner = new MigrationRunner('postgresql://test', './test-migrations');
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should create migration table', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });
      
      await runner.initialize();
      
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('CREATE TABLE IF NOT EXISTS schema_migrations')
      );
    });
  });

  describe('getMigrationFiles', () => {
    it('should read and parse migration files', async () => {
      const mockFiles = ['001_initial.sql', '002_add_users.sql', 'README.md'];
      const mockContent1 = '-- Initial migration\nCREATE TABLE test (id INT);';
      const mockContent2 = `-- UP\nCREATE TABLE users (id UUID);\n-- DOWN\nDROP TABLE users;`;
      
      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);
      (fs.readFile as jest.Mock)
        .mockResolvedValueOnce(mockContent1)
        .mockResolvedValueOnce(mockContent2);
      
      const migrations = await runner.getMigrationFiles();
      
      expect(migrations).toHaveLength(2);
      expect(migrations[0]).toMatchObject({
        filename: '001_initial.sql',
        up: 'CREATE TABLE test (id INT);',
        down: undefined,
      });
      expect(migrations[1]).toMatchObject({
        filename: '002_add_users.sql',
        up: 'CREATE TABLE users (id UUID);',
        down: 'DROP TABLE users;',
      });
    });

    it('should calculate checksums for migrations', async () => {
      const mockFiles = ['001_test.sql'];
      const mockContent = 'CREATE TABLE test (id INT);';
      
      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);
      
      const migrations = await runner.getMigrationFiles();
      
      expect(migrations[0].checksum).toBeDefined();
      expect(migrations[0].checksum).toHaveLength(64); // SHA256 hex string
    });
  });

  describe('getAppliedMigrations', () => {
    it('should return applied migrations from database', async () => {
      const mockApplied = [
        {
          id: '001_initial',
          filename: '001_initial.sql',
          checksum: 'abc123',
          applied_at: new Date(),
          execution_time_ms: 100,
        },
      ];
      
      mockPool.query.mockResolvedValue({ rows: mockApplied });
      
      const applied = await runner.getAppliedMigrations();
      
      expect(mockPool.query).toHaveBeenCalledWith(
        'SELECT * FROM schema_migrations ORDER BY applied_at'
      );
      expect(applied).toEqual(mockApplied);
    });
  });

  describe('up', () => {
    beforeEach(() => {
      mockPool.query.mockResolvedValue({ rows: [] });
      mockClient.query.mockResolvedValue({ rows: [] });
    });

    it('should apply pending migrations', async () => {
      const mockFiles = ['001_initial.sql'];
      const mockContent = 'CREATE TABLE test (id INT);';
      
      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);
      
      await runner.up();
      
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('CREATE TABLE test (id INT);');
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO schema_migrations'),
        expect.any(Array)
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should skip already applied migrations', async () => {
      const mockFiles = ['001_initial.sql'];
      const mockApplied = [{
        id: '001_initial',
        filename: '001_initial.sql',
        checksum: 'abc123',
      }];
      
      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);
      (fs.readFile as jest.Mock).mockResolvedValue('CREATE TABLE test (id INT);');
      mockPool.query.mockResolvedValue({ rows: mockApplied });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await runner.up();
      
      expect(consoleSpy).toHaveBeenCalledWith('No pending migrations');
      expect(mockClient.query).not.toHaveBeenCalledWith('BEGIN');
      
      consoleSpy.mockRestore();
    });

    it('should rollback on migration failure', async () => {
      const mockFiles = ['001_initial.sql'];
      
      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);
      (fs.readFile as jest.Mock).mockResolvedValue('INVALID SQL');
      
      mockClient.query
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Syntax error')); // Migration
      
      await expect(runner.up()).rejects.toThrow('Syntax error');
      
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should support dry run mode', async () => {
      const mockFiles = ['001_initial.sql'];
      const mockContent = 'CREATE TABLE test (id INT);';
      
      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await runner.up({ dryRun: true });
      
      expect(consoleSpy).toHaveBeenCalledWith('[DRY RUN] Would apply: 001_initial.sql');
      expect(mockClient.query).not.toHaveBeenCalledWith('BEGIN');
      
      consoleSpy.mockRestore();
    });
  });

  describe('down', () => {
    it('should rollback migrations with down sections', async () => {
      const mockApplied = [{
        id: '002_add_users',
        filename: '002_add_users.sql',
        checksum: 'xyz789',
      }];
      const mockFiles = ['002_add_users.sql'];
      const mockContent = '-- UP\nCREATE TABLE users;\n-- DOWN\nDROP TABLE users;';
      
      mockPool.query.mockResolvedValue({ rows: mockApplied });
      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);
      
      await runner.down(1);
      
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('DROP TABLE users;');
      expect(mockClient.query).toHaveBeenCalledWith(
        'DELETE FROM schema_migrations WHERE filename = $1',
        ['002_add_users.sql']
      );
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should error if no down section exists', async () => {
      const mockApplied = [{
        id: '001_initial',
        filename: '001_initial.sql',
        checksum: 'abc123',
      }];
      const mockFiles = ['001_initial.sql'];
      const mockContent = 'CREATE TABLE test (id INT);'; // No DOWN section
      
      mockPool.query.mockResolvedValue({ rows: mockApplied });
      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);
      
      await expect(runner.down(1)).rejects.toThrow('No rollback defined for: 001_initial.sql');
    });

    it('should rollback multiple migrations', async () => {
      const mockApplied = [
        { id: '001', filename: '001.sql', checksum: 'abc' },
        { id: '002', filename: '002.sql', checksum: 'def' },
        { id: '003', filename: '003.sql', checksum: 'ghi' },
      ];
      
      mockPool.query.mockResolvedValue({ rows: mockApplied });
      (fs.readdir as jest.Mock).mockResolvedValue(['001.sql', '002.sql', '003.sql']);
      (fs.readFile as jest.Mock).mockResolvedValue('-- UP\nCREATE;\n-- DOWN\nDROP;');
      
      await runner.down(2);
      
      // Should rollback in reverse order (003, then 002)
      expect(mockClient.query).toHaveBeenCalledWith('DELETE FROM schema_migrations WHERE filename = $1', ['003.sql']);
      expect(mockClient.query).toHaveBeenCalledWith('DELETE FROM schema_migrations WHERE filename = $1', ['002.sql']);
      expect(mockClient.query).not.toHaveBeenCalledWith('DELETE FROM schema_migrations WHERE filename = $1', ['001.sql']);
    });
  });

  describe('status', () => {
    it('should show migration status', async () => {
      const mockFiles = ['001_initial.sql', '002_add_users.sql'];
      const mockApplied = [{
        id: '001_initial',
        filename: '001_initial.sql',
        checksum: 'abc123',
        appliedAt: new Date('2024-01-01'),
        executionTimeMs: 100,
      }];
      
      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);
      (fs.readFile as jest.Mock).mockResolvedValue('CREATE TABLE test;');
      mockPool.query.mockResolvedValue({ rows: mockApplied });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await runner.status();
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✓ 001_initial.sql'));
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('○ 002_add_users.sql - PENDING'));
      
      consoleSpy.mockRestore();
    });

    it('should detect modified migrations', async () => {
      const mockFiles = ['001_initial.sql'];
      const mockApplied = [{
        id: '001_initial',
        filename: '001_initial.sql',
        checksum: 'old_checksum',
        appliedAt: new Date(),
      }];
      
      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);
      (fs.readFile as jest.Mock).mockResolvedValue('MODIFIED CONTENT');
      mockPool.query.mockResolvedValue({ rows: mockApplied });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await runner.status();
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✗ 001_initial.sql - MODIFIED AFTER APPLYING!'));
      
      consoleSpy.mockRestore();
    });
  });

  describe('validate', () => {
    it('should validate migration integrity', async () => {
      const mockFiles = ['001_initial.sql'];
      const mockContent = 'CREATE TABLE test;';
      const mockApplied = [{
        id: '001_initial',
        filename: '001_initial.sql',
        checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // Known hash
      }];
      
      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);
      (fs.readFile as jest.Mock).mockResolvedValue(mockContent);
      mockPool.query.mockResolvedValue({ rows: mockApplied });
      
      const valid = await runner.validate();
      
      expect(valid).toBe(false); // Checksums don't match
    });

    it('should detect missing migration files', async () => {
      const mockFiles = [];
      const mockApplied = [{
        id: '001_initial',
        filename: '001_initial.sql',
        checksum: 'abc123',
      }];
      
      (fs.readdir as jest.Mock).mockResolvedValue(mockFiles);
      mockPool.query.mockResolvedValue({ rows: mockApplied });
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const valid = await runner.validate();
      
      expect(valid).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('ERROR: Applied migration 001_initial.sql is missing');
      
      consoleSpy.mockRestore();
    });
  });

  describe('reset', () => {
    it('should require force option', async () => {
      await expect(runner.reset()).rejects.toThrow('Reset requires force option');
    });

    it('should rollback all migrations when forced', async () => {
      const mockApplied = [
        { id: '001', filename: '001.sql' },
        { id: '002', filename: '002.sql' },
      ];
      
      mockPool.query.mockResolvedValue({ rows: mockApplied });
      (fs.readdir as jest.Mock).mockResolvedValue(['001.sql', '002.sql']);
      (fs.readFile as jest.Mock).mockResolvedValue('-- UP\nCREATE;\n-- DOWN\nDROP;');
      
      jest.spyOn(runner, 'down').mockResolvedValue();
      
      await runner.reset({ force: true });
      
      expect(runner.down).toHaveBeenCalledWith(2);
    });
  });
});