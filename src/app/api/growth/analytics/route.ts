import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // For now, return empty analytics data since we don't have analytics tables set up yet
    // The real student feedback data is accessible through other endpoints
    
    const analyticsData = {
      unitPerformance: [],
      skillAnalytics: [],
      trendSummary: {
        improving: 0,
        stable: 0,
        declining: 0
      },
      commonThemes: []
    };

    return NextResponse.json(analyticsData);

  } catch (error) {
    console.error('Error fetching growth analytics:', error);
    
    // Return safe mock data if database tables don't exist yet
    return NextResponse.json({
      unitPerformance: [],
      skillAnalytics: [],
      trendSummary: {
        improving: 0,
        stable: 0,
        declining: 0
      },
      commonThemes: [],
      courseSpecificData: null
    }, { status: 200 }); // Return 200 instead of 500 for missing tables
  }
}