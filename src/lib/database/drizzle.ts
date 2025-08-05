import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { db as dbConnection } from './connection';

// Create a typed Drizzle instance using our secure connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 
    `postgresql://${process.env.POSTGRES_USER || 'tikaram'}:${process.env.POSTGRES_PASSWORD || ''}@${process.env.POSTGRES_HOST || 'localhost'}:${process.env.POSTGRES_PORT || '5432'}/${process.env.POSTGRES_DB || 'growth_compass'}`,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Create the Drizzle instance with schema
export const drizzleDb = drizzle(pool, { schema, logger: process.env.NODE_ENV === 'development' });

// Export types for use in the application
export type DrizzleDb = typeof drizzleDb;

// Export a transaction helper
export async function drizzleTransaction<T>(
  callback: (tx: DrizzleDb) => Promise<T>
): Promise<T> {
  return drizzleDb.transaction(callback);
}

// Query builder helpers with full type safety
export const db = {
  // Direct table access
  ...drizzleDb,
  
  // Helper methods
  users: {
    findById: (id: string) => 
      drizzleDb.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, id),
        with: { student: true, instructor: true }
      }),
    
    findByEmail: (email: string) =>
      drizzleDb.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, email),
        with: { student: true, instructor: true }
      }),
  },
  
  students: {
    findById: (id: string) =>
      drizzleDb.query.students.findFirst({
        where: (students, { eq }) => eq(students.id, id),
        with: {
          user: true,
          enrollments: {
            with: { course: true }
          },
          attendances: {
            orderBy: (attendances, { desc }) => [desc(attendances.createdAt)],
            limit: 10
          },
          feedback: {
            orderBy: (feedback, { desc }) => [desc(feedback.parsedAt)],
            limit: 5
          }
        }
      }),
    
    findByStudentNumber: (studentNumber: string) =>
      drizzleDb.query.students.findFirst({
        where: (students, { eq }) => eq(students.studentNumber, studentNumber),
        with: { user: true }
      }),
  },
  
  courses: {
    findById: (id: string) =>
      drizzleDb.query.courses.findFirst({
        where: (courses, { eq }) => eq(courses.id, id),
        with: {
          instructor: true,
          enrollments: {
            with: { student: { with: { user: true } } }
          },
          sessions: {
            orderBy: (sessions, { desc }) => [desc(sessions.sessionDate)]
          }
        }
      }),
    
    findByCode: (code: string) =>
      drizzleDb.query.courses.findFirst({
        where: (courses, { eq }) => eq(courses.code, code),
        with: { instructor: true }
      }),
    
    findActive: () =>
      drizzleDb.query.courses.findMany({
        where: (courses, { eq }) => eq(courses.status, 'active'),
        with: {
          instructor: true,
          enrollments: {
            where: (enrollments, { eq }) => eq(enrollments.status, 'active')
          }
        }
      }),
  },
  
  attendances: {
    findBySession: (sessionId: string) =>
      drizzleDb.query.attendances.findMany({
        where: (attendances, { eq }) => eq(attendances.sessionId, sessionId),
        with: {
          student: { with: { user: true } }
        }
      }),
    
    findByStudent: (studentId: string, limit = 20) =>
      drizzleDb.query.attendances.findMany({
        where: (attendances, { eq }) => eq(attendances.studentId, studentId),
        with: {
          session: { with: { course: true } }
        },
        orderBy: (attendances, { desc }) => [desc(attendances.createdAt)],
        limit
      }),
  },
  
  feedback: {
    findByStudent: (studentId: string) =>
      drizzleDb.query.parsedStudentFeedback.findMany({
        where: (feedback, { eq }) => eq(feedback.studentId, studentId),
        orderBy: (feedback, { desc }) => [desc(feedback.parsedAt)]
      }),
    
    findByInstructor: (instructor: string) =>
      drizzleDb.query.parsedStudentFeedback.findMany({
        where: (feedback, { eq }) => eq(feedback.instructor, instructor),
        orderBy: (feedback, { desc }) => [desc(feedback.parsedAt)]
      }),
  }
};