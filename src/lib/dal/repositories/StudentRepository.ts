import { BaseRepository } from '../base/BaseRepository';
import { DatabaseConnection } from '../base/DatabaseConnection';

export interface Student {
  id: string;
  parent_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface StudentWithUser {
  id: string;
  parent_id: string;
  name: string;
  email: string;
  created_at: Date;
  updated_at: Date;
}

export interface StudentEnrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrollment_date: Date;
  status: 'active' | 'completed' | 'withdrawn';
  created_at: Date;
  updated_at: Date;
}

export interface StudentWithEnrollments extends StudentWithUser {
  enrollments: Array<{
    id: string;
    course_id: string;
    course_code: string;
    course_name: string;
    enrollment_date: Date;
    status: string;
    instructor_id: string;
    instructor_name: string;
  }>;
}

export interface StudentGrowthMetrics {
  studentId: string;
  studentName: string;
  overallProgress: number;
  programMetrics: Array<{
    programType: string;
    enrollmentCount: number;
    averageAttendance: number;
    averageRatings: Record<string, number>;
    latestSkillLevel: string;
    growthTrend: 'improving' | 'stable' | 'declining';
  }>;
  recentActivity: Array<{
    date: Date;
    type: 'attendance' | 'feedback' | 'submission';
    courseCode: string;
    details: any;
  }>;
}

export class StudentRepository extends BaseRepository<Student> {
  protected tableName = 'students';
  protected selectFields = ['id', 'parent_id', 'created_at', 'updated_at'];

  constructor(db: DatabaseConnection) {
    super(db);
  }

  async findWithUserDetails(studentId: string): Promise<StudentWithUser | null> {
    const query = `
      SELECT 
        s.id,
        s.parent_id,
        u.name,
        u.email,
        s.created_at,
        s.updated_at
      FROM students s
      JOIN users u ON u.id = s.id
      WHERE s.id = $1
    `;

    const result = await this.db.query<StudentWithUser>(query, [studentId]);
    return result.rows[0] || null;
  }

  async findByParentId(parentId: string): Promise<StudentWithUser[]> {
    const query = `
      SELECT 
        s.id,
        s.parent_id,
        u.name,
        u.email,
        s.created_at,
        s.updated_at
      FROM students s
      JOIN users u ON u.id = s.id
      WHERE s.parent_id = $1
      ORDER BY u.name
    `;

    const result = await this.db.query<StudentWithUser>(query, [parentId]);
    return result.rows;
  }

  async findWithEnrollments(studentId: string): Promise<StudentWithEnrollments | null> {
    const studentQuery = `
      SELECT 
        s.id,
        s.parent_id,
        u.name,
        u.email,
        s.created_at,
        s.updated_at
      FROM students s
      JOIN users u ON u.id = s.id
      WHERE s.id = $1
    `;

    const enrollmentQuery = `
      SELECT 
        e.id,
        e.course_id,
        c.course_code,
        c.course_name,
        e.enrollment_date,
        e.status,
        c.instructor_id,
        i.name as instructor_name
      FROM enrollments e
      JOIN courses c ON c.id = e.course_id
      LEFT JOIN users i ON i.id = c.instructor_id
      WHERE e.student_id = $1
      ORDER BY e.enrollment_date DESC
    `;

    const [studentResult, enrollmentResult] = await Promise.all([
      this.db.query<StudentWithUser>(studentQuery, [studentId]),
      this.db.query(enrollmentQuery, [studentId])
    ]);

    const student = studentResult.rows[0];
    if (!student) return null;

    return {
      ...student,
      enrollments: enrollmentResult.rows
    };
  }

  async findByInstructorCourses(instructorId: string): Promise<StudentWithUser[]> {
    const query = `
      SELECT DISTINCT
        s.id,
        s.parent_id,
        u.name,
        u.email,
        s.created_at,
        s.updated_at
      FROM students s
      JOIN users u ON u.id = s.id
      JOIN enrollments e ON e.student_id = s.id
      JOIN courses c ON c.id = e.course_id
      WHERE c.instructor_id = $1 AND e.status = 'active'
      ORDER BY u.name
    `;

    const result = await this.db.query<StudentWithUser>(query, [instructorId]);
    return result.rows;
  }

  async getGrowthMetrics(studentId: string): Promise<StudentGrowthMetrics | null> {
    const student = await this.findWithUserDetails(studentId);
    if (!student) return null;

    // Get program-wise metrics
    const programMetricsQuery = `
      WITH program_enrollments AS (
        SELECT 
          c.program_type,
          COUNT(DISTINCT e.id) as enrollment_count,
          MAX(cc.skill_level_id) as latest_skill_level_id
        FROM enrollments e
        JOIN courses c ON c.id = e.course_id
        LEFT JOIN course_configurations cc ON cc.course_id = c.id
        WHERE e.student_id = $1
        GROUP BY c.program_type
      ),
      attendance_metrics AS (
        SELECT 
          c.program_type,
          AVG(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100 as avg_attendance,
          AVG(a.attitude_rating) as avg_attitude,
          AVG(a.questions_rating) as avg_questions,
          AVG(a.skills_rating) as avg_skills,
          AVG(a.feedback_rating) as avg_feedback
        FROM attendances a
        JOIN sessions s ON s.id = a.session_id
        JOIN courses c ON c.id = s.course_id
        WHERE a.student_id = $1
        GROUP BY c.program_type
      )
      SELECT 
        pe.program_type,
        pe.enrollment_count,
        COALESCE(am.avg_attendance, 0) as average_attendance,
        json_build_object(
          'attitude', COALESCE(am.avg_attitude, 0),
          'questions', COALESCE(am.avg_questions, 0),
          'skills', COALESCE(am.avg_skills, 0),
          'feedback', COALESCE(am.avg_feedback, 0)
        ) as average_ratings,
        sl.level_code as latest_skill_level
      FROM program_enrollments pe
      LEFT JOIN attendance_metrics am ON am.program_type = pe.program_type
      LEFT JOIN skill_levels sl ON sl.id = pe.latest_skill_level_id
    `;

    const programMetrics = await this.db.query(programMetricsQuery, [studentId]);

    // Get recent activity
    const activityQuery = `
      WITH recent_activity AS (
        -- Attendances
        SELECT 
          s.date as activity_date,
          'attendance' as type,
          c.course_code,
          json_build_object(
            'status', a.status,
            'ratings', json_build_object(
              'attitude', a.attitude_rating,
              'questions', a.questions_rating,
              'skills', a.skills_rating,
              'feedback', a.feedback_rating
            )
          ) as details
        FROM attendances a
        JOIN sessions s ON s.id = a.session_id
        JOIN courses c ON c.id = s.course_id
        WHERE a.student_id = $1
        
        UNION ALL
        
        -- Feedback
        SELECT 
          psf.class_date::date as activity_date,
          'feedback' as type,
          psf.class_code as course_code,
          json_build_object(
            'instructor', psf.instructor,
            'avg_score', (
              SELECT AVG(value::numeric)
              FROM jsonb_each_text(psf.rubric_scores)
            )
          ) as details
        FROM parsed_student_feedback psf
        WHERE psf.student_id = $1
        
        UNION ALL
        
        -- Submissions
        SELECT 
          ls.submitted_at::date as activity_date,
          'submission' as type,
          c.course_code,
          json_build_object(
            'has_recording', ls.speech_recording_url IS NOT NULL,
            'has_worksheet', ls.worksheet_url IS NOT NULL,
            'lesson_number', lp.lesson_number
          ) as details
        FROM lesson_submissions ls
        JOIN lesson_plans lp ON lp.id = ls.lesson_plan_id
        JOIN course_configurations cc ON cc.id = lp.course_config_id
        JOIN courses c ON c.id = cc.course_id
        WHERE ls.student_id = $1
      )
      SELECT * FROM recent_activity
      ORDER BY activity_date DESC
      LIMIT 20
    `;

    const recentActivity = await this.db.query(activityQuery, [studentId]);

    // Calculate overall progress
    const overallProgress = this.calculateOverallProgress(programMetrics.rows);

    // Determine growth trends
    const metricsWithTrends = programMetrics.rows.map(metric => ({
      programType: metric.program_type,
      enrollmentCount: parseInt(metric.enrollment_count),
      averageAttendance: parseFloat(metric.average_attendance),
      averageRatings: metric.average_ratings,
      latestSkillLevel: metric.latest_skill_level,
      growthTrend: this.determineGrowthTrend(studentId, metric.program_type)
    }));

    return {
      studentId: student.id,
      studentName: student.name,
      overallProgress,
      programMetrics: await Promise.all(metricsWithTrends),
      recentActivity: recentActivity.rows.map(row => ({
        date: row.activity_date,
        type: row.type,
        courseCode: row.course_code,
        details: row.details
      }))
    };
  }

  async searchStudents(searchTerm: string, instructorId?: string): Promise<StudentWithUser[]> {
    let query = `
      SELECT DISTINCT
        s.id,
        s.parent_id,
        u.name,
        u.email,
        s.created_at,
        s.updated_at
      FROM students s
      JOIN users u ON u.id = s.id
    `;

    const params: any[] = [`%${searchTerm}%`];
    let paramCount = 1;

    if (instructorId) {
      query += `
        JOIN enrollments e ON e.student_id = s.id
        JOIN courses c ON c.id = e.course_id
      `;
    }

    query += ` WHERE (u.name ILIKE $1 OR u.email ILIKE $1)`;

    if (instructorId) {
      paramCount++;
      query += ` AND c.instructor_id = $${paramCount}`;
      params.push(instructorId);
    }

    query += ` ORDER BY u.name LIMIT 50`;

    const result = await this.db.query<StudentWithUser>(query, params);
    return result.rows;
  }

  async createWithUser(data: {
    name: string;
    email: string;
    parentId: string;
  }): Promise<StudentWithUser> {
    return this.db.transaction(async (client) => {
      // First create the user
      const userQuery = `
        INSERT INTO users (name, email, role, password_hash)
        VALUES ($1, $2, 'student', '')
        RETURNING id, name, email
      `;
      
      const userResult = await client.query(userQuery, [data.name, data.email]);
      const user = userResult.rows[0];

      // Then create the student record
      const studentQuery = `
        INSERT INTO students (id, parent_id)
        VALUES ($1, $2)
        RETURNING id, parent_id, created_at, updated_at
      `;
      
      const studentResult = await client.query(studentQuery, [user.id, data.parentId]);
      const student = studentResult.rows[0];

      return {
        ...student,
        name: user.name,
        email: user.email
      };
    });
  }

  private calculateOverallProgress(metrics: any[]): number {
    if (metrics.length === 0) return 0;

    let totalScore = 0;
    metrics.forEach(metric => {
      const ratings = metric.average_ratings;
      const avgRating = (ratings.attitude + ratings.questions + ratings.skills + ratings.feedback) / 4;
      const attendanceScore = metric.average_attendance / 100;
      totalScore += (avgRating * 0.7 + attendanceScore * 0.3);
    });

    return Math.round((totalScore / metrics.length) * 100);
  }

  private async determineGrowthTrend(
    studentId: string,
    programType: string
  ): Promise<'improving' | 'stable' | 'declining'> {
    // This is a simplified version - in reality, you'd analyze historical data
    const query = `
      WITH monthly_averages AS (
        SELECT 
          DATE_TRUNC('month', s.date) as month,
          AVG((a.attitude_rating + a.questions_rating + a.skills_rating + a.feedback_rating) / 4.0) as avg_rating
        FROM attendances a
        JOIN sessions s ON s.id = a.session_id
        JOIN courses c ON c.id = s.course_id
        WHERE a.student_id = $1 AND c.program_type = $2
        GROUP BY DATE_TRUNC('month', s.date)
        ORDER BY month DESC
        LIMIT 3
      )
      SELECT 
        CASE 
          WHEN COUNT(*) < 2 THEN 'stable'
          WHEN (SELECT avg_rating FROM monthly_averages LIMIT 1) > 
               (SELECT avg_rating FROM monthly_averages OFFSET 2 LIMIT 1) + 0.3 THEN 'improving'
          WHEN (SELECT avg_rating FROM monthly_averages LIMIT 1) < 
               (SELECT avg_rating FROM monthly_averages OFFSET 2 LIMIT 1) - 0.3 THEN 'declining'
          ELSE 'stable'
        END as trend
      FROM monthly_averages
    `;

    const result = await this.db.query<{ trend: 'improving' | 'stable' | 'declining' }>(
      query,
      [studentId, programType]
    );

    return result.rows[0]?.trend || 'stable';
  }

  async findByEmail(email: string): Promise<StudentWithUser | null> {
    const query = `
      SELECT 
        s.*,
        u.name, u.email
      FROM students s
      JOIN users u ON u.id = s.id
      WHERE u.email = $1
    `;

    const result = await this.db.query(query, [email]);
    const row = result.rows[0];
    
    if (!row) return null;

    return {
      id: row.id,
      parent_id: row.parent_id,
      name: row.name,
      email: row.email,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  async createParentUser(data: {
    email: string;
    name: string;
    phone?: string;
  }): Promise<any> {
    const query = `
      INSERT INTO users (email, name, phone, role, password_hash)
      VALUES ($1, $2, $3, 'parent', '')
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        phone = EXCLUDED.phone,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await this.db.query(query, [
      data.email,
      data.name,
      data.phone || null
    ]);

    return result.rows[0];
  }

  async create(data: {
    name: string;
    email: string;
    date_of_birth?: Date;
    grade?: number;
    school?: string;
    parent_id?: string;
  }): Promise<StudentWithUser> {
    return this.db.transaction(async (client) => {
      // First create the user
      const userQuery = `
        INSERT INTO users (name, email, role, password_hash)
        VALUES ($1, $2, 'student', '')
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const userResult = await client.query(userQuery, [
        data.name,
        data.email
      ]);

      const user = userResult.rows[0];

      // Then create or update the student record
      const studentQuery = `
        INSERT INTO students (
          id, parent_id
        ) VALUES ($1, $2)
        ON CONFLICT (id) DO UPDATE SET
          parent_id = EXCLUDED.parent_id,
          updated_at = CURRENT_TIMESTAMP
        RETURNING *
      `;

      const studentResult = await client.query(studentQuery, [
        user.id,
        data.parent_id || null
      ]);

      const student = studentResult.rows[0];

      return {
        id: user.id,
        parent_id: student.parent_id,
        name: user.name,
        email: user.email,
        created_at: student.created_at,
        updated_at: student.updated_at
      };
    });
  }
}