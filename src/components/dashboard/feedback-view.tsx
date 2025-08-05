'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Clock, 
  Upload, 
  FileText, 
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3
} from 'lucide-react'

interface FeedbackViewProps {
  primaryFeedback: any[]
  secondaryFeedback: any[]
  isLoadingFeedback: boolean
  studentGrade: string
}

// Rubric name mapping
const rubricNames: Record<string, string> = {
  'rubric_1': 'Time Management',
  'rubric_2': 'POI Handling',
  'rubric_3': 'Speaking Style',
  'rubric_4': 'Argument Completeness',
  'rubric_5': 'Theory Application',
  'rubric_6': 'Rebuttal Effectiveness',
  'rubric_7': 'Team Support',
  'rubric_8': 'Feedback Application'
}

export default function FeedbackView({ 
  primaryFeedback, 
  secondaryFeedback, 
  isLoadingFeedback,
  studentGrade 
}: FeedbackViewProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFilter, setSelectedFilter] = useState('all')
  const [viewMode, setViewMode] = useState<'timeline' | 'table'>('timeline')

  // Combine all feedback for easier processing
  const allFeedback = [...primaryFeedback, ...secondaryFeedback]

  // Calculate aggregated metrics for secondary feedback
  const metrics = useMemo(() => {
    if (secondaryFeedback.length === 0) return null

    const rubricTotals: Record<string, { sum: number; count: number }> = {}
    let totalSpeakingTime = 0

    secondaryFeedback.forEach(feedback => {
      const scores = feedback.rubric_scores || feedback.metadata?.rubric_scores
      if (scores) {
        Object.entries(scores).forEach(([key, value]) => {
          if (!rubricTotals[key]) rubricTotals[key] = { sum: 0, count: 0 }
          if (value !== 0) { // Exclude N/A scores
            rubricTotals[key].sum += Number(value)
            rubricTotals[key].count += 1
          }
        })
      }

      // Parse duration (MM:SS format)
      if (feedback.duration) {
        const [minutes, seconds] = feedback.duration.split(':').map(Number)
        totalSpeakingTime += (minutes * 60) + (seconds || 0)
      }
    })

    // Calculate averages
    const rubricAverages = Object.entries(rubricTotals).map(([key, data]) => ({
      name: rubricNames[key] || key,
      average: data.count > 0 ? data.sum / data.count : 0,
      count: data.count
    }))

    const overallAverage = rubricAverages.reduce((sum, r) => sum + r.average, 0) / rubricAverages.length

    return {
      totalFeedback: secondaryFeedback.length,
      overallAverage,
      rubricAverages,
      avgSpeakingTime: totalSpeakingTime / secondaryFeedback.length,
      improvement: calculateImprovement(secondaryFeedback)
    }
  }, [secondaryFeedback])

  // Calculate improvement trend
  function calculateImprovement(feedbacks: any[]) {
    if (feedbacks.length < 2) return 0
    
    const sortedByDate = [...feedbacks].sort((a, b) => 
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    
    const firstScores = extractAverageScore(sortedByDate[0])
    const lastScores = extractAverageScore(sortedByDate[sortedByDate.length - 1])
    
    return ((lastScores - firstScores) / firstScores) * 100
  }

  function extractAverageScore(feedback: any) {
    const scores = feedback.rubric_scores || feedback.metadata?.rubric_scores
    if (!scores) return 0
    
    const validScores = Object.values(scores).filter(s => s !== 0)
    return validScores.length > 0 
      ? validScores.reduce((sum: number, s: any) => sum + Number(s), 0) / validScores.length 
      : 0
  }

  // Extract teacher comments
  function extractTeacherComments(item: any) {
    let teacherComments = item.teacher_comments
    
    if (!teacherComments && item.content && item.feedback_type === 'secondary') {
      const contentParts = item.content.split('TEACHER COMMENTS:')
      if (contentParts.length > 1) {
        teacherComments = contentParts[1].trim()
      }
    }
    
    return teacherComments
  }

  // Filter feedback based on search and filters
  const filteredFeedback = allFeedback.filter(item => {
    const matchesSearch = searchQuery === '' || 
      item.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.motion?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      extractTeacherComments(item)?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFilter = selectedFilter === 'all' || 
      (selectedFilter === 'primary' && item.feedback_type === 'primary') ||
      (selectedFilter === 'secondary' && item.feedback_type === 'secondary')
    
    return matchesSearch && matchesFilter
  })

  const toggleCard = (id: string) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedCards(newExpanded)
  }

  const getScoreColor = (score: number) => {
    if (score >= 4) return 'text-green-600'
    if (score >= 3) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number) => {
    if (score === 0) return 'bg-gray-100'
    if (score >= 4) return 'bg-green-100'
    if (score >= 3) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  if (isLoadingFeedback) {
    return (
      <div className="py-8 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
        Loading feedback...
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary Section for Secondary Students */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{metrics.overallAverage.toFixed(1)}/5</p>
                <p className="text-sm text-muted-foreground">Overall Average</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{metrics.totalFeedback}</p>
                <p className="text-sm text-muted-foreground">Total Feedback</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold flex items-center justify-center gap-1">
                  {metrics.improvement > 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  {Math.abs(metrics.improvement).toFixed(0)}%
                </p>
                <p className="text-sm text-muted-foreground">Improvement</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {Math.floor(metrics.avgSpeakingTime / 60)}:{String(Math.floor(metrics.avgSpeakingTime % 60)).padStart(2, '0')}
                </p>
                <p className="text-sm text-muted-foreground">Avg Speaking Time</p>
              </div>
            </div>

            {/* Rubric Averages */}
            <div className="mt-6 space-y-2">
              <p className="text-sm font-medium">Average Scores by Rubric</p>
              {metrics.rubricAverages.map(rubric => (
                <div key={rubric.name} className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{rubric.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          rubric.average >= 4 ? 'bg-green-600' : 
                          rubric.average >= 3 ? 'bg-yellow-600' : 'bg-red-600'
                        }`}
                        style={{ width: `${(rubric.average / 5) * 100}%` }}
                      />
                    </div>
                    <span className={`text-sm font-medium ${getScoreColor(rubric.average)}`}>
                      {rubric.average.toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search feedback by topic, motion, or comments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('all')}
              >
                All
              </Button>
              {primaryFeedback.length > 0 && (
                <Button
                  variant={selectedFilter === 'primary' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFilter('primary')}
                >
                  Primary
                </Button>
              )}
              {secondaryFeedback.length > 0 && (
                <Button
                  variant={selectedFilter === 'secondary' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedFilter('secondary')}
                >
                  Secondary
                </Button>
              )}
            </div>
            <Button size="sm" className="md:ml-auto">
              <Upload className="h-4 w-4 mr-2" />
              Upload Feedback
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* View Tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'timeline' | 'table')}>
        <TabsList>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
          {secondaryFeedback.length > 0 && (
            <TabsTrigger value="table">Table View</TabsTrigger>
          )}
        </TabsList>

        {/* Timeline View */}
        <TabsContent value="timeline" className="space-y-4">
          {filteredFeedback.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No feedback matches your search' : 'No feedback uploaded yet'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredFeedback.map((item, index) => {
                const isExpanded = expandedCards.has(item.id || `${index}`)
                const avgScore = extractAverageScore(item)
                
                return (
                  <Card key={item.id || index} className="overflow-hidden">
                    <CardContent className="p-4">
                      {/* Compact Header */}
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => toggleCard(item.id || `${index}`)}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <p className="font-medium">
                              {new Date(item.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </p>
                            {item.unit_number && (
                              <Badge variant="secondary">
                                Unit {item.unit_number}{item.lesson_number && `.${item.lesson_number}`}
                              </Badge>
                            )}
                            <Badge variant={item.feedback_type === 'primary' ? 'secondary' : 'default'}>
                              {item.feedback_type === 'primary' ? 'Primary' : 'Secondary'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {item.motion || item.topic || 'General Feedback'}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {avgScore > 0 && (
                            <div className="text-right">
                              <p className={`text-lg font-semibold ${getScoreColor(avgScore)}`}>
                                {avgScore.toFixed(1)}/5
                              </p>
                              <p className="text-xs text-muted-foreground">Average</p>
                            </div>
                          )}
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="mt-4 space-y-4 border-t pt-4">
                          {/* Metadata */}
                          <div className="flex items-center gap-4 text-sm">
                            <Badge variant="outline">
                              {item.instructor || 'Instructor'}
                            </Badge>
                            {item.duration && (
                              <Badge variant="secondary">
                                <Clock className="h-3 w-3 mr-1" />
                                {item.duration}
                              </Badge>
                            )}
                            {item.class_code && (
                              <span className="text-muted-foreground">{item.class_code}</span>
                            )}
                          </div>

                          {/* Motion/Topic */}
                          {(item.motion || item.topic) && (
                            <div className="p-3 rounded-lg bg-gray-50">
                              <p className="text-sm font-medium">
                                {item.feedback_type === 'secondary' ? 'Motion:' : 'Topic:'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {item.motion || item.topic}
                              </p>
                            </div>
                          )}

                          {/* Rubric Scores for Secondary */}
                          {item.feedback_type === 'secondary' && (item.rubric_scores || item.metadata?.rubric_scores) && (
                            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                              <p className="text-sm font-semibold text-gray-700 mb-3">📊 Performance Rubric:</p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {Object.entries(item.rubric_scores || item.metadata?.rubric_scores || {}).map(([key, value]) => {
                                  const displayName = rubricNames[key] || key.replace(/_/g, ' ')
                                  const score = Number(value)
                                  
                                  return (
                                    <div key={key} className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-100">
                                      <span className="text-sm font-medium text-gray-700">{displayName}</span>
                                      <div className="flex items-center gap-2">
                                        <div className="flex gap-1">
                                          {[1, 2, 3, 4, 5].map((n) => (
                                            <div
                                              key={n}
                                              className={`w-2 h-2 rounded-full ${
                                                score === 0 ? 'bg-gray-200' :
                                                n <= score ? getScoreBgColor(score).replace('bg-', 'bg-') : 'bg-gray-200'
                                              }`}
                                            />
                                          ))}
                                        </div>
                                        <span className={`text-sm font-semibold min-w-[3ch] text-right ${
                                          score === 0 ? 'text-gray-400' : getScoreColor(score)
                                        }`}>
                                          {score === 0 ? 'N/A' : score}
                                        </span>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {/* Primary Feedback Content */}
                          {item.feedback_type === 'primary' && (
                            <>
                              {(item.best_aspects || item.metadata?.best_aspects) && (
                                <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                                  <p className="text-sm font-semibold text-green-700 mb-2">
                                    ✨ What was BEST:
                                  </p>
                                  <div className="text-sm text-green-900 whitespace-pre-wrap leading-relaxed">
                                    {(item.best_aspects || item.metadata?.best_aspects)
                                      .split(/(?<=[.!?])\s+/)
                                      .filter(s => s.trim())
                                      .map((sentence, idx) => (
                                        <div key={idx} className="mb-2">
                                          • {sentence.trim()}
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}
                              
                              {(item.improvement_areas || item.metadata?.improvement_areas) && (
                                <div className="p-4 rounded-lg bg-orange-50 border border-orange-200">
                                  <p className="text-sm font-semibold text-orange-700 mb-2">
                                    🎯 Needs IMPROVEMENT:
                                  </p>
                                  <div className="text-sm text-orange-900 whitespace-pre-wrap leading-relaxed">
                                    {(item.improvement_areas || item.metadata?.improvement_areas)
                                      .split(/(?<=[.!?])\s+/)
                                      .filter(s => s.trim())
                                      .map((sentence, idx) => (
                                        <div key={idx} className="mb-2">
                                          • {sentence.trim()}
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}
                            </>
                          )}

                          {/* Teacher Comments */}
                          {(() => {
                            const comments = extractTeacherComments(item)
                            return comments ? (
                              <div className={`p-4 rounded-lg ${
                                item.feedback_type === 'secondary' 
                                  ? 'bg-blue-50 border border-blue-200' 
                                  : 'bg-gray-50 border border-gray-200'
                              }`}>
                                <p className={`text-sm font-semibold mb-2 ${
                                  item.feedback_type === 'secondary' 
                                    ? 'text-blue-700' 
                                    : 'text-gray-700'
                                }`}>
                                  💬 Teacher Comments:
                                </p>
                                <div className={`text-sm whitespace-pre-wrap leading-relaxed ${
                                  item.feedback_type === 'secondary' 
                                    ? 'text-blue-900' 
                                    : 'text-gray-900'
                                }`}>
                                  {comments.split(/\n\n+/).map((paragraph, idx) => (
                                    <p key={idx} className="mb-3">
                                      {paragraph.trim()}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            ) : null
                          })()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* Table View for Secondary */}
        {secondaryFeedback.length > 0 && (
          <TabsContent value="table">
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-4 font-medium">Rubric</th>
                        {secondaryFeedback.slice(0, 6).map((feedback, index) => (
                          <th key={index} className="p-4 text-center min-w-[100px]">
                            <div className="text-xs text-muted-foreground">
                              {new Date(feedback.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </div>
                            <div className="text-xs font-normal text-muted-foreground">
                              Unit {feedback.unit_number || '?'}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(rubricNames).map(([key, name]) => (
                        <tr key={key} className="border-b">
                          <td className="p-4 font-medium text-sm">{name}</td>
                          {secondaryFeedback.slice(0, 6).map((feedback, index) => {
                            const scores = feedback.rubric_scores || feedback.metadata?.rubric_scores || {}
                            const score = scores[key] || 0
                            
                            return (
                              <td key={index} className="p-4 text-center">
                                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${getScoreBgColor(score)}`}>
                                  <span className={`font-medium ${score === 0 ? 'text-gray-400' : getScoreColor(score)}`}>
                                    {score === 0 ? 'N/A' : score}
                                  </span>
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                      <tr>
                        <td className="p-4 font-medium text-sm">Average</td>
                        {secondaryFeedback.slice(0, 6).map((feedback, index) => {
                          const avgScore = extractAverageScore(feedback)
                          
                          return (
                            <td key={index} className="p-4 text-center">
                              <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg ${getScoreBgColor(avgScore)}`}>
                                <span className={`font-medium ${getScoreColor(avgScore)}`}>
                                  {avgScore.toFixed(1)}
                                </span>
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
                {secondaryFeedback.length > 6 && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Showing most recent 6 feedback entries
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}