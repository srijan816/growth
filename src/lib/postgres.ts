import { Pool, PoolClient } from 'pg';

class DatabaseConnection {
  private pool: Pool;
  private static instance: DatabaseConnection;

  private constructor() {
    this.pool = new Pool({
      host: process.env.POSTGRES_HOST || 'localhost',
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      database: process.env.POSTGRES_DB || 'growth_compass',
      user: process.env.POSTGRES_USER || 'tikaram',
      password: process.env.POSTGRES_PASSWORD || '',
      // Connection pool settings
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
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

  public async query(text: string, params?: any[]): Promise<any> {
    const client = await this.getClient();
    try {
      const result = await client.query(text, params);
      return result;
    } finally {
      client.release();
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

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

// Export singleton instance
export const db = DatabaseConnection.getInstance();

// Export pool instance for direct access
export function getPool(): Pool {
  return DatabaseConnection.getInstance()['pool'];
}

// Helper function for easier querying
export async function executeQuery(query: string, params?: any[]): Promise<any> {
  return db.query(query, params);
}

// Helper functions for common database operations
export async function findOne(table: string, conditions: Record<string, any>): Promise<any> {
  const whereClause = Object.keys(conditions).map((key, index) => `${key} = $${index + 1}`).join(' AND ');
  const values = Object.values(conditions);
  
  const query = `SELECT * FROM ${table} WHERE ${whereClause} LIMIT 1`;
  const result = await db.query(query, values);
  return result.rows[0] || null;
}

export async function findMany(table: string, conditions?: Record<string, any>, orderBy?: string, limit?: number): Promise<any[]> {
  let query = `SELECT * FROM ${table}`;
  const values: any[] = [];
  
  if (conditions && Object.keys(conditions).length > 0) {
    const whereClause = Object.keys(conditions).map((key, index) => `${key} = $${index + 1}`).join(' AND ');
    query += ` WHERE ${whereClause}`;
    values.push(...Object.values(conditions));
  }
  
  if (orderBy) {
    query += ` ORDER BY ${orderBy}`;
  }
  
  if (limit) {
    query += ` LIMIT ${limit}`;
  }
  
  const result = await db.query(query, values);
  return result.rows;
}

export async function insertOne(table: string, data: Record<string, any>): Promise<any> {
  const columns = Object.keys(data);
  const values = Object.values(data);
  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
  
  const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
  const result = await db.query(query, values);
  return result.rows[0];
}

export async function updateOne(table: string, conditions: Record<string, any>, data: Record<string, any>): Promise<any> {
  const setClause = Object.keys(data).map((key, index) => `${key} = $${index + 1}`).join(', ');
  const whereClause = Object.keys(conditions).map((key, index) => `${key} = $${Object.keys(data).length + index + 1}`).join(' AND ');
  
  const values = [...Object.values(data), ...Object.values(conditions)];
  const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`;
  
  const result = await db.query(query, values);
  return result.rows[0];
}

export async function deleteMany(table: string, conditions: Record<string, any>): Promise<number> {
  const whereClause = Object.keys(conditions).map((key, index) => `${key} = $${index + 1}`).join(' AND ');
  const values = Object.values(conditions);
  
  const query = `DELETE FROM ${table} WHERE ${whereClause}`;
  const result = await db.query(query, values);
  return result.rowCount || 0;
}

// Test connection function
export async function testConnection(): Promise<boolean> {
  try {
    await db.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}