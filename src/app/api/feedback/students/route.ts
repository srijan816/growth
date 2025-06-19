import { NextRequest, NextResponse } from 'next/server';
import FeedbackStorage from '@/lib/feedback-storage';

export async function GET(request: NextRequest) {
  try {
    const storage = new FeedbackStorage();
    
    // Check if data is ready
    const isReady = await storage.isDataReady();
    if (!isReady) {
      return NextResponse.json({
        error: 'Feedback data not yet parsed',
        message: 'Please run the parsing process first',
        students: [],
        totalStudents: 0,
        totalFeedbacks: 0
      }, { status: 202 }); // 202 Accepted - processing required
    }

    // Get students from stored data
    const students = await storage.getStudentsWithFeedback();
    
    // Transform to match expected format
    const transformedStudents = students.map(student => ({
      name: student.student_name,
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
    }));

    const totalFeedbacks = transformedStudents.reduce((sum, student) => sum + student.totalFeedbacks, 0);

    return NextResponse.json({
      totalStudents: transformedStudents.length,
      totalFeedbacks,
      students: transformedStudents,
      isDataReady: true
    });

  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student list' }, 
      { status: 500 }
    );
  }
}