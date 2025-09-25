// Score calculation utilities for showing detailed breakdowns

export interface ScoreComponent {
  name: string;
  value: number;
  weight: number;
  contribution: number;
  source: string;
}

export interface ScoreFactor {
  label: string;
  value: string | number;
  impact: 'positive' | 'negative' | 'neutral';
}

export interface ScoreBreakdownData {
  dimension: string;
  score: number;
  components: ScoreComponent[];
  calculation: string;
  factors: ScoreFactor[];
}

// Generate breakdown for Overall Score
export function getOverallScoreBreakdown(debateData: any): ScoreBreakdownData {
  const content = debateData?.content || {};
  const style = debateData?.style || {};
  const strategy = debateData?.strategy || {};
  
  const contentScore = content.score || 0;
  const styleScore = style.score || 0;
  const strategyScore = strategy.score || 0;
  
  // Weights for overall calculation
  const contentWeight = 0.4;
  const styleWeight = 0.3;
  const strategyWeight = 0.3;
  
  const overallScore = Math.round(
    contentScore * contentWeight +
    styleScore * styleWeight +
    strategyScore * strategyWeight
  );
  
  return {
    dimension: 'Overall',
    score: overallScore,
    components: [
      {
        name: 'Content Quality',
        value: contentScore,
        weight: contentWeight,
        contribution: contentScore * contentWeight,
        source: 'Argument strength, evidence, theory'
      },
      {
        name: 'Presentation Style',
        value: styleScore,
        weight: styleWeight,
        contribution: styleScore * styleWeight,
        source: 'Delivery, persuasion, engagement'
      },
      {
        name: 'Strategic Thinking',
        value: strategyScore,
        weight: strategyWeight,
        contribution: strategyScore * strategyWeight,
        source: 'Rebuttal, time management, adaptability'
      }
    ],
    calculation: `Overall Score = (Content × 40%) + (Style × 30%) + (Strategy × 30%)
    
= (${contentScore.toFixed(1)} × 0.4) + (${styleScore.toFixed(1)} × 0.3) + (${strategyScore.toFixed(1)} × 0.3)
= ${(contentScore * 0.4).toFixed(1)} + ${(styleScore * 0.3).toFixed(1)} + ${(strategyScore * 0.3).toFixed(1)}
= ${overallScore}`,
    factors: [
      {
        label: 'Growth Rate',
        value: `${debateData?.overall?.growthRate || 0}% per week`,
        impact: (debateData?.overall?.growthRate || 0) > 5 ? 'positive' : 'negative'
      },
      {
        label: 'Consistency',
        value: `${content.consistency || 0}%`,
        impact: (content.consistency || 0) > 75 ? 'positive' : 'negative'
      },
      {
        label: 'Peer Percentile',
        value: `${debateData?.overall?.percentile || 50}th`,
        impact: (debateData?.overall?.percentile || 0) > 50 ? 'positive' : 'negative'
      },
      {
        label: 'Momentum',
        value: ((content.momentum || 0) + (style.momentum || 0) + (strategy.momentum || 0)) / 3 > 0 ? 'Accelerating' : 'Steady',
        impact: ((content.momentum || 0) + (style.momentum || 0) + (strategy.momentum || 0)) / 3 > 0 ? 'positive' : 'neutral'
      }
    ]
  };
}

// Generate breakdown for Content dimension
export function getContentScoreBreakdown(contentData: any): ScoreBreakdownData {
  const argumentQuality = contentData?.details?.argumentQuality || 0;
  const evidenceUsage = contentData?.details?.evidenceUsage || 0;
  const theoryApplication = contentData?.details?.theoryApplication || 0;
  const analyticalDepth = contentData?.details?.analyticalDepth || 0;
  
  const score = contentData?.score || 0;
  
  return {
    dimension: 'Content',
    score: score,
    components: [
      {
        name: 'Argument Quality',
        value: argumentQuality,
        weight: 0.3,
        contribution: argumentQuality * 0.3,
        source: 'Structure, logic, coherence'
      },
      {
        name: 'Evidence Usage',
        value: evidenceUsage,
        weight: 0.25,
        contribution: evidenceUsage * 0.25,
        source: 'Examples, statistics, citations'
      },
      {
        name: 'Theory Application',
        value: theoryApplication,
        weight: 0.25,
        contribution: theoryApplication * 0.25,
        source: 'Frameworks, models, concepts'
      },
      {
        name: 'Analytical Depth',
        value: analyticalDepth,
        weight: 0.2,
        contribution: analyticalDepth * 0.2,
        source: 'Critical thinking, nuance'
      }
    ],
    calculation: `Content Score = (Argument × 30%) + (Evidence × 25%) + (Theory × 25%) + (Analysis × 20%)
    
= (${argumentQuality.toFixed(1)} × 0.3) + (${evidenceUsage.toFixed(1)} × 0.25) + (${theoryApplication.toFixed(1)} × 0.25) + (${analyticalDepth.toFixed(1)} × 0.2)
= ${score}`,
    factors: [
      {
        label: 'Weekly Growth',
        value: `${contentData?.growthRate || 0}%`,
        impact: (contentData?.growthRate || 0) > 3 ? 'positive' : 'negative'
      },
      {
        label: 'Consistency Score',
        value: `${contentData?.consistency || 0}%`,
        impact: (contentData?.consistency || 0) > 75 ? 'positive' : 'negative'
      },
      {
        label: 'Recent Trend',
        value: contentData?.momentum > 0 ? 'Improving' : 'Stable',
        impact: contentData?.momentum > 0 ? 'positive' : 'neutral'
      },
      {
        label: 'Strengths',
        value: contentData?.strengths?.length || 0,
        impact: 'positive'
      }
    ]
  };
}

// Generate breakdown for Style dimension
export function getStyleScoreBreakdown(styleData: any): ScoreBreakdownData {
  const delivery = styleData?.details?.delivery || 0;
  const persuasion = styleData?.details?.persuasion || 0;
  const engagement = styleData?.details?.engagement || 0;
  const clarity = styleData?.details?.clarity || 0;
  
  const score = styleData?.score || 0;
  
  return {
    dimension: 'Style',
    score: score,
    components: [
      {
        name: 'Delivery',
        value: delivery,
        weight: 0.3,
        contribution: delivery * 0.3,
        source: 'Voice, pace, confidence'
      },
      {
        name: 'Persuasion',
        value: persuasion,
        weight: 0.25,
        contribution: persuasion * 0.25,
        source: 'Rhetoric, emotion, impact'
      },
      {
        name: 'Engagement',
        value: engagement,
        weight: 0.25,
        contribution: engagement * 0.25,
        source: 'Eye contact, gestures, presence'
      },
      {
        name: 'Clarity',
        value: clarity,
        weight: 0.2,
        contribution: clarity * 0.2,
        source: 'Articulation, structure'
      }
    ],
    calculation: `Style Score = (Delivery × 30%) + (Persuasion × 25%) + (Engagement × 25%) + (Clarity × 20%)
    
= (${delivery.toFixed(1)} × 0.3) + (${persuasion.toFixed(1)} × 0.25) + (${engagement.toFixed(1)} × 0.25) + (${clarity.toFixed(1)} × 0.2)
= ${score}`,
    factors: [
      {
        label: 'Improvement Rate',
        value: `${styleData?.growthRate || 0}%`,
        impact: (styleData?.growthRate || 0) > 3 ? 'positive' : 'negative'
      },
      {
        label: 'Consistency',
        value: `${styleData?.consistency || 0}%`,
        impact: (styleData?.consistency || 0) > 70 ? 'positive' : 'negative'
      },
      {
        label: 'Audience Impact',
        value: engagement > 70 ? 'High' : 'Moderate',
        impact: engagement > 70 ? 'positive' : 'neutral'
      },
      {
        label: 'Confidence Level',
        value: delivery > 75 ? 'Strong' : 'Building',
        impact: delivery > 75 ? 'positive' : 'neutral'
      }
    ]
  };
}

// Generate breakdown for Strategy dimension
export function getStrategyScoreBreakdown(strategyData: any): ScoreBreakdownData {
  const rebuttal = strategyData?.details?.rebuttal || 0;
  const timeManagement = strategyData?.details?.timeManagement || 0;
  const adaptability = strategyData?.details?.adaptability || 0;
  const crossExamination = strategyData?.details?.crossExamination || 0;
  
  const score = strategyData?.score || 0;
  
  return {
    dimension: 'Strategy',
    score: score,
    components: [
      {
        name: 'Rebuttal Skills',
        value: rebuttal,
        weight: 0.35,
        contribution: rebuttal * 0.35,
        source: 'Counter-arguments, defense'
      },
      {
        name: 'Time Management',
        value: timeManagement,
        weight: 0.25,
        contribution: timeManagement * 0.25,
        source: 'Pacing, prioritization'
      },
      {
        name: 'Adaptability',
        value: adaptability,
        weight: 0.2,
        contribution: adaptability * 0.2,
        source: 'Flexibility, quick thinking'
      },
      {
        name: 'Cross-Examination',
        value: crossExamination,
        weight: 0.2,
        contribution: crossExamination * 0.2,
        source: 'Questions, probing'
      }
    ],
    calculation: `Strategy Score = (Rebuttal × 35%) + (Time × 25%) + (Adaptability × 20%) + (Cross-Ex × 20%)
    
= (${rebuttal.toFixed(1)} × 0.35) + (${timeManagement.toFixed(1)} × 0.25) + (${adaptability.toFixed(1)} × 0.2) + (${crossExamination.toFixed(1)} × 0.2)
= ${score}`,
    factors: [
      {
        label: 'Growth Velocity',
        value: `${strategyData?.growthRate || 0}%`,
        impact: (strategyData?.growthRate || 0) > 4 ? 'positive' : 'negative'
      },
      {
        label: 'Strategic Thinking',
        value: rebuttal > 70 ? 'Advanced' : 'Developing',
        impact: rebuttal > 70 ? 'positive' : 'neutral'
      },
      {
        label: 'Response Time',
        value: adaptability > 65 ? 'Quick' : 'Improving',
        impact: adaptability > 65 ? 'positive' : 'neutral'
      },
      {
        label: 'Debate Rounds Won',
        value: strategyData?.roundsWon || 'N/A',
        impact: 'neutral'
      }
    ]
  };
}

// Generate breakdown for Growth Rate
export function getGrowthRateBreakdown(growthData: any): ScoreBreakdownData {
  const weeklyGrowth = growthData?.overall?.growthRate || 0;
  const contentGrowth = growthData?.content?.growthRate || 0;
  const styleGrowth = growthData?.style?.growthRate || 0;
  const strategyGrowth = growthData?.strategy?.growthRate || 0;
  
  return {
    dimension: 'Growth Rate',
    score: weeklyGrowth,
    components: [
      {
        name: 'Content Growth',
        value: contentGrowth,
        weight: 0.35,
        contribution: contentGrowth * 0.35,
        source: 'Week-over-week improvement'
      },
      {
        name: 'Style Growth',
        value: styleGrowth,
        weight: 0.35,
        contribution: styleGrowth * 0.35,
        source: 'Presentation improvement'
      },
      {
        name: 'Strategy Growth',
        value: strategyGrowth,
        weight: 0.3,
        contribution: strategyGrowth * 0.3,
        source: 'Tactical improvement'
      }
    ],
    calculation: `Growth Rate = Average weekly improvement across all dimensions
    
= (Content Growth + Style Growth + Strategy Growth) / 3
= (${contentGrowth.toFixed(1)}% + ${styleGrowth.toFixed(1)}% + ${strategyGrowth.toFixed(1)}%) / 3
= ${weeklyGrowth.toFixed(1)}% per week`,
    factors: [
      {
        label: 'Consistency',
        value: `${growthData?.overall?.consistency || 0}%`,
        impact: (growthData?.overall?.consistency || 0) > 75 ? 'positive' : 'negative'
      },
      {
        label: 'Momentum',
        value: weeklyGrowth > 5 ? 'Accelerating' : 'Steady',
        impact: weeklyGrowth > 5 ? 'positive' : 'neutral'
      },
      {
        label: 'vs Peer Average',
        value: `${weeklyGrowth > 3 ? '+' : ''}${(weeklyGrowth - 3).toFixed(1)}%`,
        impact: weeklyGrowth > 3 ? 'positive' : 'negative'
      },
      {
        label: 'Projected 3-Month',
        value: `+${(weeklyGrowth * 12).toFixed(0)} points`,
        impact: 'positive'
      }
    ]
  };
}