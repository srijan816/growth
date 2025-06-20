import { NextRequest, NextResponse } from 'next/server';
import FeedbackStorage from '@/lib/feedback-storage';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting force reparse with debug...');
    
    const storage = new FeedbackStorage();
    
    // Force re-parsing with detailed logging
    const result = await storage.forceReparse();
    
    // Get debug information about what was parsed
    const students = await storage.getStudentsWithFeedback();
    
    // Get unique student names
    const uniqueStudentNames = [...new Set(students.map(s => s.student_name))].sort();
    
    return NextResponse.json({
      success: result.success,
      totalProcessed: result.totalProcessed,
      totalStudents: result.totalStudents,
      uniqueStudentNames,
      errors: result.errors,
      studentsInDB: students.length,
      sampleStudents: students.slice(0, 10),
      message: 'Force reparse completed with debug info'
    });

  } catch (error) {
    console.error('Error in force reparse:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to force reparse', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, 
      { status: 500 }
    );
  }
}