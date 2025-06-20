import { NextResponse } from 'next/server';
import FeedbackParser from '@/lib/feedback-parser';
import FeedbackStorage from '@/lib/feedback-storage';
import path from 'path';

export async function GET() {
  try {
    const dataPath = path.join(process.cwd(), 'data');
    const parser = new FeedbackParser(dataPath);
    const storage = new FeedbackStorage();
    
    console.log('Comparing files vs database...');
    
    // Parse files to see what we should have
    const fileResult = await parser.parseAllFeedback();
    const fileStudents = [...new Set(fileResult.feedbacks.map(f => f.studentName))].sort();
    
    // Get what's actually in the database
    const dbStudents = await storage.getStudentsWithFeedback();
    const dbStudentNames = [...new Set(dbStudents.map(s => s.student_name))].sort();
    
    // Find missing students
    const missingFromDB = fileStudents.filter(name => !dbStudentNames.includes(name));
    const extraInDB = dbStudentNames.filter(name => !fileStudents.includes(name));
    
    // Get detailed feedback counts
    const fileStudentCounts = new Map<string, number>();
    fileResult.feedbacks.forEach(feedback => {
      const count = fileStudentCounts.get(feedback.studentName) || 0;
      fileStudentCounts.set(feedback.studentName, count + 1);
    });
    
    const dbStudentCounts = new Map<string, number>();
    dbStudents.forEach(student => {
      dbStudentCounts.set(student.student_name, student.total_feedback_sessions);
    });
    
    // Find students with different feedback counts
    const countMismatches = [];
    for (const [studentName, fileCount] of fileStudentCounts.entries()) {
      const dbCount = dbStudentCounts.get(studentName) || 0;
      if (fileCount !== dbCount) {
        countMismatches.push({
          studentName,
          fileCount,
          dbCount,
          difference: fileCount - dbCount
        });
      }
    }
    
    return NextResponse.json({
      summary: {
        studentsInFiles: fileStudents.length,
        studentsInDB: dbStudentNames.length,
        missingFromDB: missingFromDB.length,
        extraInDB: extraInDB.length,
        countMismatches: countMismatches.length,
        totalFeedbacksInFiles: fileResult.feedbacks.length,
        totalFeedbacksInDB: dbStudents.reduce((sum, s) => sum + s.total_feedback_sessions, 0)
      },
      studentsInFiles: fileStudents,
      studentsInDB: dbStudentNames,
      missingFromDB,
      extraInDB,
      countMismatches,
      sampleFileStudents: fileStudents.slice(0, 20),
      sampleDBStudents: dbStudentNames.slice(0, 20),
      errors: fileResult.errors
    });
    
  } catch (error) {
    console.error('Error comparing files vs DB:', error);
    return NextResponse.json(
      { error: 'Failed to compare files vs database', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}