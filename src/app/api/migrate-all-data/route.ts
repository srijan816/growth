import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getInstructorPermissions } from '@/lib/instructor-permissions';
import { FeedbackParser } from '@/lib/feedback-parser';
import FeedbackStoragePostgres from '@/lib/feedback-storage-postgres';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const instructorName = session.user.name || 'Unknown';
    const permissions = getInstructorPermissions(instructorName);

    // Only allow admins to run full migration
    if (!permissions.canAccessAllData) {
      return NextResponse.json({ 
        error: 'Insufficient permissions for full data migration' 
      }, { status: 403 });
    }

    console.log('🚀 Starting complete data migration...');
    const startTime = Date.now();

    const dataPath = path.join(process.cwd(), 'data', 'Overall');
    const parser = new FeedbackParser(dataPath);
    const storage = new FeedbackStoragePostgres();

    // Parse all feedback from all instructors
    console.log('📖 Parsing all feedback data...');
    const parseResult = await parser.parseAllFeedback();
    
    if (!parseResult.success) {
      return NextResponse.json({
        success: false,
        error: 'Failed to parse feedback data',
        errors: parseResult.errors
      }, { status: 500 });
    }

    console.log(`📊 Parsed ${parseResult.feedbacks.length} feedback records`);

    // Store all parsed data
    console.log('💾 Storing parsed data in database...');
    const storeResult = await storage.storeParsedFeedback(parseResult.feedbacks);

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Get instructor statistics
    const instructorStats = await storage.getInstructorStats();

    console.log(`✅ Migration completed in ${duration}ms`);

    return NextResponse.json({
      success: true,
      summary: {
        totalParsed: parseResult.feedbacks.length,
        totalStored: storeResult.totalStored,
        uniqueStudents: storeResult.uniqueStudents,
        instructorBreakdown: instructorStats,
        duration: duration,
        parseErrors: parseResult.errors,
        storeErrors: storeResult.errors
      }
    });

  } catch (error) {
    console.error('Error in complete data migration:', error);
    return NextResponse.json({ 
      error: 'Failed to complete data migration',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/migrate-all-data',
    method: 'POST',
    description: 'Migrates all feedback data from Overall folder to database',
    requires: 'Admin permissions (canAccessAllData)',
    warning: 'This will reparse and store all feedback data'
  });
}