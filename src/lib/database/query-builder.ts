import { db, DatabaseConnection } from './connection';
import { PoolClient } from 'pg';

export interface QueryCondition {
  column: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE' | 'IN' | 'NOT IN' | 'IS' | 'IS NOT';
  value: any;
}

export interface QueryOptions {
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  limit?: number;
  offset?: number;
  useReplica?: boolean;
}

export class SecureQueryBuilder {
  private db: DatabaseConnection;

  constructor(database: DatabaseConnection = db) {
    this.db = database;
  }

  async findOne<T>(
    table: string,
    conditions: Record<string, any> | QueryCondition[],
    options?: QueryOptions
  ): Promise<T | null> {
    const validTable = this.db.validateTable(table);
    const { query, values } = this.buildSelectQuery(validTable, conditions, { ...options, limit: 1 });
    
    const result = await this.db.query(query, values, { useReplica: options?.useReplica });
    return result.rows[0] || null;
  }

  async findMany<T>(
    table: string,
    conditions?: Record<string, any> | QueryCondition[],
    options?: QueryOptions
  ): Promise<T[]> {
    const validTable = this.db.validateTable(table);
    const { query, values } = this.buildSelectQuery(validTable, conditions, options);
    
    const result = await this.db.query(query, values, { useReplica: options?.useReplica });
    return result.rows;
  }

  async insertOne<T>(
    table: string,
    data: Record<string, any>,
    returning: string[] = ['*']
  ): Promise<T> {
    const validTable = this.db.validateTable(table);
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${validTable} (${columns.join(', ')}) 
      VALUES (${placeholders}) 
      RETURNING ${returning.join(', ')}
    `;
    
    const result = await this.db.query(query, values);
    return result.rows[0];
  }

  async insertMany<T>(
    table: string,
    records: Record<string, any>[],
    returning: string[] = ['*']
  ): Promise<T[]> {
    if (records.length === 0) return [];
    
    const validTable = this.db.validateTable(table);
    const columns = Object.keys(records[0]);
    const values: any[] = [];
    const placeholders: string[] = [];
    
    records.forEach((record, recordIndex) => {
      const recordPlaceholders = columns.map((col, colIndex) => {
        const paramIndex = recordIndex * columns.length + colIndex + 1;
        values.push(record[col]);
        return `$${paramIndex}`;
      });
      placeholders.push(`(${recordPlaceholders.join(', ')})`);
    });
    
    const query = `
      INSERT INTO ${validTable} (${columns.join(', ')}) 
      VALUES ${placeholders.join(', ')} 
      RETURNING ${returning.join(', ')}
    `;
    
    const result = await this.db.query(query, values);
    return result.rows;
  }

  async updateOne<T>(
    table: string,
    conditions: Record<string, any> | QueryCondition[],
    data: Record<string, any>,
    returning: string[] = ['*']
  ): Promise<T | null> {
    const validTable = this.db.validateTable(table);
    const updates = Object.keys(data);
    const values = Object.values(data);
    
    const setClause = updates.map((col, index) => `${col} = $${index + 1}`).join(', ');
    
    const { whereClause, whereValues } = this.buildWhereClause(conditions, values.length);
    values.push(...whereValues);
    
    const query = `
      UPDATE ${validTable} 
      SET ${setClause}, updated_at = NOW() 
      WHERE ${whereClause} 
      RETURNING ${returning.join(', ')}
    `;
    
    const result = await this.db.query(query, values);
    return result.rows[0] || null;
  }

  async updateMany<T>(
    table: string,
    conditions: Record<string, any> | QueryCondition[],
    data: Record<string, any>,
    returning: string[] = ['*']
  ): Promise<T[]> {
    const validTable = this.db.validateTable(table);
    const updates = Object.keys(data);
    const values = Object.values(data);
    
    const setClause = updates.map((col, index) => `${col} = $${index + 1}`).join(', ');
    
    const { whereClause, whereValues } = this.buildWhereClause(conditions, values.length);
    values.push(...whereValues);
    
    const query = `
      UPDATE ${validTable} 
      SET ${setClause}, updated_at = NOW() 
      WHERE ${whereClause} 
      RETURNING ${returning.join(', ')}
    `;
    
    const result = await this.db.query(query, values);
    return result.rows;
  }

  async deleteOne<T>(
    table: string,
    conditions: Record<string, any> | QueryCondition[],
    returning: string[] = ['*']
  ): Promise<T | null> {
    const validTable = this.db.validateTable(table);
    const { whereClause, whereValues } = this.buildWhereClause(conditions);
    
    const query = `
      DELETE FROM ${validTable} 
      WHERE ${whereClause} 
      RETURNING ${returning.join(', ')}
    `;
    
    const result = await this.db.query(query, whereValues);
    return result.rows[0] || null;
  }

  async deleteMany<T>(
    table: string,
    conditions: Record<string, any> | QueryCondition[],
    returning: string[] = ['id']
  ): Promise<{ count: number; deleted: T[] }> {
    const validTable = this.db.validateTable(table);
    const { whereClause, whereValues } = this.buildWhereClause(conditions);
    
    const query = `
      DELETE FROM ${validTable} 
      WHERE ${whereClause} 
      RETURNING ${returning.join(', ')}
    `;
    
    const result = await this.db.query(query, whereValues);
    return {
      count: result.rowCount || 0,
      deleted: result.rows
    };
  }

  async count(
    table: string,
    conditions?: Record<string, any> | QueryCondition[]
  ): Promise<number> {
    const validTable = this.db.validateTable(table);
    let query = `SELECT COUNT(*) as count FROM ${validTable}`;
    let values: any[] = [];
    
    if (conditions) {
      const { whereClause, whereValues } = this.buildWhereClause(conditions);
      query += ` WHERE ${whereClause}`;
      values = whereValues;
    }
    
    const result = await this.db.query(query, values, { useReplica: true });
    return parseInt(result.rows[0].count);
  }

  async exists(
    table: string,
    conditions: Record<string, any> | QueryCondition[]
  ): Promise<boolean> {
    const validTable = this.db.validateTable(table);
    const { whereClause, whereValues } = this.buildWhereClause(conditions);
    
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM ${validTable} WHERE ${whereClause}
      ) as exists
    `;
    
    const result = await this.db.query(query, whereValues, { useReplica: true });
    return result.rows[0].exists;
  }

  private buildSelectQuery(
    table: string,
    conditions?: Record<string, any> | QueryCondition[],
    options?: QueryOptions
  ): { query: string; values: any[] } {
    let query = `SELECT * FROM ${table}`;
    let values: any[] = [];
    
    if (conditions) {
      const { whereClause, whereValues } = this.buildWhereClause(conditions);
      query += ` WHERE ${whereClause}`;
      values = whereValues;
    }
    
    if (options?.orderBy) {
      query += ` ORDER BY ${options.orderBy} ${options.orderDirection || 'ASC'}`;
    }
    
    if (options?.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    
    if (options?.offset) {
      query += ` OFFSET ${options.offset}`;
    }
    
    return { query, values };
  }

  private buildWhereClause(
    conditions: Record<string, any> | QueryCondition[],
    startIndex: number = 0
  ): { whereClause: string; whereValues: any[] } {
    const whereValues: any[] = [];
    let whereClause: string;
    
    if (Array.isArray(conditions)) {
      const clauses = conditions.map((cond, index) => {
        const paramIndex = startIndex + index + 1;
        
        if (cond.operator === 'IN' || cond.operator === 'NOT IN') {
          const placeholders = cond.value.map((_: any, i: number) => 
            `$${paramIndex + i}`
          ).join(', ');
          whereValues.push(...cond.value);
          return `${cond.column} ${cond.operator} (${placeholders})`;
        } else if (cond.operator === 'IS' || cond.operator === 'IS NOT') {
          return `${cond.column} ${cond.operator} ${cond.value}`;
        } else {
          whereValues.push(cond.value);
          return `${cond.column} ${cond.operator} $${paramIndex}`;
        }
      });
      whereClause = clauses.join(' AND ');
    } else {
      const entries = Object.entries(conditions);
      const clauses = entries.map(([key, value], index) => {
        const paramIndex = startIndex + index + 1;
        
        if (value === null) {
          return `${key} IS NULL`;
        } else if (Array.isArray(value)) {
          const placeholders = value.map((_, i) => 
            `$${paramIndex + i}`
          ).join(', ');
          whereValues.push(...value);
          return `${key} IN (${placeholders})`;
        } else {
          whereValues.push(value);
          return `${key} = $${paramIndex}`;
        }
      });
      whereClause = clauses.join(' AND ');
    }
    
    return { whereClause, whereValues };
  }

  // Transaction helper
  async transaction<T>(
    callback: (qb: TransactionalQueryBuilder) => Promise<T>
  ): Promise<T> {
    return this.db.transaction(async (client) => {
      const txQb = new TransactionalQueryBuilder(client, this.db);
      return callback(txQb);
    });
  }
}

// Transactional query builder that uses a specific client
export class TransactionalQueryBuilder extends SecureQueryBuilder {
  private client: PoolClient;
  private database: DatabaseConnection;

  constructor(client: PoolClient, database: DatabaseConnection) {
    super(database);
    this.client = client;
    this.database = database;
  }

  async query(text: string, params?: any[]): Promise<any> {
    return this.client.query(text, params);
  }
}

// Export singleton instance
export const qb = new SecureQueryBuilder();