import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GrowthAnalyticsEngine, TimeFrame } from '@/lib/analytics/growth-engine';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ studentId: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const params = await context.params;
    const studentId = params.studentId;
    const searchParams = request.nextUrl.searchParams;
    const timeframe = (searchParams.get('timeframe') || 'month') as TimeFrame;

    // Validate timeframe
    if (!['week', 'month', 'term', 'year'].includes(timeframe)) {
      return NextResponse.json(
        { error: 'Invalid timeframe. Must be one of: week, month, term, year' },
        { status: 400 }
      );
    }

    // Initialize growth analytics engine
    const growthEngine = new GrowthAnalyticsEngine();

    // Calculate student growth data
    const growthData = await growthEngine.calculateStudentGrowth(studentId, timeframe);

    return NextResponse.json(growthData);
  } catch (error) {
    console.error('Error calculating student growth:', error);
    
    // Return more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('not found')) {
        return NextResponse.json(
          { error: 'Student not found' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to calculate student growth data' },
      { status: 500 }
    );
  }
}