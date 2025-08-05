// Re-export from new secure database module
export { db, DatabaseConnection } from './database/connection';
export { qb, SecureQueryBuilder } from './database/query-builder';
import { db } from './database/connection';
import { qb } from './database/query-builder';
import { Pool } from 'pg';

// Backward compatibility exports
export function getPool(): Pool {
  // Note: This is deprecated and will be removed
  console.warn('getPool() is deprecated. Use db instance directly.');
  return (db as any).pool;
}

export async function executeQuery(query: string, params?: any[]): Promise<any> {
  console.warn('executeQuery() is deprecated. Use db.query() or qb methods.');
  return db.query(query, params);
}

// Deprecated helper functions - use qb (query builder) instead
export async function findOne(table: string, conditions: Record<string, any>): Promise<any> {
  console.warn('findOne() is deprecated. Use qb.findOne() instead.');
  return qb.findOne(table, conditions);
}

export async function findMany(table: string, conditions?: Record<string, any>, orderBy?: string, limit?: number): Promise<any[]> {
  console.warn('findMany() is deprecated. Use qb.findMany() instead.');
  return qb.findMany(table, conditions, { orderBy, limit });
}

export async function insertOne(table: string, data: Record<string, any>): Promise<any> {
  console.warn('insertOne() is deprecated. Use qb.insertOne() instead.');
  return qb.insertOne(table, data);
}

export async function updateOne(table: string, conditions: Record<string, any>, data: Record<string, any>): Promise<any> {
  console.warn('updateOne() is deprecated. Use qb.updateOne() instead.');
  return qb.updateOne(table, conditions, data);
}

export async function deleteMany(table: string, conditions: Record<string, any>): Promise<number> {
  console.warn('deleteMany() is deprecated. Use qb.deleteMany() instead.');
  const result = await qb.deleteMany(table, conditions);
  return result.count;
}

export async function testConnection(): Promise<boolean> {
  const health = await db.healthCheck();
  return health.healthy;
}