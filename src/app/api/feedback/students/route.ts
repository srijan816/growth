import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import FeedbackStoragePostgres from '@/lib/feedback-storage-postgres';
import { getInstructorPermissions } from '@/lib/instructor-permissions';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get instructor permissions
    const instructorName = session.user.name || 'Unknown';
    const permissions = getInstructorPermissions(instructorName);
    
    console.log(`Fetching students for instructor: ${instructorName}`);

    const storage = new FeedbackStoragePostgres();
    
    // Get all students with their primary instructor assignments
    const studentsByInstructor = await storage.getStudentsByPrimaryInstructor();
    
    // If no data exists, return empty response
    if (Object.keys(studentsByInstructor).length === 0) {
      return NextResponse.json({
        error: 'No feedback data found',
        message: 'Please run the parsing process first',
        students: [],
        totalStudents: 0,
        totalFeedbacks: 0,
        instructorView: permissions.canAccessAllData ? 'all' : permissions.instructorName
      }, { status: 202 }); // 202 Accepted - processing required
    }

    // Get all students from stored data
    const allStudents = await storage.getStudentsWithFeedback();
    
    // Filter students based on instructor permissions using pre-computed assignments
    let filteredStudents = allStudents;
    
    if (!permissions.canAccessAllData) {
      // Get students assigned to this instructor's allowed instructors
      const studentsForThisInstructor: string[] = [];
      
      for (const allowedInstructor of permissions.allowedInstructors) {
        if (studentsByInstructor[allowedInstructor]) {
          studentsForThisInstructor.push(...studentsByInstructor[allowedInstructor]);
        }
      }
      
      // Filter allStudents to only include those assigned to this instructor
      filteredStudents = allStudents.filter(student => 
        studentsForThisInstructor.includes(student.student_name)
      );
      
      console.log(`Assigned ${filteredStudents.length} students to instructor ${instructorName} (out of ${allStudents.length} total)`);
      console.log(`Students: ${studentsForThisInstructor.slice(0, 5).join(', ')}${studentsForThisInstructor.length > 5 ? '...' : ''}`);
    } else {
      console.log(`Test instructor ${instructorName} accessing all ${filteredStudents.length} students`);
    }
    
    // Transform to match expected format with unique IDs
    const transformedStudents = filteredStudents.map((student, index) => {
      // Create a stable unique ID that doesn't change with data updates
      const uniqueId = `student_${student.student_name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${student.primary_instructor?.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'unknown'}_${student.class_codes.split(', ')[0] || 'unknown'}`;
      
      return {
        id: uniqueId, // Add unique ID for React keys
        name: student.student_name,
        primaryInstructor: student.primary_instructor,
        allInstructors: student.instructors?.split(', ') || [student.primary_instructor],
        totalFeedbacks: student.total_feedback_sessions,
        classes: student.class_codes.split(', '),
        classNames: student.class_names.split(', '),
        feedbackTypes: student.feedback_types.split(', '),
        classCount: student.class_codes.split(', ').length,
        unitRange: {
          earliest: student.earliest_unit.toString(),
          latest: student.latest_unit.toString()
        },
        lastUpdated: student.last_updated
      };
    });

    const totalFeedbacks = transformedStudents.reduce((sum, student) => sum + student.totalFeedbacks, 0);

    return NextResponse.json({
      totalStudents: transformedStudents.length,
      totalFeedbacks,
      students: transformedStudents,
      isDataReady: true,
      instructorView: permissions.canAccessAllData ? 'all' : permissions.instructorName,
      allowedInstructors: permissions.allowedInstructors
    });

  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student list' }, 
      { status: 500 }
    );
  }
}