import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import FeedbackStoragePostgres from '@/lib/feedback-storage-postgres';
import { OptimizedFeedbackStorage } from '@/lib/feedback-storage-optimized';
import { getInstructorPermissions } from '@/lib/instructor-permissions';
import { DashboardWrapper } from './DashboardWrapper';

// Server Component - handles data fetching
export default async function DashboardServer() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect('/');
  }

  const instructorName = session.user.name || 'Unknown';
  const permissions = getInstructorPermissions(instructorName);
  
  console.log(`Fetching dashboard data for instructor: ${instructorName}`);

  try {
    // Use optimized storage to prevent N+1 queries
    const optimizedStorage = new OptimizedFeedbackStorage();
    
    // Get everything efficiently
    const { students: studentSummaries } = await optimizedStorage.getStudentAnalytics(
      permissions.allowedInstructors
    );
    
    if (studentSummaries.length === 0) {
      return (
        <DashboardWrapper 
          initialData={{
            error: 'No feedback data found. Please parse feedback data first.',
            students: [],
            analysisData: null,
            session,
            permissions
          }}
        />
      );
    }

    console.log(`Dashboard: Found ${studentSummaries.length} students for instructor ${instructorName}`);

    // Transform students data
    const studentList = studentSummaries.map(student => ({
      id: student.student_name,
      name: student.student_name,
      feedbackCount: student.total_feedback_sessions || 0,
      courses: student.class_codes.split(', ') || []
    }));

    // Note: Analysis data will be loaded on the client side to avoid SSR fetch issues
    const analysisData = null;

    return (
      <DashboardWrapper 
        initialData={{
          students: studentList,
          analysisData,
          session,
          permissions,
          instructorName
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
          analysisData: null,
          session,
          permissions
        }}
      />
    );
  }
}