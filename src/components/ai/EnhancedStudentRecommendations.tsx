'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DebateMetricsDisplay from '@/components/ai/DebateMetricsDisplay'
import { 
  Target, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Star,
  BookOpen,
  Users,
  Award,
  ArrowRight,
  X,
  Brain,
  Zap,
  Heart,
  Activity,
  MessageSquare,
  ChevronRight,
  Timer,
  ListChecks,
  RefreshCcw
} from 'lucide-react'

interface DiagnosticAnalysisResponse {
  success: boolean
  studentName: string
  sessionCount: number
  analysisDate: string
  patterns: {
    skillTrends: Array<{
      skill: string
      trajectory: string
      currentLevel: number
      improvement: string
      keyMoments: any[]
    }>
    topStrengths: Array<{
      strength: string
      consistency: number
      evidence: string[]
      leverageOpportunities: string[]
    }>
    criticalIssues: Array<{
      theme: string
      frequency: number
      severity: string
      trend: string
      examples: string[]
    }>
  }
  diagnosis: {
    primaryConcerns: Array<{
      symptom: string
      rootCause: string
      category: string
      confidence: string
    }>
    studentProfile: {
      learningStyle: string
      motivationalDrivers: string[]
      anxietyTriggers: string[]
      strengthsToLeverage: string[]
      preferredFeedbackStyle: string
    }
    keyInsight: string
  }
  recommendations: Array<{
    id: string
    priority: string
    focus: string
    solution: string
    rationale: string
    exercises: Array<{
      name: string
      duration: string
      frequency: string
      description: string
    }>
    firstWeekTarget: string
    instructorTip: string
    parentMessage: string
  }>
  cached?: boolean
  cacheDate?: string
  version?: number
  debateMetrics?: {
    overallScore: number
    metrics: Array<{
      metricId: string
      score: number
      trend: string
      evidence: string[]
    }>
    metricAnalysis: Array<{
      metricId: string
      score: number
      trend: string
      evidence: string[]
      improvements: string[]
      concerns: string[]
    }>
  }
}

interface EnhancedStudentRecommendationsProps {
  studentName: string
  isVisible: boolean
  onClose: () => void
}

const EnhancedStudentRecommendations: React.FC<EnhancedStudentRecommendationsProps> = ({
  studentName,
  isVisible,
  onClose
}) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<DiagnosticAnalysisResponse | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (isVisible && studentName) {
      fetchDiagnosticAnalysis()
    }
  }, [isVisible, studentName])

  const fetchDiagnosticAnalysis = async (forceRegenerate = false) => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ai/diagnostic-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          studentName,
          level: 'primary',
          includeRecommendations: true,
          forceRegenerate
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch analysis')
      }

      const data = await response.json()
      setAnalysis(data)
    } catch (err) {
      console.error('Failed to fetch diagnostic analysis:', err)
      setError(err instanceof Error ? err.message : 'Failed to load recommendations')
    } finally {
      setLoading(false)
    }
  }

  if (!isVisible) return null

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200'
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200'
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'knowledge': return <BookOpen className="w-4 h-4" />
      case 'skill': return <Target className="w-4 h-4" />
      case 'confidence': return <Heart className="w-4 h-4" />
      case 'preparation': return <ListChecks className="w-4 h-4" />
      case 'conceptual': return <Brain className="w-4 h-4" />
      case 'anxiety': return <Activity className="w-4 h-4" />
      default: return <Target className="w-4 h-4" />
    }
  }

  const getTrajectoryIcon = (trajectory: string) => {
    switch (trajectory) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-600" />
      case 'declining': return <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />
      case 'plateau': return <ArrowRight className="w-4 h-4 text-yellow-600" />
      case 'volatile': return <Activity className="w-4 h-4 text-purple-600" />
      default: return <ArrowRight className="w-4 h-4 text-gray-600" />
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="w-full max-w-6xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Brain className="w-6 h-6" />
                Diagnostic Growth Analysis
              </h1>
              <p className="text-indigo-100 mt-1">
                Evidence-based insights for {studentName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!loading && analysis && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchDiagnosticAnalysis(true)}
                  className="text-white hover:bg-white/20"
                  title="Regenerate recommendations"
                >
                  <RefreshCcw className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4" />
                <p className="text-gray-600">Analyzing feedback patterns...</p>
              </div>
            </div>
          ) : error ? (
            <div className="p-8">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-red-700 mb-2">Analysis Error</h3>
                <p className="text-red-600">{error}</p>
                <Button 
                  onClick={fetchDiagnosticAnalysis} 
                  className="mt-4"
                  variant="outline"
                >
                  Try Again
                </Button>
              </div>
            </div>
          ) : analysis ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="p-6">
              <TabsList className="grid w-full grid-cols-5 mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="metrics">Debate Metrics</TabsTrigger>
                <TabsTrigger value="diagnosis">Diagnosis</TabsTrigger>
                <TabsTrigger value="recommendations">Action Plan</TabsTrigger>
                <TabsTrigger value="coaching">Coaching Guide</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-6">
                {/* Key Insight Banner */}
                <Card className="border-indigo-200 bg-indigo-50">
                  <CardHeader>
                    <CardTitle className="text-lg text-indigo-700 flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      Key Insight
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{analysis.diagnosis.keyInsight}</p>
                  </CardContent>
                </Card>

                {/* Skills Progress Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Skill Trends */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Skill Development Trends
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {analysis.patterns.skillTrends.slice(0, 4).map((skill, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {getTrajectoryIcon(skill.trajectory)}
                            <div>
                              <p className="font-medium text-sm">{skill.skill}</p>
                              <p className="text-xs text-gray-500">Level {skill.currentLevel}/5</p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {skill.improvement}
                          </Badge>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Top Strengths */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Star className="w-5 h-5" />
                        Core Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {analysis.patterns.topStrengths.map((strength, idx) => (
                        <div key={idx} className="p-3 bg-green-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-medium text-sm text-green-800">{strength.strength}</p>
                            <Progress 
                              value={strength.consistency * 100} 
                              className="w-16 h-2"
                            />
                          </div>
                          <p className="text-xs text-gray-600">
                            {strength.leverageOpportunities[0]}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Session Summary */}
                <Card className="bg-gray-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{analysis.sessionCount}</p>
                        <p className="text-sm text-gray-500">Sessions Analyzed</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-indigo-600">
                          {analysis.patterns.topStrengths.length}
                        </p>
                        <p className="text-sm text-gray-500">Key Strengths</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-orange-600">
                          {analysis.diagnosis.primaryConcerns.length}
                        </p>
                        <p className="text-sm text-gray-500">Focus Areas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {analysis.recommendations.length}
                        </p>
                        <p className="text-sm text-gray-500">Action Items</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Debate Metrics Summary (if available) */}
                {analysis.debateMetrics && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="w-5 h-5" />
                        Debate Performance Summary
                      </CardTitle>
                      <CardDescription>
                        Quick view of debate skill metrics
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <DebateMetricsDisplay
                        metrics={analysis.debateMetrics.metrics}
                        overallScore={analysis.debateMetrics.overallScore}
                        metricAnalysis={analysis.debateMetrics.metricAnalysis}
                        studentLevel="primary"
                        compact={true}
                      />
                      <Button 
                        variant="outline" 
                        className="w-full mt-4"
                        onClick={() => setActiveTab('metrics')}
                      >
                        View Detailed Metrics
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Debate Metrics Tab */}
              <TabsContent value="metrics" className="space-y-6">
                {analysis.debateMetrics ? (
                  <DebateMetricsDisplay
                    metrics={analysis.debateMetrics.metrics}
                    overallScore={analysis.debateMetrics.overallScore}
                    metricAnalysis={analysis.debateMetrics.metricAnalysis}
                    studentLevel="primary"
                    compact={false}
                  />
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center py-8">
                        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-700 mb-2">
                          Debate Metrics Not Available
                        </h3>
                        <p className="text-sm text-gray-500">
                          Detailed debate metrics analysis is being generated. Please check back later.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Diagnosis Tab */}
              <TabsContent value="diagnosis" className="space-y-6">
                {/* Student Profile */}
                <Card className="border-purple-200 bg-purple-50">
                  <CardHeader>
                    <CardTitle className="text-lg text-purple-700 flex items-center gap-2">
                      <Users className="w-5 h-5" />
                      Student Learning Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="font-medium text-sm text-gray-700 mb-2">Learning Style</p>
                        <Badge className="mb-3">{analysis.diagnosis.studentProfile.learningStyle}</Badge>
                        
                        <p className="font-medium text-sm text-gray-700 mb-2">Motivational Drivers</p>
                        <div className="flex flex-wrap gap-2">
                          {analysis.diagnosis.studentProfile.motivationalDrivers.map((driver, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {driver}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-sm text-gray-700 mb-2">Strengths to Leverage</p>
                        <ul className="space-y-1">
                          {analysis.diagnosis.studentProfile.strengthsToLeverage.slice(0, 3).map((strength, idx) => (
                            <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                              <CheckCircle className="w-3 h-3 text-green-600 mt-0.5" />
                              {strength}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Root Cause Analysis */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {analysis.diagnosis.primaryConcerns.map((concern, idx) => (
                    <Card key={idx} className="border-orange-200">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {getCategoryIcon(concern.category)}
                            {concern.symptom}
                          </CardTitle>
                          <Badge className="text-xs">{concern.confidence}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">Root Cause</p>
                            <p className="text-sm text-gray-600">{concern.rootCause}</p>
                          </div>
                          <div className="pt-2 border-t">
                            <Badge variant="outline" className="text-xs">
                              {concern.category} issue
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Anxiety Triggers (if any) */}
                {analysis.diagnosis.studentProfile.anxietyTriggers.length > 0 && (
                  <Card className="border-red-200 bg-red-50">
                    <CardHeader>
                      <CardTitle className="text-lg text-red-700 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Anxiety Triggers to Address
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {analysis.diagnosis.studentProfile.anxietyTriggers.map((trigger, idx) => (
                          <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                            <Activity className="w-4 h-4 text-red-500 mt-0.5" />
                            {trigger}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Recommendations Tab */}
              <TabsContent value="recommendations" className="space-y-6">
                {analysis.recommendations.map((rec, idx) => (
                  <Card key={rec.id} className="border-l-4 border-l-indigo-500">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">
                          {rec.focus}
                        </CardTitle>
                        <Badge className={getPriorityColor(rec.priority)}>
                          {rec.priority.toUpperCase()} PRIORITY
                        </Badge>
                      </div>
                      <CardDescription className="mt-2">
                        <strong>Solution:</strong> {rec.solution}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Rationale */}
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 mb-1">Why This Works</p>
                        <p className="text-sm text-gray-700">{rec.rationale}</p>
                      </div>

                      {/* Exercises */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                          <ListChecks className="w-4 h-4" />
                          Practice Exercises
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {rec.exercises.map((exercise, exIdx) => (
                            <div key={exIdx} className="bg-gray-50 p-3 rounded-lg">
                              <div className="flex items-start justify-between mb-2">
                                <p className="font-medium text-sm">{exercise.name}</p>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <Timer className="w-3 h-3" />
                                  {exercise.duration}
                                </div>
                              </div>
                              <p className="text-xs text-gray-600 mb-2">{exercise.description}</p>
                              <Badge variant="outline" className="text-xs">
                                {exercise.frequency}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* First Week Target */}
                      <div className="bg-green-50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-green-900 mb-1">Week 1 Target</p>
                        <p className="text-sm text-gray-700">{rec.firstWeekTarget}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* Coaching Guide Tab */}
              <TabsContent value="coaching" className="space-y-6">
                {/* Instructor Guidance */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      Instructor Quick Guide
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analysis.recommendations.map((rec, idx) => (
                      <div key={idx} className="p-4 bg-blue-50 rounded-lg">
                        <p className="font-medium text-sm text-blue-900 mb-2">
                          For "{rec.focus}":
                        </p>
                        <p className="text-sm text-gray-700 italic">
                          💡 {rec.instructorTip}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Parent Communication */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      Parent Communication Points
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analysis.recommendations.map((rec, idx) => (
                        <div key={idx} className="p-4 bg-purple-50 rounded-lg">
                          <p className="font-medium text-sm text-purple-900 mb-2">
                            Regarding {rec.focus}:
                          </p>
                          <p className="text-sm text-gray-700">
                            {rec.parentMessage}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Preferred Feedback Style */}
                <Card className="bg-gray-50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Heart className="w-5 h-5" />
                      Communication Approach
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-700">
                      This student responds best to{' '}
                      <span className="font-semibold text-indigo-600">
                        {analysis.diagnosis.studentProfile.preferredFeedbackStyle}
                      </span>{' '}
                      feedback. Adjust your communication style accordingly for maximum impact.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 p-4 border-t flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {analysis && (
              <>
                Analysis generated on {new Date(analysis.analysisDate).toLocaleDateString()}
                {analysis.cached && (
                  <span className="ml-2 text-xs text-gray-400">
                    (Cached from {new Date(analysis.cacheDate).toLocaleDateString()})
                  </span>
                )}
              </>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700">
              <Award className="w-4 h-4 mr-2" />
              Save to Profile
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default EnhancedStudentRecommendations