import { useState, useEffect } from 'react';
import { StudentGrowthData, TimeFrame } from '@/lib/analytics/growth-engine';

interface UseStudentGrowthReturn {
  data: StudentGrowthData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

// Transform debate growth data to legacy format for compatibility
function transformDebateDataToLegacyFormat(debateData: any): any {
  // If it's already in the old format, return as is
  if (debateData?.skills) {
    return debateData;
  }
  
  
  // Transform debate format to legacy format
  return {
    studentId: debateData?.studentId,
    studentName: debateData?.studentName,
    timeframe: debateData?.timeframe,
    
    // Pass the whole debate data for SkillRadarEvolution (it handles both formats)
    skills: debateData,
    content: debateData?.content,
    style: debateData?.style, 
    strategy: debateData?.strategy,
    
    // Use actual overall metrics from debate engine
    overall: {
      score: debateData?.overall?.score || 0,
      percentile: debateData?.overall?.percentile || 0,
      growthRate: debateData?.overall?.growthRate || 0,
      level: debateData?.overall?.level || 'intermediate',
      description: debateData?.overall?.description || '',
      // Map history for sparkline
      history: debateData?.history?.map((h: any) => ({
        date: h.date,
        score: h.overall
      })) || []
    },
    
    // Calculate velocity from actual history data
    velocity: debateData?.history?.map((h: any, idx: number) => {
      const prevScore = idx > 0 ? debateData.history[idx-1].overall : h.overall;
      const velocity = h.overall - prevScore;
      return {
        week: h.date || `Week ${idx + 1}`,
        velocity: velocity,
        benchmark: 5 // 5% growth per week is good
      };
    }) || [],
    
    // Use actual comparison data
    comparisons: {
      toPeers: {
        percentile: debateData?.overall?.percentile || 0,
        ranking: Math.max(1, Math.round((100 - (debateData?.overall?.percentile || 50)) / 5)),
        totalPeers: 20,
        aboveAverage: (debateData?.overall?.percentile || 0) > 50
      },
      toPrevious: {
        improvement: debateData?.overall?.growthRate || 0,
        consistencyChange: debateData?.content?.consistency ? 
          (debateData.content.consistency - 75) : 0,
        momentumChange: ((debateData?.content?.momentum || 0) + 
          (debateData?.style?.momentum || 0) + 
          (debateData?.strategy?.momentum || 0)) / 3
      },
      toGoals: {
        onTrack: (debateData?.overall?.growthRate || 0) > 0,
        progressPercentage: Math.min(100, Math.max(0, debateData?.overall?.score || 0)),
        estimatedCompletion: debateData?.trajectory?.confidence > 50 ? 
          new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) : null
      }
    },
    
    // Generate milestones based on actual scores and progress
    milestones: {
      achieved: generateAchievedMilestones(debateData),
      upcoming: generateUpcomingMilestones(debateData)
    },
    
    // Use actual trajectory data
    trajectory: {
      projected3Months: debateData?.trajectory?.nextQuarter || 
        Math.min(100, (debateData?.overall?.score || 0) + 15),
      projected6Months: Math.min(100, (debateData?.trajectory?.nextQuarter || 0) + 10),
      confidenceInterval: [
        Math.max(0, (debateData?.trajectory?.nextMonth || 0) - 10),
        Math.min(100, (debateData?.trajectory?.nextMonth || 0) + 10)
      ],
      nextMonth: debateData?.trajectory?.nextMonth,
      nextQuarter: debateData?.trajectory?.nextQuarter,
      confidence: debateData?.trajectory?.confidence
    },
    
    // Map recommendations to patterns
    patterns: debateData?.recommendations?.map((r: any) => ({
      pattern: r.action || 'Improvement needed',
      confidence: r.priority === 'high' ? 0.9 : r.priority === 'medium' ? 0.7 : 0.5,
      impact: r.priority || 'medium',
      description: `${r.action} - ${r.measurableGoal || 'Track progress'}`
    })) || []
  };
}

// Helper function to generate achieved milestones from scores
function generateAchievedMilestones(debateData: any): any[] {
  const milestones = [];
  const overallScore = debateData?.overall?.score || 0;
  
  // Basic milestones based on score thresholds
  if (overallScore >= 25) {
    milestones.push({
      id: 'milestone-1',
      title: 'First Steps in Debate',
      description: 'Started debate journey',
      achievedDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      achieved: true,
      progress: 100,
      skills: ['Basic Structure', 'Speaking Confidence'],
      icon: '🌱'
    });
  }
  
  if (overallScore >= 50) {
    milestones.push({
      id: 'milestone-2', 
      title: 'Developing Debater',
      description: 'Reached intermediate level',
      achievedDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      achieved: true,
      progress: 100,
      skills: ['Argument Building', 'Time Management'],
      icon: '📈'
    });
  }
  
  if (overallScore >= 75) {
    milestones.push({
      id: 'milestone-3',
      title: 'Advanced Debater',
      description: 'Mastered core debate skills',
      achievedDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      achieved: true,
      progress: 100,
      skills: ['Rebuttal', 'Strategy'],
      icon: '🎯'
    });
  }
  
  // Add dimension-specific milestones
  if (debateData?.content?.score >= 70) {
    milestones.push({
      id: 'content-master',
      title: 'Content Mastery',
      description: 'Excellent argument quality',
      achievedDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      achieved: true,
      progress: 100,
      skills: ['Argument Quality', 'Theory Application'],
      icon: '📚'
    });
  }
  
  return milestones;
}

// Helper function to generate upcoming milestones
function generateUpcomingMilestones(debateData: any): any[] {
  const milestones = [];
  const overallScore = debateData?.overall?.score || 0;
  
  // Generate next milestones based on current score
  if (overallScore < 50) {
    milestones.push({
      id: 'next-1',
      title: 'Reach Intermediate Level',
      description: 'Achieve 50% overall score',
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      achieved: false,
      progress: (overallScore / 50) * 100,
      skills: ['Improve Style', 'Build Arguments'],
      dimension: 'overall'
    });
  }
  
  if (overallScore < 75) {
    milestones.push({
      id: 'next-2',
      title: 'Advanced Level',
      description: 'Achieve 75% overall score',
      targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      achieved: false,
      progress: (overallScore / 75) * 100,
      skills: ['Master Rebuttal', 'Strategic Thinking'],
      dimension: 'overall'
    });
  }
  
  // Add dimension-specific upcoming milestones
  if (debateData?.content?.score < 80) {
    milestones.push({
      id: 'content-next',
      title: 'Content Excellence',
      description: 'Reach 80% in content dimension',
      targetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      achieved: false,
      progress: (debateData?.content?.score / 80) * 100,
      skills: ['Argument Depth', 'Evidence Usage'],
      dimension: 'content'
    });
  }
  
  if (debateData?.style?.score < 80) {
    milestones.push({
      id: 'style-next',
      title: 'Presentation Mastery',
      description: 'Reach 80% in style dimension',
      targetDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      achieved: false,
      progress: (debateData?.style?.score / 80) * 100,
      skills: ['Delivery', 'Persuasion'],
      dimension: 'style'
    });
  }
  
  return milestones;
}

export function useStudentGrowth(
  studentId: string,
  timeframe: TimeFrame = 'month'
): UseStudentGrowthReturn {
  const [data, setData] = useState<StudentGrowthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGrowthData = async () => {
    if (!studentId) {
      setError('No student ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(
        `/api/students/${studentId}/growth?timeframe=${timeframe}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch growth data');
      }
      
      const growthData = await response.json();
      
      // Transform debate growth data to match expected format
      const transformedData = transformDebateDataToLegacyFormat(growthData);
      setData(transformedData);
    } catch (err) {
      console.error('Error fetching student growth:', err);
      setError(err instanceof Error ? err.message : 'Failed to load growth data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGrowthData();
  }, [studentId, timeframe]);

  return {
    data,
    loading,
    error,
    refetch: fetchGrowthData
  };
}