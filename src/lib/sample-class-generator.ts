/**
 * Sample Class Session Generator
 * Creates realistic class sessions based on parsed feedback data for Srijan
 */

import { getPool } from './postgres';

export interface SampleClassSession {
  courseCode: string;
  courseName: string;
  instructorId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  students: SampleStudent[];
  currentUnit: string;
  currentLesson: string;
}

export interface SampleStudent {
  name: string;
  email: string;
  studentNumber: string;
}

// Real student data from parsed feedback for Srijan's classes
export const SRIJAN_CLASSES: SampleClassSession[] = [
  // Primary Level Classes  
  {
    courseCode: '02IPDEC2404',
    courseName: 'PSD I - Saturday Afternoon',
    instructorId: '', // Will be populated from database
    dayOfWeek: 'Saturday',
    startTime: '13:30',
    endTime: '15:00',
    currentUnit: '7',
    currentLesson: '7.2',
    students: [
      { name: 'Marcus', email: 'marcus@capstone.com', studentNumber: 'S001' },
      { name: 'Kaye', email: 'kaye@capstone.com', studentNumber: 'S002' },
      { name: 'Charlotte', email: 'charlotte@capstone.com', studentNumber: 'S003' },
      { name: 'Victoria', email: 'victoria@capstone.com', studentNumber: 'S004' },
      { name: 'Alexis', email: 'alexis@capstone.com', studentNumber: 'S005' },
      { name: 'Theo', email: 'theo@capstone.com', studentNumber: 'S006' },
      { name: 'Isabelle', email: 'isabelle@capstone.com', studentNumber: 'S007' },
      { name: 'Ally', email: 'ally@capstone.com', studentNumber: 'S008' }
    ]
  },
  {
    courseCode: '02IPDEC2401',
    courseName: 'PSD I - Thursday Evening',
    instructorId: '',
    dayOfWeek: 'Thursday',
    startTime: '18:00',
    endTime: '19:30',
    currentUnit: '6',
    currentLesson: '6.4',
    students: [
      { name: 'Amelia', email: 'amelia@capstone.com', studentNumber: 'S009' },
      { name: 'Ashley', email: 'ashley@capstone.com', studentNumber: 'S010' },
      { name: 'Charlotte', email: 'charlotte2@capstone.com', studentNumber: 'S011' },
      { name: 'Edward', email: 'edward@capstone.com', studentNumber: 'S012' },
      { name: 'Jean', email: 'jean@capstone.com', studentNumber: 'S013' }
    ]
  },
  {
    courseCode: '02IPDEC2403',
    courseName: 'PSD I - Saturday Morning',
    instructorId: '',
    dayOfWeek: 'Saturday',
    startTime: '11:00',
    endTime: '12:30',
    currentUnit: '8',
    currentLesson: '8.1',
    students: [
      { name: 'Abigail', email: 'abigail@capstone.com', studentNumber: 'S014' },
      { name: 'Alexis', email: 'alexis2@capstone.com', studentNumber: 'S015' },
      { name: 'Astrea', email: 'astrea@capstone.com', studentNumber: 'S016' },
      { name: 'Cecilia', email: 'cecilia@capstone.com', studentNumber: 'S017' },
      { name: 'Elise', email: 'elise@capstone.com', studentNumber: 'S018' },
      { name: 'Victor', email: 'victor@capstone.com', studentNumber: 'S019' }
    ]
  },
  // Secondary Level Classes
  {
    courseCode: '01IPDED2404',
    courseName: 'PSD I - Advanced Saturday',
    instructorId: '',
    dayOfWeek: 'Saturday',
    startTime: '15:00',
    endTime: '16:30',
    currentUnit: '9',
    currentLesson: '9.3',
    students: [
      { name: 'Ashley', email: 'ashley3@capstone.com', studentNumber: 'S020' },
      { name: 'Evelynne', email: 'evelynne@capstone.com', studentNumber: 'S021' },
      { name: 'Henry', email: 'henry@capstone.com', studentNumber: 'S022' },
      { name: 'Kris', email: 'kris@capstone.com', studentNumber: 'S023' },
      { name: 'Melody', email: 'melody@capstone.com', studentNumber: 'S024' }
    ]
  },
  {
    courseCode: '01IPDED2406',
    courseName: 'PSD I - Thursday Advanced',
    instructorId: '',
    dayOfWeek: 'Thursday',
    startTime: '16:30',
    endTime: '18:00',
    currentUnit: '10',
    currentLesson: '10.2',
    students: [
      { name: 'Aliana', email: 'aliana@capstone.com', studentNumber: 'S025' },
      { name: 'Marcel', email: 'marcel@capstone.com', studentNumber: 'S026' },
      { name: 'Rachel', email: 'rachel@capstone.com', studentNumber: 'S027' },
      { name: 'Selina', email: 'selina@capstone.com', studentNumber: 'S028' }
    ]
  }
];

export class SampleClassGenerator {
  private pool;

  constructor() {
    this.pool = getPool();
  }

  /**
   * Generate weekly class sessions for a given week
   */
  async generateWeeklyClasses(startDate: Date): Promise<any[]> {
    try {
      // Get Srijan's instructor ID
      const instructorResult = await this.pool.query(
        'SELECT id FROM users WHERE email = $1 OR name ILIKE $2',
        ['srijan@capstoneevolve.com', '%Srijan%']
      );

      if (instructorResult.rows.length === 0) {
        throw new Error('Instructor Srijan not found in database');
      }

      const instructorId = instructorResult.rows[0].id;

      const classSessions = [];

      // Generate sessions for the week
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + dayOffset);
        
        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
        
        // Find classes for this day
        const dayClasses = SRIJAN_CLASSES.filter(cls => cls.dayOfWeek === dayName);
        
        for (const classData of dayClasses) {
          const [startHour, startMinute] = classData.startTime.split(':').map(Number);
          const [endHour, endMinute] = classData.endTime.split(':').map(Number);
          
          const startDateTime = new Date(currentDate);
          startDateTime.setHours(startHour, startMinute, 0, 0);
          
          const endDateTime = new Date(currentDate);
          endDateTime.setHours(endHour, endMinute, 0, 0);

          classSessions.push({
            id: `${classData.courseCode}-${currentDate.toISOString().split('T')[0]}`,
            courseId: classData.courseCode,
            courseCode: classData.courseCode,
            courseName: classData.courseName,
            instructorId: instructorId,
            instructorName: 'Srijan',
            startTime: startDateTime.toISOString(),
            endTime: endDateTime.toISOString(),
            venue: `Room ${Math.floor(Math.random() * 10) + 101}`,
            currentUnit: classData.currentUnit,
            currentLesson: classData.currentLesson,
            maxStudents: 12,
            enrolledCount: classData.students.length,
            status: this.getClassStatus(startDateTime),
            students: classData.students,
            topics: [
              `Unit ${classData.currentUnit}: Advanced Argumentation`,
              `Lesson ${classData.currentLesson}: Evidence Analysis`,
              'Rebuttal Techniques',
              'Cross-examination Skills'
            ]
          });
        }
      }

      return classSessions;
    } catch (error) {
      console.error('Error generating weekly classes:', error);
      throw error;
    }
  }

  /**
   * Determine class status based on current time
   */
  private getClassStatus(classStartTime: Date): 'upcoming' | 'ongoing' | 'completed' {
    const now = new Date();
    const classEndTime = new Date(classStartTime.getTime() + 90 * 60 * 1000); // 90 minutes

    if (now < classStartTime) {
      return 'upcoming';
    } else if (now >= classStartTime && now <= classEndTime) {
      return 'ongoing';
    } else {
      return 'completed';
    }
  }

  /**
   * Populate database with sample data (courses, students, enrollments)
   */
  async populateSampleData(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get or create Srijan user
      let instructorResult = await client.query(
        'SELECT id FROM users WHERE email = $1',
        ['srijan@capstoneevolve.com']
      );

      let instructorId: string;
      
      if (instructorResult.rows.length === 0) {
        // Create Srijan user
        const result = await client.query(`
          INSERT INTO users (name, email, role, password_hash) 
          VALUES ($1, $2, $3, $4) 
          RETURNING id
        `, ['Srijan', 'srijan@capstoneevolve.com', 'instructor', '$2b$12$dummy.hash.value']);
        instructorId = result.rows[0].id;
      } else {
        instructorId = instructorResult.rows[0].id;
      }

      // Create courses and students for each class
      for (const classData of SRIJAN_CLASSES) {
        // Check if course exists, if not create it
        const existingCourse = await client.query(
          'SELECT id FROM courses WHERE code = $1',
          [classData.courseCode]
        );
        
        if (existingCourse.rows.length === 0) {
          await client.query(`
            INSERT INTO courses (code, name, instructor_id, day_of_week, start_time, program_type, level, grade_range, max_students, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `, [
            classData.courseCode,
            classData.courseName,
            instructorId,
            classData.dayOfWeek,
            classData.startTime,
            'PSD',
            'Beginner',
            '6-12',
            12,
            'active'
          ]);
        }

        // Get course UUID from code
        const courseResult = await client.query(
          'SELECT id FROM courses WHERE code = $1',
          [classData.courseCode]
        );
        
        if (courseResult.rows.length === 0) {
          console.warn(`Course not found: ${classData.courseCode}`);
          continue;
        }
        
        const courseId = courseResult.rows[0].id;

        // Create students and enrollments
        for (const student of classData.students) {
          // Create or update student user
          let studentResult = await client.query(
            'SELECT id FROM users WHERE email = $1',
            [student.email]
          );

          let userId: string;
          
          if (studentResult.rows.length === 0) {
            const result = await client.query(`
              INSERT INTO users (name, email, role, password_hash) 
              VALUES ($1, $2, $3, $4) 
              RETURNING id
            `, [student.name, student.email, 'student', '$2b$12$dummy.hash.value']);
            userId = result.rows[0].id;
          } else {
            userId = studentResult.rows[0].id;
          }

          // Create student record (students table just links to users)
          const existingStudent = await client.query(
            'SELECT id FROM students WHERE id = $1',
            [userId]
          );
          
          if (existingStudent.rows.length === 0) {
            await client.query(`
              INSERT INTO students (id, student_number)
              VALUES ($1, $2)
            `, [userId, student.studentNumber]);
          }

          // Create enrollment (use course UUID, not code)
          const existingEnrollment = await client.query(
            'SELECT id FROM enrollments WHERE student_id = $1 AND course_id = $2',
            [userId, courseId]
          );
          
          if (existingEnrollment.rows.length === 0) {
            await client.query(`
              INSERT INTO enrollments (student_id, course_id, enrollment_date, status)
              VALUES ($1, $2, $3, $4)
            `, [userId, courseId, new Date(), 'active']);
          }
        }
      }

      await client.query('COMMIT');
      console.log('Sample data populated successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error populating sample data:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Generate class sessions for the current week and store in database
   */
  async generateAndStoreWeeklyClasses(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // Get current week start (Sunday)
      const now = new Date();
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      // Generate for 4 weeks (current week + 3 future weeks)
      for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
        const weekStart = new Date(startOfWeek);
        weekStart.setDate(startOfWeek.getDate() + (weekOffset * 7));

        const classSessions = await this.generateWeeklyClasses(weekStart);

        for (const session of classSessions) {
          // Get course UUID for this session
          const courseResult = await client.query(
            'SELECT id FROM courses WHERE code = $1',
            [session.courseCode]
          );
          
          if (courseResult.rows.length === 0) {
            console.warn(`Course not found for session: ${session.courseCode}`);
            continue;
          }
          
          const courseId = courseResult.rows[0].id;
          const startDateTime = new Date(session.startTime);
          const endDateTime = new Date(session.endTime);

          const sessionDate = startDateTime.toISOString().split('T')[0];
          
          // Check if session already exists
          const existingSession = await client.query(
            'SELECT id FROM class_sessions WHERE course_id = $1 AND session_date = $2',
            [courseId, sessionDate]
          );
          
          if (existingSession.rows.length === 0) {
            await client.query(`
              INSERT INTO class_sessions (
                course_id, session_date, start_time, end_time, 
                topic, unit_number, lesson_number, status
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `, [
              courseId,
              sessionDate, // session_date
              startDateTime.toTimeString().substr(0, 8), // start_time
              endDateTime.toTimeString().substr(0, 8), // end_time
              `Unit ${session.currentUnit}.${session.currentLesson}: Advanced Argumentation`,
              session.currentUnit,
              session.currentLesson,
              session.status === 'upcoming' ? 'scheduled' : session.status
            ]);
          }
        }
      }

      await client.query('COMMIT');
      console.log('Weekly class sessions generated and stored successfully');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error generating and storing weekly classes:', error);
      throw error;
    } finally {
      client.release();
    }
  }
}