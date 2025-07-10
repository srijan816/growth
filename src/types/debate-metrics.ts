/**
 * Debate Performance Metrics System
 * 
 * Tracks 11 core debate skills with level-appropriate naming and progression tracking
 */

export type DebateLevel = 'beginner' | 'intermediate' | 'advanced'

export interface DebateMetric {
  id: string
  name: string
  advancedName?: string // Name when student moves up (e.g., "Speech time" → "Time management")
  description: string
  category: 'delivery' | 'content' | 'strategy' | 'engagement'
  weight: number // Importance weight (0-1)
  rubricMapping?: string[] // Maps to existing rubric items
}

export const DEBATE_METRICS: DebateMetric[] = [
  {
    id: 'hook',
    name: 'Hook',
    description: 'Opening statement that captures audience attention and sets the tone',
    category: 'delivery',
    weight: 0.8
  },
  {
    id: 'speech_time',
    name: 'Speech Time',
    advancedName: 'Time Management',
    description: 'Adherence to time limits and pacing throughout the speech',
    category: 'delivery',
    weight: 0.9,
    rubricMapping: ['rubric_1'] // Duration Management
  },
  {
    id: 'vocal_projection',
    name: 'Vocal Projection',
    description: 'Volume, tone variation, and voice control',
    category: 'delivery',
    weight: 0.8,
    rubricMapping: ['rubric_3'] // Style/Persuasion
  },
  {
    id: 'clarity_fluency',
    name: 'Clarity & Fluency',
    description: 'Clear articulation, smooth delivery, and minimal filler words',
    category: 'delivery',
    weight: 0.9,
    rubricMapping: ['rubric_3'] // Style/Persuasion
  },
  {
    id: 'argument_structure',
    name: 'Argument Structure',
    advancedName: 'Argument Depth',
    description: 'Logical flow, claims, evidence, and analysis',
    category: 'content',
    weight: 1.0,
    rubricMapping: ['rubric_4', 'rubric_5'] // Argument Completeness & Theory Application
  },
  {
    id: 'rebuttal',
    name: 'Rebuttal',
    description: 'Direct response to opponents\' arguments with counter-evidence',
    category: 'strategy',
    weight: 0.9,
    rubricMapping: ['rubric_6'] // Rebuttal Effectiveness
  },
  {
    id: 'relevance',
    name: 'Relevance of Content',
    description: 'Content directly addresses the motion and stays on topic',
    category: 'content',
    weight: 0.9
  },
  {
    id: 'pois',
    name: 'POIs & Response to POIs',
    description: 'Offering and accepting Points of Information effectively',
    category: 'engagement',
    weight: 0.8,
    rubricMapping: ['rubric_2'] // Point of Information
  },
  {
    id: 'speech_structure',
    name: 'Speech Structure & Organisation',
    description: 'Clear introduction, body, conclusion with signposting',
    category: 'content',
    weight: 0.9,
    rubricMapping: ['rubric_7'] // Teammate Support (organization)
  },
  {
    id: 'strategy',
    name: 'Strategy',
    description: 'Case building, prioritization, and tactical decisions',
    category: 'strategy',
    weight: 0.8
  },
  {
    id: 'non_verbal',
    name: 'Non-verbal Communication',
    description: 'Eye contact, gestures, posture, and stage presence',
    category: 'delivery',
    weight: 0.7
  }
]

export interface MetricScore {
  metricId: string
  score: number // 1-5 scale
  trend: 'improving' | 'declining' | 'stable' | 'volatile'
  evidence: string[] // Specific quotes from feedback
  lastUpdated: Date
}

export interface StudentDebateMetrics {
  studentId: string
  studentName: string
  level: DebateLevel
  overallScore: number // Weighted average
  metrics: MetricScore[]
  lastAssessmentDate: Date
  totalSessions: number
  
  // Progression tracking
  strongestMetrics: string[] // Top 3 metric IDs
  weakestMetrics: string[] // Bottom 3 metric IDs
  recentImprovements: string[] // Metrics that improved in last 3 sessions
  
  // Historical data
  history: Array<{
    date: Date
    sessionNumber: number
    metrics: Array<{
      metricId: string
      score: number
    }>
  }>
}

export interface MetricAnalysis {
  metric: DebateMetric
  currentScore: number
  previousScore?: number
  percentileRank?: number // Compared to peers
  
  analysis: {
    strengths: string[]
    weaknesses: string[]
    specificExamples: string[]
    improvementRate: number // -1 to 1
  }
  
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low'
    action: string
    expectedImprovement: string
    timeframe: string
  }>
}

// Helper functions
export function getMetricName(metric: DebateMetric, level: DebateLevel): string {
  if (level === 'advanced' && metric.advancedName) {
    return metric.advancedName
  }
  return metric.name
}

export function calculateOverallScore(metrics: MetricScore[]): number {
  const totalWeight = DEBATE_METRICS.reduce((sum, m) => sum + m.weight, 0)
  const weightedSum = metrics.reduce((sum, score) => {
    const metric = DEBATE_METRICS.find(m => m.id === score.metricId)
    return sum + (score.score * (metric?.weight || 0))
  }, 0)
  return weightedSum / totalWeight
}

export function getMetricCategory(metricId: string): string {
  const metric = DEBATE_METRICS.find(m => m.id === metricId)
  return metric?.category || 'unknown'
}

export function getMetricsByCategory(category: DebateMetric['category']): DebateMetric[] {
  return DEBATE_METRICS.filter(m => m.category === category)
}

// Color coding for scores
export function getScoreColor(score: number): string {
  if (score >= 4.5) return 'text-green-700 bg-green-50'
  if (score >= 3.5) return 'text-blue-700 bg-blue-50'
  if (score >= 2.5) return 'text-yellow-700 bg-yellow-50'
  if (score >= 1.5) return 'text-orange-700 bg-orange-50'
  return 'text-red-700 bg-red-50'
}

export function getTrendIcon(trend: MetricScore['trend']): string {
  switch (trend) {
    case 'improving': return '↗️'
    case 'declining': return '↘️'
    case 'stable': return '→'
    case 'volatile': return '↕️'
    default: return '•'
  }
}