import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { GrowthAnalyticsEngine, TimeFrame } from '@/lib/analytics/growth-engine';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get params
    const params = await context.params;
    const studentId = params.id;
    
    // Get timeframe from query params
    const searchParams = req.nextUrl.searchParams;
    const timeframe = (searchParams.get('timeframe') || 'month') as TimeFrame;
    
    // Validate timeframe
    const validTimeframes: TimeFrame[] = ['week', 'month', 'term', 'year'];
    if (!validTimeframes.includes(timeframe)) {
      return NextResponse.json(
        { error: 'Invalid timeframe. Must be one of: week, month, term, year' },
        { status: 400 }
      );
    }

    // Initialize growth analytics engine
    const engine = new GrowthAnalyticsEngine();
    
    // Calculate growth data
    const growthData = await engine.calculateStudentGrowth(studentId, timeframe);
    
    return NextResponse.json(growthData);
    
  } catch (error) {
    console.error('Error calculating student growth:', error);
    
    // Return a more detailed error message for debugging
    return NextResponse.json(
      { 
        error: 'Failed to calculate student growth',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}