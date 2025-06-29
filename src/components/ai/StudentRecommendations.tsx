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
  description: string
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
  isVisible: boolean
  onClose: () => void
}

const StudentRecommendations: React.FC<StudentRecommendationsProps> = ({
  studentName,
  recommendations,
  strengths,
  focusAreas,
  isVisible,
  onClose
}) => {
  if (!isVisible) return null

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
          {/* Student Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-green-700 flex items-center gap-2">
                  <CheckCircle className="w-5 w-5" />
                  Key Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {strengths.map((strength, index) => (
                    <motion.div
                      key={`strength_${strength.slice(0,15)}_${index}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        {strength}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Focus Areas */}
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-orange-700 flex items-center gap-2">
                  <Target className="w-5 w-5" />
                  Focus Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {focusAreas.map((area, index) => (
                    <motion.div
                      key={`focus_${area.slice(0,15)}_${index}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.2 }}
                    >
                      <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                        {area}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Star className="w-5 h-5 text-blue-600" />
              Strategic Recommendations
            </h2>
            
            <div className="grid grid-cols-1 gap-4">
              {recommendations.map((rec, index) => (
                <motion.div
                  key={rec.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.15 + 0.5 }}
                >
                  <Card className="hover:shadow-lg transition-shadow border-l-4 border-l-blue-500">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg text-gray-900 flex items-center gap-2">
                            {getCategoryIcon(rec.category)}
                            {rec.title}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {rec.description}
                          </CardDescription>
                        </div>
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
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      {/* Action Steps */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-1">
                          <ArrowRight className="w-4 h-4 text-blue-600" />
                          Action Steps
                        </h4>
                        <ul className="space-y-1">
                          {rec.actions.map((action, actionIndex) => (
                            <li key={actionIndex} className="text-sm text-gray-700 flex items-start gap-2">
                              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Measurable Goals */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-1">
                          <Target className="w-4 h-4 text-green-600" />
                          Success Metrics
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {rec.measurableGoals.map((goal, goalIndex) => (
                            <Badge key={goalIndex} variant="outline" className="text-xs">
                              {goal}
                            </Badge>
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
              ))}
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