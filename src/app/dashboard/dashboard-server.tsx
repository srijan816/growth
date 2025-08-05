import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/postgres';
import { DashboardWrapper } from './DashboardWrapper';
import { DashboardData, ProgramMetrics, OverallMetrics, ActivityItem } from '@/types/data-models';

// Server Component - handles data fetching
export default async function DashboardServer() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/');
  }

  console.log(`Fetching dashboard data for user: ${session.user.name}`);

  try {
    // Fetch real data from the new database tables
    const programMetrics = await getProgramMetrics();
    const overallMetrics = await getOverallMetrics();
    const recentActivity = await getRecentActivity();
    const todaysClasses = await getTodaysClasses(session);
    const nextUpcomingClass = await getNextUpcomingClass(session);

    console.log(`Dashboard: Fetched metrics for ${programMetrics.length} programs`);

    // Get student data from existing parsed feedback for overall metrics
    const studentsQuery = `
      SELECT DISTINCT student_name, created_at
      FROM parsed_student_feedback 
      WHERE student_name IS NOT NULL 
      ORDER BY created_at DESC
    `;
    const studentsResult = await db.query(studentsQuery);
    const studentList = studentsResult.rows.map(row => ({
      id: row.student_name,
      name: row.student_name,
      feedbackCount: 1,
      courses: []
    }));

    const dashboardData: DashboardData = {
      programs: programMetrics,
      todaysClasses,
      nextUpcomingClass,
      overallMetrics,
      recentActivity,
      lastUpdated: new Date()
    };

    return (
      <DashboardWrapper 
        initialData={{
          students: studentList,
          dashboardData,
          analysisData: null,
          session
        }}
      />
    );

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    
    return (
      <DashboardWrapper 
        initialData={{
          error: 'Failed to load dashboard data',
          students: [],
          dashboardData: null,
          analysisData: null,
          session
        }}
      />
    );
  }
}

// Helper functions to fetch data from the new database tables
async function getProgramMetrics(): Promise<ProgramMetrics[]> {
  const query = `
    SELECT 
      program_type,
      total_students,
      total_classes,
      average_attendance,
      average_growth,
      recent_feedback_count,
      top_performers,
      needs_attention,
      completion_rate,
      trend_direction
    FROM program_metrics_summary
    ORDER BY program_type
  `;
  
  const result = await db.query(query);
  
  return result.rows.map(row => ({
    programType: row.program_type,
    programName: getProgramName(row.program_type),
    totalStudents: row.total_students,
    totalClasses: row.total_classes,
    averageAttendance: parseFloat(row.average_attendance),
    averageGrowth: parseFloat(row.average_growth),
    recentFeedbackCount: row.recent_feedback_count,
    topPerformers: row.top_performers,
    needsAttention: row.needs_attention,
    completionRate: parseFloat(row.completion_rate),
    trendDirection: row.trend_direction,
    levels: [
      {
        level: 'PRIMARY',
        studentCount: Math.floor(row.total_students / 2),
        classCount: Math.floor(row.total_classes / 2),
        averageProgress: parseFloat(row.completion_rate) - 5,
        classes: []
      },
      {
        level: 'SECONDARY',
        studentCount: Math.ceil(row.total_students / 2),
        classCount: Math.ceil(row.total_classes / 2),
        averageProgress: parseFloat(row.completion_rate) + 5,
        classes: []
      }
    ]
  }));
}

async function getOverallMetrics(): Promise<OverallMetrics> {
  const programMetricsQuery = `
    SELECT 
      SUM(total_students) as total_students,
      SUM(total_classes) as total_classes,
      AVG(average_attendance) as avg_attendance,
      AVG(average_growth) as avg_growth
    FROM program_metrics_summary
  `;
  
  const feedbackQuery = `
    SELECT COUNT(*) as total_feedback
    FROM parsed_student_feedback
  `;
  
  const instructorQuery = `
    SELECT COUNT(*) as total_instructors
    FROM instructors
  `;
  
  const [programResult, feedbackResult, instructorResult] = await Promise.all([
    db.query(programMetricsQuery),
    db.query(feedbackQuery),
    db.query(instructorQuery)
  ]);
  
  const programData = programResult.rows[0];
  const feedbackData = feedbackResult.rows[0];
  const instructorData = instructorResult.rows[0];
  
  return {
    totalStudents: parseInt(programData.total_students) || 0,
    totalActiveClasses: parseInt(programData.total_classes) || 0,
    totalInstructors: parseInt(instructorData.total_instructors) || 0,
    averageAttendanceRate: parseFloat(programData.avg_attendance) || 0,
    averageGrowthRate: parseFloat(programData.avg_growth) || 0,
    totalFeedbackDocuments: parseInt(feedbackData.total_feedback) || 0
  };
}

async function getRecentActivity(): Promise<ActivityItem[]> {
  const query = `
    SELECT 
      al.activity_id as id,
      al.activity_type as type,
      s.name as student_name,
      c.course_name as class_name,
      al.description,
      al.created_at as timestamp
    FROM activity_log al
    LEFT JOIN students s ON al.student_id = s.id
    LEFT JOIN courses c ON al.class_id = c.id
    ORDER BY al.created_at DESC
    LIMIT 10
  `;
  
  const result = await db.query(query);
  
  return result.rows.map(row => ({
    id: row.id,
    type: row.type || 'activity',
    studentName: row.student_name || 'Unknown Student',
    className: row.class_name || 'Unknown Class',
    description: row.description || 'Activity logged',
    timestamp: new Date(row.timestamp)
  }));
}

async function getTodaysClasses(session?: any) {
  try {
    const now = new Date();
    const today = now.toLocaleDateString('en-US', { weekday: 'long' }); // Get day name (e.g., "Tuesday")
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    console.log(`Getting classes for ${today} at ${currentTime}`);
    
    // First, get the user ID from the session email if we have a session
    let instructorId = null;
    if (session?.user?.email) {
      const userQuery = `SELECT id FROM users WHERE email = $1`;
      const userResult = await db.query(userQuery, [session.user.email]);
      if (userResult.rows.length > 0) {
        instructorId = userResult.rows[0].id;
        console.log(`Filtering classes for instructor: ${session.user.name} (${instructorId})`);
      }
    }
    
    // Get courses with schedules for today
    let query = `
      SELECT 
        id,
        code,
        name,
        level,
        COALESCE(program_type, course_type, 'PSD') as type,
        max_students as student_count,
        start_time,
        COALESCE(
          end_time,
          -- Calculate end time based on duration or name
          CASE 
            WHEN name LIKE '%III%' THEN (start_time + INTERVAL '120 minutes')::time
            ELSE (start_time + INTERVAL '90 minutes')::time
          END
        ) as end_time,
        day_of_week,
        instructor_id
      FROM courses
      WHERE status = 'Active'
        AND start_time IS NOT NULL
    `;
    
    const params: any[] = [];
    
    // Add instructor filter if we have one
    if (instructorId) {
      query += ` AND instructor_id = $1`;
      params.push(instructorId);
    }
    
    query += ` ORDER BY start_time`;
    
    const result = await db.query(query, params);
    
    console.log(`Found ${result.rows.length} active courses with start times`);
    
    // Log first few courses for debugging
    if (result.rows.length > 0) {
      console.log(`Sample courses:`);
      result.rows.slice(0, 3).forEach(row => {
        console.log(`  - ${row.code}: day_of_week='${row.day_of_week}', start_time='${row.start_time}'`);
      });
    }
    
    // Filter by day of week
    const todaysClasses = result.rows.filter(row => {
      // Check if course runs on today
      if (!row.day_of_week) return false;
      
      let matches = false;
      if (typeof row.day_of_week === 'string') {
        // String format: "Tuesday", "Monday", etc.
        matches = row.day_of_week.toLowerCase() === today.toLowerCase();
        if (row.code === '02IPDEB2401') {
          console.log(`Checking 02IPDEB2401: day_of_week='${row.day_of_week}' vs today='${today}', match=${matches}`);
        }
      } else if (Array.isArray(row.day_of_week)) {
        // Array format: [0, 1, 2, ...] where 0=Sunday
        const todayNumber = now.getDay();
        matches = row.day_of_week.includes(todayNumber);
      }
      
      if (!matches && row.day_of_week && row.day_of_week.toString().toLowerCase().includes('tuesday')) {
        console.log(`IMPORTANT: Course ${row.code} has Tuesday but didn't match. day_of_week='${row.day_of_week}', today='${today}'`);
      }
      
      return matches;
    });
    
    console.log(`Filtered to ${todaysClasses.length} courses for ${today}`);
    
    return todaysClasses.map(row => {
      // Format times
      const startTime = typeof row.start_time === 'string' 
        ? row.start_time.substring(0, 5) 
        : row.start_time?.toTimeString().substring(0, 5) || '00:00';
        
      const endTime = typeof row.end_time === 'string'
        ? row.end_time.substring(0, 5)
        : row.end_time?.toTimeString().substring(0, 5) || '00:00';
      
      // Determine current status
      let status: 'upcoming' | 'ongoing' | 'completed' = 'upcoming';
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const startMinutes = parseInt(startTime.split(':')[0]) * 60 + parseInt(startTime.split(':')[1]);
      const endMinutes = parseInt(endTime.split(':')[0]) * 60 + parseInt(endTime.split(':')[1]);
      
      if (currentMinutes >= endMinutes) {
        status = 'completed';
      } else if (currentMinutes >= startMinutes) {
        status = 'ongoing';
      }
      
      return {
        id: row.id,
        code: row.code,
        name: row.name,
        level: row.level || 'PRIMARY',
        type: row.type,
        time: `${startTime} - ${endTime}`,
        startTime: startTime,
        endTime: endTime,
        status,
        students: row.student_count || 0,
        location: 'Room TBD' // Can be added to schema later
      };
    });
  } catch (error) {
    console.error('Error fetching today\'s classes:', error);
    return [];
  }
}

function getProgramName(programType: string): string {
  const programNames: Record<string, string> = {
    'PSD': 'Public Speaking & Debating',
    'WRITING': 'Academic Writing',
    'RAPS': 'Research Analysis & Problem Solving',
    'CRITICAL': 'Critical Thinking'
  };
  
  return programNames[programType] || programType;
}

async function getNextUpcomingClass(session?: any) {
  try {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    console.log(`Finding next upcoming class from current time: ${currentTime}`);
    
    // Get instructor ID if available
    let instructorId = null;
    if (session?.user?.email) {
      const userQuery = `SELECT id FROM users WHERE email = $1`;
      const userResult = await db.query(userQuery, [session.user.email]);
      if (userResult.rows.length > 0) {
        instructorId = userResult.rows[0].id;
      }
    }
    
    // Query to find the next upcoming class
    let query = `
      WITH upcoming_classes AS (
        SELECT 
          id,
          code,
          name,
          level,
          COALESCE(program_type, course_type, 'PSD') as type,
          max_students as student_count,
          start_time,
          COALESCE(end_time, (start_time + INTERVAL '90 minutes')::time) as end_time,
          day_of_week,
          instructor_id,
          -- Calculate days until next occurrence
          CASE 
            WHEN day_of_week = 'Sunday' THEN (7 - $1 + 0) % 7
            WHEN day_of_week = 'Monday' THEN (7 - $1 + 1) % 7
            WHEN day_of_week = 'Tuesday' THEN (7 - $1 + 2) % 7
            WHEN day_of_week = 'Wednesday' THEN (7 - $1 + 3) % 7
            WHEN day_of_week = 'Thursday' THEN (7 - $1 + 4) % 7
            WHEN day_of_week = 'Friday' THEN (7 - $1 + 5) % 7
            WHEN day_of_week = 'Saturday' THEN (7 - $1 + 6) % 7
          END as days_until,
          -- Check if it's today and still upcoming
          CASE 
            WHEN TRIM(day_of_week) = TRIM(to_char(CURRENT_DATE, 'Day')) AND start_time > $2::time 
            THEN true 
            ELSE false 
          END as is_today_upcoming
        FROM courses
        WHERE status = 'Active'
          AND start_time IS NOT NULL
          AND COALESCE(is_intensive, FALSE) = FALSE
          AND day_of_week IS NOT NULL
          ${instructorId ? 'AND instructor_id = $3' : ''}
      )
      SELECT * FROM upcoming_classes
      WHERE days_until = 0 AND is_today_upcoming = true
         OR days_until > 0
      ORDER BY days_until, start_time
      LIMIT 1
    `;
    
    const params = [currentDay, currentTime];
    if (instructorId) params.push(instructorId);
    
    const result = await db.query(query, params);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    
    // Format the class data
    const startTime = typeof row.start_time === 'string' 
      ? row.start_time.substring(0, 5) 
      : row.start_time?.toTimeString().substring(0, 5) || '00:00';
      
    const endTime = typeof row.end_time === 'string'
      ? row.end_time.substring(0, 5)
      : row.end_time?.toTimeString().substring(0, 5) || '00:00';
    
    // Calculate when the class is
    let whenText = '';
    if (row.days_until === 0) {
      whenText = 'Today';
    } else if (row.days_until === 1) {
      whenText = 'Tomorrow';
    } else {
      whenText = `${row.day_of_week}`;
    }
    
    return {
      id: row.id,
      code: row.code,
      name: row.name,
      level: row.level || 'PRIMARY',
      type: row.type,
      time: `${startTime} - ${endTime}`,
      startTime: startTime,
      endTime: endTime,
      status: 'upcoming' as const,
      students: row.student_count || 0,
      location: 'Room TBD',
      dayOfWeek: row.day_of_week,
      whenText,
      daysUntil: row.days_until
    };
    
  } catch (error) {
    console.error('Error fetching next upcoming class:', error);
    return null;
  }
}