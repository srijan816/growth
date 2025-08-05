import { cache, CacheOptions } from './cache';
import { db, DrizzleDb } from './drizzle';
import * as schema from './schema';

export class CachedRepository {
  protected db: DrizzleDb;
  protected cache = cache;
  protected defaultTTL = 3600; // 1 hour

  constructor(database: DrizzleDb = db) {
    this.db = database;
  }

  // Student repository with caching
  async findStudentById(id: string, useCache: boolean = true): Promise<schema.Student | null> {
    const cacheKey = `student:${id}`;
    
    if (useCache) {
      const cached = await this.cache.get<schema.Student>(cacheKey);
      if (cached) return cached;
    }
    
    const student = await this.db.query.students.findFirst({
      where: (students, { eq }) => eq(students.id, id),
      with: {
        user: true,
        enrollments: {
          with: { course: true }
        }
      }
    });
    
    if (student && useCache) {
      await this.cache.set(cacheKey, student, { ttl: this.defaultTTL });
    }
    
    return student || null;
  }

  async findStudentsByGrade(gradeLevel: string, useCache: boolean = true): Promise<schema.Student[]> {
    const cacheKey = `students:grade:${gradeLevel}`;
    
    if (useCache) {
      const cached = await this.cache.get<schema.Student[]>(cacheKey);
      if (cached) return cached;
    }
    
    const students = await this.db.query.students.findMany({
      where: (students, { eq }) => eq(students.gradeLevel, gradeLevel),
      with: { user: true }
    });
    
    if (useCache) {
      await this.cache.set(cacheKey, students, { ttl: this.defaultTTL / 2 }); // 30 min
    }
    
    return students;
  }

  // Course repository with caching
  async findCourseById(id: string, useCache: boolean = true): Promise<schema.Course | null> {
    const cacheKey = `course:${id}`;
    
    if (useCache) {
      const cached = await this.cache.get<schema.Course>(cacheKey);
      if (cached) return cached;
    }
    
    const course = await this.db.query.courses.findFirst({
      where: (courses, { eq }) => eq(courses.id, id),
      with: {
        instructor: true,
        enrollments: {
          with: {
            student: {
              with: { user: true }
            }
          }
        }
      }
    });
    
    if (course && useCache) {
      await this.cache.set(cacheKey, course, { ttl: this.defaultTTL });
    }
    
    return course || null;
  }

  async findActiveCourses(useCache: boolean = true): Promise<schema.Course[]> {
    const cacheKey = 'courses:active';
    
    if (useCache) {
      const cached = await this.cache.get<schema.Course[]>(cacheKey);
      if (cached) return cached;
    }
    
    const courses = await this.db.query.courses.findMany({
      where: (courses, { eq }) => eq(courses.status, 'active'),
      with: { instructor: true }
    });
    
    if (useCache) {
      await this.cache.set(cacheKey, courses, { ttl: 300 }); // 5 min
    }
    
    return courses;
  }

  // Attendance analytics with caching
  async getStudentAttendanceStats(
    studentId: string, 
    dateFrom: Date, 
    dateTo: Date,
    useCache: boolean = true
  ): Promise<{
    totalSessions: number;
    attendedSessions: number;
    missedSessions: number;
    attendanceRate: number;
    averageRating: number;
  }> {
    const cacheKey = `attendance:stats:${studentId}:${dateFrom.toISOString()}:${dateTo.toISOString()}`;
    
    if (useCache) {
      const cached = await this.cache.get<any>(cacheKey);
      if (cached) return cached;
    }
    
    const attendances = await this.db.query.attendances.findMany({
      where: (attendances, { and, eq, gte, lte }) => and(
        eq(attendances.studentId, studentId),
        gte(attendances.createdAt, dateFrom),
        lte(attendances.createdAt, dateTo)
      )
    });
    
    const totalSessions = attendances.length;
    const attendedSessions = attendances.filter(a => a.status === 'present').length;
    const missedSessions = attendances.filter(a => a.status === 'absent').length;
    const attendanceRate = totalSessions > 0 ? (attendedSessions / totalSessions) * 100 : 0;
    
    const ratings = attendances
      .filter(a => a.status === 'present')
      .map(a => {
        const total = (a.attitudeEfforts || 0) + 
                     (a.askingQuestions || 0) + 
                     (a.applicationSkills || 0) + 
                     (a.applicationFeedback || 0);
        return total / 4;
      });
    
    const averageRating = ratings.length > 0 
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length 
      : 0;
    
    const stats = {
      totalSessions,
      attendedSessions,
      missedSessions,
      attendanceRate,
      averageRating
    };
    
    if (useCache) {
      await this.cache.set(cacheKey, stats, { ttl: 1800 }); // 30 min
    }
    
    return stats;
  }

  // Feedback with caching
  async getStudentFeedback(
    studentId: string,
    limit: number = 10,
    useCache: boolean = true
  ): Promise<schema.ParsedStudentFeedback[]> {
    const cacheKey = `feedback:student:${studentId}:${limit}`;
    
    if (useCache) {
      const cached = await this.cache.get<schema.ParsedStudentFeedback[]>(cacheKey);
      if (cached) return cached;
    }
    
    const feedback = await this.db.query.parsedStudentFeedback.findMany({
      where: (feedback, { eq }) => eq(feedback.studentId, studentId),
      orderBy: (feedback, { desc }) => [desc(feedback.parsedAt)],
      limit
    });
    
    if (useCache) {
      await this.cache.set(cacheKey, feedback, { ttl: this.defaultTTL });
    }
    
    return feedback;
  }

  // Materialized view data with caching
  async getStudentMetrics(useCache: boolean = true): Promise<any[]> {
    const cacheKey = 'metrics:students:all';
    
    if (useCache) {
      const cached = await this.cache.get<any[]>(cacheKey);
      if (cached) return cached;
    }
    
    // Query materialized view
    const result = await this.db.execute(
      schema.sql`SELECT * FROM student_metrics_mv ORDER BY name`
    );
    
    if (useCache) {
      await this.cache.set(cacheKey, result, { ttl: 600 }); // 10 min
    }
    
    return result;
  }

  // Cache invalidation methods
  async invalidateStudent(studentId: string): Promise<void> {
    await this.cache.invalidateStudent(studentId);
    // Also invalidate related caches
    await this.cache.deletePattern('metrics:students:*');
  }

  async invalidateCourse(courseId: string): Promise<void> {
    await this.cache.invalidateCourse(courseId);
    await this.cache.delete('courses:active');
  }

  async invalidateAttendance(studentId: string): Promise<void> {
    await this.cache.deletePattern(`attendance:*:${studentId}:*`);
    await this.invalidateStudent(studentId);
  }

  // Batch operations with caching
  async getMultipleStudents(ids: string[], useCache: boolean = true): Promise<(schema.Student | null)[]> {
    if (!useCache) {
      return Promise.all(ids.map(id => this.findStudentById(id, false)));
    }
    
    // Check cache for all keys
    const cacheKeys = ids.map(id => `student:${id}`);
    const cached = await this.cache.mget<schema.Student>(cacheKeys);
    
    // Identify cache misses
    const misses: { index: number; id: string }[] = [];
    cached.forEach((item, index) => {
      if (!item) {
        misses.push({ index, id: ids[index] });
      }
    });
    
    // Fetch missing data
    if (misses.length > 0) {
      const missedIds = misses.map(m => m.id);
      const students = await this.db.query.students.findMany({
        where: (students, { inArray }) => inArray(students.id, missedIds),
        with: { user: true }
      });
      
      // Create a map for quick lookup
      const studentMap = new Map(students.map(s => [s.id, s]));
      
      // Update cache and result array
      const cacheUpdates: { key: string; value: schema.Student }[] = [];
      
      misses.forEach(({ index, id }) => {
        const student = studentMap.get(id) || null;
        cached[index] = student;
        
        if (student) {
          cacheUpdates.push({
            key: `student:${id}`,
            value: student
          });
        }
      });
      
      // Batch update cache
      if (cacheUpdates.length > 0) {
        await this.cache.mset(cacheUpdates, { ttl: this.defaultTTL });
      }
    }
    
    return cached;
  }

  // Performance monitoring
  async getCacheStats(): Promise<any> {
    return this.cache.getStats();
  }
}

// Export singleton instance
export const cachedRepo = new CachedRepository();

// Re-export types
import { sql } from 'drizzle-orm';