import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import fs from 'fs/promises';
import path from 'path';

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { filename } = params;
    
    // Sanitize filename to prevent path traversal
    const sanitizedFilename = path.basename(filename);
    const audioPath = path.join(process.cwd(), 'data', 'recordings', 'audio', sanitizedFilename);
    
    // Check if file exists
    try {
      await fs.access(audioPath);
    } catch {
      return NextResponse.json({ error: 'Audio file not found' }, { status: 404 });
    }
    
    // Read the file
    const audioBuffer = await fs.readFile(audioPath);
    
    // Determine content type based on file extension
    const ext = path.extname(sanitizedFilename).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.webm': 'audio/webm',
      '.ogg': 'audio/ogg',
      '.m4a': 'audio/mp4'
    };
    
    const contentType = contentTypes[ext] || 'audio/mpeg';
    
    // Return the audio file with proper headers
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': audioBuffer.length.toString(),
        'Content-Disposition': `inline; filename="${sanitizedFilename}"`,
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('Error serving audio file:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve audio file' },
      { status: 500 }
    );
  }
}