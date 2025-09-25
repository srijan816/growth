import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { debateGrowthEngine, TimeFrame } from '@/lib/analytics/debate-growth-engine';
// Keep old engine as fallback
import { GrowthAnalyticsEngine } from '@/lib/analytics/growth-engine';

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
    const useDebateEngine = searchParams.get('engine') !== 'legacy'; // Default to new engine
    
    // Validate timeframe
    const validTimeframes: TimeFrame[] = ['week', 'month', 'term', 'year'];
    if (!validTimeframes.includes(timeframe)) {
      return NextResponse.json(
        { error: 'Invalid timeframe. Must be one of: week, month, term, year' },
        { status: 400 }
      );
    }

    // Use debate-focused engine for more accurate growth analytics
    let growthData;
    
    if (useDebateEngine) {
      // New debate-specific growth engine with Content-Style-Strategy model
      growthData = await debateGrowthEngine.calculateStudentGrowth(studentId, timeframe);
    } else {
      // Legacy engine (fallback)
      const engine = new GrowthAnalyticsEngine();
      growthData = await engine.calculateStudentGrowth(studentId, timeframe);
    }
    
    return NextResponse.json(growthData);
    
  } catch (error) {
    console.error('Error calculating student growth:', error);
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack');
    
    // Return a more detailed error message for debugging
    return NextResponse.json(
      { 
        error: 'Failed to calculate student growth',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}