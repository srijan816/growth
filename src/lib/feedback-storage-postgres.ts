import { db, executeQuery, findMany, insertOne, deleteMany } from './postgres';
import { FeedbackParser, StudentFeedback } from './feedback-parser';
import path from 'path';

export interface StoredStudentFeedback {
  id: string;
  student_name: string;
  class_code: string;
  class_name: string;
  unit_number: string;
  lesson_number?: string;
  topic?: string;
  motion?: string;
  feedback_type: 'primary' | 'secondary';
  content: string;
  raw_content?: string;
  html_content?: string;
  best_aspects?: string;
  improvement_areas?: string;
  teacher_comments?: string;
  duration?: string;
  file_path: string;
  unique_id?: string;
  instructor: string; // This is the key field!
  parsed_at: string;
  rubric_scores?: any; // JSON object with rubric_1 through rubric_8 keys
}

export interface StudentSummary {
  student_name: string;
  instructor: string;
  total_feedback_sessions: number;
  earliest_unit: number;
  latest_unit: number;
  class_codes: string;
  class_names: string;
  feedback_types: string;
  last_updated: string;
}

export class FeedbackStoragePostgres {
  private parser: FeedbackParser;

  constructor() {
    const dataPath = path.join(process.cwd(), 'data', 'Overall');
    this.parser = new FeedbackParser(dataPath);
    console.log('FeedbackStoragePostgres initialized with data path:', dataPath);
  }

  /**
   * Parse and store all feedback from the data directory
   */
  async parseAndStoreFeedback(): Promise<{
    success: boolean;
    totalProcessed: number;
    totalStudents: number;
    errors: string[];
  }> {
    console.log('Starting feedback parsing and storage...');
    
    try {
      // Clear existing data
      await this.clearExistingData();
      
      // Parse feedback from files
      const feedbackData = await this.parser.parseAllFeedback();
      console.log(`Parsed ${feedbackData.length} feedback records`);

      // Store in database with progress tracking
      let processedCount = 0;
      const errors: string[] = [];
      const batchSize = 50;

      for (let i = 0; i < feedbackData.length; i += batchSize) {
        const batch = feedbackData.slice(i, i + batchSize);
        
        for (const feedback of batch) {
          try {
            await this.storeFeedback(feedback);
            processedCount++;
            
            if (processedCount % 100 === 0) {
              console.log(`Processed ${processedCount}/${feedbackData.length} feedback records`);
            }
          } catch (error) {
            const errorMsg = `Error storing feedback for ${feedback.studentName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
            console.error(errorMsg);
            errors.push(errorMsg);
          }
        }
      }

      // Get unique students count
      const studentsResult = await executeQuery(
        'SELECT COUNT(DISTINCT student_name) as count FROM parsed_student_feedback'
      );
      const totalStudents = studentsResult.rows[0]?.count || 0;

      // Update parsing status
      await this.updateParsingStatus(processedCount, totalStudents, errors);

      console.log(`✅ Parsing completed: ${processedCount} records, ${totalStudents} students, ${errors.length} errors`);

      return {
        success: true,
        totalProcessed: processedCount,
        totalStudents: parseInt(totalStudents),
        errors
      };

    } catch (error) {
      console.error('Error in parseAndStoreFeedback:', error);
      return {
        success: false,
        totalProcessed: 0,
        totalStudents: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Clear existing feedback data
   */
  private async clearExistingData(): Promise<void> {
    console.log('Clearing existing feedback data...');
    
    await executeQuery('DELETE FROM parsed_student_feedback');
    await executeQuery('DELETE FROM feedback_parsing_status');
    
    console.log('Existing data cleared');
  }

  /**
   * Store a single feedback record in the database
   */
  private async storeFeedback(feedback: StudentFeedback): Promise<void> {
    const data = {
      student_name: feedback.studentName,
      class_code: feedback.classCode || '',
      class_name: feedback.className || '',
      unit_number: feedback.unitNumber || '',
      lesson_number: feedback.lessonNumber || null,
      topic: feedback.topic || null,
      motion: feedback.motion || null,
      feedback_type: feedback.feedbackType,
      content: feedback.content,
      raw_content: feedback.rawContent || null,
      html_content: feedback.htmlContent || null,
      best_aspects: null, // Will be extracted from content during analysis
      improvement_areas: null, // Will be extracted from content during analysis  
      teacher_comments: null, // Will be extracted from content during analysis
      duration: feedback.duration || null,
      file_path: feedback.filePath,
      unique_id: feedback.uniqueId || null,
      instructor: feedback.instructor || 'Unknown', // CRITICAL: Store instructor
      rubric_scores: feedback.rubricScores ? JSON.stringify(feedback.rubricScores) : null,
      parsed_at: new Date().toISOString()
    };

    await insertOne('parsed_student_feedback', data);
  }

  /**
   * Get all students with feedback, including instructor attribution
   */
  async getStudentsWithFeedback(): Promise<StudentSummary[]> {
    const query = `
      SELECT * FROM student_feedback_summary
      ORDER BY total_feedback_sessions DESC
    `;
    
    const result = await executeQuery(query);
    return result.rows;
  }

  /**
   * Get feedback for a specific student, optionally filtered by instructor
   */
  async getStudentFeedback(
    studentName: string, 
    feedbackType?: 'primary' | 'secondary', 
    classCode?: string,
    instructor?: string
  ): Promise<StoredStudentFeedback[]> {
    let query = `
      SELECT * FROM parsed_student_feedback 
      WHERE LOWER(student_name) LIKE LOWER($1)
    `;
    const params: any[] = [`%${studentName}%`];
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

    query += ` ORDER BY unit_number::decimal, parsed_at`;

    const result = await executeQuery(query, params);
    return result.rows;
  }

  /**
   * Check if data is ready for analysis
   */
  async isDataReady(): Promise<boolean> {
    try {
      const result = await executeQuery(
        'SELECT is_complete FROM feedback_parsing_status ORDER BY created_at DESC LIMIT 1'
      );
      return result.rows[0]?.is_complete || false;
    } catch (error) {
      console.error('Error checking data readiness:', error);
      return false;
    }
  }

  /**
   * Get parsing status
   */
  async getParsingStatus() {
    const result = await executeQuery(
      'SELECT * FROM feedback_parsing_status ORDER BY created_at DESC LIMIT 1'
    );
    return result.rows[0] || null;
  }

  /**
   * Update parsing status
   */
  private async updateParsingStatus(
    totalProcessed: number, 
    totalStudents: number, 
    errors: string[]
  ): Promise<void> {
    const data = {
      total_files_processed: totalProcessed,
      total_feedback_records: totalProcessed,
      total_students: totalStudents,
      parsing_started_at: new Date().toISOString(),
      parsing_completed_at: new Date().toISOString(),
      parsing_errors: errors,
      is_complete: true
    };

    await insertOne('feedback_parsing_status', data);
  }

  /**
   * Get instructor attribution statistics
   */
  async getInstructorStats(): Promise<{ [instructor: string]: number }> {
    const result = await executeQuery(`
      SELECT instructor, COUNT(*) as count 
      FROM parsed_student_feedback 
      GROUP BY instructor 
      ORDER BY count DESC
    `);

    const stats: { [instructor: string]: number } = {};
    for (const row of result.rows) {
      stats[row.instructor] = parseInt(row.count);
    }
    return stats;
  }

  /**
   * Store parsed feedback data (used by the consolidated API)
   */
  async storeParsedFeedback(feedbacks: StudentFeedback[]): Promise<{
    totalStored: number;
    uniqueStudents: number;
    errors: string[];
  }> {
    console.log(`Storing ${feedbacks.length} parsed feedback records...`);
    
    let storedCount = 0;
    const errors: string[] = [];
    
    for (const feedback of feedbacks) {
      try {
        await this.storeFeedback(feedback);
        storedCount++;
        
        if (storedCount % 50 === 0) {
          console.log(`Stored ${storedCount}/${feedbacks.length} feedback records`);
        }
      } catch (error) {
        const errorMsg = `Error storing feedback for ${feedback.studentName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Get unique students count
    const studentsResult = await executeQuery(
      'SELECT COUNT(DISTINCT student_name) as count FROM parsed_student_feedback'
    );
    const uniqueStudents = studentsResult.rows[0]?.count || 0;

    console.log(`✅ Storage completed: ${storedCount} records, ${uniqueStudents} students, ${errors.length} errors`);

    return {
      totalStored: storedCount,
      uniqueStudents,
      errors
    };
  }

  /**
   * Get students by primary instructor (instructor with most feedback)
   */
  async getStudentsByPrimaryInstructor(): Promise<{ [instructor: string]: string[] }> {
    const query = `
      WITH instructor_counts AS (
        SELECT 
          student_name,
          instructor,
          COUNT(*) as feedback_count,
          ROW_NUMBER() OVER (PARTITION BY student_name ORDER BY COUNT(*) DESC) as rn
        FROM parsed_student_feedback
        GROUP BY student_name, instructor
      )
      SELECT student_name, instructor
      FROM instructor_counts
      WHERE rn = 1
      ORDER BY instructor, student_name
    `;

    const result = await executeQuery(query);
    const studentsByInstructor: { [instructor: string]: string[] } = {};

    for (const row of result.rows) {
      if (!studentsByInstructor[row.instructor]) {
        studentsByInstructor[row.instructor] = [];
      }
      studentsByInstructor[row.instructor].push(row.student_name);
    }

    return studentsByInstructor;
  }
}

// Export singleton instance
export default FeedbackStoragePostgres;