'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Brain, 
  Target, 
  Clock, 
  TrendingUp, 
  BookOpen,
  AlertCircle,
  Loader2,
  CheckCircle
} from 'lucide-react'

interface AIRecommendation {
  id: string
  studentName: string
  growthArea: string
  priority: 'high' | 'medium' | 'low'
  category: 'skill-building' | 'practice' | 'mindset' | 'technique'
  recommendation: string
  specificActions: string[]
  timeframe: string
  measurableGoals: string[]
  resources: string[]
  instructorNotes: string
  confidence: number
  status: 'active' | 'completed' | 'archived'
  createdAt: string
}

interface AIRecommendationsProps {
  studentName: string
  programType?: string
}

export default function AIRecommendations({ 
  studentName, 
  programType = 'PSD'
}: AIRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (studentName) {
      fetchRecommendations()
    }
  }, [studentName])

  const fetchRecommendations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/ai/recommendations?student=${encodeURIComponent(studentName)}`)
      const data = await response.json()

      if (response.ok) {
        setRecommendations(data.recommendations || [])
      } else {
        setError(data.error || 'Failed to fetch recommendations')
      }
    } catch (err) {
      setError('Network error fetching recommendations')
    } finally {
      setLoading(false)
    }
  }

  const generateNewRecommendations = async () => {
    try {
      setGenerating(true)
      setError(null)

      const response = await fetch('/api/ai/recommendations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentName,
          programType
        })
      })

      const data = await response.json()

      if (response.ok) {
        setRecommendations(data.recommendations || [])
      } else {
        setError(data.error || 'Failed to generate recommendations')
      }
    } catch (err) {
      setError('Network error generating recommendations')
    } finally {
      setGenerating(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Generate Button */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Brain className="h-6 w-6 text-purple-600" />
              <div>
                <CardTitle className="text-purple-700">AI Growth Recommendations</CardTitle>
                <CardDescription className="text-purple-600">
                  Personalized improvement strategies powered by AI analysis
                </CardDescription>
              </div>
            </div>
            <Button 
              onClick={generateNewRecommendations}
              disabled={generating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Brain className="mr-2 h-4 w-4" />
                  {recommendations.length > 0 ? 'Refresh' : 'Generate'} AI Recommendations
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {recommendations.length === 0 && !error && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-48 text-center">
            <Brain className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 mb-2">No AI recommendations yet</p>
            <p className="text-sm text-gray-500 mb-4">
              Click "Generate AI Recommendations" to analyze {studentName}'s feedback and create personalized improvement strategies
            </p>
            <Button onClick={generateNewRecommendations} variant="outline">
              <Brain className="mr-2 h-4 w-4" />
              Get Started
            </Button>
          </CardContent>
        </Card>
      )}

      {recommendations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {recommendations.length} AI Recommendation{recommendations.length !== 1 ? 's' : ''} Generated
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recommendations.map((rec) => (
              <Card 
                key={rec.id}
                className="hover:shadow-md transition-shadow border-l-4 border-l-purple-400"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className={getPriorityColor(rec.priority)}>
                      {rec.priority} priority
                    </Badge>
                    <div className="text-xs text-gray-500 capitalize">{rec.category}</div>
                  </div>
                  <CardTitle className="text-sm font-semibold text-gray-900">
                    {rec.growthArea}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-700 mb-3">
                    {rec.recommendation}
                  </p>
                  
                  {/* Specific Actions */}
                  <div className="mb-3">
                    <h5 className="text-xs font-semibold text-gray-600 mb-2 flex items-center">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Action Steps ({rec.specificActions.length})
                    </h5>
                    <div className="space-y-1">
                      {rec.specificActions.slice(0, 3).map((action, index) => (
                        <div key={index} className="flex items-start space-x-2 text-xs">
                          <div className="w-4 h-4 bg-purple-100 rounded-full flex items-center justify-center text-xs font-bold text-purple-600 mt-0.5">
                            {index + 1}
                          </div>
                          <span className="text-gray-600">{action}</span>
                        </div>
                      ))}
                      {rec.specificActions.length > 3 && (
                        <div className="text-xs text-gray-500 pl-6">
                          +{rec.specificActions.length - 3} more actions
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Goals */}
                  {rec.measurableGoals.length > 0 && (
                    <div className="mb-3">
                      <h5 className="text-xs font-semibold text-gray-600 mb-2 flex items-center">
                        <Target className="h-3 w-3 mr-1" />
                        Goals ({rec.measurableGoals.length})
                      </h5>
                      <div className="space-y-1">
                        {rec.measurableGoals.slice(0, 2).map((goal, index) => (
                          <div key={index} className="text-xs text-gray-600 pl-4 border-l-2 border-blue-200">
                            {goal}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">AI Confidence</span>
                      <span className="font-medium">{rec.confidence}%</span>
                    </div>
                    <Progress value={rec.confidence} className="h-1" />
                  </div>

                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <Clock className="h-3 w-3" />
                      <span>{rec.timeframe}</span>
                    </div>
                    <span>{rec.category}</span>
                  </div>

                  {rec.instructorNotes && (
                    <div className="mt-3 p-2 bg-indigo-50 rounded text-xs">
                      <strong className="text-indigo-700">Instructor Note:</strong>
                      <p className="text-indigo-600 mt-1">{rec.instructorNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}