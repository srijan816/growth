import { NextRequest, NextResponse } from 'next/server';
import FeedbackStorage from '@/lib/feedback-storage';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting feedback parsing and storage...');
    
    const storage = new FeedbackStorage();
    
    // Check if force re-parse is requested
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';
    
    let result;
    if (force) {
      console.log('Force re-parse requested');
      result = await storage.forceReparse();
    } else {
      result = await storage.parseAndStoreFeedback();
    }
    
    return NextResponse.json({
      success: result.success,
      message: result.success 
        ? `Successfully processed ${result.totalProcessed} feedback records for ${result.totalStudents} students`
        : 'Parsing failed',
      details: {
        totalProcessed: result.totalProcessed,
        totalStudents: result.totalStudents,
        errors: result.errors
      }
    });

  } catch (error) {
    console.error('Error in parse-and-store:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to parse and store feedback',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const storage = new FeedbackStorage();
    const status = await storage.getParsingStatus();
    const isReady = await storage.isDataReady();
    
    return NextResponse.json({
      isReady,
      status,
      message: isReady ? 'Feedback data is ready' : 'Feedback data not yet parsed'
    });

  } catch (error) {
    console.error('Error getting parsing status:', error);
    return NextResponse.json(
      { error: 'Failed to get parsing status' }, 
      { status: 500 }
    );
  }
}