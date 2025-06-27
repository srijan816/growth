import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { queues, addJob, getJobStatus } from '@/lib/queue/queue-manager';
import { AIAnalysisJobData } from '@/lib/queue/queue-manager';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { studentId, feedbackIds, analysisType } = body;

    if (!studentId || !feedbackIds || !analysisType) {
      return NextResponse.json(
        { error: 'Missing required fields: studentId, feedbackIds, analysisType' },
        { status: 400 }
      );
    }

    // Add job to queue
    const job = await addJob<AIAnalysisJobData>(
      queues.aiAnalysis,
      {
        studentId,
        feedbackIds,
        analysisType,
      },
      {
        priority: analysisType === 'recommendations' ? 1 : 0, // Higher priority for recommendations
      }
    );

    return NextResponse.json({
      success: true,
      jobId: job.id,
      queue: 'ai-analysis',
      message: 'Analysis job queued successfully',
    });

  } catch (error) {
    console.error('Failed to queue AI analysis:', error);
    return NextResponse.json(
      { error: 'Failed to queue analysis job' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    const queue = searchParams.get('queue') || 'ai-analysis';

    if (!jobId) {
      return NextResponse.json(
        { error: 'Missing jobId parameter' },
        { status: 400 }
      );
    }

    const status = await getJobStatus(queue, jobId);

    if (!status) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(status);

  } catch (error) {
    console.error('Failed to get job status:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve job status' },
      { status: 500 }
    );
  }
}