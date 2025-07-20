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
    const todaysClasses = await getTodaysClasses();

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
    LEFT JOIN courses c ON al.class_code = c.course_code
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

async function getTodaysClasses() {
  try {
    const today = new Date().getDay(); // 0-6 (Sunday-Saturday)
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Get courses with schedules for today
    const query = `
      SELECT 
        id,
        course_code,
        course_name,
        level as course_level,
        program_type as course_type,
        max_students as student_count,
        start_time,
        start_time as end_time,
        day_of_week
      FROM courses
      WHERE status = 'active'
        AND start_time IS NOT NULL
      ORDER BY start_time
    `;
    
    const result = await db.query(query);
    
    // Filter by day of week in JavaScript
    const filteredRows = result.rows.filter(row => {
      if (!row.day_of_week || row.day_of_week.length === 0) {
        // If no specific days set, show every day
        return true;
      }
      return row.day_of_week.includes(today);
    });
    
    return filteredRows.map(row => {
      let status: 'upcoming' | 'ongoing' | 'completed' = 'upcoming';
      
      // For now, just check if class has started
      if (row.start_time && currentTime >= row.start_time) {
        status = 'ongoing';
      }
      
      return {
        id: row.id,
        code: row.course_code,
        name: row.course_name,
        level: row.course_level,
        type: row.course_type,
        time: `${row.start_time} - ${row.end_time}`,
        startTime: row.start_time,
        endTime: row.end_time,
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