import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import FeedbackStoragePostgres from '@/lib/feedback-storage-postgres';
import FeedbackParser from '@/lib/feedback-parser';
import { getInstructorPermissions } from '@/lib/instructor-permissions';
import { executeQuery } from '@/lib/postgres';
import fs from 'fs';
import path from 'path';

// GET /api/feedback - List all feedback for the instructor
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const instructorName = session.user.name || 'Unknown';
    const permissions = getInstructorPermissions(instructorName);
    
    const storage = new FeedbackStoragePostgres();
    
    // Get feedback based on permissions
    let query = 'SELECT * FROM parsed_student_feedback WHERE 1=1';
    const params: any[] = [];
    
    if (!permissions.canAccessAllData) {
      query += ' AND instructor = ANY($1::text[])';
      params.push(permissions.allowedInstructors);
    }
    
    query += ' ORDER BY parsed_at DESC LIMIT 100';
    
    const result = await executeQuery(query, params);
    
    return NextResponse.json({
      feedbacks: result.rows,
      instructor: instructorName,
      permissions: permissions.allowedInstructors
    });
    
  } catch (error) {
    console.error('Error fetching feedback:', error);
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 });
  }
}

// POST /api/feedback - Parse and store feedback for the instructor
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const instructorName = session.user.name || 'Unknown';
    const permissions = getInstructorPermissions(instructorName);
    
    console.log(`Parsing feedback for instructor: ${instructorName}`);
    console.log(`Allowed instructors: ${permissions.allowedInstructors.join(', ')}`);

    // Parse only this instructor's folders
    const parser = new FeedbackParser();
    const allFeedbacks = [];
    const errors = [];

    const dataPath = '/Users/tikaram/Downloads/Claude Code/student-growth/growth-compass/data/Overall';

    for (const allowedInstructor of permissions.allowedInstructors) {
      if (allowedInstructor === '*') {
        // Test instructor - parse everything
        const result = await parser.parseAllFeedback();
        allFeedbacks.push(...result.feedbacks);
        errors.push(...result.errors);
        break;
      }

      // Parse Primary folder for this instructor
      const primaryPath = path.join(dataPath, 'Primary', allowedInstructor);
      if (fs.existsSync(primaryPath)) {
        console.log(`Parsing primary feedback from ${primaryPath}`);
        const primaryResults = await parser.parseDirectoryRecursive(primaryPath, 'primary');
        allFeedbacks.push(...primaryResults.feedbacks);
        errors.push(...primaryResults.errors);
      }

      // Parse Secondary folder for this instructor
      const secondaryPath = path.join(dataPath, 'Secondary', allowedInstructor);
      if (fs.existsSync(secondaryPath)) {
        console.log(`Parsing secondary feedback from ${secondaryPath}`);
        const secondaryResults = await parser.parseDirectoryRecursive(secondaryPath, 'secondary');
        allFeedbacks.push(...secondaryResults.feedbacks);
        errors.push(...secondaryResults.errors);
      }
    }

    if (allFeedbacks.length === 0) {
      return NextResponse.json({ 
        error: 'No feedback data found for this instructor',
        instructor: instructorName,
        checkedPaths: permissions.allowedInstructors.map(i => ({
          primary: path.join(dataPath, 'Primary', i),
          secondary: path.join(dataPath, 'Secondary', i)
        }))
      }, { status: 404 });
    }

    // Clear existing data based on permissions
    if (permissions.canAccessAllData) {
      // Test instructor - clear all data
      console.log('Test instructor detected - clearing all feedback data');
      await executeQuery('DELETE FROM parsed_student_feedback');
    } else {
      // Regular instructor - clear only their students' data
      console.log(`Clearing data for instructors: ${permissions.allowedInstructors.join(', ')}`);
      await executeQuery(
        'DELETE FROM parsed_student_feedback WHERE instructor = ANY($1::text[])',
        [permissions.allowedInstructors]
      );
    }

    // Store parsed data
    const storage = new FeedbackStoragePostgres();
    const storeResult = await storage.storeParsedFeedback(allFeedbacks);

    // Get updated statistics
    const instructorStats = await executeQuery(`
      SELECT instructor, COUNT(*) as count, COUNT(DISTINCT student_name) as unique_students
      FROM parsed_student_feedback
      WHERE instructor = ANY($1::text[])
      GROUP BY instructor
      ORDER BY count DESC
    `, [permissions.allowedInstructors]);

    return NextResponse.json({
      success: true,
      summary: {
        instructor: instructorName,
        allowedInstructors: permissions.allowedInstructors,
        totalRecordsParsed: allFeedbacks.length,
        totalRecordsStored: storeResult.totalStored,
        totalStudents: storeResult.uniqueStudents,
        instructorStats: instructorStats.rows,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('Error parsing feedback:', error);
    return NextResponse.json({ 
      error: 'Failed to parse feedback data',
      details: error.message 
    }, { status: 500 });
  }
}