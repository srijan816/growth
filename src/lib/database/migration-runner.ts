import { Pool, PoolClient } from 'pg';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

interface Migration {
  id: string;
  filename: string;
  checksum: string;
  appliedAt?: Date;
  executionTimeMs?: number;
}

interface MigrationFile {
  filename: string;
  content: string;
  checksum: string;
  up: string;
  down?: string;
}

export class MigrationRunner {
  private pool: Pool;
  private migrationsPath: string;

  constructor(connectionString: string, migrationsPath: string = './migrations') {
    this.pool = new Pool({ connectionString });
    this.migrationsPath = migrationsPath;
  }

  async initialize(): Promise<void> {
    await this.createMigrationTable();
  }

  private async createMigrationTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(255) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        checksum VARCHAR(64) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        execution_time_ms INTEGER
      );
      
      CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON schema_migrations(applied_at);
    `;
    
    await this.pool.query(query);
  }

  async getMigrationFiles(): Promise<MigrationFile[]> {
    const files = await fs.readdir(this.migrationsPath);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
    
    const migrations: MigrationFile[] = [];
    
    for (const filename of sqlFiles) {
      const filepath = path.join(this.migrationsPath, filename);
      const content = await fs.readFile(filepath, 'utf-8');
      const checksum = this.generateChecksum(content);
      
      const { up, down } = this.parseMigration(content);
      
      migrations.push({
        filename,
        content,
        checksum,
        up,
        down
      });
    }
    
    return migrations;
  }

  private parseMigration(content: string): { up: string; down?: string } {
    // Check if migration has explicit UP/DOWN sections
    const upMatch = content.match(/-- UP\n([\s\S]*?)(?:-- DOWN|$)/);
    const downMatch = content.match(/-- DOWN\n([\s\S]*?)$/);
    
    if (upMatch) {
      return {
        up: upMatch[1].trim(),
        down: downMatch ? downMatch[1].trim() : undefined
      };
    }
    
    // If no explicit sections, treat entire content as UP
    return { up: content.trim() };
  }

  private generateChecksum(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  async getAppliedMigrations(): Promise<Migration[]> {
    const result = await this.pool.query(
      'SELECT * FROM schema_migrations ORDER BY applied_at'
    );
    return result.rows;
  }

  async up(options: { dryRun?: boolean } = {}): Promise<void> {
    const files = await this.getMigrationFiles();
    const applied = await this.getAppliedMigrations();
    const appliedFilenames = new Set(applied.map(m => m.filename));
    
    const pending = files.filter(f => !appliedFilenames.has(f.filename));
    
    if (pending.length === 0) {
      console.log('No pending migrations');
      return;
    }
    
    console.log(`Found ${pending.length} pending migrations`);
    
    for (const migration of pending) {
      if (options.dryRun) {
        console.log(`[DRY RUN] Would apply: ${migration.filename}`);
        console.log(migration.up);
        continue;
      }
      
      await this.applyMigration(migration);
    }
  }

  private async applyMigration(migration: MigrationFile): Promise<void> {
    const client = await this.pool.connect();
    const startTime = Date.now();
    
    try {
      await client.query('BEGIN');
      
      console.log(`Applying migration: ${migration.filename}`);
      
      // Execute the migration
      await client.query(migration.up);
      
      // Record the migration
      const executionTime = Date.now() - startTime;
      await client.query(
        `INSERT INTO schema_migrations (id, filename, checksum, execution_time_ms) 
         VALUES ($1, $2, $3, $4)`,
        [
          migration.filename.replace('.sql', ''),
          migration.filename,
          migration.checksum,
          executionTime
        ]
      );
      
      await client.query('COMMIT');
      console.log(`✓ Applied ${migration.filename} (${executionTime}ms)`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`✗ Failed to apply ${migration.filename}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async down(steps: number = 1, options: { dryRun?: boolean } = {}): Promise<void> {
    const applied = await this.getAppliedMigrations();
    const files = await this.getMigrationFiles();
    
    const fileMap = new Map(files.map(f => [f.filename, f]));
    const toRollback = applied.slice(-steps).reverse();
    
    if (toRollback.length === 0) {
      console.log('No migrations to rollback');
      return;
    }
    
    for (const migration of toRollback) {
      const file = fileMap.get(migration.filename);
      
      if (!file) {
        throw new Error(`Migration file not found: ${migration.filename}`);
      }
      
      if (!file.down) {
        throw new Error(`No rollback defined for: ${migration.filename}`);
      }
      
      if (options.dryRun) {
        console.log(`[DRY RUN] Would rollback: ${migration.filename}`);
        console.log(file.down);
        continue;
      }
      
      await this.rollbackMigration(migration, file);
    }
  }

  private async rollbackMigration(migration: Migration, file: MigrationFile): Promise<void> {
    const client = await this.pool.connect();
    const startTime = Date.now();
    
    try {
      await client.query('BEGIN');
      
      console.log(`Rolling back: ${migration.filename}`);
      
      // Execute the rollback
      await client.query(file.down!);
      
      // Remove the migration record
      await client.query(
        'DELETE FROM schema_migrations WHERE filename = $1',
        [migration.filename]
      );
      
      await client.query('COMMIT');
      const executionTime = Date.now() - startTime;
      console.log(`✓ Rolled back ${migration.filename} (${executionTime}ms)`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`✗ Failed to rollback ${migration.filename}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async status(): Promise<void> {
    const files = await this.getMigrationFiles();
    const applied = await this.getAppliedMigrations();
    const appliedMap = new Map(applied.map(m => [m.filename, m]));
    
    console.log('\nMigration Status:');
    console.log('=================\n');
    
    for (const file of files) {
      const migration = appliedMap.get(file.filename);
      
      if (migration) {
        // Check if file has been modified
        if (migration.checksum !== file.checksum) {
          console.log(`✗ ${file.filename} - MODIFIED AFTER APPLYING!`);
          console.log(`  Applied: ${migration.appliedAt}`);
          console.log(`  WARNING: File checksum mismatch`);
        } else {
          console.log(`✓ ${file.filename}`);
          console.log(`  Applied: ${migration.appliedAt}`);
          if (migration.executionTimeMs) {
            console.log(`  Duration: ${migration.executionTimeMs}ms`);
          }
        }
      } else {
        console.log(`○ ${file.filename} - PENDING`);
        if (!file.down) {
          console.log(`  Warning: No rollback defined`);
        }
      }
      console.log('');
    }
    
    // Check for orphaned migrations
    const fileSet = new Set(files.map(f => f.filename));
    const orphaned = applied.filter(m => !fileSet.has(m.filename));
    
    if (orphaned.length > 0) {
      console.log('\nOrphaned Migrations (applied but file missing):');
      for (const migration of orphaned) {
        console.log(`! ${migration.filename}`);
      }
    }
  }

  async validate(): Promise<boolean> {
    const files = await this.getMigrationFiles();
    const applied = await this.getAppliedMigrations();
    const appliedMap = new Map(applied.map(m => [m.filename, m]));
    
    let valid = true;
    
    // Check for modified migrations
    for (const file of files) {
      const migration = appliedMap.get(file.filename);
      if (migration && migration.checksum !== file.checksum) {
        console.error(`ERROR: Migration ${file.filename} has been modified after being applied`);
        valid = false;
      }
    }
    
    // Check for missing migration files
    const fileSet = new Set(files.map(f => f.filename));
    for (const migration of applied) {
      if (!fileSet.has(migration.filename)) {
        console.error(`ERROR: Applied migration ${migration.filename} is missing`);
        valid = false;
      }
    }
    
    // Check for duplicate migration IDs
    const ids = new Set<string>();
    for (const file of files) {
      const id = file.filename.replace('.sql', '');
      if (ids.has(id)) {
        console.error(`ERROR: Duplicate migration ID: ${id}`);
        valid = false;
      }
      ids.add(id);
    }
    
    return valid;
  }

  async reset(options: { force?: boolean } = {}): Promise<void> {
    if (!options.force) {
      throw new Error('Reset requires force option to prevent accidental data loss');
    }
    
    const applied = await this.getAppliedMigrations();
    await this.down(applied.length);
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// CLI interface
if (require.main === module) {
  const runner = new MigrationRunner(
    process.env.DATABASE_URL || `postgresql://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`,
    path.join(process.cwd(), 'migrations')
  );
  
  const command = process.argv[2];
  const args = process.argv.slice(3);
  
  async function run() {
    try {
      await runner.initialize();
      
      switch (command) {
        case 'up':
          await runner.up({ dryRun: args.includes('--dry-run') });
          break;
          
        case 'down':
          const steps = parseInt(args[0]) || 1;
          await runner.down(steps, { dryRun: args.includes('--dry-run') });
          break;
          
        case 'status':
          await runner.status();
          break;
          
        case 'validate':
          const valid = await runner.validate();
          process.exit(valid ? 0 : 1);
          break;
          
        case 'reset':
          await runner.reset({ force: args.includes('--force') });
          break;
          
        default:
          console.log(`
Migration Runner

Commands:
  up [--dry-run]           Apply pending migrations
  down [steps] [--dry-run] Rollback migrations (default: 1)
  status                   Show migration status
  validate                 Validate migration integrity
  reset --force            Rollback all migrations

Examples:
  npm run migrate:up
  npm run migrate:down 2
  npm run migrate:status
          `);
      }
    } catch (error) {
      console.error('Migration error:', error);
      process.exit(1);
    } finally {
      await runner.close();
    }
  }
  
  run();
}