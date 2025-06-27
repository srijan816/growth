import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getInstructorPermissions } from '@/lib/instructor-permissions';
import FeedbackStoragePostgres from '@/lib/feedback-storage-postgres';
import { FeedbackParser } from '@/lib/feedback-parser';
import { executeQuery } from '@/lib/postgres';
import path from 'path';

export async function POST(request: NextRequest) {
  console.log('🔄 Reparse all feedback endpoint called');
  
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Must be logged in' },
        { status: 401 }
      );
    }

    // Check admin permissions
    const permissions = getInstructorPermissions(session.user.name || '');
    if (!permissions.canAccessAllData) {
      return NextResponse.json(
        { error: 'Unauthorized: Only admin users (Srijan or Test Instructor) can reparse feedback' },
        { status: 403 }
      );
    }

    console.log(`✅ Admin user ${session.user.name} authorized for reparsing`);

    // Initialize parser
    const dataPath = path.join(process.cwd(), 'data', 'Overall');
    const parser = new FeedbackParser(dataPath);
    console.log('📁 Data path:', dataPath);

    // Clear existing data
    console.log('🗑️ Clearing existing parsed feedback data...');
    await executeQuery('DELETE FROM parsed_student_feedback');
    await executeQuery('DELETE FROM feedback_parsing_status');
    console.log('✅ Existing data cleared');

    // Parse all feedback
    console.log('📄 Starting feedback parsing...');
    const startTime = Date.now();
    const result = await parser.parseAllFeedback();
    
    if (!result.success) {
      return NextResponse.json(
        { 
          error: 'Failed to parse feedback', 
          details: result.errors 
        },
        { status: 500 }
      );
    }

    console.log(`✅ Parsed ${result.feedbacks.length} feedback records`);

    // Store feedback in database
    console.log('💾 Storing feedback in database...');
    const storage = new FeedbackStoragePostgres();
    const storageResult = await storage.storeParsedFeedback(result.feedbacks);

    // Get rubric score statistics
    console.log('📊 Calculating rubric score statistics...');
    const rubricStats = await executeQuery(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(rubric_scores) as records_with_rubric,
        COUNT(DISTINCT student_name) as unique_students,
        COUNT(DISTINCT CASE WHEN rubric_scores IS NOT NULL THEN student_name END) as students_with_rubric
      FROM parsed_student_feedback
    `);

    // Get breakdown by feedback type
    const typeBreakdown = await executeQuery(`
      SELECT 
        feedback_type,
        COUNT(*) as total,
        COUNT(rubric_scores) as with_rubric
      FROM parsed_student_feedback
      GROUP BY feedback_type
    `);

    // Get instructor breakdown
    const instructorBreakdown = await executeQuery(`
      SELECT 
        instructor,
        COUNT(*) as total,
        COUNT(rubric_scores) as with_rubric
      FROM parsed_student_feedback
      GROUP BY instructor
      ORDER BY total DESC
    `);

    // Get sample rubric scores to verify extraction
    const sampleScores = await executeQuery(`
      SELECT 
        student_name,
        feedback_type,
        unit_number,
        lesson_number,
        rubric_scores
      FROM parsed_student_feedback
      WHERE rubric_scores IS NOT NULL
      LIMIT 5
    `);

    const endTime = Date.now();
    const processingTime = ((endTime - startTime) / 1000).toFixed(2);

    const response = {
      success: true,
      summary: {
        totalRecords: result.feedbacks.length,
        storedRecords: storageResult.totalStored,
        uniqueStudents: storageResult.uniqueStudents,
        processingTimeSeconds: processingTime,
        errors: [...result.errors, ...storageResult.errors]
      },
      rubricScoreStats: {
        totalRecords: parseInt(rubricStats.rows[0].total_records),
        recordsWithRubric: parseInt(rubricStats.rows[0].records_with_rubric),
        percentageWithRubric: ((parseInt(rubricStats.rows[0].records_with_rubric) / parseInt(rubricStats.rows[0].total_records)) * 100).toFixed(2) + '%',
        uniqueStudents: parseInt(rubricStats.rows[0].unique_students),
        studentsWithRubric: parseInt(rubricStats.rows[0].students_with_rubric)
      },
      breakdowns: {
        byType: typeBreakdown.rows.map(row => ({
          feedbackType: row.feedback_type,
          total: parseInt(row.total),
          withRubric: parseInt(row.with_rubric),
          percentage: ((parseInt(row.with_rubric) / parseInt(row.total)) * 100).toFixed(2) + '%'
        })),
        byInstructor: instructorBreakdown.rows.map(row => ({
          instructor: row.instructor,
          total: parseInt(row.total),
          withRubric: parseInt(row.with_rubric),
          percentage: ((parseInt(row.with_rubric) / parseInt(row.total)) * 100).toFixed(2) + '%'
        }))
      },
      sampleRubricScores: sampleScores.rows.map(row => ({
        studentName: row.student_name,
        feedbackType: row.feedback_type,
        unit: `${row.unit_number}.${row.lesson_number || ''}`,
        scores: row.rubric_scores
      }))
    };

    console.log('🎉 Reparsing completed successfully!');
    console.log(`📊 Rubric extraction: ${response.rubricScoreStats.recordsWithRubric}/${response.rubricScoreStats.totalRecords} records have rubric scores`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error in reparse-all-feedback:', error);
    return NextResponse.json(
      { 
        error: 'Failed to reparse feedback', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// GET method to check current rubric score statistics
export async function GET(request: NextRequest) {
  console.log('📊 Checking current rubric score statistics');
  
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Must be logged in' },
        { status: 401 }
      );
    }

    // Get current statistics
    const stats = await executeQuery(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(rubric_scores) as records_with_rubric,
        COUNT(DISTINCT student_name) as unique_students,
        COUNT(DISTINCT CASE WHEN rubric_scores IS NOT NULL THEN student_name END) as students_with_rubric,
        MAX(parsed_at) as last_parsed
      FROM parsed_student_feedback
    `);

    const typeBreakdown = await executeQuery(`
      SELECT 
        feedback_type,
        COUNT(*) as total,
        COUNT(rubric_scores) as with_rubric
      FROM parsed_student_feedback
      GROUP BY feedback_type
    `);

    const response = {
      currentStats: {
        totalRecords: parseInt(stats.rows[0]?.total_records || 0),
        recordsWithRubric: parseInt(stats.rows[0]?.records_with_rubric || 0),
        percentageWithRubric: stats.rows[0]?.total_records > 0 
          ? ((parseInt(stats.rows[0].records_with_rubric) / parseInt(stats.rows[0].total_records)) * 100).toFixed(2) + '%'
          : '0%',
        uniqueStudents: parseInt(stats.rows[0]?.unique_students || 0),
        studentsWithRubric: parseInt(stats.rows[0]?.students_with_rubric || 0),
        lastParsed: stats.rows[0]?.last_parsed || null
      },
      byType: typeBreakdown.rows.map(row => ({
        feedbackType: row.feedback_type,
        total: parseInt(row.total),
        withRubric: parseInt(row.with_rubric),
        percentage: ((parseInt(row.with_rubric) / parseInt(row.total)) * 100).toFixed(2) + '%'
      }))
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Error getting rubric statistics:', error);
    return NextResponse.json(
      { 
        error: 'Failed to get rubric statistics', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}