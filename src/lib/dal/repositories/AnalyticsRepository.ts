import { BaseRepository } from '../base/BaseRepository';
import { DatabaseConnection } from '../base/DatabaseConnection';

export interface ProgramGrowthMetrics {
  programType: string;
  totalStudents: number;
  totalEnrollments: number;
  averageGrowthRate: number;
  skillLevelDistribution: Array<{
    levelCode: string;
    displayName: string;
    count: number;
    percentage: number;
  }>;
  performanceByGrade: Array<{
    gradeGroup: string;
    averageRating: number;
    studentCount: number;
  }>;
}

export interface InstructorAnalytics {
  instructorId: string;
  instructorName: string;
  totalCourses: number;
  totalStudents: number;
  averageClassSize: number;
  overallAttendanceRate: number;
  studentSatisfactionScore: number;
  feedbackQuality: {
    totalFeedback: number;
    averageDetailLevel: number;
    consistencyScore: number;
  };
  topPerformingStudents: Array<{
    studentId: string;
    studentName: string;
    growthRate: number;
  }>;
}

export interface CrossProgramAnalytics {
  studentId: string;
  studentName: string;
  programsEnrolled: string[];
  overallGrowthScore: number;
  strengthAreas: Array<{
    skill: string;
    score: number;
    program: string;
  }>;
  improvementAreas: Array<{
    skill: string;
    score: number;
    program: string;
  }>;
  crossProgramCorrelations: Array<{
    program1: string;
    program2: string;
    correlation: number;
  }>;
}

export interface GrowthTrajectory {
  studentId: string;
  programType: string;
  dataPoints: Array<{
    date: Date;
    overallScore: number;
    categoryScores: Record<string, number>;
    milestone?: string;
  }>;
  projectedGrowth: number;
  recommendedFocus: string[];
}

export class AnalyticsRepository extends BaseRepository<any> {
  protected tableName = ''; // Analytics repo doesn't have a single table
  protected selectFields = [];

  constructor(db: DatabaseConnection) {
    super(db);
  }

  async getProgramGrowthMetrics(programType: string): Promise<ProgramGrowthMetrics> {
    const metricsQuery = `
      WITH program_stats AS (
        SELECT 
          COUNT(DISTINCT e.student_id) as total_students,
          COUNT(DISTINCT e.id) as total_enrollments
        FROM enrollments e
        JOIN courses c ON c.id = e.course_id
        WHERE c.program_type = $1 AND e.status = 'active'
      ),
      skill_distribution AS (
        SELECT 
          sl.level_code,
          sl.display_name,
          COUNT(DISTINCT e.student_id) as count
        FROM enrollments e
        JOIN courses c ON c.id = e.course_id
        JOIN course_configurations cc ON cc.course_id = c.id
        JOIN skill_levels sl ON sl.id = cc.skill_level_id
        WHERE c.program_type = $1 AND e.status = 'active'
        GROUP BY sl.level_code, sl.display_name, sl.order_index
        ORDER BY sl.order_index
      ),
      grade_performance AS (
        SELECT 
          gg.name as grade_group,
          AVG((a.attitude_rating + a.questions_rating + a.skills_rating + a.feedback_rating) / 4.0) as avg_rating,
          COUNT(DISTINCT a.student_id) as student_count
        FROM attendances a
        JOIN sessions s ON s.id = a.session_id
        JOIN courses c ON c.id = s.course_id
        JOIN course_configurations cc ON cc.course_id = c.id
        JOIN grade_groups gg ON gg.id = cc.grade_group_id
        WHERE c.program_type = $1 AND a.status = 'present'
        GROUP BY gg.name, gg.order_index
        ORDER BY gg.order_index
      ),
      growth_rates AS (
        SELECT 
          AVG(growth_rate) as avg_growth_rate
        FROM (
          SELECT 
            student_id,
            (MAX(avg_score) - MIN(avg_score)) / NULLIF(COUNT(DISTINCT month), 1) as growth_rate
          FROM (
            SELECT 
              a.student_id,
              DATE_TRUNC('month', s.date) as month,
              AVG((a.attitude_rating + a.questions_rating + a.skills_rating + a.feedback_rating) / 4.0) as avg_score
            FROM attendances a
            JOIN sessions s ON s.id = a.session_id
            JOIN courses c ON c.id = s.course_id
            WHERE c.program_type = $1 AND a.status = 'present'
            GROUP BY a.student_id, DATE_TRUNC('month', s.date)
          ) monthly_scores
          GROUP BY student_id
          HAVING COUNT(DISTINCT month) > 1
        ) student_growth
      )
      SELECT 
        ps.*,
        gr.avg_growth_rate,
        (
          SELECT json_agg(
            json_build_object(
              'levelCode', level_code,
              'displayName', display_name,
              'count', count,
              'percentage', ROUND((count::float / ps.total_students) * 100, 2)
            )
          )
          FROM skill_distribution
        ) as skill_distribution,
        (
          SELECT json_agg(
            json_build_object(
              'gradeGroup', grade_group,
              'averageRating', ROUND(avg_rating::numeric, 2),
              'studentCount', student_count
            )
          )
          FROM grade_performance
        ) as performance_by_grade
      FROM program_stats ps
      CROSS JOIN growth_rates gr
    `;

    const result = await this.db.query(metricsQuery, [programType]);
    const data = result.rows[0];

    return {
      programType,
      totalStudents: parseInt(data.total_students),
      totalEnrollments: parseInt(data.total_enrollments),
      averageGrowthRate: parseFloat(data.avg_growth_rate) || 0,
      skillLevelDistribution: data.skill_distribution || [],
      performanceByGrade: data.performance_by_grade || []
    };
  }

  async getInstructorAnalytics(instructorId: string): Promise<InstructorAnalytics> {
    const analyticsQuery = `
      WITH instructor_info AS (
        SELECT id, name FROM users WHERE id = $1
      ),
      course_stats AS (
        SELECT 
          COUNT(DISTINCT c.id) as total_courses,
          COUNT(DISTINCT e.student_id) as total_students,
          AVG(student_count) as avg_class_size
        FROM courses c
        LEFT JOIN (
          SELECT course_id, COUNT(*) as student_count
          FROM enrollments
          WHERE status = 'active'
          GROUP BY course_id
        ) e_counts ON e_counts.course_id = c.id
        LEFT JOIN enrollments e ON e.course_id = c.id AND e.status = 'active'
        WHERE c.instructor_id = $1
      ),
      attendance_stats AS (
        SELECT 
          AVG(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100 as attendance_rate
        FROM attendances a
        JOIN sessions s ON s.id = a.session_id
        JOIN courses c ON c.id = s.course_id
        WHERE c.instructor_id = $1
      ),
      satisfaction_stats AS (
        SELECT 
          AVG((a.attitude_rating + a.questions_rating + a.skills_rating + a.feedback_rating) / 4.0) * 20 as satisfaction_score
        FROM attendances a
        JOIN sessions s ON s.id = a.session_id
        JOIN courses c ON c.id = s.course_id
        WHERE c.instructor_id = $1 AND a.status = 'present'
      ),
      feedback_stats AS (
        SELECT 
          COUNT(*) as total_feedback,
          AVG(LENGTH(strengths) + LENGTH(improvement_areas) + LENGTH(teacher_comments)) / 100 as avg_detail_level,
          STDDEV(
            (SELECT AVG(value::numeric) FROM jsonb_each_text(rubric_scores))
          ) as consistency_score
        FROM parsed_student_feedback
        WHERE instructor = (SELECT name FROM instructor_info)
      ),
      top_students AS (
        SELECT 
          st.id as student_id,
          u.name as student_name,
          AVG((a.attitude_rating + a.questions_rating + a.skills_rating + a.feedback_rating) / 4.0) as avg_score
        FROM students st
        JOIN users u ON u.id = st.id
        JOIN attendances a ON a.student_id = st.id
        JOIN sessions s ON s.id = a.session_id
        JOIN courses c ON c.id = s.course_id
        WHERE c.instructor_id = $1 AND a.status = 'present'
        GROUP BY st.id, u.name
        ORDER BY avg_score DESC
        LIMIT 5
      )
      SELECT 
        ii.id,
        ii.name,
        cs.*,
        COALESCE(ast.attendance_rate, 0) as attendance_rate,
        COALESCE(ss.satisfaction_score, 0) as satisfaction_score,
        COALESCE(fs.total_feedback, 0) as total_feedback,
        COALESCE(fs.avg_detail_level, 0) as avg_detail_level,
        COALESCE(100 - (fs.consistency_score * 10), 90) as consistency_score,
        (
          SELECT json_agg(
            json_build_object(
              'studentId', student_id,
              'studentName', student_name,
              'growthRate', ROUND(avg_score::numeric * 20, 2)
            )
          )
          FROM top_students
        ) as top_students
      FROM instructor_info ii
      CROSS JOIN course_stats cs
      CROSS JOIN attendance_stats ast
      CROSS JOIN satisfaction_stats ss
      CROSS JOIN feedback_stats fs
    `;

    const result = await this.db.query(analyticsQuery, [instructorId]);
    const data = result.rows[0];

    return {
      instructorId: data.id,
      instructorName: data.name,
      totalCourses: parseInt(data.total_courses),
      totalStudents: parseInt(data.total_students),
      averageClassSize: parseFloat(data.avg_class_size) || 0,
      overallAttendanceRate: parseFloat(data.attendance_rate),
      studentSatisfactionScore: parseFloat(data.satisfaction_score),
      feedbackQuality: {
        totalFeedback: parseInt(data.total_feedback),
        averageDetailLevel: parseFloat(data.avg_detail_level),
        consistencyScore: parseFloat(data.consistency_score)
      },
      topPerformingStudents: data.top_students || []
    };
  }

  async getCrossProgramAnalytics(studentId: string): Promise<CrossProgramAnalytics> {
    const analyticsQuery = `
      WITH student_info AS (
        SELECT s.id, u.name
        FROM students s
        JOIN users u ON u.id = s.id
        WHERE s.id = $1
      ),
      programs_enrolled AS (
        SELECT DISTINCT c.program_type
        FROM enrollments e
        JOIN courses c ON c.id = e.course_id
        WHERE e.student_id = $1 AND e.status = 'active'
      ),
      skill_scores AS (
        SELECT 
          c.program_type,
          'Attitude & Efforts' as skill,
          AVG(a.attitude_rating) as score
        FROM attendances a
        JOIN sessions s ON s.id = a.session_id
        JOIN courses c ON c.id = s.course_id
        WHERE a.student_id = $1 AND a.status = 'present'
        GROUP BY c.program_type
        
        UNION ALL
        
        SELECT 
          c.program_type,
          'Asking Questions' as skill,
          AVG(a.questions_rating) as score
        FROM attendances a
        JOIN sessions s ON s.id = a.session_id
        JOIN courses c ON c.id = s.course_id
        WHERE a.student_id = $1 AND a.status = 'present'
        GROUP BY c.program_type
        
        UNION ALL
        
        SELECT 
          c.program_type,
          'Application of Skills' as skill,
          AVG(a.skills_rating) as score
        FROM attendances a
        JOIN sessions s ON s.id = a.session_id
        JOIN courses c ON c.id = s.course_id
        WHERE a.student_id = $1 AND a.status = 'present'
        GROUP BY c.program_type
        
        UNION ALL
        
        SELECT 
          c.program_type,
          'Application of Feedback' as skill,
          AVG(a.feedback_rating) as score
        FROM attendances a
        JOIN sessions s ON s.id = a.session_id
        JOIN courses c ON c.id = s.course_id
        WHERE a.student_id = $1 AND a.status = 'present'
        GROUP BY c.program_type
      ),
      overall_growth AS (
        SELECT 
          AVG(score) * 20 as overall_score
        FROM skill_scores
      ),
      program_correlations AS (
        SELECT 
          p1.program_type as program1,
          p2.program_type as program2,
          CORR(p1.avg_score, p2.avg_score) as correlation
        FROM (
          SELECT 
            c.program_type,
            s.date,
            AVG((a.attitude_rating + a.questions_rating + a.skills_rating + a.feedback_rating) / 4.0) as avg_score
          FROM attendances a
          JOIN sessions s ON s.id = a.session_id
          JOIN courses c ON c.id = s.course_id
          WHERE a.student_id = $1 AND a.status = 'present'
          GROUP BY c.program_type, s.date
        ) p1
        JOIN (
          SELECT 
            c.program_type,
            s.date,
            AVG((a.attitude_rating + a.questions_rating + a.skills_rating + a.feedback_rating) / 4.0) as avg_score
          FROM attendances a
          JOIN sessions s ON s.id = a.session_id
          JOIN courses c ON c.id = s.course_id
          WHERE a.student_id = $1 AND a.status = 'present'
          GROUP BY c.program_type, s.date
        ) p2 ON p1.date = p2.date AND p1.program_type < p2.program_type
        GROUP BY p1.program_type, p2.program_type
        HAVING COUNT(*) > 3
      )
      SELECT 
        si.id,
        si.name,
        ARRAY(SELECT program_type FROM programs_enrolled) as programs,
        og.overall_score,
        (
          SELECT json_agg(
            json_build_object(
              'skill', skill,
              'score', ROUND(score::numeric * 20, 2),
              'program', program_type
            )
            ORDER BY score DESC
          )
          FROM skill_scores
          WHERE score >= 4
        ) as strength_areas,
        (
          SELECT json_agg(
            json_build_object(
              'skill', skill,
              'score', ROUND(score::numeric * 20, 2),
              'program', program_type
            )
            ORDER BY score ASC
          )
          FROM skill_scores
          WHERE score < 3.5
        ) as improvement_areas,
        (
          SELECT json_agg(
            json_build_object(
              'program1', program1,
              'program2', program2,
              'correlation', ROUND(correlation::numeric, 3)
            )
          )
          FROM program_correlations
          WHERE correlation IS NOT NULL
        ) as correlations
      FROM student_info si
      CROSS JOIN overall_growth og
    `;

    const result = await this.db.query(analyticsQuery, [studentId]);
    const data = result.rows[0];

    return {
      studentId: data.id,
      studentName: data.name,
      programsEnrolled: data.programs || [],
      overallGrowthScore: parseFloat(data.overall_score) || 0,
      strengthAreas: data.strength_areas || [],
      improvementAreas: data.improvement_areas || [],
      crossProgramCorrelations: data.correlations || []
    };
  }

  async getGrowthTrajectory(
    studentId: string,
    programType: string,
    months: number = 6
  ): Promise<GrowthTrajectory> {
    const trajectoryQuery = `
      WITH monthly_data AS (
        SELECT 
          DATE_TRUNC('month', s.date) as month,
          AVG((a.attitude_rating + a.questions_rating + a.skills_rating + a.feedback_rating) / 4.0) as overall_score,
          AVG(a.attitude_rating) as attitude_score,
          AVG(a.questions_rating) as questions_score,
          AVG(a.skills_rating) as skills_score,
          AVG(a.feedback_rating) as feedback_score
        FROM attendances a
        JOIN sessions s ON s.id = a.session_id
        JOIN courses c ON c.id = s.course_id
        WHERE a.student_id = $1 AND c.program_type = $2 
          AND a.status = 'present'
          AND s.date >= CURRENT_DATE - INTERVAL '${months} months'
        GROUP BY DATE_TRUNC('month', s.date)
        ORDER BY month
      ),
      milestones AS (
        SELECT 
          ls.submitted_at::date as date,
          'Completed Lesson ' || lp.lesson_number || ': ' || lp.title as milestone
        FROM lesson_submissions ls
        JOIN lesson_plans lp ON lp.id = ls.lesson_plan_id
        JOIN course_configurations cc ON cc.id = lp.course_config_id
        JOIN courses c ON c.id = cc.course_id
        WHERE ls.student_id = $1 AND c.program_type = $2
          AND ls.submitted_at >= CURRENT_DATE - INTERVAL '${months} months'
      ),
      trend_analysis AS (
        SELECT 
          REGR_SLOPE(overall_score, EXTRACT(EPOCH FROM month)) as growth_rate,
          REGR_R2(overall_score, EXTRACT(EPOCH FROM month)) as r_squared
        FROM monthly_data
      ),
      focus_areas AS (
        SELECT 
          CASE 
            WHEN attitude_score < 3.5 THEN 'Attitude & Efforts'
            WHEN questions_score < 3.5 THEN 'Asking Questions'
            WHEN skills_score < 3.5 THEN 'Application of Skills'
            WHEN feedback_score < 3.5 THEN 'Application of Feedback'
            ELSE NULL
          END as focus_area
        FROM (
          SELECT 
            AVG(attitude_score) as attitude_score,
            AVG(questions_score) as questions_score,
            AVG(skills_score) as skills_score,
            AVG(feedback_score) as feedback_score
          FROM monthly_data
        ) recent_avg
      )
      SELECT 
        json_agg(
          json_build_object(
            'date', md.month,
            'overallScore', ROUND(md.overall_score::numeric * 20, 2),
            'categoryScores', json_build_object(
              'attitude', ROUND(md.attitude_score::numeric * 20, 2),
              'questions', ROUND(md.questions_score::numeric * 20, 2),
              'skills', ROUND(md.skills_score::numeric * 20, 2),
              'feedback', ROUND(md.feedback_score::numeric * 20, 2)
            ),
            'milestone', m.milestone
          )
          ORDER BY md.month
        ) as data_points,
        COALESCE(ta.growth_rate * 30 * 20, 0) as projected_monthly_growth,
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT fa.focus_area), NULL) as recommended_focus
      FROM monthly_data md
      LEFT JOIN milestones m ON DATE_TRUNC('month', m.date) = md.month
      CROSS JOIN trend_analysis ta
      CROSS JOIN focus_areas fa
      GROUP BY ta.growth_rate
    `;

    const result = await this.db.query(trajectoryQuery, [studentId, programType]);
    const data = result.rows[0];

    return {
      studentId,
      programType,
      dataPoints: data?.data_points || [],
      projectedGrowth: parseFloat(data?.projected_monthly_growth) || 0,
      recommendedFocus: data?.recommended_focus || []
    };
  }

  async getComparativeAnalytics(filters: {
    programType?: string;
    gradeGroupId?: string;
    skillLevelId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<any> {
    // This method would provide comparative analytics across different segments
    // Implementation would be similar to above methods but with comparative logic
    // Leaving as placeholder for brevity
    return {};
  }
}