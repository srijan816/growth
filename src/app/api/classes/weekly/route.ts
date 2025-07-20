import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { executeQuery } from '@/lib/postgres';
import { SampleClassGenerator } from '@/lib/sample-class-generator';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // First try to get classes from database
    const query = `
      SELECT 
        cs.id,
        cs.course_id as "courseId",
        c.code as "courseCode",
        c.name as "courseName",
        cs.date as "sessionDate",
        TO_CHAR(cs.start_time, 'HH24:MI') as "startTime",
        TO_CHAR(cs.end_time, 'HH24:MI') as "endTime",
        cs.notes as topic,
        1 as "currentUnit",
        1 as "currentLesson",
        c.max_students,
        COUNT(e.id) as "enrolledStudents"
      FROM class_sessions cs
      JOIN courses c ON cs.course_id = c.id
      LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
      WHERE c.instructor_id::text = $1
        AND cs.date >= $2
        AND cs.date <= $3
      GROUP BY cs.id, c.id, c.code, c.name, cs.date, cs.start_time, cs.end_time, 
               cs.notes, c.max_students
      ORDER BY cs.date, cs.start_time
    `;

    let result = await executeQuery(query, [session.user.id, startDate, endDate]);

    // If no classes found in database, generate sample data for Srijan
    if (result.rows.length === 0) {
      try {
        // Check if user is Srijan or has instructor role
        const userQuery = `
          SELECT name, email, role FROM users WHERE id = $1
        `;
        const userResult = await executeQuery(userQuery, [session.user.id]);
        const user = userResult.rows[0];

        if (user && (user.name === 'Srijan' || user.email?.includes('srijan') || user.role === 'instructor')) {
          // Generate sample weekly classes
          const generator = new SampleClassGenerator();
          const startDateObj = new Date(startDate);
          const weeklyClasses = await generator.generateWeeklyClasses(startDateObj);
          
          // Transform to match expected format
          const classes = weeklyClasses.map((cls: any) => {
            const startDateTime = new Date(cls.startTime);
            const endDateTime = new Date(cls.endTime);
            const now = new Date();
            
            let status = cls.status;
            if (startDateTime > now) {
              status = 'upcoming';
            } else if (startDateTime <= now && endDateTime >= now) {
              status = 'ongoing';
            } else {
              status = 'completed';
            }

            return {
              id: cls.id,
              courseId: cls.courseCode,
              courseCode: cls.courseCode,
              courseName: cls.courseName,
              sessionDate: startDateTime.toISOString().split('T')[0],
              startTime: startDateTime.toTimeString().substr(0, 5),
              endTime: endDateTime.toTimeString().substr(0, 5),
              venue: cls.venue,
              currentUnit: cls.currentUnit,
              currentLesson: cls.currentLesson,
              maxStudents: cls.maxStudents,
              enrolledStudents: cls.enrolledCount,
              status,
              topics: cls.topics
            };
          });

          return NextResponse.json({ 
            classes,
            isSampleData: true,
            instructor: user.name || 'Srijan'
          });
        }
      } catch (sampleError) {
        console.error('Error generating sample data:', sampleError);
        // Fall through to return empty result
      }
    }

    // Transform the database results to include proper status based on current time
    const classes = result.rows.map((cls: any) => {
      const sessionDateTime = new Date(`${cls.sessionDate}T${cls.startTime}:00`);
      const endDateTime = new Date(`${cls.sessionDate}T${cls.endTime}:00`);
      const now = new Date();
      
      let status = 'upcoming';
      if (sessionDateTime <= now && endDateTime >= now) {
        status = 'ongoing';
      } else if (endDateTime < now) {
        status = 'completed';
      }

      return {
        ...cls,
        status,
        enrolledStudents: parseInt(cls.enrolledStudents) || 0
      };
    });

    return NextResponse.json({ classes });

  } catch (error) {
    console.error('Error fetching weekly classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weekly classes' },
      { status: 500 }
    );
  }
}