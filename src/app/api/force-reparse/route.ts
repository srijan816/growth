import { NextRequest, NextResponse } from 'next/server';
import FeedbackStorage from '@/lib/feedback-storage';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting force re-parse with enhanced student detection...');
    
    const storage = new FeedbackStorage();
    
    // Force re-parsing with the improved logic
    const result = await storage.forceReparse();
    
    console.log('Force re-parse completed:', result);
    
    return NextResponse.json({
      success: result.success,
      message: `Re-parsing completed. Found ${result.totalStudents} students with ${result.totalProcessed} feedback records.`,
      totalStudents: result.totalStudents,
      totalProcessed: result.totalProcessed,
      errors: result.errors
    });

  } catch (error) {
    console.error('Error in force re-parse:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to re-parse feedback data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}