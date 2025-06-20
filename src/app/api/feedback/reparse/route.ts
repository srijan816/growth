import { NextRequest, NextResponse } from 'next/server';
import FeedbackStorage from '@/lib/feedback-storage';
import { getInstructorPermissions } from '@/lib/instructor-permissions';

export async function POST(request: NextRequest) {
  try {
    console.log('Re-parsing feedback data...');
    
    // Get instructor permissions
    const permissions = await getInstructorPermissions();
    console.log(`Re-parsing for ${permissions.instructorName} (canAccessAllData: ${permissions.canAccessAllData})`);
    
    const storage = new FeedbackStorage();
    
    // Force re-parse all feedback with permissions
    const result = await storage.forceReparseWithPermissions(permissions);
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: 'Feedback re-parsed successfully',
        totalProcessed: result.totalProcessed,
        totalStudents: result.totalStudents,
        instructorType: permissions.canAccessAllData ? 'all_access' : 'restricted',
        allowedInstructors: permissions.allowedInstructors,
        errors: result.errors
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Re-parsing failed',
        details: result.errors
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error re-parsing feedback:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to re-parse feedback',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}