import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getInstructorPermissions } from '@/lib/instructor-permissions';
import { FeedbackParser } from '@/lib/feedback-parser';
import FeedbackStoragePostgres from '@/lib/feedback-storage-postgres';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const instructorName = session.user.name || 'Unknown';
    const permissions = getInstructorPermissions(instructorName);

    // Only allow admins to run test extraction
    if (!permissions.canAccessAllData) {
      return NextResponse.json({ 
        error: 'Insufficient permissions for test rubric extraction' 
      }, { status: 403 });
    }

    console.log('🧪 Testing rubric extraction...');

    // Find a sample secondary feedback file for testing
    const dataPath = path.join(process.cwd(), 'data', 'Overall', 'Secondary');
    const parser = new FeedbackParser(dataPath);

    let testFilePath = '';
    let testResults: any = {};

    // Look for any .docx file in Secondary folders
    if (fs.existsSync(dataPath)) {
      const items = fs.readdirSync(dataPath);
      for (const item of items) {
        const itemPath = path.join(dataPath, item);
        if (fs.statSync(itemPath).isDirectory()) {
          const subItems = fs.readdirSync(itemPath);
          for (const subItem of subItems) {
            if (subItem.endsWith('.docx')) {
              testFilePath = path.join(itemPath, subItem);
              break;
            }
          }
          if (testFilePath) break;
        }
      }
    }

    if (!testFilePath) {
      return NextResponse.json({
        error: 'No test .docx files found in Secondary folder'
      }, { status: 404 });
    }

    console.log(`📄 Testing with file: ${testFilePath}`);

    // Parse the document
    const parseResult = await parser.parseDocumentFile(testFilePath, 'secondary');
    
    if (parseResult.success && parseResult.feedbacks.length > 0) {
      const feedback = parseResult.feedbacks[0];
      testResults = {
        success: true,
        testFile: testFilePath,
        studentName: feedback.studentName,
        hasHtmlContent: !!feedback.htmlContent,
        htmlContentLength: feedback.htmlContent?.length || 0,
        rubricScores: feedback.rubricScores || {},
        rubricScoreCount: Object.keys(feedback.rubricScores || {}).length,
        contentPreview: feedback.content.substring(0, 500),
        htmlPreview: feedback.htmlContent?.substring(0, 500) || 'No HTML content'
      };

      // Store the parsed feedback to test database integration
      const storage = new FeedbackStoragePostgres();
      const storeResult = await storage.storeParsedFeedback([feedback]);
      
      testResults.storageResult = storeResult;
    } else {
      testResults = {
        success: false,
        error: 'Failed to parse test file',
        parseErrors: parseResult.errors
      };
    }

    return NextResponse.json(testResults);

  } catch (error) {
    console.error('Error in rubric extraction test:', error);
    return NextResponse.json({ 
      error: 'Failed to test rubric extraction',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/test-rubric-extraction',
    method: 'POST',
    description: 'Tests rubric score extraction from a sample secondary feedback document',
    requires: 'Admin permissions (canAccessAllData)'
  });
}