import { BaseRepository } from '../base/BaseRepository';
import { DatabaseConnection } from '../base/DatabaseConnection';

export interface Attendance {
  id: string;
  session_id: string;
  student_id: string;
  status: 'present' | 'absent' | 'makeup';
  attitude_efforts?: number;
  asking_questions?: number;
  application_skills?: number;
  application_feedback?: number;
  notes?: string;
  marked_at: Date;
  marked_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface AttendanceWithDetails extends Attendance {
  student_name: string;
  course_code: string;
  course_name: string;
  session_date: Date;
  session_start_time: string;
  session_end_time: string;
}

export interface SessionAttendance {
  sessionId: string;
  sessionDate: Date;
  courseCode: string;
  courseName: string;
  totalStudents: number;
  presentCount: number;
  absentCount: number;
  makeupCount: number;
  attendanceRate: number;
  averageRatings: {
    attitude: number;
    questions: number;
    skills: number;
    feedback: number;
  };
}

export interface StudentAttendanceStats {
  studentId: string;
  studentName: string;
  totalSessions: number;
  attendedSessions: number;
  attendanceRate: number;
  makeupSessions: number;
  averageRatings: {
    attitude: number;
    questions: number;
    skills: number;
    feedback: number;
  };
  recentAttendances: AttendanceWithDetails[];
}

export class AttendanceRepository extends BaseRepository<Attendance> {
  protected tableName = 'attendances';
  protected selectFields = [
    'id',
    'session_id',
    'student_id',
    'status',
    'attitude_efforts',
    'asking_questions', 
    'application_skills',
    'application_feedback',
    'notes',
    'marked_at',
    'marked_by',
    'created_at',
    'updated_at'
  ];

  constructor(db: DatabaseConnection) {
    super(db);
  }

  async findBySession(sessionId: string): Promise<AttendanceWithDetails[]> {
    const query = `
      SELECT 
        a.*,
        u.name as student_name,
        c.code as course_code,
        c.name as course_name,
        s.session_date,
        s.start_time as session_start_time,
        s.end_time as session_end_time
      FROM attendances a
      JOIN students st ON st.id = a.student_id
      JOIN users u ON u.id = st.id
      JOIN class_sessions s ON s.id = a.session_id
      JOIN courses c ON c.id = s.course_id
      WHERE a.session_id = $1
      ORDER BY u.name
    `;

    const result = await this.db.query<AttendanceWithDetails>(query, [sessionId]);
    return result.rows;
  }

  async findByStudent(studentId: string, limit?: number): Promise<AttendanceWithDetails[]> {
    const query = `
      SELECT 
        a.*,
        u.name as student_name,
        c.code as course_code,
        c.name as course_name,
        s.session_date,
        s.start_time as session_start_time,
        s.end_time as session_end_time
      FROM attendances a
      JOIN students st ON st.id = a.student_id
      JOIN users u ON u.id = st.id
      JOIN class_sessions s ON s.id = a.session_id
      JOIN courses c ON c.id = s.course_id
      WHERE a.student_id = $1
      ORDER BY s.date DESC, s.start_time DESC
      ${limit ? `LIMIT ${limit}` : ''}
    `;

    const result = await this.db.query<AttendanceWithDetails>(query, [studentId]);
    return result.rows;
  }

  async getSessionAttendance(sessionId: string): Promise<SessionAttendance | null> {
    const query = `
      WITH session_info AS (
        SELECT 
          s.id,
          s.date,
          c.course_code,
          c.course_name,
          COUNT(DISTINCT e.student_id) as total_students
        FROM sessions s
        JOIN courses c ON c.id = s.course_id
        JOIN enrollments e ON e.course_id = c.id AND e.status = 'active'
        WHERE s.id = $1
        GROUP BY s.id, s.date, c.course_code, c.course_name
      ),
      attendance_stats AS (
        SELECT 
          COUNT(*) FILTER (WHERE status = 'present') as present_count,
          COUNT(*) FILTER (WHERE status = 'absent') as absent_count,
          COUNT(*) FILTER (WHERE status = 'makeup') as makeup_count,
          AVG(attitude_rating) FILTER (WHERE attitude_rating IS NOT NULL) as avg_attitude,
          AVG(questions_rating) FILTER (WHERE questions_rating IS NOT NULL) as avg_questions,
          AVG(skills_rating) FILTER (WHERE skills_rating IS NOT NULL) as avg_skills,
          AVG(feedback_rating) FILTER (WHERE feedback_rating IS NOT NULL) as avg_feedback
        FROM attendances
        WHERE session_id = $1
      )
      SELECT 
        si.*,
        ast.*,
        CASE 
          WHEN si.total_students > 0 
          THEN (ast.present_count::float / si.total_students) * 100
          ELSE 0
        END as attendance_rate
      FROM session_info si
      CROSS JOIN attendance_stats ast
    `;

    const result = await this.db.query(query, [sessionId]);
    const data = result.rows[0];

    if (!data) return null;

    return {
      sessionId: data.id,
      sessionDate: data.date,
      courseCode: data.course_code,
      courseName: data.course_name,
      totalStudents: parseInt(data.total_students),
      presentCount: parseInt(data.present_count),
      absentCount: parseInt(data.absent_count),
      makeupCount: parseInt(data.makeup_count),
      attendanceRate: parseFloat(data.attendance_rate),
      averageRatings: {
        attitude: parseFloat(data.avg_attitude) || 0,
        questions: parseFloat(data.avg_questions) || 0,
        skills: parseFloat(data.avg_skills) || 0,
        feedback: parseFloat(data.avg_feedback) || 0
      }
    };
  }

  async getStudentAttendanceStats(
    studentId: string,
    courseId?: string,
    dateFrom?: Date,
    dateTo?: Date
  ): Promise<StudentAttendanceStats | null> {
    let conditions = ['a.student_id = $1'];
    let params: any[] = [studentId];
    let paramCount = 1;

    if (courseId) {
      paramCount++;
      conditions.push(`s.course_id = $${paramCount}`);
      params.push(courseId);
    }

    if (dateFrom) {
      paramCount++;
      conditions.push(`s.date >= $${paramCount}`);
      params.push(dateFrom);
    }

    if (dateTo) {
      paramCount++;
      conditions.push(`s.date <= $${paramCount}`);
      params.push(dateTo);
    }

    const whereClause = conditions.join(' AND ');

    const query = `
      WITH student_info AS (
        SELECT 
          st.id,
          u.name
        FROM students st
        JOIN users u ON u.id = st.id
        WHERE st.id = $1
      ),
      attendance_summary AS (
        SELECT 
          COUNT(DISTINCT s.id) as total_sessions,
          COUNT(a.id) FILTER (WHERE a.status = 'present') as attended_sessions,
          COUNT(a.id) FILTER (WHERE a.status = 'makeup') as makeup_sessions,
          AVG(a.attitude_rating) FILTER (WHERE a.attitude_rating IS NOT NULL) as avg_attitude,
          AVG(a.questions_rating) FILTER (WHERE a.questions_rating IS NOT NULL) as avg_questions,
          AVG(a.skills_rating) FILTER (WHERE a.skills_rating IS NOT NULL) as avg_skills,
          AVG(a.feedback_rating) FILTER (WHERE a.feedback_rating IS NOT NULL) as avg_feedback
        FROM sessions s
        LEFT JOIN attendances a ON a.session_id = s.id AND a.student_id = $1
        WHERE ${whereClause.replace('a.student_id = $1', 's.id IS NOT NULL')}
      )
      SELECT 
        si.*,
        asm.*,
        CASE 
          WHEN asm.total_sessions > 0 
          THEN (asm.attended_sessions::float / asm.total_sessions) * 100
          ELSE 0
        END as attendance_rate
      FROM student_info si
      CROSS JOIN attendance_summary asm
    `;

    const result = await this.db.query(query, params);
    const data = result.rows[0];

    if (!data) return null;

    // Get recent attendances
    const recentAttendances = await this.findByStudent(studentId, 10);

    return {
      studentId: data.id,
      studentName: data.name,
      totalSessions: parseInt(data.total_sessions),
      attendedSessions: parseInt(data.attended_sessions),
      attendanceRate: parseFloat(data.attendance_rate),
      makeupSessions: parseInt(data.makeup_sessions),
      averageRatings: {
        attitude: parseFloat(data.avg_attitude) || 0,
        questions: parseFloat(data.avg_questions) || 0,
        skills: parseFloat(data.avg_skills) || 0,
        feedback: parseFloat(data.avg_feedback) || 0
      },
      recentAttendances
    };
  }

  async bulkRecord(attendances: Array<{
    sessionId: string;
    studentId: string;
    status: 'present' | 'absent' | 'makeup';
    attitudeRating?: number;
    questionsRating?: number;
    skillsRating?: number;
    feedbackRating?: number;
    notes?: string;
    markedBy: string;
  }>): Promise<Attendance[]> {
    if (attendances.length === 0) return [];

    const values: any[] = [];
    const placeholders: string[] = [];

    attendances.forEach((attendance, index) => {
      const baseIndex = index * 9;
      placeholders.push(
        `($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, ` +
        `$${baseIndex + 4}, $${baseIndex + 5}, $${baseIndex + 6}, ` +
        `$${baseIndex + 7}, $${baseIndex + 8}, $${baseIndex + 9})`
      );
      values.push(
        attendance.sessionId,
        attendance.studentId,
        attendance.status,
        attendance.attitudeRating,
        attendance.questionsRating,
        attendance.skillsRating,
        attendance.feedbackRating,
        attendance.notes,
        attendance.markedBy
      );
    });

    const query = `
      INSERT INTO attendances (
        session_id, student_id, status,
        attitude_rating, questions_rating, skills_rating, feedback_rating,
        notes, marked_by
      )
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (session_id, student_id) DO UPDATE SET
        status = EXCLUDED.status,
        attitude_rating = EXCLUDED.attitude_rating,
        questions_rating = EXCLUDED.questions_rating,
        skills_rating = EXCLUDED.skills_rating,
        feedback_rating = EXCLUDED.feedback_rating,
        notes = EXCLUDED.notes,
        marked_by = EXCLUDED.marked_by,
        marked_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await this.db.query<Attendance>(query, values);
    return result.rows;
  }

  async getMakeupSessions(studentId: string, courseId?: string): Promise<Array<{
    sessionId: string;
    originalDate: Date;
    makeupDate?: Date;
    courseCode: string;
    courseName: string;
    reason?: string;
  }>> {
    let query = `
      SELECT 
        a.session_id,
        s.date as original_date,
        ms.date as makeup_date,
        c.code as course_code,
        c.name as course_name,
        a.notes as reason
      FROM attendances a
      JOIN class_sessions s ON s.id = a.session_id
      JOIN courses c ON c.id = s.course_id
      LEFT JOIN sessions ms ON ms.id = a.makeup_session_id
      WHERE a.student_id = $1 AND a.status = 'makeup'
    `;

    const params: any[] = [studentId];

    if (courseId) {
      query += ` AND c.id = $2`;
      params.push(courseId);
    }

    query += ` ORDER BY s.date DESC`;

    const result = await this.db.query(query, params);
    
    return result.rows.map(row => ({
      sessionId: row.session_id,
      originalDate: row.original_date,
      makeupDate: row.makeup_date,
      courseCode: row.course_code,
      courseName: row.course_name,
      reason: row.reason
    }));
  }

  async getAttendanceHeatmap(
    courseId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{
    date: Date;
    attendanceRate: number;
    totalStudents: number;
    presentCount: number;
  }>> {
    const query = `
      WITH daily_attendance AS (
        SELECT 
          s.date,
          COUNT(DISTINCT e.student_id) as total_students,
          COUNT(a.id) FILTER (WHERE a.status = 'present') as present_count
        FROM sessions s
        JOIN enrollments e ON e.course_id = s.course_id AND e.status = 'active'
        LEFT JOIN attendances a ON a.session_id = s.id AND a.student_id = e.student_id
        WHERE s.course_id = $1 AND s.date BETWEEN $2 AND $3
        GROUP BY s.date
      )
      SELECT 
        date,
        total_students,
        present_count,
        CASE 
          WHEN total_students > 0 
          THEN (present_count::float / total_students) * 100
          ELSE 0
        END as attendance_rate
      FROM daily_attendance
      ORDER BY date
    `;

    const result = await this.db.query(query, [courseId, startDate, endDate]);
    
    return result.rows.map(row => ({
      date: row.date,
      attendanceRate: parseFloat(row.attendance_rate),
      totalStudents: parseInt(row.total_students),
      presentCount: parseInt(row.present_count)
    }));
  }
}