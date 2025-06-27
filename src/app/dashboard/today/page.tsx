'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  Calendar, 
  User, 
  Search, 
  AlertCircle, 
  TrendingUp, 
  Target,
  Clock,
  Users,
  Star,
  ArrowRight
} from 'lucide-react'
import StudentAnalysisAnimation from '@/components/animations/StudentAnalysisAnimation'
import StudentRecommendations from '@/components/ai/StudentRecommendations'

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

interface TodaysClass {
  code: string
  name: string
  time: string
  students: Student[]
}

export default function TodaysClassPage() {
  const [classes, setClasses] = useState<TodaysClass[]>([])
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAnimation, setShowAnimation] = useState(false)
  const [animatingStudent, setAnimatingStudent] = useState<Student | null>(null)
  const [showRecommendations, setShowRecommendations] = useState(false)
  const [analysisComplete, setAnalysisComplete] = useState(false)

  useEffect(() => {
    fetchTodaysClasses()
    
    // Check for class parameter in URL
    const urlParams = new URLSearchParams(window.location.search)
    const classParam = urlParams.get('class')
    if (classParam) {
      setSelectedClass(classParam)
    }
  }, [])

  const fetchTodaysClasses = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get students from feedback data
      const response = await fetch('/api/feedback/students')
      const data = await response.json()
      
      if (response.ok && data.isDataReady) {
        // Group students by their classes and simulate today's schedule
        const classMap = new Map<string, TodaysClass>()
        
        data.students.forEach((student: any) => {
          if (student.classes && student.classNames) {
            student.classes.forEach((code: string, index: number) => {
              if (code && code.trim()) {
                const name = student.classNames[index] || code
                
                if (!classMap.has(code)) {
                  classMap.set(code, {
                    code,
                    name,
                    time: generateClassTime(code),
                    students: []
                  })
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
            })
          }
        })
        
        // Convert to array and sort by time
        const classArray = Array.from(classMap.values())
          .sort((a, b) => a.time.localeCompare(b.time))
        
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

  const generateClassTime = (code: string): string => {
    // Generate realistic class times based on code
    const times = ['09:00', '10:30', '14:00', '15:30', '17:00']
    const hash = code.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    return times[hash % times.length]
  }

  const determinePerformance = (student: any): 'needs_help' | 'growing' | 'top_performer' => {
    const feedbackCount = student.totalFeedbacks || 0
    const hash = student.name.split('').reduce((a: number, b: string) => a + b.charCodeAt(0), 0)
    
    // Simulate performance based on feedback count and name hash
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

  const handleStudentClick = async (student: Student) => {
    setAnimatingStudent(student)
    setShowAnimation(true)
    setAnalysisComplete(false)
    
    // Simulate data compilation during animation
    setTimeout(() => {
      console.log('Student analysis completed for:', student.name)
      setAnalysisComplete(true)
    }, 6000)
  }

  // Generate mock recommendations for the student
  const generateMockRecommendations = (student: Student) => {
    return [
      {
        id: `${student.name}-rec-1`,
        title: 'Improve Public Speaking Confidence',
        priority: 'high' as const,
        category: 'skill-building' as const,
        description: 'Focus on building confidence through structured practice sessions and gradual exposure to larger audiences.',
        actions: [
          'Practice daily 5-minute impromptu speeches',
          'Record practice sessions to review body language',
          'Join peer feedback sessions for constructive input'
        ],
        timeframe: '3-4 weeks',
        measurableGoals: [
          'Maintain eye contact for 80% of speech time',
          'Reduce filler words by 50%',
          'Speak without notes for 3+ minutes'
        ],
        confidence: 87
      },
      {
        id: `${student.name}-rec-2`,
        title: 'Strengthen Argument Structure',
        priority: 'medium' as const,
        category: 'technique' as const,
        description: 'Develop clear claim-evidence-warrant progression in all arguments for more persuasive communication.',
        actions: [
          'Use CEW template for each main argument',
          'Practice outlining before speaking or writing',
          'Study exemplary debate performances'
        ],
        timeframe: '2-3 weeks',
        measurableGoals: [
          'Include 3 well-structured arguments per presentation',
          'Connect evidence clearly to main claims',
          'Improve logical flow between points'
        ],
        confidence: 75
      }
    ]
  }

  const filteredStudents = () => {
    let allStudents: Student[] = []
    
    if (selectedClass === 'all') {
      allStudents = classes.flatMap(cls => cls.students)
      // Remove duplicates by using a Map with unique keys
      const uniqueStudents = new Map<string, Student>()
      allStudents.forEach(student => {
        uniqueStudents.set(student.id, student)
      })
      allStudents = Array.from(uniqueStudents.values())
    } else {
      const cls = classes.find(c => c.code === selectedClass)
      allStudents = cls?.students || []
    }
    
    return allStudents.filter(student => 
      student.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading today's classes...</p>
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

  return (
    <div className="p-4 md:p-6 space-y-6 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="mr-3 h-8 w-8 text-blue-600" />
            {selectedClass === 'all' ? "Today's Classes" : `${selectedClass} - Today's Class`}
          </h1>
          <p className="text-gray-600">
            {selectedClass === 'all' 
              ? "Monitor student performance and provide targeted support" 
              : `Students enrolled in ${selectedClass} class`
            }
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
              {classes.reduce((total, cls) => total + cls.students.length, 0)}
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
              {filteredStudents().filter(s => s.performance === 'needs_help').length}
            </div>
            <div className="text-sm text-gray-600">Students requiring attention</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-full md:w-64">
            <SelectValue placeholder="Filter by class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes ({classes.length})</SelectItem>
            {classes.map((cls) => (
              <SelectItem key={cls.code} value={cls.code}>
                <div className="flex items-center justify-between w-full">
                  <span>{cls.code}</span>
                  <span className="text-xs text-gray-500 ml-2">{cls.time}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Student Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStudents().map((student) => (
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

      {filteredStudents().length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64 text-center">
            <Users className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search terms' : 'No classes scheduled for today'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Student Analysis Animation */}
      <StudentAnalysisAnimation
        studentName={animatingStudent?.name || ''}
        isVisible={showAnimation}
        onComplete={() => {
          setShowAnimation(false)
          if (animatingStudent) {
            setShowRecommendations(true)
          }
        }}
        duration={6000}
      />

      {/* Student Recommendations Display */}
      {animatingStudent && (
        <StudentRecommendations
          studentName={animatingStudent.name}
          recommendations={generateMockRecommendations(animatingStudent)}
          strengths={animatingStudent.strengths}
          focusAreas={animatingStudent.focusAreas}
          isVisible={showRecommendations}
          onClose={() => {
            setShowRecommendations(false)
            setAnimatingStudent(null)
          }}
        />
      )}
    </div>
  )
}