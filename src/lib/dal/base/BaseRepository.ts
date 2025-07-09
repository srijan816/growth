import { Pool } from 'pg';
import { DatabaseConnection } from './DatabaseConnection';

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface FilterOptions {
  [key: string]: any;
}

export abstract class BaseRepository<T> {
  protected db: DatabaseConnection;
  protected abstract tableName: string;
  protected abstract selectFields: string[];

  constructor(db: DatabaseConnection) {
    this.db = db;
  }

  protected buildWhereClause(filter: FilterOptions): { text: string; values: any[] } {
    const conditions: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(filter).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          conditions.push(`${key} = ANY($${paramCount})`);
          values.push(value);
        } else if (typeof value === 'object' && value.hasOwnProperty('$like')) {
          conditions.push(`${key} ILIKE $${paramCount}`);
          values.push(`%${value.$like}%`);
        } else if (typeof value === 'object' && value.hasOwnProperty('$gte')) {
          conditions.push(`${key} >= $${paramCount}`);
          values.push(value.$gte);
        } else if (typeof value === 'object' && value.hasOwnProperty('$lte')) {
          conditions.push(`${key} <= $${paramCount}`);
          values.push(value.$lte);
        } else {
          conditions.push(`${key} = $${paramCount}`);
          values.push(value);
        }
        paramCount++;
      }
    });

    return {
      text: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
      values
    };
  }

  protected buildQueryOptions(options?: QueryOptions): string {
    const parts: string[] = [];

    if (options?.orderBy) {
      parts.push(`ORDER BY ${options.orderBy} ${options.orderDirection || 'ASC'}`);
    }

    if (options?.limit) {
      parts.push(`LIMIT ${options.limit}`);
    }

    if (options?.offset) {
      parts.push(`OFFSET ${options.offset}`);
    }

    return parts.join(' ');
  }

  async findById(id: string): Promise<T | null> {
    const query = `
      SELECT ${this.selectFields.join(', ')}
      FROM ${this.tableName}
      WHERE id = $1
    `;

    const result = await this.db.query<T>(query, [id]);
    return result.rows[0] || null;
  }

  async findOne(filter: FilterOptions): Promise<T | null> {
    const { text: whereClause, values } = this.buildWhereClause(filter);
    const query = `
      SELECT ${this.selectFields.join(', ')}
      FROM ${this.tableName}
      ${whereClause}
      LIMIT 1
    `;

    const result = await this.db.query<T>(query, values);
    return result.rows[0] || null;
  }

  async findMany(filter: FilterOptions = {}, options?: QueryOptions): Promise<T[]> {
    const { text: whereClause, values } = this.buildWhereClause(filter);
    const queryOptions = this.buildQueryOptions(options);
    
    const query = `
      SELECT ${this.selectFields.join(', ')}
      FROM ${this.tableName}
      ${whereClause}
      ${queryOptions}
    `;

    const result = await this.db.query<T>(query, values);
    return result.rows;
  }

  async count(filter: FilterOptions = {}): Promise<number> {
    const { text: whereClause, values } = this.buildWhereClause(filter);
    const query = `
      SELECT COUNT(*) as count
      FROM ${this.tableName}
      ${whereClause}
    `;

    const result = await this.db.query<{ count: string }>(query, values);
    return parseInt(result.rows[0].count, 10);
  }

  async create(data: Partial<T>): Promise<T> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = fields.map((_, index) => `$${index + 1}`).join(', ');

    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES (${placeholders})
      RETURNING ${this.selectFields.join(', ')}
    `;

    const result = await this.db.query<T>(query, values);
    return result.rows[0];
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING ${this.selectFields.join(', ')}
    `;

    const result = await this.db.query<T>(query, [id, ...values]);
    return result.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE id = $1
    `;

    const result = await this.db.query(query, [id]);
    return result.rowCount > 0;
  }

  async bulkCreate(items: Partial<T>[]): Promise<T[]> {
    if (items.length === 0) return [];

    const fields = Object.keys(items[0]);
    const values: any[] = [];
    const placeholders: string[] = [];

    items.forEach((item, itemIndex) => {
      const itemPlaceholders = fields.map((field, fieldIndex) => {
        const paramIndex = itemIndex * fields.length + fieldIndex + 1;
        values.push((item as any)[field]);
        return `$${paramIndex}`;
      });
      placeholders.push(`(${itemPlaceholders.join(', ')})`);
    });

    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES ${placeholders.join(', ')}
      RETURNING ${this.selectFields.join(', ')}
    `;

    const result = await this.db.query<T>(query, values);
    return result.rows;
  }

  async transaction<R>(callback: (client: any) => Promise<R>): Promise<R> {
    return this.db.transaction(callback);
  }
}