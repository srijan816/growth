import { NextRequest, NextResponse } from 'next/server';
import FeedbackStorage from '@/lib/feedback-storage';

export async function POST(request: NextRequest) {
  try {
    console.log('Re-parsing feedback data...');
    
    const storage = new FeedbackStorage();
    
    // Force re-parse all feedback
    const result = await storage.forceReparse();
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Feedback re-parsed successfully',
        totalProcessed: result.totalProcessed,
        totalStudents: result.totalStudents,
        errors: result.errors
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Re-parsing failed',
        details: result.errors
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error re-parsing feedback:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to re-parse feedback',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}