import { NextRequest, NextResponse } from 'next/server';
import FeedbackParser from '@/lib/feedback-parser';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('file');
    
    if (!filePath) {
      return NextResponse.json({ error: 'File path parameter is required' }, { status: 400 });
    }

    const parser = new FeedbackParser();
    // Since parseDocumentFile is private, we'll access it through the parseAllFeedback method
    // but filter for our specific file
    const allResults = await parser.parseAllFeedback();
    
    // Filter results for the specific file
    const result = {
      success: true,
      errors: [],
      feedbacks: allResults.feedbacks.filter(f => f.filePath === filePath)
    };
    
    // Return the parsing result
    return NextResponse.json({
      file_path: filePath,
      success: result.success,
      errors: result.errors,
      feedbacks: result.feedbacks.map(f => ({
        student_name: f.studentName,
        unit_number: f.unitNumber,
        lesson_number: f.lessonNumber,
        motion: f.motion,
        topic: f.topic,
        raw_content_preview: f.rawContent?.substring(0, 1000) + '...',
        clean_content_preview: f.content?.substring(0, 500) + '...',
        file_path: f.filePath,
        feedback_type: f.feedbackType
      }))
    });

  } catch (error) {
    console.error('Error parsing specific file:', error);
    return NextResponse.json(
      { 
        error: 'Failed to parse file', 
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}