import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { executeQuery } from '@/lib/postgres';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'instructor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse body or use defaults for current week
    let startDate: string;
    let endDate: string;
    
    try {
      const body = await request.json();
      startDate = body.startDate;
      endDate = body.endDate;
    } catch {
      // Default to current week if no body provided
      const today = new Date();
      const dayOfWeek = today.getDay();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - dayOfWeek);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      startDate = startOfWeek.toISOString().split('T')[0];
      endDate = endOfWeek.toISOString().split('T')[0];
    }

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    // Get all courses for the instructor
    const coursesQuery = `
      SELECT 
        id,
        code,
        name,
        day_of_week,
        start_time,
        end_time
      FROM courses
      WHERE instructor_id = $1
    `;
    
    const coursesResult = await executeQuery(coursesQuery, [session.user.id]);
    
    if (coursesResult.rows.length === 0) {
      return NextResponse.json({
        message: 'No courses found for instructor',
        sessionsCreated: 0
      });
    }

    // Generate sessions for each course in the date range
    let sessionsCreated = 0;
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    for (const course of coursesResult.rows) {
      // Map day names to numbers (0 = Sunday, 1 = Monday, etc.)
      const dayMap: { [key: string]: number } = {
        'Sunday': 0,
        'Monday': 1,
        'Tuesday': 2,
        'Wednesday': 3,
        'Thursday': 4,
        'Friday': 5,
        'Saturday': 6
      };
      
      const courseDayNumber = dayMap[course.day_of_week];
      if (courseDayNumber === undefined) continue;
      
      // Find all dates in the range that match the course's day
      const currentDate = new Date(startDateObj);
      
      while (currentDate <= endDateObj) {
        if (currentDate.getDay() === courseDayNumber) {
          // Check if session already exists
          const checkQuery = `
            SELECT id FROM class_sessions 
            WHERE course_id = $1 AND date = $2
          `;
          
          const existingSession = await executeQuery(checkQuery, [
            course.id,
            currentDate.toISOString().split('T')[0]
          ]);
          
          if (existingSession.rows.length === 0) {
            // Create session
            const sessionDate = currentDate.toISOString().split('T')[0];
            const startDateTime = `${sessionDate}T${course.start_time}`;
            const endDateTime = `${sessionDate}T${course.end_time || course.start_time}`;
            
            const insertQuery = `
              INSERT INTO class_sessions (
                course_id,
                date,
                start_time,
                end_time,
                status,
                notes
              ) VALUES ($1, $2, $3, $4, $5, $6)
            `;
            
            await executeQuery(insertQuery, [
              course.id,
              sessionDate,
              startDateTime,
              endDateTime,
              'scheduled',
              `${course.name} - Week ${Math.ceil((currentDate.getDate()) / 7)}`
            ]);
            
            sessionsCreated++;
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    return NextResponse.json({
      success: true,
      sessionsCreated,
      courses: coursesResult.rows.length
    });

  } catch (error) {
    console.error('Error generating sessions:', error);
    return NextResponse.json(
      { error: 'Failed to generate sessions' },
      { status: 500 }
    );
  }
}