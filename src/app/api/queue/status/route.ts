import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { queues } from '@/lib/queue/queue-manager';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'instructor') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const queueStats = await Promise.all(
      Object.entries(queues).map(async ([name, queue]) => {
        const [
          waiting,
          active,
          completed,
          failed,
          delayed,
          paused,
        ] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
          queue.getCompletedCount(),
          queue.getFailedCount(),
          queue.getDelayedCount(),
          queue.getPausedCount(),
        ]);

        return {
          name,
          stats: {
            waiting,
            active,
            completed,
            failed,
            delayed,
            paused,
            total: waiting + active + completed + failed + delayed + paused,
          },
        };
      })
    );

    return NextResponse.json({
      queues: queueStats,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Failed to get queue status:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve queue status' },
      { status: 500 }
    );
  }
}