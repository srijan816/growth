import { PoolClient, QueryResult } from 'pg';
import { db } from '@/lib/postgres';

export class DatabaseConnection {
  private transactionClient: PoolClient | null = null;

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    if (this.transactionClient) {
      return this.transactionClient.query(text, params);
    }
    return db.query(text, params);
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    return db.transaction(callback);
  }

  async getClient(): Promise<PoolClient> {
    return db.getClient();
  }

  async end(): Promise<void> {
    // The db instance manages its own pool lifecycle
    // No need to manually end it here
  }

  // Helper methods for common operations
  async exists(table: string, filter: Record<string, any>): Promise<boolean> {
    const conditions = Object.keys(filter)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(' AND ');
    
    const query = `SELECT EXISTS(SELECT 1 FROM ${table} WHERE ${conditions})`;
    const values = Object.values(filter);
    
    const result = await this.query<{ exists: boolean }>(query, values);
    return result.rows[0].exists;
  }

  async batchInsert<T>(
    table: string,
    items: T[],
    returning?: string[]
  ): Promise<QueryResult> {
    if (items.length === 0) {
      return { rows: [], rowCount: 0 } as any;
    }

    const keys = Object.keys(items[0] as any);
    const values: any[] = [];
    const placeholders: string[] = [];

    items.forEach((item, itemIndex) => {
      const itemValues = keys.map((key) => (item as any)[key]);
      const itemPlaceholders = itemValues.map((_, valueIndex) => {
        const paramIndex = itemIndex * keys.length + valueIndex + 1;
        values.push(itemValues[valueIndex]);
        return `$${paramIndex}`;
      });
      placeholders.push(`(${itemPlaceholders.join(', ')})`);
    });

    let query = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES ${placeholders.join(', ')}
    `;

    if (returning && returning.length > 0) {
      query += ` RETURNING ${returning.join(', ')}`;
    }

    return this.query(query, values);
  }

  // Performance monitoring
  async measureQuery<T>(
    queryFn: () => Promise<T>,
    label: string
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await queryFn();
      const duration = performance.now() - start;
      
      if (duration > 1000) {
        console.warn(`Slow query detected (${label}): ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      console.error(`Query failed (${label}) after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }
}