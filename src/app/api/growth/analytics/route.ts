import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const programType = searchParams.get('programType');
    const level = searchParams.get('level');

    // Get unit performance analysis
    let unitQuery = supabase
      .from('unit_performance_analysis')
      .select('*');

    if (programType) unitQuery = unitQuery.eq('program_type', programType);
    if (level) unitQuery = unitQuery.eq('level', level);

    const { data: unitPerformance, error: unitError } = await unitQuery
      .order('unit_number');

    if (unitError) {
      return NextResponse.json({ error: 'Failed to fetch unit performance' }, { status: 500 });
    }

    // Get skill category performance across all students
    let skillQuery = supabase
      .from('growth_indicators')
      .select(`
        skill_category,
        trend_direction,
        avg(current_score) as average_score,
        count(*) as student_count,
        count(*) filter (where is_strength = true) as strength_count,
        count(*) filter (where is_growth_area = true) as growth_area_count
      `)
      .group('skill_category, trend_direction');

    const { data: skillAnalytics, error: skillError } = await skillQuery;

    if (skillError) {
      return NextResponse.json({ error: 'Failed to fetch skill analytics' }, { status: 500 });
    }

    // Get course-specific data if courseId provided
    let courseSpecificData = null;
    if (courseId) {
      const { data: courseData, error: courseError } = await supabase
        .from('student_progress_overview')
        .select('*')
        .eq('course_code', courseId);

      if (!courseError) {
        courseSpecificData = courseData;
      }
    }

    // Calculate trend summaries
    const trendSummary = {
      improving: skillAnalytics ? skillAnalytics.filter(s => s.trend_direction === 'improving').length : 0,
      stable: skillAnalytics ? skillAnalytics.filter(s => s.trend_direction === 'stable').length : 0,
      declining: skillAnalytics ? skillAnalytics.filter(s => s.trend_direction === 'declining').length : 0
    };

    // Get most common themes
    const { data: commonThemes, error: themesError } = await supabase
      .from('student_theme_tracking')
      .select(`
        theme_id,
        feedback_themes!inner (
          name,
          theme_type
        ),
        count(*) as frequency
      `)
      .group('theme_id, feedback_themes.name, feedback_themes.theme_type')
      .order('frequency', { ascending: false })
      .limit(10);

    if (themesError) {
      console.error('Error fetching themes:', themesError);
    }

    return NextResponse.json({
      unitPerformance: unitPerformance || [],
      skillAnalytics: skillAnalytics || [],
      trendSummary,
      commonThemes: commonThemes || [],
      courseSpecificData
    });

  } catch (error) {
    console.error('Error fetching growth analytics:', error);
    
    // Return mock data if database tables don't exist yet
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
    });
  }
}