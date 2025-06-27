import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { queues, addJob } from '@/lib/queue/queue-manager';
import { ExcelImportJobData } from '@/lib/queue/queue-manager';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'instructor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const importType = formData.get('importType') as string || 'students';
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Save file temporarily
    const uploadDir = path.join(process.cwd(), 'tmp', 'uploads');
    await mkdir(uploadDir, { recursive: true });
    
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = path.join(uploadDir, fileName);
    
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    // Add job to queue
    const job = await addJob<ExcelImportJobData>(
      queues.excelImport,
      {
        filePath,
        userId: session.user.id,
        importType: importType as 'students' | 'courses' | 'schedules',
      },
      {
        priority: 0,
      }
    );

    return NextResponse.json({
      success: true,
      jobId: job.id,
      queue: 'excel-import',
      message: 'Excel import job queued successfully. You can check the status using the job ID.',
    });

  } catch (error) {
    console.error('Failed to queue Excel import:', error);
    return NextResponse.json(
      { 
        error: 'Failed to queue import job',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}