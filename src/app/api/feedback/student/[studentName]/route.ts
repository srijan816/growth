import { NextRequest, NextResponse } from 'next/server';
import FeedbackStorage from '@/lib/feedback-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentName: string }> }
) {
  try {
    const { studentName: rawStudentName } = await params;
    const studentName = decodeURIComponent(rawStudentName);
    
    // Get query parameters for filtering
    const searchParams = request.nextUrl.searchParams;
    const feedbackType = searchParams.get('type') as 'primary' | 'secondary' | null;
    const classCode = searchParams.get('classCode');
    
    console.log(`Getting feedback for student: ${studentName} (type: ${feedbackType || 'all'}, class: ${classCode || 'all'})`);
    
    const storage = new FeedbackStorage();
    
    // Check if data is ready
    const isReady = await storage.isDataReady();
    if (!isReady) {
      return NextResponse.json({
        error: 'Feedback data not yet parsed',
        message: 'Please run the parsing process first',
        studentName
      }, { status: 202 });
    }
    
    // Get student feedback from stored data with optional filters
    const feedbacks = await storage.getStudentFeedback(studentName, feedbackType || undefined, classCode || undefined);
    
    if (feedbacks.length === 0) {
      // Get similar names for suggestions
      const allStudents = await storage.getStudentsWithFeedback();
      const suggestions = allStudents
        .filter(student => 
          student.student_name.toLowerCase().includes(studentName.toLowerCase()) ||
          studentName.toLowerCase().includes(student.student_name.toLowerCase())
        )
        .slice(0, 5)
        .map(s => s.student_name);
      
      return NextResponse.json(
        { 
          error: 'No feedback found for this student',
          studentName,
          suggestions
        }, 
        { status: 404 }
      );
    }

    // Group feedback by class/course
    const feedbackByClass = feedbacks.reduce((acc, feedback) => {
      const key = `${feedback.class_code} - ${feedback.class_name}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(feedback);
      return acc;
    }, {} as Record<string, typeof feedbacks>);

    // Deduplicate feedbacks by unit number and content (keep most recent)
    const uniqueFeedbacks = feedbacks.reduce((acc, feedback) => {
      const key = `${feedback.unit_number}-${feedback.feedback_type}`;
      if (!acc[key] || new Date(feedback.parsed_at) > new Date(acc[key].parsed_at)) {
        acc[key] = feedback;
      }
      return acc;
    }, {} as Record<string, typeof feedbacks[0]>);

    // Transform to match expected format
    const chronologicalFeedback = Object.values(uniqueFeedbacks).map(feedback => ({
      studentName: feedback.student_name,
      classCode: feedback.class_code,
      className: feedback.class_name,
      unitNumber: feedback.unit_number,
      lessonNumber: feedback.lesson_number,
      topic: feedback.topic,
      motion: feedback.motion,
      feedbackType: feedback.feedback_type,
      content: feedback.content,
      rawContent: feedback.raw_content,
      htmlContent: feedback.html_content,
      duration: feedback.duration,
      extractedAt: feedback.parsed_at
    })).sort((a, b) => {
      // Sort by unit number
      const aUnit = parseFloat(a.unitNumber || '0');
      const bUnit = parseFloat(b.unitNumber || '0');
      return aUnit - bUnit;
    });

    return NextResponse.json({
      studentName: feedbacks[0]?.student_name || studentName,
      totalFeedbacks: feedbacks.length,
      classes: Object.keys(feedbackByClass).length,
      dateRange: {
        earliest: feedbacks[0]?.unit_number,
        latest: feedbacks[feedbacks.length - 1]?.unit_number
      },
      feedbackByClass,
      chronologicalFeedback
    });

  } catch (error) {
    console.error('Error fetching student feedback:', error);
    return NextResponse.json(
      { error: 'Failed to fetch student feedback', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    );
  }
}