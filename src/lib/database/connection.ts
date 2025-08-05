import { Pool, PoolClient, PoolConfig } from 'pg';
import { performance } from 'perf_hooks';

// Table whitelist for security
const ALLOWED_TABLES = [
  'users',
  'students',
  'courses',
  'enrollments',
  'class_sessions',
  'attendances',
  'parsed_student_feedback',
  'speech_recordings',
  'ai_generated_feedback',
  'instructors',
  'classes',
  'student_achievements',
  'feedback_parsing_status',
  'ai_recommendations',
  'student_analysis_cache',
  'activity_log',
  'program_metrics_summary',
  'class_metrics'
] as const;

type AllowedTable = typeof ALLOWED_TABLES[number];

interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  params?: any[];
}

interface PoolMetrics {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
  timestamp: Date;
}

export class DatabaseConnection {
  private pool: Pool;
  private readPool?: Pool;
  private static instance: DatabaseConnection;
  private queryMetrics: QueryMetrics[] = [];
  private slowQueryThreshold = 1000; // 1 second

  private constructor() {
    const config = this.buildConfig();
    this.pool = new Pool(config);
    
    // Set up read replica if configured
    if (process.env.DATABASE_READ_URL) {
      this.readPool = new Pool(this.buildConfig(process.env.DATABASE_READ_URL));
      this.setupPoolMonitoring(this.readPool, 'READ');
    }

    this.setupPoolMonitoring(this.pool, 'WRITE');
    this.setupErrorHandling();
  }

  private buildConfig(connectionString?: string): PoolConfig {
    const baseConfig: PoolConfig = {
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      statement_timeout: 30000,
      query_timeout: 30000,
      application_name: 'growth-compass',
    };

    // Support both DATABASE_URL and individual env vars
    if (connectionString || process.env.DATABASE_URL) {
      return {
        ...baseConfig,
        connectionString: connectionString || process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' 
          ? { rejectUnauthorized: false } 
          : false
      };
    }

    // Fallback to individual env vars
    return {
      ...baseConfig,
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'growth_compass',
      user: process.env.POSTGRES_USER || 'tikaram',
      password: process.env.POSTGRES_PASSWORD || '',
    };
  }

  private setupPoolMonitoring(pool: Pool, label: string) {
    // Monitor pool metrics every 30 seconds
    setInterval(() => {
      const metrics: PoolMetrics = {
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
        timestamp: new Date()
      };
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[POOL-${label}]`, metrics);
      }

      // Emit warning if pool is exhausted
      if (metrics.idleCount === 0 && metrics.waitingCount > 0) {
        console.warn(`[POOL-${label}] Pool exhausted, ${metrics.waitingCount} queries waiting`);
      }
    }, 30000);
  }

  private setupErrorHandling() {
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });

    if (this.readPool) {
      this.readPool.on('error', (err) => {
        console.error('Unexpected error on read pool idle client', err);
      });
    }
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async getClient(): Promise<PoolClient> {
    return this.pool.connect();
  }

  public validateTable(table: string): AllowedTable {
    if (!ALLOWED_TABLES.includes(table as AllowedTable)) {
      throw new Error(`Invalid table name: ${table}`);
    }
    return table as AllowedTable;
  }

  public async query(text: string, params?: any[], options?: { useReplica?: boolean }): Promise<any> {
    const start = performance.now();
    const pool = this.selectPool(text, options?.useReplica);
    const client = await pool.connect();
    
    try {
      const result = await client.query(text, params);
      const duration = performance.now() - start;
      
      this.logQuery({ query: text, duration, timestamp: new Date(), params });
      
      return result;
    } finally {
      client.release();
    }
  }

  private selectPool(query: string, useReplica?: boolean): Pool {
    // Use read replica for SELECT queries if available and not explicitly disabled
    if (this.readPool && 
        query.trim().toUpperCase().startsWith('SELECT') && 
        useReplica !== false) {
      return this.readPool;
    }
    return this.pool;
  }

  private logQuery(metrics: QueryMetrics) {
    // Store metrics
    this.queryMetrics.push(metrics);
    
    // Keep only last 1000 queries
    if (this.queryMetrics.length > 1000) {
      this.queryMetrics = this.queryMetrics.slice(-1000);
    }

    // Log slow queries
    if (metrics.duration > this.slowQueryThreshold) {
      console.warn('[SLOW QUERY]', {
        query: metrics.query.substring(0, 200),
        duration: `${metrics.duration.toFixed(2)}ms`,
        timestamp: metrics.timestamp
      });
    }

    // Log in development
    if (process.env.NODE_ENV === 'development' && process.env.LOG_QUERIES === 'true') {
      console.log('[SQL]', {
        query: metrics.query.substring(0, 100),
        duration: `${metrics.duration.toFixed(2)}ms`
      });
    }
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public getQueryMetrics(): QueryMetrics[] {
    return [...this.queryMetrics];
  }

  public getSlowQueries(threshold?: number): QueryMetrics[] {
    const limit = threshold || this.slowQueryThreshold;
    return this.queryMetrics.filter(m => m.duration > limit);
  }

  public async healthCheck(): Promise<{ 
    healthy: boolean; 
    writePool: boolean; 
    readPool: boolean;
    latency: number;
  }> {
    const start = performance.now();
    let writeHealthy = false;
    let readHealthy = false;

    try {
      await this.pool.query('SELECT 1');
      writeHealthy = true;
    } catch (error) {
      console.error('Write pool health check failed:', error);
    }

    if (this.readPool) {
      try {
        await this.readPool.query('SELECT 1');
        readHealthy = true;
      } catch (error) {
        console.error('Read pool health check failed:', error);
      }
    } else {
      readHealthy = writeHealthy; // No read pool configured
    }

    const latency = performance.now() - start;

    return {
      healthy: writeHealthy && readHealthy,
      writePool: writeHealthy,
      readPool: readHealthy,
      latency
    };
  }

  public async close(): Promise<void> {
    await this.pool.end();
    if (this.readPool) {
      await this.readPool.end();
    }
  }
}

// Export singleton instance
export const db = DatabaseConnection.getInstance();