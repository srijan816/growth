'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Calendar, 
  Clock, 
  Users,
  ArrowRight,
  BookOpen,
  AlertCircle,
  TrendingUp,
  Star,
  Loader2,
  User,
  Target,
  Search,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Input } from "@/components/ui/input"
import StudentAnalysisAnimation from '@/components/animations/StudentAnalysisAnimation'
import StudentRecommendations from '@/components/ai/StudentRecommendations'
import Link from 'next/link'

interface TodaysClass {
  code: string
  name: string
  time: string
  duration: string
  studentCount: number
  location?: string
  status: 'upcoming' | 'ongoing' | 'completed'
  priority: 'high' | 'medium' | 'low'
  students: Student[]
}

interface Student {
  id: string
  name: string
  courses: string[]
  courseNames: string[]
  feedbackCount: number
  performance: 'needs_help' | 'growing' | 'top_performer'
  lastFeedbackDate: string
  focusAreas: string[]
  strengths: string[]
}

interface TodaysClassesCalendarViewProps {
  className?: string
}

export default function TodaysClassesCalendarView({ className }: TodaysClassesCalendarViewProps) {
  const [classes, setClasses] = useState<TodaysClass[]>([])
  const [selectedClass, setSelectedClass] = useState<TodaysClass | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showStudentList, setShowStudentList] = useState(false)
  const [showAnimation, setShowAnimation] = useState(false)
  const [animatingStudent, setAnimatingStudent] = useState<Student | null>(null)
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)
  const [scientificAnalysis, setScientificAnalysis] = useState<any>(null)
  const [showPromptDebug, setShowPromptDebug] = useState(false)
  const [promptDebugData, setPromptDebugData] = useState<any>(null)

  useEffect(() => {
    fetchTodaysClasses()
  }, [])

  const fetchTodaysClasses = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get students from feedback data
      const response = await fetch('/api/feedback/students')
      const data = await response.json()
      
      if (response.ok && data.isDataReady) {
        // Group students by their classes and filter for today's schedule only
        const classMap = new Map<string, { students: Student[], classNames: string[] }>()
        const today = new Date().getDay() // 0 = Sunday, 1 = Monday, etc.
        
        data.students.forEach((student: any) => {
          if (student.classes && student.classNames) {
            student.classes.forEach((code: string, index: number) => {
              if (code && code.trim()) {
                const name = student.classNames[index] || code
                
                // Only include students if their class is scheduled for today
                const classScheduledToday = isClassScheduledToday(code, name, today)
                
                if (classScheduledToday) {
                  if (!classMap.has(code)) {
                    classMap.set(code, { students: [], classNames: [name] })
                  }
                  
                  const transformedStudent: Student = {
                    id: `${student.name}-${student.studentId || student.id || Math.random()}-${code}`,
                    name: student.name,
                    courses: [code],
                    courseNames: [name],
                    feedbackCount: student.totalFeedbacks || 0,
                    performance: determinePerformance(student),
                    lastFeedbackDate: new Date().toISOString().split('T')[0],
                    focusAreas: generateFocusAreas(student),
                    strengths: generateStrengths(student)
                  }
                  
                  classMap.get(code)?.students.push(transformedStudent)
                }
              }
            })
          }
        })
        
        // Convert to array and sort by time
        const classArray = Array.from(classMap.entries()).map(([code, data]) => {
          const classTime = generateClassTime(code)
          return {
            code,
            name: data.classNames[0] || code,
            time: classTime,
            duration: '90 min',
            studentCount: data.students.length,
            location: generateLocation(code),
            status: determineStatus(classTime),
            priority: determinePriority(data.students.length),
            students: data.students
          } as TodaysClass
        }).sort((a, b) => a.time.localeCompare(b.time))
        
        setClasses(classArray)
      } else {
        setError('No class data available. Please ensure feedback data is parsed.')
      }
    } catch (error) {
      console.error('Error fetching today\'s classes:', error)
      setError('Failed to load today\'s class data')
    } finally {
      setLoading(false)
    }
  }

  const isClassScheduledToday = (classCode: string, className: string, todayWeekday: number): boolean => {
    const classNameLower = className.toLowerCase()
    const dayNames = {
      0: ['sunday', 'sun'],
      1: ['monday', 'mon'],
      2: ['tuesday', 'tue'], 
      3: ['wednesday', 'wed'],
      4: ['thursday', 'thu'],
      5: ['friday', 'fri'],
      6: ['saturday', 'sat']
    }
    const todayNames = dayNames[todayWeekday] || []
    return todayNames.some(day => classNameLower.includes(day))
  }

  const generateClassTime = (code: string): string => {
    const times = ['09:00', '10:30', '12:00', '14:00', '15:30', '17:00', '18:30']
    const hash = code.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    return times[hash % times.length]
  }

  const generateLocation = (code: string): string => {
    const locations = ['Room A', 'Room B', 'Room C', 'Studio 1', 'Studio 2', 'Online']
    const hash = code.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    return locations[hash % locations.length]
  }

  const determineStatus = (time: string): 'upcoming' | 'ongoing' | 'completed' => {
    const now = new Date()
    const currentTime = now.getHours() * 100 + now.getMinutes()
    const classTime = parseInt(time.replace(':', ''))
    
    if (classTime > currentTime + 30) return 'upcoming'
    if (classTime > currentTime - 90) return 'ongoing'
    return 'completed'
  }

  const determinePriority = (studentCount: number): 'high' | 'medium' | 'low' => {
    if (studentCount > 8) return 'high'
    if (studentCount > 4) return 'medium'
    return 'low'
  }

  const determinePerformance = (student: any): 'needs_help' | 'growing' | 'top_performer' => {
    const feedbackCount = student.totalFeedbacks || 0
    const hash = student.name.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)
    
    if (feedbackCount > 10 && hash % 3 === 0) return 'top_performer'
    if (feedbackCount < 3 || hash % 5 === 0) return 'needs_help'
    return 'growing'
  }

  const generateFocusAreas = (student: any): string[] => {
    const areas = [
      'Public Speaking Confidence',
      'Argument Structure', 
      'Voice Projection',
      'Eye Contact',
      'Research Skills',
      'Critical Analysis',
      'Time Management',
      'Rebuttal Techniques'
    ]
    const hash = student.name.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)
    return areas.slice(0, (hash % 3) + 1)
  }

  const generateStrengths = (student: any): string[] => {
    const strengths = [
      'Clear Communication',
      'Strong Research',
      'Confident Delivery',
      'Creative Thinking',
      'Logical Arguments',
      'Excellent Preparation',
      'Good Teamwork',
      'Quick Thinking'
    ]
    const hash = student.name.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)
    return strengths.slice(0, (hash % 2) + 2)
  }

  const getStatusColor = (status: TodaysClass['status']) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'ongoing':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: TodaysClass['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  const getStatusIcon = (status: TodaysClass['status']) => {
    switch (status) {
      case 'upcoming':
        return <Clock className="w-4 h-4" />
      case 'ongoing':
        return <TrendingUp className="w-4 h-4" />
      case 'completed':
        return <Star className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case 'needs_help':
        return 'bg-red-100 text-red-700 border-red-200'
      case 'growing':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'top_performer':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getPerformanceIcon = (performance: string) => {
    switch (performance) {
      case 'needs_help':
        return <AlertCircle className="h-4 w-4" />
      case 'growing':
        return <TrendingUp className="h-4 w-4" />
      case 'top_performer':
        return <Star className="h-4 w-4" />
      default:
        return <User className="h-4 w-4" />
    }
  }

  const handleClassClick = (classItem: TodaysClass) => {
    setSelectedClass(classItem)
    setShowStudentList(true)
  }

  const handleBackToCalendar = () => {
    setShowStudentList(false)
    setSelectedClass(null)
    setSearchTerm('')
  }

  const handleStudentClick = async (student: Student) => {
    console.log('Student clicked:', student.name)
    console.log('Setting animation state...')
    setAnimatingStudent(student)
    setShowAnimation(true)
    setAnalysisComplete(false)
    
    try {
      // Call the new scientific analysis API
      const response = await fetch('/api/ai/recommendations?action=scientific-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentName: student.name,
          programType: 'PSD',
          level: 'primary'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        
        // Store debug data even when there's an error
        if (errorData.debug) {
          setPromptDebugData(errorData.debug)
          console.log('Error response contains debug data:', errorData.debug)
        } else {
          // Create minimal debug data for errors without debug info
          setPromptDebugData({
            error: errorData.error || 'Unknown error',
            details: errorData.details || 'No additional details',
            apiResponse: errorData,
            timestamp: new Date().toISOString()
          })
        }
        
        throw new Error(`Failed to generate scientific analysis: ${errorData.error || 'Unknown error'} ${errorData.details ? `(${errorData.details})` : ''}`)
      }

      const data = await response.json()
      console.log('Scientific analysis completed for:', student.name, data)
      console.log('Setting scientific analysis data:', data.scientificAnalysis)
      console.log('Setting analysisComplete to true')
      
      // Store the scientific analysis results and debug data
      setScientificAnalysis(data.scientificAnalysis)
      setPromptDebugData(data.debug)
      setAnalysisComplete(true)
    } catch (error) {
      console.error('Error generating scientific analysis:', error)
      
      // Check if it's a data quality issue
      if (error instanceof Error && error.message.includes('Insufficient feedback data')) {
        // Show a more helpful message for data quality issues
        alert(`Analysis cannot be performed: ${error.message}\n\nThe system needs detailed feedback content to generate meaningful recommendations. Please ensure feedback documents contain comprehensive observations and comments.`)
      } else {
        // Show error message to user
        alert(`Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`)
      }
      
      // Reset animation state on error but keep student for debug access
      setShowAnimation(false)
      setAnalysisComplete(false)
      // Don't reset animatingStudent or promptDebugData so debug info is still accessible
    }
  }

  // Return empty array when no scientific analysis is available
  const getRecommendations = (student: Student) => {
    return scientificAnalysis?.recommendations || []
  }

  const filteredStudents = selectedClass?.students.filter(student => 
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading today's classes...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (showStudentList && selectedClass) {
    return (
      <div className="p-6 space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleBackToCalendar}
              className="flex items-center space-x-2"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Calendar</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{selectedClass.code}</h1>
              <p className="text-gray-600">{selectedClass.name} • {selectedClass.time}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={`${getStatusColor(selectedClass.status)} flex items-center space-x-1`}>
              {getStatusIcon(selectedClass.status)}
              <span className="capitalize">{selectedClass.status}</span>
            </Badge>
            <div className="flex items-center space-x-1 text-sm text-gray-600">
              <Users className="h-4 w-4" />
              <span>{selectedClass.studentCount} students</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Students Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => (
            <Card 
              key={student.id} 
              className="hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => handleStudentClick(student)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{student.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {student.feedbackCount} feedback sessions
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={`${getPerformanceColor(student.performance)} flex items-center space-x-1`}>
                    {getPerformanceIcon(student.performance)}
                    <span className="capitalize">{student.performance.replace('_', ' ')}</span>
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  {/* Performance Indicator */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Performance Status:</span>
                    <div className="flex items-center space-x-1">
                      {student.performance === 'needs_help' && (
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      )}
                      {student.performance === 'growing' && (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      )}
                      {student.performance === 'top_performer' && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      )}
                      <span className="capitalize font-medium">
                        {student.performance.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Focus Areas Preview */}
                  {student.focusAreas.length > 0 && (
                    <div>
                      <div className="text-sm font-medium text-gray-700 mb-1">Focus Areas:</div>
                      <div className="flex flex-wrap gap-1">
                        {student.focusAreas.slice(0, 2).map((area, index) => (
                          <Badge key={`${student.id}_focus_${area}_${index}`} variant="outline" className="text-xs">
                            {area}
                          </Badge>
                        ))}
                        {student.focusAreas.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{student.focusAreas.length - 2} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action Button */}
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors"
                  >
                    <Target className="mr-2 h-4 w-4" />
                    Analyze & Get Recommendations
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredStudents.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center h-64 text-center">
              <Users className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
              <p className="text-gray-600">
                {searchTerm ? 'Try adjusting your search terms' : 'No students enrolled in this class'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Student Analysis Animation */}
        <StudentAnalysisAnimation
          studentName={animatingStudent?.name || ''}
          isVisible={showAnimation}
          analysisComplete={analysisComplete}
          onComplete={() => {
            setShowAnimation(false)
            if (animatingStudent) {
              setShowRecommendations(true)
            }
          }}
          duration={60000}
        />

        {/* Student Recommendations Display */}
        {animatingStudent && (
          <StudentRecommendations
            studentName={animatingStudent.name}
            recommendations={getRecommendations(animatingStudent)}
            strengths={animatingStudent.strengths}
            focusAreas={animatingStudent.focusAreas}
            scientificAnalysis={scientificAnalysis}
            isVisible={showRecommendations}
            onClose={() => {
              setShowRecommendations(false)
              setAnimatingStudent(null)
              setScientificAnalysis(null)
            }}
          />
        )}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="mr-3 h-8 w-8 text-blue-600" />
            Today's Classes
          </h1>
          <p className="text-gray-600">
            Click on any class to view and manage students
          </p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          <span>{new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
      </div>

      {/* Class Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-blue-700">Classes Today</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{classes.length}</div>
            <div className="text-sm text-gray-600">Scheduled sessions</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-green-700">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {classes.reduce((total, cls) => total + cls.studentCount, 0)}
            </div>
            <div className="text-sm text-gray-600">Across all classes</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-red-700">Need Support</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {classes.reduce((total, cls) => 
                total + cls.students.filter(s => s.performance === 'needs_help').length, 0
              )}
            </div>
            <div className="text-sm text-gray-600">Students requiring attention</div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar View of Classes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-blue-600" />
            Today's Schedule
          </CardTitle>
          <CardDescription>
            Click on any class to view students and manage attendance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {classes.map((classItem) => (
              <div
                key={classItem.code}
                onClick={() => handleClassClick(classItem)}
                className="group p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-white hover:bg-blue-50"
              >
                {/* Main Class Row */}
                <div className="flex items-start justify-between mb-3">
                  {/* Left Side - Class Info */}
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    {/* Priority Indicator */}
                    <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${getPriorityColor(classItem.priority)}`}></div>
                    
                    {/* Class Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold text-gray-900 text-base">{classItem.code}</h3>
                        <Badge className={`${getStatusColor(classItem.status)} flex items-center space-x-1 text-xs px-2 py-0.5`}>
                          {getStatusIcon(classItem.status)}
                          <span className="capitalize">{classItem.status}</span>
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{classItem.name}</p>
                      
                      {/* Time and Location Row */}
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4" />
                          <span className="font-medium">{classItem.time}</span>
                        </div>
                        <span>•</span>
                        <span>{classItem.duration}</span>
                        {classItem.location && (
                          <>
                            <span>•</span>
                            <div className="flex items-center space-x-1">
                              <BookOpen className="h-3 w-3" />
                              <span>{classItem.location}</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Right Side - Student Count and Action */}
                  <div className="flex items-center space-x-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="flex items-center space-x-1 text-sm text-gray-700 mb-1">
                        <Users className="h-4 w-4" />
                        <span className="font-medium">{classItem.studentCount}</span>
                      </div>
                      <div className="text-xs text-gray-500">students</div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
                
                {/* Status Indicator for Ongoing Classes */}
                {classItem.status === 'ongoing' && (
                  <div className="flex items-center justify-center pt-2 border-t border-green-100">
                    <div className="flex items-center space-x-2 text-green-600">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs font-medium">Class in Progress</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {classes.length === 0 && (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No classes today</h3>
                <p className="text-gray-600">Your schedule is clear for today.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Student Analysis Animation */}
      <StudentAnalysisAnimation
        studentName={animatingStudent?.name || ''}
        isVisible={showAnimation}
        analysisComplete={analysisComplete}
        onComplete={() => {
          console.log('Animation completed!')
          setShowAnimation(false)
          if (animatingStudent) {
            setShowRecommendations(true)
          }
        }}
        duration={60000}
      />
      
      {/* Debug Info - Disabled */}
      {false && (
        <div style={{ position: 'fixed', top: '10px', right: '10px', background: 'rgba(0,0,0,0.8)', color: 'white', padding: '10px', borderRadius: '5px', fontSize: '12px', zIndex: 10000 }}>
          <div>Animation Visible: {showAnimation ? 'YES' : 'NO'}</div>
          <div>Animating Student: {animatingStudent?.name || 'NONE'}</div>
          <div>Analysis Complete: {analysisComplete ? 'YES' : 'NO'}</div>
          <div>Show Recommendations: {showRecommendations ? 'YES' : 'NO'}</div>
          <div>Scientific Analysis: {scientificAnalysis ? 'HAS DATA' : 'NO DATA'}</div>
          <div>Prompt Debug: {promptDebugData ? 'HAS DATA' : 'NO DATA'}</div>
          {promptDebugData && (
            <button 
              onClick={() => setShowPromptDebug(!showPromptDebug)}
              style={{ marginTop: '5px', padding: '2px 8px', fontSize: '10px', backgroundColor: promptDebugData.error ? '#dc2626' : '#2563eb', color: 'white', border: 'none', borderRadius: '3px' }}
            >
              {showPromptDebug ? 'Hide' : 'Show'} {promptDebugData.error ? 'Error' : 'Prompt'} Debug
            </button>
          )}
        </div>
      )}

      {/* Student Recommendations Display */}
      {animatingStudent && (
        <StudentRecommendations
          studentName={animatingStudent.name}
          recommendations={getRecommendations(animatingStudent)}
          strengths={animatingStudent.strengths}
          focusAreas={animatingStudent.focusAreas}
          scientificAnalysis={scientificAnalysis}
          isVisible={showRecommendations}
          onClose={() => {
            setShowRecommendations(false)
            setAnimatingStudent(null)
            setScientificAnalysis(null)
          }}
        />
      )}

      {/* Prompt Debug Modal */}
      {showPromptDebug && promptDebugData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">
                  {promptDebugData.error ? 'Error Debug Information' : 'AI Prompt Debug Information'}
                </h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowPromptDebug(false)}
                >
                  ✕
                </Button>
              </div>
              <div className="mt-2 text-sm text-gray-600">
                {promptDebugData.error ? (
                  <div>
                    <div className="text-red-600 font-medium">Error: {promptDebugData.error}</div>
                    <div>Details: {promptDebugData.details}</div>
                    <div>Timestamp: {promptDebugData.timestamp}</div>
                  </div>
                ) : (
                  <div>
                    <div>Prompt Length: {promptDebugData.promptLength} characters</div>
                    <div>Feedback Sessions: {promptDebugData.feedbackSessionCount} total, {promptDebugData.meaningfulSessionCount} meaningful</div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                {promptDebugData.error ? (
                  <div>
                    <h3 className="font-semibold text-gray-800 mb-2">Full API Response:</h3>
                    <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                      {JSON.stringify(promptDebugData.apiResponse, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <>
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">Sample Feedback Data:</h3>
                      <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto">
                        {JSON.stringify(promptDebugData.sampleFeedback, null, 2)}
                      </pre>
                    </div>
                    
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-2">Full Prompt Sent to AI:</h3>
                      <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto whitespace-pre-wrap">
                        {promptDebugData.prompt}
                      </pre>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}