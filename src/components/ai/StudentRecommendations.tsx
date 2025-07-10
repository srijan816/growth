'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
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
  X
} from 'lucide-react'

interface Recommendation {
  id: string
  title: string
  priority: 'high' | 'medium' | 'low'
  category: 'skill-building' | 'practice' | 'mindset' | 'technique'
  targetIssue: string // The problem
  diagnosis: string // Root cause
  description: string // The solution
  rationale: string // Why it works
  actions: string[]
  timeframe: string
  measurableGoals: string[]
  confidence: number
}

interface StudentRecommendationsProps {
  studentName: string
  recommendations: Recommendation[]
  strengths: string[]
  focusAreas: string[]
  scientificAnalysis?: any
  isVisible: boolean
  onClose: () => void
}

const StudentRecommendations: React.FC<StudentRecommendationsProps> = ({
  studentName,
  recommendations,
  strengths,
  focusAreas,
  scientificAnalysis,
  isVisible,
  onClose
}) => {
  if (!isVisible) return null

  console.log('StudentRecommendations - scientificAnalysis:', scientificAnalysis)
  console.log('StudentRecommendations - fallback recommendations:', recommendations)

  // Transform scientific analysis recommendations to the expected format
  const transformScientificRecommendations = (scientificRecs: any[]): Recommendation[] => {
    return scientificRecs.map((rec, index) => {
      // Extract concise action items
      const actions = [
        ...(rec.actionItems?.practiceExercises || []),
        ...(rec.actionItems?.preparationFocus || []),
        ...(rec.actionItems?.nextDebateObjectives || [])
      ].slice(0, 4) // Limit to 4 actions

      // Create success metrics without truncation
      const measurableGoals = rec.measurableGoals?.shortTerm || []

      return {
        id: rec.id || `sci_rec_${index}`,
        title: rec.skill || 'Skill Development',
        priority: rec.priority as 'high' | 'medium' | 'low',
        category: rec.category === 'immediate_action' ? 'practice' :
                  rec.category === 'skill_development' ? 'skill-building' : 'technique',
        targetIssue: rec.targetIssue || 'Performance challenge',
        diagnosis: rec.diagnosis || 'Root cause analysis needed',
        description: rec.recommendation || '',
        rationale: rec.rationale || 'Evidence-based approach',
        actions: actions,
        timeframe: rec.timeframe || '',
        measurableGoals: measurableGoals,
        confidence: rec.patternContext?.issueFrequency ? Math.round(rec.patternContext.issueFrequency * 100) : 85
      }
    })
  }

  // Use scientific analysis recommendations if available, otherwise use provided recommendations
  const displayRecommendations = scientificAnalysis?.recommendations 
    ? transformScientificRecommendations(scientificAnalysis.recommendations)
    : recommendations

  // Use scientific analysis strengths if available
  const displayStrengths = scientificAnalysis?.keyStrengths 
    ? scientificAnalysis.keyStrengths.map((strength: any) => strength.strengthName).slice(0, 4)
    : (scientificAnalysis ? 
        Object.values(scientificAnalysis.skillCategories || {})
          .filter((skill: any) => skill.progress === 'improving' || skill.currentLevel === 'Advanced')
          .map((skill: any) => skill.name || '')
          .slice(0, 3)
        : strengths)

  // Use scientific analysis focus areas if available  
  const displayFocusAreas = scientificAnalysis?.patternAnalysis?.recentConcerns
    ? scientificAnalysis.patternAnalysis.recentConcerns.map((concern: any) => concern.concern).slice(0, 3)
    : focusAreas

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-700 border-green-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'skill-building': return <Target className="w-4 h-4" />
      case 'practice': return <BookOpen className="w-4 h-4" />
      case 'mindset': return <Star className="w-4 h-4" />
      case 'technique': return <Award className="w-4 h-4" />
      default: return <Target className="w-4 h-4" />
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
        className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-2xl"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-6 h-6" />
                Growth Recommendations
              </h1>
              <p className="text-blue-100 mt-1">Personalized insights for {studentName}</p>
            </div>
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

        <div className="p-6 space-y-6">
          {/* Student Overview - Strengths Only */}
          {scientificAnalysis?.keyStrengths && scientificAnalysis.keyStrengths.length > 0 && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-green-700 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Key Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {scientificAnalysis.keyStrengths.slice(0, 3).map((strength: any, index: number) => (
                    <motion.div
                      key={`strength_${index}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border-l-3 border-green-400 pl-3 py-1"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                          {strength.type}
                        </Badge>
                        <span className="font-medium text-sm text-green-800">{strength.strengthName}</span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {strength.howToLeverage}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Star className="w-5 h-5 text-blue-600" />
              Strategic Recommendations
            </h2>
            
            <div className="grid grid-cols-1 gap-4">
              {displayRecommendations.length > 0 ? displayRecommendations.map((rec, index) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.15 + 0.5 }}
                >
                  <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                          {getCategoryIcon(rec.category)}
                          {rec.title}
                        </CardTitle>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={getPriorityColor(rec.priority)}>
                            {rec.priority.toUpperCase()}
                          </Badge>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {rec.timeframe}
                          </div>
                        </div>
                      </div>
                      <CardDescription className="mt-2 space-y-3 w-full">
                        {/* Problem Identification */}
                        <div className="bg-red-50 p-3 rounded-lg">
                          <h5 className="text-sm font-semibold text-red-800 mb-1">Problem:</h5>
                          <p className="text-sm text-gray-700">{rec.targetIssue}</p>
                        </div>
                        
                        {/* Root Cause */}
                        <div className="bg-orange-50 p-3 rounded-lg">
                          <h5 className="text-sm font-semibold text-orange-800 mb-1">Root Cause:</h5>
                          <p className="text-sm text-gray-700">{rec.diagnosis}</p>
                        </div>
                        
                        {/* Solution */}
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <h5 className="text-sm font-semibold text-blue-800 mb-1">Solution:</h5>
                          <p className="text-sm text-gray-700">{rec.description}</p>
                        </div>
                        
                        {/* Why It Works */}
                        <div className="bg-green-50 p-3 rounded-lg">
                          <h5 className="text-sm font-semibold text-green-800 mb-1">Why This Works:</h5>
                          <p className="text-sm text-gray-700">{rec.rationale}</p>
                        </div>
                      </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Action Steps */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                          <ArrowRight className="w-4 h-4 text-blue-600" />
                          Action Steps
                        </h4>
                        <ul className="space-y-1">
                          {rec.actions.map((action, actionIndex) => (
                            <li key={actionIndex} className="text-sm text-gray-700 flex items-start gap-2">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                              <span className="text-sm">{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Measurable Goals */}
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center gap-1">
                          <Target className="w-4 h-4 text-green-600" />
                          Success Metrics
                        </h4>
                        <div className="space-y-2">
                          {rec.measurableGoals.map((goal, goalIndex) => (
                            <div key={goalIndex} className="bg-gray-50 p-2 rounded-lg">
                              <div className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                                <span className="text-sm text-gray-700">{goal}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Confidence Indicator */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-500">Confidence Level</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                              style={{ width: `${rec.confidence}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium text-gray-700">{rec.confidence}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-4">
                    <AlertCircle className="w-12 h-12 mx-auto mb-2" />
                    <h3 className="text-lg font-medium text-gray-700">No Recommendations Available</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Unable to generate recommendations due to insufficient feedback data.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <BookOpen className="w-4 h-4 mr-2" />
              Save to Student Profile
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default StudentRecommendations