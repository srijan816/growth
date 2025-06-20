import { NextRequest, NextResponse } from 'next/server';
import FeedbackStorage from '@/lib/feedback-storage';
import FeedbackParser from '@/lib/feedback-parser';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const storage = new FeedbackStorage();
    
    // Get list of expected students
    const expectedStudents = [
      'Melody', 'Selena', 'Selina', 'Selina Ke', 'Kaye',
      'Henry', 'Marcus', 'Annette', 'Ashley', 'Ethan'
    ];
    
    // Get all students from database
    const allStudents = await storage.getStudentsWithFeedback();
    const foundStudentNames = allStudents.map(s => s.student_name);
    
    // Check which expected students are missing
    const missingStudents = expectedStudents.filter(student => 
      !foundStudentNames.some(found => 
        found.toLowerCase() === student.toLowerCase() ||
        found.toLowerCase().includes(student.toLowerCase())
      )
    );
    
    // Check for potential name collisions (same name in both primary and secondary)
    const nameCollisions: any[] = [];
    const studentsByName = new Map<string, any[]>();
    
    allStudents.forEach(student => {
      const key = student.student_name.toLowerCase();
      if (!studentsByName.has(key)) {
        studentsByName.set(key, []);
      }
      studentsByName.get(key)!.push(student);
    });
    
    // Find students that appear in both primary and secondary
    studentsByName.forEach((students, name) => {
      const feedbackTypes = new Set(students.flatMap(s => s.feedback_types.split(', ')));
      if (feedbackTypes.has('primary') && feedbackTypes.has('secondary')) {
        nameCollisions.push({
          name: students[0].student_name,
          occurrences: students,
          feedbackTypes: Array.from(feedbackTypes)
        });
      }
    });
    
    // Try to find missing students in raw files
    const dataPath = path.join(process.cwd(), 'data');
    const parser = new FeedbackParser(dataPath);
    const missingInFiles: any[] = [];
    
    for (const studentName of missingStudents) {
      const feedbacks = await parser.getStudentFeedback(studentName);
      if (feedbacks.length > 0) {
        missingInFiles.push({
          studentName,
          foundInFiles: feedbacks.length,
          feedbackTypes: [...new Set(feedbacks.map(f => f.feedbackType))],
          classes: [...new Set(feedbacks.map(f => f.classCode))]
        });
      }
    }
    
    // Get detailed student data for debugging
    const detailedData: any[] = [];
    for (const student of ['Melody', 'Selena', 'Selina', 'Henry']) {
      const dbFeedback = await storage.getStudentFeedback(student);
      const fileFeedback = await parser.getStudentFeedback(student);
      
      detailedData.push({
        studentName: student,
        inDatabase: {
          count: dbFeedback.length,
          feedbackTypes: [...new Set(dbFeedback.map(f => f.feedback_type))],
          classes: [...new Set(dbFeedback.map(f => f.class_code))]
        },
        inFiles: {
          count: fileFeedback.length,
          feedbackTypes: [...new Set(fileFeedback.map(f => f.feedbackType))],
          classes: [...new Set(fileFeedback.map(f => f.classCode))]
        }
      });
    }
    
    return NextResponse.json({
      totalStudentsInDB: allStudents.length,
      expectedStudents: expectedStudents.length,
      missingStudents,
      missingButFoundInFiles: missingInFiles,
      nameCollisions,
      detailedData,
      suggestions: {
        message: 'Some students might be missing due to name variations or parsing issues',
        actions: [
          'Check if names have variations (e.g., Selena vs Selina)',
          'Verify file naming conventions match expected patterns',
          'Re-run parsing with improved name normalization'
        ]
      }
    });
    
  } catch (error) {
    console.error('Error validating students:', error);
    return NextResponse.json(
      { error: 'Failed to validate students', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}