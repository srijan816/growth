import { DatabaseConnection } from './base/DatabaseConnection';
import { FeedbackRepository } from './repositories/FeedbackRepository';
import { StudentRepository } from './repositories/StudentRepository';
import { CourseRepository } from './repositories/CourseRepository';
import { AttendanceRepository } from './repositories/AttendanceRepository';
import { AnalyticsRepository } from './repositories/AnalyticsRepository';

export class DataAccessLayer {
  private static instance: DataAccessLayer;
  private db: DatabaseConnection;

  public feedback: FeedbackRepository;
  public students: StudentRepository;
  public courses: CourseRepository;
  public attendance: AttendanceRepository;
  public analytics: AnalyticsRepository;

  private constructor() {
    this.db = new DatabaseConnection();
    
    // Initialize all repositories
    this.feedback = new FeedbackRepository(this.db);
    this.students = new StudentRepository(this.db);
    this.courses = new CourseRepository(this.db);
    this.attendance = new AttendanceRepository(this.db);
    this.analytics = new AnalyticsRepository(this.db);
  }

  public static getInstance(): DataAccessLayer {
    if (!DataAccessLayer.instance) {
      DataAccessLayer.instance = new DataAccessLayer();
    }
    return DataAccessLayer.instance;
  }

  // Transaction helper
  public async transaction<T>(
    callback: (repositories: {
      feedback: FeedbackRepository;
      students: StudentRepository;
      courses: CourseRepository;
      attendance: AttendanceRepository;
      analytics: AnalyticsRepository;
    }) => Promise<T>
  ): Promise<T> {
    return this.db.transaction(async () => {
      return callback({
        feedback: this.feedback,
        students: this.students,
        courses: this.courses,
        attendance: this.attendance,
        analytics: this.analytics
      });
    });
  }

  // Utility methods for common operations
  public async healthCheck(): Promise<boolean> {
    try {
      await this.db.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const dal = DataAccessLayer.getInstance();

// Export types
export * from './repositories/FeedbackRepository';
export * from './repositories/StudentRepository';
export * from './repositories/CourseRepository';
export * from './repositories/AttendanceRepository';
export * from './repositories/AnalyticsRepository';