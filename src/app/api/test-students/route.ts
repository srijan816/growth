import { NextRequest, NextResponse } from 'next/server';
import FeedbackStorage from '@/lib/feedback-storage';

export async function GET() {
  try {
    const storage = new FeedbackStorage();
    
    // Check if data is ready
    const isReady = await storage.isDataReady();
    
    console.log('Data ready status:', isReady);
    
    if (!isReady) {
      return NextResponse.json({
        isReady: false,
        message: 'Feedback data not yet parsed. Need to run parsing first.',
        students: []
      });
    }

    // Get students from stored data
    const students = await storage.getStudentsWithFeedback();
    
    console.log('Found students:', students.length);
    console.log('First few students:', students.slice(0, 3));
    
    return NextResponse.json({
      isReady: true,
      totalStudents: students.length,
      students: students.slice(0, 10), // Return first 10 for testing
      message: 'Success'
    });

  } catch (error) {
    console.error('Error in test-students:', error);
    return NextResponse.json({
      error: 'Failed to test student data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}