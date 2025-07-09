import { BaseRepository } from '../base/BaseRepository';
import { DatabaseConnection } from '../base/DatabaseConnection';

export interface ParsedStudentFeedback {
  id: string;
  student_name: string;
  student_id: string;
  instructor: string;
  class_date: string;
  class_code: string;
  rubric_scores: Record<string, number>;
  strengths: string;
  improvement_areas: string;
  teacher_comments: string;
  parsed_from_file: string;
  unique_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface FeedbackSummary {
  totalFeedback: number;
  uniqueStudents: number;
  dateRange: {
    earliest: Date;
    latest: Date;
  };
  byInstructor: Record<string, number>;
  byClass: Record<string, number>;
}

export interface StudentFeedbackHistory {
  studentId: string;
  studentName: string;
  feedbackCount: number;
  averageScores: Record<string, number>;
  latestFeedback: ParsedStudentFeedback | null;
  growthTrend: 'improving' | 'stable' | 'declining';
}

export class FeedbackRepository extends BaseRepository<ParsedStudentFeedback> {
  protected tableName = 'parsed_student_feedback';
  protected selectFields = [
    'id',
    'student_name',
    'student_id',
    'instructor',
    'class_date',
    'class_code',
    'rubric_scores',
    'strengths',
    'improvement_areas',
    'teacher_comments',
    'parsed_from_file',
    'unique_id',
    'created_at',
    'updated_at'
  ];

  constructor(db: DatabaseConnection) {
    super(db);
  }

  async findByStudentId(studentId: string): Promise<ParsedStudentFeedback[]> {
    return this.findMany(
      { student_id: studentId },
      { orderBy: 'class_date', orderDirection: 'DESC' }
    );
  }

  async findByInstructor(instructorName: string): Promise<ParsedStudentFeedback[]> {
    return this.findMany(
      { instructor: instructorName },
      { orderBy: 'class_date', orderDirection: 'DESC' }
    );
  }

  async findByClassCode(classCode: string): Promise<ParsedStudentFeedback[]> {
    return this.findMany(
      { class_code: classCode },
      { orderBy: 'class_date', orderDirection: 'DESC' }
    );
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<ParsedStudentFeedback[]> {
    const query = `
      SELECT ${this.selectFields.join(', ')}
      FROM ${this.tableName}
      WHERE class_date >= $1 AND class_date <= $2
      ORDER BY class_date DESC
    `;

    const result = await this.db.query<ParsedStudentFeedback>(query, [startDate, endDate]);
    return result.rows;
  }

  async getStudentFeedbackHistory(studentId: string): Promise<StudentFeedbackHistory | null> {
    const feedbacks = await this.findByStudentId(studentId);
    
    if (feedbacks.length === 0) {
      return null;
    }

    // Calculate average scores
    const scoresSums: Record<string, number> = {};
    const scoresCounts: Record<string, number> = {};

    feedbacks.forEach(feedback => {
      Object.entries(feedback.rubric_scores).forEach(([category, score]) => {
        scoresSums[category] = (scoresSums[category] || 0) + score;
        scoresCounts[category] = (scoresCounts[category] || 0) + 1;
      });
    });

    const averageScores: Record<string, number> = {};
    Object.keys(scoresSums).forEach(category => {
      averageScores[category] = scoresSums[category] / scoresCounts[category];
    });

    // Determine growth trend
    const recentFeedback = feedbacks.slice(0, 3);
    const olderFeedback = feedbacks.slice(-3);
    
    let growthTrend: 'improving' | 'stable' | 'declining' = 'stable';
    
    if (recentFeedback.length >= 2 && olderFeedback.length >= 2) {
      const recentAvg = this.calculateAverageScore(recentFeedback);
      const olderAvg = this.calculateAverageScore(olderFeedback);
      
      if (recentAvg > olderAvg + 0.3) growthTrend = 'improving';
      else if (recentAvg < olderAvg - 0.3) growthTrend = 'declining';
    }

    return {
      studentId,
      studentName: feedbacks[0].student_name,
      feedbackCount: feedbacks.length,
      averageScores,
      latestFeedback: feedbacks[0],
      growthTrend
    };
  }

  async getFeedbackSummary(filter?: { instructorId?: string; dateFrom?: Date; dateTo?: Date }): Promise<FeedbackSummary> {
    let whereConditions: string[] = [];
    let params: any[] = [];
    let paramCount = 1;

    if (filter?.instructorId) {
      whereConditions.push(`instructor = $${paramCount}`);
      params.push(filter.instructorId);
      paramCount++;
    }

    if (filter?.dateFrom) {
      whereConditions.push(`class_date >= $${paramCount}`);
      params.push(filter.dateFrom);
      paramCount++;
    }

    if (filter?.dateTo) {
      whereConditions.push(`class_date <= $${paramCount}`);
      params.push(filter.dateTo);
      paramCount++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const query = `
      WITH feedback_stats AS (
        SELECT 
          COUNT(*) as total_feedback,
          COUNT(DISTINCT student_id) as unique_students,
          MIN(class_date) as earliest_date,
          MAX(class_date) as latest_date
        FROM ${this.tableName}
        ${whereClause}
      ),
      instructor_counts AS (
        SELECT 
          instructor,
          COUNT(*) as count
        FROM ${this.tableName}
        ${whereClause}
        GROUP BY instructor
      ),
      class_counts AS (
        SELECT 
          class_code,
          COUNT(*) as count
        FROM ${this.tableName}
        ${whereClause}
        GROUP BY class_code
      )
      SELECT 
        fs.*,
        COALESCE(json_object_agg(ic.instructor, ic.count) FILTER (WHERE ic.instructor IS NOT NULL), '{}'::json) as by_instructor,
        COALESCE(json_object_agg(cc.class_code, cc.count) FILTER (WHERE cc.class_code IS NOT NULL), '{}'::json) as by_class
      FROM feedback_stats fs
      CROSS JOIN instructor_counts ic
      CROSS JOIN class_counts cc
      GROUP BY fs.total_feedback, fs.unique_students, fs.earliest_date, fs.latest_date
    `;

    const result = await this.db.query<any>(query, params);
    const row = result.rows[0];

    return {
      totalFeedback: parseInt(row.total_feedback),
      uniqueStudents: parseInt(row.unique_students),
      dateRange: {
        earliest: row.earliest_date,
        latest: row.latest_date
      },
      byInstructor: row.by_instructor,
      byClass: row.by_class
    };
  }

  async bulkUpsert(feedbacks: Partial<ParsedStudentFeedback>[]): Promise<number> {
    if (feedbacks.length === 0) return 0;

    const fields = Object.keys(feedbacks[0]).filter(f => f !== 'id');
    const values: any[] = [];
    const placeholders: string[] = [];

    feedbacks.forEach((feedback, index) => {
      const rowPlaceholders: string[] = [];
      fields.forEach((field, fieldIndex) => {
        const paramNum = index * fields.length + fieldIndex + 1;
        values.push((feedback as any)[field]);
        rowPlaceholders.push(`$${paramNum}`);
      });
      placeholders.push(`(${rowPlaceholders.join(', ')})`);
    });

    const query = `
      INSERT INTO ${this.tableName} (${fields.join(', ')})
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (unique_id) DO UPDATE SET
        ${fields.filter(f => f !== 'unique_id').map(f => `${f} = EXCLUDED.${f}`).join(', ')},
        updated_at = CURRENT_TIMESTAMP
    `;

    const result = await this.db.query(query, values);
    return result.rowCount;
  }

  async searchFeedback(searchTerm: string, limit: number = 50): Promise<ParsedStudentFeedback[]> {
    const query = `
      SELECT ${this.selectFields.join(', ')}
      FROM ${this.tableName}
      WHERE 
        student_name ILIKE $1 OR
        student_id ILIKE $1 OR
        instructor ILIKE $1 OR
        class_code ILIKE $1 OR
        strengths ILIKE $1 OR
        improvement_areas ILIKE $1 OR
        teacher_comments ILIKE $1
      ORDER BY class_date DESC
      LIMIT $2
    `;

    const result = await this.db.query<ParsedStudentFeedback>(query, [`%${searchTerm}%`, limit]);
    return result.rows;
  }

  private calculateAverageScore(feedbacks: ParsedStudentFeedback[]): number {
    let totalScore = 0;
    let totalCount = 0;

    feedbacks.forEach(feedback => {
      Object.values(feedback.rubric_scores).forEach(score => {
        totalScore += score;
        totalCount++;
      });
    });

    return totalCount > 0 ? totalScore / totalCount : 0;
  }

  // Optimized methods from OptimizedFeedbackStorage
  async getCourseSummaries(instructorId?: string): Promise<any[]> {
    const query = `
      WITH course_stats AS (
        SELECT 
          class_code,
          COUNT(DISTINCT student_id) as total_students,
          COUNT(*) as total_feedback_count,
          MAX(class_date) as last_class_date,
          jsonb_object_agg(
            DISTINCT instructor,
            true
          ) as instructors
        FROM parsed_student_feedback
        ${instructorId ? 'WHERE instructor = $1' : ''}
        GROUP BY class_code
      ),
      course_averages AS (
        SELECT 
          class_code,
          jsonb_object_agg(
            key,
            avg_score
          ) as avg_scores
        FROM (
          SELECT 
            class_code,
            key,
            AVG(value::numeric) as avg_score
          FROM parsed_student_feedback,
          jsonb_each_text(rubric_scores)
          ${instructorId ? 'WHERE instructor = $1' : ''}
          GROUP BY class_code, key
        ) scores
        GROUP BY class_code
      )
      SELECT 
        cs.*,
        ca.avg_scores,
        array_agg(DISTINCT key) as rubric_categories
      FROM course_stats cs
      JOIN course_averages ca ON cs.class_code = ca.class_code,
      jsonb_object_keys(ca.avg_scores) as key
      GROUP BY cs.class_code, cs.total_students, cs.total_feedback_count, 
               cs.last_class_date, cs.instructors, ca.avg_scores
      ORDER BY cs.last_class_date DESC
    `;

    const result = await this.db.query(query, instructorId ? [instructorId] : []);
    return result.rows;
  }

  async getStudentGrowthData(studentId: string): Promise<any> {
    const query = `
      WITH feedback_timeline AS (
        SELECT 
          id,
          class_date,
          class_code,
          instructor,
          rubric_scores,
          strengths,
          improvement_areas,
          teacher_comments,
          ROW_NUMBER() OVER (PARTITION BY class_code ORDER BY class_date DESC) as rn
        FROM parsed_student_feedback
        WHERE student_id = $1
      ),
      latest_feedback AS (
        SELECT * FROM feedback_timeline WHERE rn = 1
      ),
      score_trends AS (
        SELECT 
          key as category,
          array_agg(
            json_build_object(
              'date', class_date,
              'score', value::numeric,
              'class_code', class_code
            ) ORDER BY class_date
          ) as trend
        FROM parsed_student_feedback,
        jsonb_each_text(rubric_scores)
        WHERE student_id = $1
        GROUP BY key
      )
      SELECT 
        json_build_object(
          'student_id', $1,
          'total_feedback_count', COUNT(DISTINCT ft.id),
          'courses_enrolled', COUNT(DISTINCT ft.class_code),
          'date_range', json_build_object(
            'first', MIN(ft.class_date),
            'last', MAX(ft.class_date)
          ),
          'latest_feedback', json_agg(DISTINCT lf.*),
          'score_trends', json_object_agg(st.category, st.trend),
          'instructors', array_agg(DISTINCT ft.instructor)
        ) as growth_data
      FROM feedback_timeline ft
      CROSS JOIN latest_feedback lf
      CROSS JOIN score_trends st
      GROUP BY st.category, st.trend
    `;

    const result = await this.db.query(query, [studentId]);
    return result.rows[0]?.growth_data || null;
  }
}