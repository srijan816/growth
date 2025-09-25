import { NextResponse } from 'next/server';
import { db } from '@/lib/database/connection';

export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: {
      connected: false,
      tables: 0,
      error: null as string | null
    },
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '0.1.0'
  };

  try {
    // Test database connection
    const result = await db.query('SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = $1', ['public']);
    
    health.database.connected = true;
    health.database.tables = parseInt(result.rows[0].count);
    
    // Quick data check
    const dataCheck = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM students) as students,
        (SELECT COUNT(*) FROM courses) as courses
    `);
    
    const data = dataCheck.rows[0];
    Object.assign(health.database, {
      users: parseInt(data.users),
      students: parseInt(data.students),
      courses: parseInt(data.courses)
    });
    
  } catch (error) {
    health.status = 'unhealthy';
    health.database.connected = false;
    health.database.error = error instanceof Error ? error.message : 'Unknown database error';
    
    // Return 503 Service Unavailable if database is down
    return NextResponse.json(health, { status: 503 });
  }

  return NextResponse.json(health);
}