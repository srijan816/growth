import { NextRequest, NextResponse } from 'next/server';
import FeedbackParser from '@/lib/feedback-parser';
import path from 'path';

export async function GET() {
  try {
    // Initialize feedback parser
    const dataPath = path.join(process.cwd(), 'data');
    const parser = new FeedbackParser(dataPath);
    
    // Test parsing
    const result = await parser.parseAllFeedback();
    
    // Get summary statistics
    const stats = {
      success: result.success,
      totalFeedbacks: result.feedbacks.length,
      totalErrors: result.errors.length,
      studentCount: new Set(result.feedbacks.map(f => f.studentName)).size,
      classCount: new Set(result.feedbacks.map(f => f.classCode)).size,
      feedbackTypes: {
        primary: result.feedbacks.filter(f => f.feedbackType === 'primary').length,
        secondary: result.feedbacks.filter(f => f.feedbackType === 'secondary').length
      },
      unitRange: {
        earliest: result.feedbacks.sort((a, b) => 
          parseFloat(a.unitNumber) - parseFloat(b.unitNumber)
        )[0]?.unitNumber,
        latest: result.feedbacks.sort((a, b) => 
          parseFloat(b.unitNumber) - parseFloat(a.unitNumber)
        )[0]?.unitNumber
      },
      sampleStudents: Array.from(new Set(result.feedbacks.map(f => f.studentName))).slice(0, 10),
      sampleFeedback: result.feedbacks.slice(0, 3).map(f => ({
        student: f.studentName,
        class: f.classCode,
        unit: f.unitNumber,
        type: f.feedbackType,
        contentPreview: f.content.substring(0, 200) + '...'
      }))
    };

    return NextResponse.json({
      status: 'success',
      message: 'Feedback parsing test completed',
      stats,
      errors: result.errors.slice(0, 10) // Show first 10 errors
    });
    
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Test failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}