import { NextResponse } from 'next/server';
import FeedbackParser from '@/lib/feedback-parser';
import path from 'path';

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), 'data');
    const parser = new FeedbackParser(dataPath);
    
    console.log('Starting test parsing...');
    const result = await parser.parseAllFeedback();
    
    if (!result.success) {
      return NextResponse.json({
        error: 'Parsing failed',
        errors: result.errors
      }, { status: 500 });
    }
    
    // Get unique student names
    const uniqueStudents = new Set<string>();
    const studentDetails = new Map<string, any>();
    
    result.feedbacks.forEach(feedback => {
      uniqueStudents.add(feedback.studentName);
      
      if (!studentDetails.has(feedback.studentName)) {
        studentDetails.set(feedback.studentName, {
          name: feedback.studentName,
          feedbackTypes: new Set(),
          classCodes: new Set(),
          feedbackCount: 0,
          files: new Set()
        });
      }
      
      const student = studentDetails.get(feedback.studentName);
      student.feedbackTypes.add(feedback.feedbackType);
      student.classCodes.add(feedback.classCode);
      student.feedbackCount++;
      student.files.add(feedback.filePath);
    });
    
    // Convert to array for response
    const studentsArray = Array.from(studentDetails.values()).map(student => ({
      name: student.name,
      feedbackTypes: Array.from(student.feedbackTypes),
      classCodes: Array.from(student.classCodes),
      feedbackCount: student.feedbackCount,
      fileCount: student.files.size
    }));
    
    // Sort by name
    studentsArray.sort((a, b) => a.name.localeCompare(b.name));
    
    return NextResponse.json({
      success: true,
      totalFeedbacks: result.feedbacks.length,
      totalUniqueStudents: uniqueStudents.size,
      students: studentsArray,
      sampleFeedbacks: result.feedbacks.slice(0, 5),
      errors: result.errors
    });
    
  } catch (error) {
    console.error('Error in test parsing:', error);
    return NextResponse.json(
      { error: 'Failed to test parsing', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}