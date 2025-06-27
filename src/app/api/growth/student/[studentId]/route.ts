import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/postgres';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const { studentId } = await params;

    // Get student progress overview
    const { data: overview, error: overviewError } = await supabase
      .from('student_progress_overview')
      .select('*')
      .eq('student_id', studentId)
      .single();

    if (overviewError) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Get growth indicators
    const { data: growthData, error: growthError } = await supabase
      .from('growth_indicators')
      .select('*')
      .eq('student_id', studentId);

    if (growthError) {
      return NextResponse.json({ error: 'Failed to fetch growth data' }, { status: 500 });
    }

    // Get skill progression timeline
    const { data: skillProgression, error: skillError } = await supabase
      .from('skill_progression_timeline')
      .select('*')
      .eq('student_id', studentId)
      .order('skill_category');

    if (skillError) {
      return NextResponse.json({ error: 'Failed to fetch skill progression' }, { status: 500 });
    }

    // Get recent feedback records
    const { data: recentFeedback, error: feedbackError } = await supabase
      .from('student_feedback_records')
      .select(`
        id,
        feedback_date,
        best_aspects,
        improvement_areas,
        speech_duration,
        feedback_sessions!inner (
          unit_number,
          topic,
          class_sessions!inner (
            course_id,
            courses!inner (
              code,
              name
            )
          )
        )
      `)
      .eq('student_id', studentId)
      .order('feedback_date', { ascending: false })
      .limit(10000);

    if (feedbackError) {
      return NextResponse.json({ error: 'Failed to fetch recent feedback' }, { status: 500 });
    }

    // Organize growth trends
    const growthTrends = {
      improving: growthData?.filter(g => g.trend_direction === 'improving').map(g => g.skill_category) || [],
      stable: growthData?.filter(g => g.trend_direction === 'stable').map(g => g.skill_category) || [],
      declining: growthData?.filter(g => g.trend_direction === 'declining').map(g => g.skill_category) || []
    };

    const focusAreas = growthData?.filter(g => g.is_growth_area).map(g => g.skill_category) || [];
    const strengths = growthData?.filter(g => g.is_strength).map(g => g.skill_category) || [];

    return NextResponse.json({
      student: overview,
      growthTrends,
      focusAreas,
      strengths,
      skillProgression,
      recentFeedback,
      growthIndicators: growthData
    });

  } catch (error) {
    console.error('Error fetching student growth data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}