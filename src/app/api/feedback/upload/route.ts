import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { FeedbackParser } from '@/lib/feedback-parser';
import FeedbackStoragePostgres from '@/lib/feedback-storage-postgres';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const instructorName = session.user.name || 'Unknown';

    // Only allow file uploads for instructors with appropriate permissions
    if (!permissions.canAccessAllData) {
      return NextResponse.json({ 
        error: 'Insufficient permissions for file upload' 
      }, { status: 403 });
    }

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const targetInstructor = formData.get('instructor') as string || instructorName;
    const feedbackType = formData.get('feedbackType') as 'primary' | 'secondary' || 'secondary';

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    console.log(`Processing ${files.length} files for instructor: ${targetInstructor}`);

    // Validate file types
    const validFiles = files.filter(file => 
      file.name.endsWith('.docx') || file.name.endsWith('.doc')
    );

    if (validFiles.length === 0) {
      return NextResponse.json({ 
        error: 'No valid document files found. Only .docx and .doc files are supported.' 
      }, { status: 400 });
    }

    // Create upload directory structure
    const uploadDir = path.join(
      process.cwd(), 
      'data', 
      'uploads', 
      feedbackType === 'primary' ? 'Primary' : 'Secondary',
      targetInstructor,
      new Date().toISOString().split('T')[0] // YYYY-MM-DD folder
    );

    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Save uploaded files
    const savedFiles: string[] = [];
    const errors: string[] = [];

    for (const file of validFiles) {
      try {
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        
        // Sanitize filename
        const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = path.join(uploadDir, sanitizedName);
        
        await writeFile(filePath, buffer);
        savedFiles.push(filePath);
        console.log(`Saved: ${sanitizedName}`);
      } catch (error) {
        const errorMsg = `Failed to save ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Parse uploaded files immediately
    console.log('Starting immediate parsing of uploaded files...');
    const parser = new FeedbackParser();
    const parseResults = [];

    for (const filePath of savedFiles) {
      try {
        const fileResult = await parser.parseDocumentFile(filePath, feedbackType);
        parseResults.push(...fileResult.feedbacks);
        console.log(`Parsed ${fileResult.feedbacks.length} feedback entries from ${path.basename(filePath)}`);
      } catch (error) {
        const errorMsg = `Failed to parse ${path.basename(filePath)}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    // Store parsed data in database
    if (parseResults.length > 0) {
      const storage = new FeedbackStoragePostgres();
      const storeResult = await storage.storeParsedFeedback(parseResults);
      
      return NextResponse.json({
        success: true,
        summary: {
          filesUploaded: savedFiles.length,
          feedbackRecordsParsed: parseResults.length,
          recordsStored: storeResult.totalStored,
          uniqueStudents: storeResult.uniqueStudents,
          instructor: targetInstructor,
          feedbackType,
          uploadPath: uploadDir,
          errors: [...errors, ...storeResult.errors]
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'No feedback data could be parsed from uploaded files',
        summary: {
          filesUploaded: savedFiles.length,
          feedbackRecordsParsed: 0,
          errors
        }
      }, { status: 422 });
    }

  } catch (error) {
    console.error('Error processing file upload:', error);
    return NextResponse.json({ 
      error: 'Failed to process file upload',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET endpoint to show upload form
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/feedback/upload',
    method: 'POST',
    contentType: 'multipart/form-data',
    fields: {
      files: 'File[] - Array of .docx or .doc files',
      instructor: 'string (optional) - Target instructor name',
      feedbackType: 'primary | secondary (optional) - Type of feedback'
    },
    description: 'Upload and automatically parse feedback documents'
  });
}