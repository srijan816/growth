import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { queueManager } from '@/lib/queue/queue-manager';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const stats = await queueManager.getQueueStats();
    
    return NextResponse.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Queue stats error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch queue statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, queueName, jobData } = await request.json();

    switch (action) {
      case 'pause':
        await queueManager.pauseQueue(queueName);
        return NextResponse.json({ 
          success: true, 
          message: `Queue ${queueName} paused` 
        });

      case 'resume':
        await queueManager.resumeQueue(queueName);
        return NextResponse.json({ 
          success: true, 
          message: `Queue ${queueName} resumed` 
        });

      case 'clean':
        await queueManager.cleanQueue(queueName, 24 * 60 * 60 * 1000); // 24 hours
        return NextResponse.json({ 
          success: true, 
          message: `Queue ${queueName} cleaned` 
        });

      case 'retry':
        const retryCount = await queueManager.retryFailedJobs(queueName);
        return NextResponse.json({ 
          success: true, 
          message: `Retried ${retryCount} failed jobs in ${queueName}`,
          retryCount 
        });

      case 'add_job':
        if (!jobData) {
          return NextResponse.json({ 
            error: 'Job data required for add_job action' 
          }, { status: 400 });
        }

        let job;
        switch (queueName) {
          case 'feedback':
            job = await queueManager.addFeedbackJob(jobData);
            break;
          case 'transcription':
            job = await queueManager.addTranscriptionJob(jobData);
            break;
          case 'analytics':
            job = await queueManager.addAnalyticsJob(jobData);
            break;
          case 'notification':
            job = await queueManager.addNotificationJob(jobData);
            break;
          default:
            return NextResponse.json({ 
              error: `Unknown queue: ${queueName}` 
            }, { status: 400 });
        }

        return NextResponse.json({ 
          success: true, 
          message: `Job added to ${queueName}`,
          jobId: job.id 
        });

      default:
        return NextResponse.json({ 
          error: `Unknown action: ${action}` 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Queue management error:', error);
    return NextResponse.json({ 
      error: 'Failed to perform queue operation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}