import { BaseRepository } from '../base/BaseRepository';
import { DatabaseConnection } from '../base/DatabaseConnection';

export interface Course {
  id: string;
  code: string;
  name: string;
  instructor_id: string;
  location?: string;
  max_students?: number;
  program_type: 'PSD' | 'Writing' | 'RAPS' | 'Critical';
  created_at: Date;
  updated_at: Date;
}

export interface CourseWithInstructor extends Course {
  instructor_name: string;
  instructor_email: string;
}

export interface CourseConfiguration {
  id: string;
  course_id: string;
  grade_group_id: string;
  skill_level_id: string;
  is_active: boolean;
}

export interface CourseHierarchy {
  course: CourseWithInstructor;
  division: {
    id: string;
    name: string;
  };
  gradeGroup: {
    id: string;
    name: string;
    minGrade: number;
    maxGrade: number;
  };
  skillLevel: {
    id: string;
    levelCode: string;
    displayName: string;
    description?: string;
  };
  configurations: CourseConfiguration[];
}

export interface CourseWithEnrollments extends CourseWithInstructor {
  totalEnrolled: number;
  activeStudents: number;
  completedStudents: number;
  averageAttendance: number;
  nextSession?: {
    id: string;
    date: Date;
    startTime: string;
    endTime: string;
  };
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  enrollment_date: Date;
  status: 'active' | 'completed' | 'withdrawn';
  created_at: Date;
  updated_at: Date;
}

export class CourseRepository extends BaseRepository<Course> {
  protected tableName = 'courses';
  protected selectFields = [
    'id',
    'code',
    'name',
    'instructor_id',
    'location',
    'max_students',
    'program_type',
    'created_at',
    'updated_at'
  ];

  constructor(db: DatabaseConnection) {
    super(db);
  }

  async findWithInstructor(courseId: string): Promise<CourseWithInstructor | null> {
    const query = `
      SELECT 
        c.*,
        u.name as instructor_name,
        u.email as instructor_email
      FROM courses c
      JOIN users u ON u.id = c.instructor_id
      WHERE c.id = $1
    `;

    const result = await this.db.query<CourseWithInstructor>(query, [courseId]);
    return result.rows[0] || null;
  }

  async findByInstructor(instructorId: string): Promise<CourseWithInstructor[]> {
    const query = `
      SELECT 
        c.*,
        u.name as instructor_name,
        u.email as instructor_email
      FROM courses c
      JOIN users u ON u.id = c.instructor_id
      WHERE c.instructor_id = $1
      ORDER BY c.course_code
    `;

    const result = await this.db.query<CourseWithInstructor>(query, [instructorId]);
    return result.rows;
  }

  async findByProgramType(programType: string): Promise<CourseWithInstructor[]> {
    const query = `
      SELECT 
        c.*,
        u.name as instructor_name,
        u.email as instructor_email
      FROM courses c
      JOIN users u ON u.id = c.instructor_id
      WHERE c.program_type = $1
      ORDER BY c.course_code
    `;

    const result = await this.db.query<CourseWithInstructor>(query, [programType]);
    return result.rows;
  }

  async getHierarchy(courseId: string): Promise<CourseHierarchy | null> {
    const courseQuery = `
      SELECT 
        c.*,
        u.name as instructor_name,
        u.email as instructor_email,
        cd.id as division_id,
        cd.name as division_name,
        gg.id as grade_group_id,
        gg.name as grade_group_name,
        gg.min_grade,
        gg.max_grade,
        sl.id as skill_level_id,
        sl.level_code,
        sl.display_name,
        sl.description as skill_description
      FROM courses c
      JOIN users u ON u.id = c.instructor_id
      LEFT JOIN course_configurations cc ON cc.course_id = c.id AND cc.is_active = true
      LEFT JOIN grade_groups gg ON gg.id = cc.grade_group_id
      LEFT JOIN course_divisions cd ON cd.id = gg.division_id
      LEFT JOIN skill_levels sl ON sl.id = cc.skill_level_id
      WHERE c.id = $1
    `;

    const configQuery = `
      SELECT * FROM course_configurations
      WHERE course_id = $1 AND is_active = true
    `;

    const [courseResult, configResult] = await Promise.all([
      this.db.query(courseQuery, [courseId]),
      this.db.query<CourseConfiguration>(configQuery, [courseId])
    ]);

    const courseData = courseResult.rows[0];
    if (!courseData) return null;

    return {
      course: {
        id: courseData.id,
        code: courseData.code,
        name: courseData.name,
        instructor_id: courseData.instructor_id,
        instructor_name: courseData.instructor_name,
        instructor_email: courseData.instructor_email,
        location: courseData.location,
        max_students: courseData.max_students,
        program_type: courseData.program_type,
        created_at: courseData.created_at,
        updated_at: courseData.updated_at
      },
      division: courseData.division_id ? {
        id: courseData.division_id,
        name: courseData.division_name
      } : null,
      gradeGroup: courseData.grade_group_id ? {
        id: courseData.grade_group_id,
        name: courseData.grade_group_name,
        minGrade: courseData.min_grade,
        maxGrade: courseData.max_grade
      } : null,
      skillLevel: courseData.skill_level_id ? {
        id: courseData.skill_level_id,
        levelCode: courseData.level_code,
        displayName: courseData.display_name,
        description: courseData.skill_description
      } : null,
      configurations: configResult.rows
    };
  }

  async getWithEnrollmentStats(courseId: string): Promise<CourseWithEnrollments | null> {
    const course = await this.findWithInstructor(courseId);
    if (!course) return null;

    const statsQuery = `
      WITH enrollment_stats AS (
        SELECT 
          COUNT(*) FILTER (WHERE status = 'active') as active_students,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_students,
          COUNT(*) as total_enrolled
        FROM enrollments
        WHERE course_id = $1
      ),
      attendance_stats AS (
        SELECT 
          AVG(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) * 100 as avg_attendance
        FROM attendances a
        JOIN sessions s ON s.id = a.session_id
        WHERE s.course_id = $1
      ),
      next_session AS (
        SELECT 
          id,
          date,
          start_time,
          end_time
        FROM sessions
        WHERE course_id = $1 AND date >= CURRENT_DATE
        ORDER BY date, start_time
        LIMIT 1
      )
      SELECT 
        es.*,
        COALESCE(ast.avg_attendance, 0) as average_attendance,
        ns.id as next_session_id,
        ns.date as next_session_date,
        ns.start_time as next_session_start,
        ns.end_time as next_session_end
      FROM enrollment_stats es
      CROSS JOIN attendance_stats ast
      LEFT JOIN next_session ns ON true
    `;

    const result = await this.db.query(statsQuery, [courseId]);
    const stats = result.rows[0];

    return {
      ...course,
      totalEnrolled: parseInt(stats.total_enrolled),
      activeStudents: parseInt(stats.active_students),
      completedStudents: parseInt(stats.completed_students),
      averageAttendance: parseFloat(stats.average_attendance),
      nextSession: stats.next_session_id ? {
        id: stats.next_session_id,
        date: stats.next_session_date,
        startTime: stats.next_session_start,
        endTime: stats.next_session_end
      } : undefined
    };
  }

  async getEnrollments(courseId: string): Promise<Array<{
    enrollment: Enrollment;
    student: {
      id: string;
      name: string;
      email: string;
    };
  }>> {
    const query = `
      SELECT 
        e.*,
        u.id as student_user_id,
        u.name as student_name,
        u.email as student_email
      FROM enrollments e
      JOIN students s ON s.id = e.student_id
      JOIN users u ON u.id = s.id
      WHERE e.course_id = $1
      ORDER BY u.name
    `;

    const result = await this.db.query(query, [courseId]);
    
    return result.rows.map(row => ({
      enrollment: {
        id: row.id,
        student_id: row.student_id,
        course_id: row.course_id,
        enrollment_date: row.enrollment_date,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at
      },
      student: {
        id: row.student_user_id,
        name: row.student_name,
        email: row.student_email
      }
    }));
  }

  async createWithHierarchy(data: {
    courseCode: string;
    courseName: string;
    instructorId: string;
    programType: 'PSD' | 'Writing' | 'RAPS' | 'Critical';
    divisionId: string;
    gradeGroupId: string;
    skillLevelId: string;
    location?: string;
    maxStudents?: number;
  }): Promise<CourseHierarchy> {
    return this.db.transaction(async (client) => {
      // Create the course
      const courseQuery = `
        INSERT INTO courses (
          code, name, instructor_id, 
          program_type, location, max_students
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const courseResult = await client.query<Course>(courseQuery, [
        data.courseCode,
        data.courseName,
        data.instructorId,
        data.programType,
        data.location,
        data.maxStudents
      ]);

      const course = courseResult.rows[0];

      // Create the course configuration
      const configQuery = `
        INSERT INTO course_configurations (
          course_id, grade_group_id, skill_level_id
        )
        VALUES ($1, $2, $3)
        RETURNING *
      `;

      const configResult = await client.query<CourseConfiguration>(configQuery, [
        course.id,
        data.gradeGroupId,
        data.skillLevelId
      ]);

      // Return the full hierarchy
      return this.getHierarchy(course.id);
    });
  }

  async bulkCreateEnrollments(enrollments: Array<{
    studentId: string;
    courseId: string;
    enrollmentDate?: Date;
  }>): Promise<Enrollment[]> {
    if (enrollments.length === 0) return [];

    const values: any[] = [];
    const placeholders: string[] = [];

    enrollments.forEach((enrollment, index) => {
      const baseIndex = index * 4;
      placeholders.push(`($${baseIndex + 1}, $${baseIndex + 2}, $${baseIndex + 3}, $${baseIndex + 4})`);
      values.push(
        enrollment.studentId,
        enrollment.courseId,
        enrollment.enrollmentDate || new Date(),
        'active'
      );
    });

    const query = `
      INSERT INTO enrollments (student_id, course_id, enrollment_date, status)
      VALUES ${placeholders.join(', ')}
      ON CONFLICT (student_id, course_id) DO UPDATE SET
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await this.db.query<Enrollment>(query, values);
    return result.rows;
  }

  async searchCourses(searchTerm: string, filters?: {
    programType?: string;
    instructorId?: string;
    divisionId?: string;
  }): Promise<CourseWithInstructor[]> {
    const conditions: string[] = [
      '(c.code ILIKE $1 OR c.name ILIKE $1)'
    ];
    const params: any[] = [`%${searchTerm}%`];
    let paramCount = 1;

    if (filters?.programType) {
      paramCount++;
      conditions.push(`c.program_type = $${paramCount}`);
      params.push(filters.programType);
    }

    if (filters?.instructorId) {
      paramCount++;
      conditions.push(`c.instructor_id = $${paramCount}`);
      params.push(filters.instructorId);
    }

    let query = `
      SELECT DISTINCT
        c.*,
        u.name as instructor_name,
        u.email as instructor_email
      FROM courses c
      JOIN users u ON u.id = c.instructor_id
    `;

    if (filters?.divisionId) {
      paramCount++;
      query += `
        JOIN course_configurations cc ON cc.course_id = c.id
        JOIN grade_groups gg ON gg.id = cc.grade_group_id
      `;
      conditions.push(`gg.division_id = $${paramCount}`);
      params.push(filters.divisionId);
    }

    query += `
      WHERE ${conditions.join(' AND ')}
      ORDER BY c.code
      LIMIT 50
    `;

    const result = await this.db.query<CourseWithInstructor>(query, params);
    return result.rows;
  }

  async findByCode(code: string): Promise<Course | null> {
    const query = `
      SELECT 
        id, code, name, instructor_id,
        location, max_students, program_type,
        created_at, updated_at
      FROM courses
      WHERE code = $1
    `;

    const result = await this.db.query<Course>(query, [code]);
    return result.rows[0] || null;
  }

  async upsertCourse(data: {
    code: string;
    name: string;
    description?: string;
    program_type?: string;
    instructor_id: string;
    schedule_day?: string;
    start_time?: string;
    end_time?: string;
    max_students?: number;
    division?: string;
    grade_group?: string;
    skill_level?: string;
  }): Promise<Course> {
    const query = `
      INSERT INTO courses (
        code, name, instructor_id, program_type,
        location, max_students
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        instructor_id = EXCLUDED.instructor_id,
        program_type = EXCLUDED.program_type,
        location = EXCLUDED.location,
        max_students = EXCLUDED.max_students,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await this.db.query<Course>(query, [
      data.code,
      data.name,
      data.instructor_id,
      data.program_type || 'PSD',
      data.schedule_day || null,
      data.max_students || 12
    ]);

    return result.rows[0];
  }

  async enrollStudent(data: {
    student_id: string;
    course_id: string;
    enrollment_date?: Date;
    status?: string;
  }): Promise<any> {
    const query = `
      INSERT INTO enrollments (
        student_id, course_id, enrolled_date, status
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT (student_id, course_id) DO UPDATE SET
        status = EXCLUDED.status,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await this.db.query(query, [
      data.student_id,
      data.course_id,
      data.enrollment_date || new Date(),
      data.status || 'active'
    ]);

    return result.rows[0];
  }

  async findLessonPlan(courseId: string, lessonNumber: number): Promise<any | null> {
    const query = `
      SELECT lp.*
      FROM lesson_plans lp
      JOIN course_configurations cc ON cc.id = lp.course_config_id
      WHERE cc.course_id = $1 AND lp.lesson_number = $2
    `;

    const result = await this.db.query(query, [courseId, lessonNumber]);
    return result.rows[0] || null;
  }

  async createLessonPlan(data: {
    course_id: string;
    lesson_number: number;
    title: string;
    objectives?: string;
    materials?: string;
    duration_minutes?: number;
  }): Promise<any> {
    // First find or create course configuration
    const configQuery = `
      SELECT id FROM course_configurations
      WHERE course_id = $1
      LIMIT 1
    `;
    let configResult = await this.db.query(configQuery, [data.course_id]);
    
    if (!configResult.rows[0]) {
      // Create a default configuration
      const createConfigQuery = `
        INSERT INTO course_configurations (
          course_id, 
          grade_group_id, 
          skill_level_id
        )
        SELECT 
          $1,
          (SELECT id FROM grade_groups LIMIT 1),
          (SELECT id FROM skill_levels WHERE program_type = 'PSD' LIMIT 1)
        RETURNING id
      `;
      configResult = await this.db.query(createConfigQuery, [data.course_id]);
    }

    const configId = configResult.rows[0].id;

    const query = `
      INSERT INTO lesson_plans (
        course_config_id, lesson_number, title,
        objectives, materials, duration_minutes
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      configId,
      data.lesson_number,
      data.title,
      data.objectives || null,
      data.materials || null,
      data.duration_minutes || null
    ]);

    return result.rows[0];
  }

  async createLessonSubmission(data: {
    student_id: string;
    lesson_plan_id: string;
    session_date?: Date;
    speech_recording_url?: string;
    worksheet_url?: string;
    feedback_document_url?: string;
  }): Promise<any> {
    const query = `
      INSERT INTO lesson_submissions (
        student_id, lesson_plan_id, submitted_at,
        speech_recording_url, worksheet_url
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      data.student_id,
      data.lesson_plan_id,
      data.session_date || new Date(),
      data.speech_recording_url || null,
      data.worksheet_url || null
    ]);

    return result.rows[0];
  }
}