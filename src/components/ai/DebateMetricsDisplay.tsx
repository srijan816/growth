'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Target, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Activity,
  Mic,
  Brain,
  Users,
  Zap,
  ChevronRight,
  Info
} from 'lucide-react'
import { DEBATE_METRICS, getMetricName, getScoreColor, getTrendIcon, type MetricScore, type DebateMetric } from '@/types/debate-metrics'

interface DebateMetricsDisplayProps {
  metrics: MetricScore[]
  overallScore: number
  metricAnalysis?: Array<{
    metricId: string
    score: number
    trend: string
    evidence: string[]
    improvements: string[]
    concerns: string[]
  }>
  studentLevel: 'beginner' | 'intermediate' | 'advanced'
  compact?: boolean
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'delivery': return <Mic className="w-4 h-4" />
    case 'content': return <Brain className="w-4 h-4" />
    case 'strategy': return <Zap className="w-4 h-4" />
    case 'engagement': return <Users className="w-4 h-4" />
    default: return <Target className="w-4 h-4" />
  }
}

const getTrendComponent = (trend: string) => {
  switch (trend) {
    case 'improving': 
      return <TrendingUp className="w-4 h-4 text-green-600" />
    case 'declining': 
      return <TrendingDown className="w-4 h-4 text-red-600" />
    case 'stable': 
      return <Minus className="w-4 h-4 text-gray-600" />
    case 'volatile': 
      return <Activity className="w-4 h-4 text-purple-600" />
    default: 
      return null
  }
}

export default function DebateMetricsDisplay({
  metrics,
  overallScore,
  metricAnalysis,
  studentLevel,
  compact = false
}: DebateMetricsDisplayProps) {
  // Group metrics by category
  const metricsByCategory = DEBATE_METRICS.reduce((acc, metric) => {
    if (!acc[metric.category]) acc[metric.category] = []
    acc[metric.category].push(metric)
    return acc
  }, {} as Record<string, DebateMetric[]>)

  // Create a map for quick lookup of metric scores
  const metricScoreMap = metrics.reduce((acc, m) => {
    acc[m.metricId] = m
    return acc
  }, {} as Record<string, MetricScore>)

  const categories = [
    { key: 'delivery', label: 'Delivery Skills', color: 'blue' },
    { key: 'content', label: 'Content & Structure', color: 'green' },
    { key: 'strategy', label: 'Strategic Thinking', color: 'purple' },
    { key: 'engagement', label: 'Engagement', color: 'orange' }
  ]

  if (compact) {
    // Compact view for embedding in other components
    return (
      <div className="space-y-4">
        {/* Overall Score */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-gray-700">Overall Debate Score</p>
            <p className="text-2xl font-bold text-indigo-700">{(overallScore * 20).toFixed(0)}%</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Based on 11 metrics</p>
            <p className="text-sm font-medium text-gray-700">{overallScore.toFixed(1)}/5.0</p>
          </div>
        </div>

        {/* Quick Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          {metrics.slice(0, 6).map((metric) => {
            const metricDef = DEBATE_METRICS.find(m => m.id === metric.metricId)
            if (!metricDef) return null
            
            return (
              <div key={metric.metricId} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-gray-700">
                    {getMetricName(metricDef, studentLevel)}
                  </p>
                  {getTrendComponent(metric.trend)}
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={metric.score * 20} className="h-1.5" />
                  <span className="text-xs font-medium">{metric.score.toFixed(1)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // Full view
  return (
    <div className="space-y-6">
      {/* Overall Performance Card */}
      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Target className="w-5 h-5" />
            Debate Performance Metrics
          </CardTitle>
          <CardDescription>
            Comprehensive analysis across 11 core debate skills
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Overall Score</p>
              <p className="text-4xl font-bold text-indigo-700">{(overallScore * 20).toFixed(0)}%</p>
              <p className="text-sm text-gray-500 mt-1">{overallScore.toFixed(2)} / 5.00</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Strongest Area</p>
              <p className="text-lg font-semibold text-green-700">
                {(() => {
                  const topMetric = metrics.reduce((max, m) => m.score > max.score ? m : max)
                  const metricDef = DEBATE_METRICS.find(m => m.id === topMetric.metricId)
                  return metricDef ? getMetricName(metricDef, studentLevel) : 'N/A'
                })()}
              </p>
              <Badge className="mt-1 bg-green-100 text-green-700">
                {metrics.reduce((max, m) => m.score > max.score ? m : max).score.toFixed(1)}/5
              </Badge>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Focus Area</p>
              <p className="text-lg font-semibold text-orange-700">
                {(() => {
                  const weakMetric = metrics.reduce((min, m) => m.score < min.score ? m : min)
                  const metricDef = DEBATE_METRICS.find(m => m.id === weakMetric.metricId)
                  return metricDef ? getMetricName(metricDef, studentLevel) : 'N/A'
                })()}
              </p>
              <Badge className="mt-1 bg-orange-100 text-orange-700">
                {metrics.reduce((min, m) => m.score < min.score ? m : min).score.toFixed(1)}/5
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics by Category */}
      {categories.map((category, catIndex) => {
        const categoryMetrics = metricsByCategory[category.key] || []
        
        return (
          <motion.div
            key={category.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: catIndex * 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  {getCategoryIcon(category.key)}
                  {category.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {categoryMetrics.map((metric, metricIndex) => {
                  const score = metricScoreMap[metric.id]
                  const analysis = metricAnalysis?.find(a => a.metricId === metric.id)
                  
                  if (!score) return null
                  
                  return (
                    <motion.div
                      key={metric.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: metricIndex * 0.05 }}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      {/* Metric Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 flex items-center gap-2">
                            {getMetricName(metric, studentLevel)}
                            {getTrendComponent(score.trend)}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
                        </div>
                        <div className="text-right">
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full ${getScoreColor(score.score)}`}>
                            <span className="font-semibold">{score.score.toFixed(1)}</span>
                            <span className="text-xs">/5</span>
                          </div>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-3">
                        <Progress value={score.score * 20} className="h-2" />
                      </div>

                      {/* Detailed Analysis (if available) */}
                      {analysis && (
                        <div className="space-y-2 text-sm">
                          {/* Evidence */}
                          {analysis.evidence.length > 0 && (
                            <div className="bg-gray-50 p-2 rounded">
                              <p className="font-medium text-gray-700 mb-1">Evidence:</p>
                              <ul className="space-y-1">
                                {analysis.evidence.slice(0, 2).map((ev, idx) => (
                                  <li key={idx} className="text-xs text-gray-600 flex items-start gap-1">
                                    <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                    <span>{ev}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Improvements & Concerns */}
                          <div className="grid grid-cols-2 gap-2">
                            {analysis.improvements.length > 0 && (
                              <div className="bg-green-50 p-2 rounded">
                                <p className="font-medium text-green-700 text-xs mb-1">Improvements:</p>
                                <p className="text-xs text-gray-600">{analysis.improvements[0]}</p>
                              </div>
                            )}
                            {analysis.concerns.length > 0 && (
                              <div className="bg-orange-50 p-2 rounded">
                                <p className="font-medium text-orange-700 text-xs mb-1">Focus:</p>
                                <p className="text-xs text-gray-600">{analysis.concerns[0]}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )
                })}
              </CardContent>
            </Card>
          </motion.div>
        )
      })}

      {/* Metric Legend */}
      <Card className="bg-gray-50">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Info className="w-4 h-4" />
            Understanding the Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <p className="font-medium text-gray-700 mb-1">Score Range</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded" />
                  <span>4.5-5.0: Exceptional</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded" />
                  <span>3.5-4.4: Proficient</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded" />
                  <span>2.5-3.4: Developing</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded" />
                  <span>1.0-2.4: Emerging</span>
                </div>
              </div>
            </div>
            <div>
              <p className="font-medium text-gray-700 mb-1">Trends</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3 h-3 text-green-600" />
                  <span>Improving</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingDown className="w-3 h-3 text-red-600" />
                  <span>Declining</span>
                </div>
                <div className="flex items-center gap-2">
                  <Minus className="w-3 h-3 text-gray-600" />
                  <span>Stable</span>
                </div>
                <div className="flex items-center gap-2">
                  <Activity className="w-3 h-3 text-purple-600" />
                  <span>Volatile</span>
                </div>
              </div>
            </div>
            <div className="col-span-2">
              <p className="font-medium text-gray-700 mb-1">Level Progression</p>
              <p className="text-gray-600">
                Some metrics evolve as students advance. For example, "Speech Time" becomes 
                "Time Management" at advanced levels, reflecting more sophisticated skill expectations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}