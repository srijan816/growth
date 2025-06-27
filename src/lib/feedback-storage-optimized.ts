import { executeQuery } from './postgres';
import { StoredStudentFeedback, StudentSummary } from './feedback-storage-postgres';

/**
 * Optimized feedback storage methods that prevent N+1 queries
 */
export class OptimizedFeedbackStorage {
  
  /**
   * Get feedback for multiple students in a single query
   * This prevents the N+1 problem where we'd make separate queries for each student
   */
  async getMultipleStudentsFeedback(
    studentNames: string[],
    feedbackType?: 'primary' | 'secondary',
    classCode?: string,
    instructor?: string
  ): Promise<Map<string, StoredStudentFeedback[]>> {
    if (studentNames.length === 0) {
      return new Map();
    }

    let query = `
      SELECT * FROM parsed_student_feedback 
      WHERE student_name = ANY($1::text[])
    `;
    const params: any[] = [studentNames];
    let paramIndex = 2;

    if (feedbackType) {
      query += ` AND feedback_type = $${paramIndex}`;
      params.push(feedbackType);
      paramIndex++;
    }

    if (classCode) {
      query += ` AND class_code = $${paramIndex}`;
      params.push(classCode);
      paramIndex++;
    }

    if (instructor) {
      query += ` AND instructor = $${paramIndex}`;
      params.push(instructor);
      paramIndex++;
    }

    query += ` ORDER BY student_name, unit_number::decimal, parsed_at`;

    const result = await executeQuery(query, params);
    
    // Group feedback by student name
    const feedbackMap = new Map<string, StoredStudentFeedback[]>();
    
    for (const feedback of result.rows) {
      const studentName = feedback.student_name;
      if (!feedbackMap.has(studentName)) {
        feedbackMap.set(studentName, []);
      }
      feedbackMap.get(studentName)!.push(feedback);
    }

    return feedbackMap;
  }

  /**
   * Get students with feedback filtered by instructor permissions in a single query
   */
  async getStudentsWithFeedbackByInstructors(
    allowedInstructors: string[]
  ): Promise<StudentSummary[]> {
    if (allowedInstructors.includes('*')) {
      // Test instructor - get all students
      const query = `
        SELECT * FROM student_feedback_summary
        ORDER BY total_feedback_sessions DESC
      `;
      const result = await executeQuery(query);
      return result.rows;
    }

    const query = `
      SELECT * FROM student_feedback_summary
      WHERE instructor = ANY($1::text[])
      ORDER BY total_feedback_sessions DESC
    `;
    
    const result = await executeQuery(query, [allowedInstructors]);
    return result.rows;
  }

  /**
   * Get all feedback data for analysis in optimized batches
   */
  async getAllFeedbackForAnalysis(
    allowedInstructors: string[]
  ): Promise<Map<string, StoredStudentFeedback[]>> {
    // First, get students for these instructors
    const students = await this.getStudentsWithFeedbackByInstructors(allowedInstructors);
    const studentNames = students.map(s => s.student_name);
    
    if (studentNames.length === 0) {
      return new Map();
    }

    // Then get all their feedback in one query
    return await this.getMultipleStudentsFeedback(studentNames);
  }

  /**
   * Get students by primary instructor with optimized aggregation
   */
  async getStudentsByPrimaryInstructorOptimized(): Promise<{ [instructor: string]: string[] }> {
    const query = `
      WITH instructor_counts AS (
        SELECT 
          student_name,
          instructor,
          COUNT(*) as feedback_count,
          ROW_NUMBER() OVER (PARTITION BY student_name ORDER BY COUNT(*) DESC) as rn
        FROM parsed_student_feedback
        WHERE instructor IS NOT NULL
        GROUP BY student_name, instructor
      ),
      primary_instructors AS (
        SELECT student_name, instructor
        FROM instructor_counts
        WHERE rn = 1
      )
      SELECT 
        instructor,
        ARRAY_AGG(student_name ORDER BY student_name) as students
      FROM primary_instructors
      GROUP BY instructor
      ORDER BY instructor
    `;

    const result = await executeQuery(query);
    const studentsByInstructor: { [instructor: string]: string[] } = {};

    for (const row of result.rows) {
      studentsByInstructor[row.instructor] = row.students;
    }

    return studentsByInstructor;
  }

  /**
   * Get comprehensive student analytics in a single query
   */
  async getStudentAnalytics(
    allowedInstructors: string[]
  ): Promise<{
    students: StudentSummary[];
    feedbackData: Map<string, StoredStudentFeedback[]>;
    instructorStats: { [instructor: string]: { studentCount: number; feedbackCount: number } };
  }> {
    // Get students
    const students = await this.getStudentsWithFeedbackByInstructors(allowedInstructors);
    
    // Get all feedback data efficiently
    const feedbackData = await this.getAllFeedbackForAnalysis(allowedInstructors);
    
    // Get instructor statistics
    const statsQuery = `
      SELECT 
        instructor,
        COUNT(DISTINCT student_name) as student_count,
        COUNT(*) as feedback_count
      FROM parsed_student_feedback
      WHERE instructor = ANY($1::text[])
      GROUP BY instructor
      ORDER BY instructor
    `;
    
    const statsResult = await executeQuery(statsQuery, [allowedInstructors]);
    const instructorStats: { [instructor: string]: { studentCount: number; feedbackCount: number } } = {};
    
    for (const row of statsResult.rows) {
      instructorStats[row.instructor] = {
        studentCount: parseInt(row.student_count),
        feedbackCount: parseInt(row.feedback_count)
      };
    }

    return {
      students,
      feedbackData,
      instructorStats
    };
  }

  /**
   * Batch insert feedback records for optimal performance
   */
  async batchInsertFeedback(feedbacks: any[]): Promise<void> {
    if (feedbacks.length === 0) return;

    // Use PostgreSQL's UNNEST for efficient batch insert
    const columns = [
      'student_name', 'class_code', 'class_name', 'unit_number', 'lesson_number',
      'topic', 'motion', 'feedback_type', 'content', 'raw_content', 'html_content',
      'best_aspects', 'improvement_areas', 'teacher_comments', 'duration',
      'file_path', 'unique_id', 'instructor', 'parsed_at'
    ];

    const values = feedbacks.map((feedback, index) => {
      const row = columns.map((_, colIndex) => `$${index * columns.length + colIndex + 1}`);
      return `(${row.join(', ')})`;
    });

    const flatParams = feedbacks.flatMap(feedback => [
      feedback.student_name,
      feedback.class_code || '',
      feedback.class_name || '',
      feedback.unit_number || '',
      feedback.lesson_number || null,
      feedback.topic || null,
      feedback.motion || null,
      feedback.feedback_type,
      feedback.content,
      feedback.raw_content || null,
      feedback.html_content || null,
      feedback.best_aspects || null,
      feedback.improvement_areas || null,
      feedback.teacher_comments || null,
      feedback.duration || null,
      feedback.file_path,
      feedback.unique_id || null,
      feedback.instructor || 'Unknown',
      new Date().toISOString()
    ]);

    const query = `
      INSERT INTO parsed_student_feedback (${columns.join(', ')})
      VALUES ${values.join(', ')}
      ON CONFLICT (unique_id) DO UPDATE SET
        content = EXCLUDED.content,
        parsed_at = EXCLUDED.parsed_at
    `;

    await executeQuery(query, flatParams);
  }
}