import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { transcriptStorage } from '@/lib/transcript-storage';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const recordingId = searchParams.get('recordingId');
    const studentId = searchParams.get('studentId');
    const search = searchParams.get('search');
    const format = searchParams.get('format') as 'txt' | 'md' | 'json' | undefined;

    // Get transcript for specific recording
    if (recordingId) {
      // Export in specific format if requested
      if (format) {
        const exportResult = await transcriptStorage.exportTranscript(recordingId, format);
        if (exportResult.error) {
          return NextResponse.json({ error: exportResult.error }, { status: 400 });
        }
        
        // Return file download response
        return new NextResponse(exportResult.content, {
          status: 200,
          headers: {
            'Content-Type': format === 'json' ? 'application/json' : 'text/plain',
            'Content-Disposition': `attachment; filename="${exportResult.filename}"`,
          }
        });
      }
      
      // Return transcript data
      const transcript = await transcriptStorage.getTranscript(recordingId);
      if (transcript.error) {
        return NextResponse.json({ error: transcript.error }, { status: 404 });
      }
      
      return NextResponse.json(transcript);
    }

    // Get all transcripts for a student
    if (studentId) {
      const transcripts = await transcriptStorage.getStudentTranscripts(studentId);
      return NextResponse.json({ transcripts });
    }

    // Search transcripts
    if (search) {
      const results = await transcriptStorage.searchTranscripts(search, {
        studentId: searchParams.get('filterStudentId') || undefined,
        speechType: searchParams.get('speechType') || undefined,
      });
      return NextResponse.json({ results });
    }

    return NextResponse.json({ error: 'Please provide recordingId, studentId, or search parameter' }, { status: 400 });
  } catch (error) {
    console.error('Error handling transcript request:', error);
    return NextResponse.json(
      { error: 'Failed to process transcript request' },
      { status: 500 }
    );
  }
}