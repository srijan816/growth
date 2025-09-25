import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { executeQuery } from '@/lib/postgres';

interface TodayClass {
  id: string;
  code: string;
  name: string;
  level: string;
  type: string;
  time: string;
  startTime: string;
  endTime: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  students: number;
  location: string;
  dayOfWeek: string;
  instructorId?: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    
    // Use provided date or today
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const dayName = targetDate.toLocaleDateString('en-US', { weekday: 'long' });
    const isToday = targetDate.toDateString() === new Date().toDateString();
    
    // Check if it's a holiday (Sunday or Monday)
    const dayOfWeek = targetDate.getDay();
    const isHoliday = dayOfWeek === 0 || dayOfWeek === 1; // 0 = Sunday, 1 = Monday
    
    console.log(`[API] Getting classes for ${dayName} (${targetDate.toISOString().split('T')[0]})`);
    console.log(`[API] Current time: ${new Date().toTimeString()}`);
    console.log(`[API] Is holiday: ${isHoliday}`);
    
    // If it's a holiday, return empty array immediately
    if (isHoliday) {
      return NextResponse.json({
        classes: [],
        date: targetDate.toISOString().split('T')[0],
        dayOfWeek: dayName,
        isToday,
        isHoliday: true
      });
    }
    
    // First, get the user ID from the session email if we have one
    let instructorId = null;
    if (session?.user?.email) {
      const userQuery = `SELECT id, name FROM users WHERE email = $1`;
      const userResult = await executeQuery(userQuery, [session.user.email]);
      if (userResult.rows.length > 0) {
        instructorId = userResult.rows[0].id;
        console.log(`[API] Session user: ${session.user.name} (email: ${session.user.email})`);
        console.log(`[API] Database user: ${userResult.rows[0].name} (ID: ${instructorId})`);
      } else {
        console.log(`[API] No user found for email: ${session.user.email}`);
      }
    } else {
      console.log(`[API] No email in session:`, session?.user);
    }
    
    // Query courses table with proper day_of_week filtering
    let query = `
      SELECT 
        id,
        code,
        name,
        level,
        COALESCE(program_type, course_type, 'PSD') as type,
        start_time,
        COALESCE(
          end_time,
          -- Calculate end time based on duration or default
          CASE 
            WHEN name LIKE '%III%' THEN (start_time + INTERVAL '120 minutes')::time
            ELSE (start_time + INTERVAL '90 minutes')::time
          END
        ) as end_time,
        day_of_week,
        instructor_id,
        COALESCE(max_students, student_count, 20) as max_students,
        COALESCE(is_intensive, FALSE) as is_intensive
      FROM courses
      WHERE status = 'active'
        AND start_time IS NOT NULL
        AND COALESCE(is_intensive, FALSE) = FALSE
    `;
    
    const params: any[] = [];
    
    // Add instructor filter if we have one
    if (instructorId) {
      query += ` AND instructor_id = $1`;
      params.push(instructorId);
    }
    
    query += ` ORDER BY start_time`;
    
    const result = await executeQuery(query, params);
    
    console.log(`[API] Found ${result.rows.length} active courses with start times`);
    
    // Log first few courses for debugging
    if (result.rows.length > 0) {
      console.log(`[API] Sample courses:`);
      result.rows.slice(0, 3).forEach(row => {
        console.log(`  - ${row.code}: day_of_week='${row.day_of_week}', start_time='${row.start_time}'`);
      });
    }
    
    // Filter by day of week and transform to consistent format
    const todaysClasses: TodayClass[] = [];
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    for (const row of result.rows) {
      // Check if course runs on target day
      let runsOnTargetDay = false;
      
      if (row.day_of_week) {
        if (typeof row.day_of_week === 'string') {
          // String format: "Tuesday", "Monday", etc.
          runsOnTargetDay = row.day_of_week.toLowerCase() === dayName.toLowerCase();
          if (row.code === '02IPDEB2401') {
            console.log(`[API] Checking 02IPDEB2401: day_of_week='${row.day_of_week}' vs dayName='${dayName}', match=${runsOnTargetDay}`);
          }
        } else if (Array.isArray(row.day_of_week)) {
          // Array format: [0, 1, 2, ...] where 0=Sunday
          const targetDayNumber = targetDate.getDay();
          runsOnTargetDay = row.day_of_week.includes(targetDayNumber);
        }
      }
      
      if (!runsOnTargetDay) {
        if (row.day_of_week && row.day_of_week.toString().toLowerCase().includes('tuesday')) {
          console.log(`[API] IMPORTANT: Course ${row.code} has Tuesday but didn't match. day_of_week='${row.day_of_week}', dayName='${dayName}'`);
        }
        continue;
      }
      
      // Format times
      const startTime = typeof row.start_time === 'string' 
        ? row.start_time.substring(0, 5) 
        : row.start_time?.toTimeString().substring(0, 5) || '00:00';
        
      const endTime = typeof row.end_time === 'string'
        ? row.end_time.substring(0, 5)
        : row.end_time?.toTimeString().substring(0, 5) || '00:00';
      
      // Determine status
      let status: 'upcoming' | 'ongoing' | 'completed' = 'upcoming';
      
      if (isToday) {
        if (currentTime >= endTime) {
          status = 'completed';
        } else if (currentTime >= startTime && currentTime < endTime) {
          status = 'ongoing';
        }
      } else if (targetDate < now) {
        status = 'completed';
      }
      
      todaysClasses.push({
        id: row.id,
        code: row.code,
        name: row.name,
        level: row.level || 'PRIMARY',
        type: row.type,
        time: `${startTime} - ${endTime}`,
        startTime,
        endTime,
        status,
        students: parseInt(row.max_students) || 0,
        location: 'Room TBD',
        dayOfWeek: dayName,
        instructorId: row.instructor_id
      });
    }
    
    console.log(`[API] Filtered to ${todaysClasses.length} classes for ${dayName}`);
    
    // Check class_sessions table for specific scheduled sessions
    // This should be the primary source when sessions exist
    const sessionQuery = `
      SELECT 
        cs.id as session_id,
        c.id as course_id,
        c.code,
        c.name,
        c.level,
        COALESCE(c.program_type, c.course_type, 'PSD') as type,
        TO_CHAR(cs.start_time, 'HH24:MI') as start_time,
        TO_CHAR(cs.end_time, 'HH24:MI') as end_time,
        c.instructor_id,
        COUNT(DISTINCT e.id) as enrolled_students
      FROM class_sessions cs
      JOIN courses c ON cs.course_id = c.id
      LEFT JOIN enrollments e ON c.id = e.course_id AND e.status = 'active'
      WHERE cs.session_date = $1
        AND COALESCE(c.is_intensive, FALSE) = FALSE
        ${instructorId ? 'AND c.instructor_id = $2' : ''}
      GROUP BY cs.id, c.id, c.code, c.name, c.level, c.program_type, c.course_type, 
               cs.start_time, cs.end_time, c.instructor_id
      ORDER BY cs.start_time
    `;
    
    const sessionParams = [targetDate.toISOString().split('T')[0]];
    if (instructorId) sessionParams.push(instructorId);
    
    const sessionResult = await executeQuery(sessionQuery, sessionParams);
    
    // Track which courses we've already added from sessions
    const coursesFromSessions = new Set<string>();
    
    // Replace courses with their session-specific times
    for (const session of sessionResult.rows) {
      coursesFromSessions.add(session.course_id);
      
      // Remove any existing entry for this course
      const existingIndex = todaysClasses.findIndex(c => c.id === session.course_id);
      if (existingIndex !== -1) {
        todaysClasses.splice(existingIndex, 1);
      }
      
      const startTime = session.start_time;
      const endTime = session.end_time;
      
      let status: 'upcoming' | 'ongoing' | 'completed' = 'upcoming';
      if (isToday) {
        if (currentTime >= endTime) {
          status = 'completed';
        } else if (currentTime >= startTime && currentTime < endTime) {
          status = 'ongoing';
        }
      } else if (targetDate < now) {
        status = 'completed';
      }
      
      todaysClasses.push({
        id: session.course_id,
        code: session.code,
        name: session.name,
        level: session.level || 'PRIMARY',
        type: session.type,
        time: `${startTime} - ${endTime}`,
        startTime,
        endTime,
        status,
        students: parseInt(session.enrolled_students) || 0,
        location: 'Room TBD',
        dayOfWeek: dayName,
        instructorId: session.instructor_id
      });
    }
    
    // Sort by start time
    todaysClasses.sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    return NextResponse.json({
      classes: todaysClasses,
      date: targetDate.toISOString().split('T')[0],
      dayOfWeek: dayName,
      isToday
    });

  } catch (error) {
    console.error('[API] Error fetching today\'s classes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch today\'s classes' },
      { status: 500 }
    );
  }
}