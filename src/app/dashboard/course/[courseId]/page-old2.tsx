'use client'

import React, { useState, useEffect, use } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
// import {
//   Tooltip,
//   TooltipContent,
//   TooltipProvider,
//   TooltipTrigger,
// } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { 
  Users, 
  Calendar, 
  BarChart3, 
  FileText,
  Clock,
  TrendingUp,
  CheckCircle,
  Download,
  Search,
  ChevronDown,
  Brain,
  AlertCircle,
  Target,
  MessageSquare,
  User,
  Filter,
  ArrowUpRight,
  Lightbulb,
  X,
  Check,
  ChevronRight,
  Timer,
  PlayCircle,
  MoreVertical,
  Sparkles,
  ChevronUp,
  Award
} from 'lucide-react'
import { Progress } from "@/components/ui/progress"
import { cn } from '@/lib/utils'

interface CourseDetailPageProps {
  params: Promise<{ courseId: string }>
}

export default function CourseDetailPage({ params }: CourseDetailPageProps) {
  const { courseId } = use(params)
  const [courseData, setCourseData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [isSessionLive, setIsSessionLive] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [sessionExpanded, setSessionExpanded] = useState(true)
  const [aiInsightsExpanded, setAiInsightsExpanded] = useState(true)
  const [dismissedInsights, setDismissedInsights] = useState<number[]>([])
  const [showGrowthDetails, setShowGrowthDetails] = useState(false)
  const [showSearchTooltip, setShowSearchTooltip] = useState(true)

  useEffect(() => {
    fetchCourseData()
  }, [courseId])

  const fetchCourseData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/courses/${courseId}`)
      const data = await response.json()
      
      if (response.ok) {
        setCourseData(data)
      } else {
        setError(data.error || 'Failed to load course data')
      }
    } catch (error) {
      console.error('Error fetching course:', error)
      setError('Failed to load course data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading course details...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !courseData) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-700">{error || 'Course not found'}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { course, metrics, students, recentSessions } = courseData

  // Mock data for demonstration
  const todaySession = {
    time: '18:00 - 19:30',
    topic: 'Basic Speech Techniques & Rebuttals',
    objectives: [
      'Practice speech hooks and introductions',
      'Focus on rebuttal structure',
      'Confidence building exercises'
    ],
    focusStudents: [
      { name: 'Sarah Chen', issue: 'Rebuttals' },
      { name: 'Alex Rivera', issue: 'Confidence' },
      { name: 'Jordan Smith', issue: 'Structure' }
    ],
    materials: ['Debate Motion Cards', 'Rubric Sheets', 'Timer']
  }

  const aiInsights = [
    { id: 1, type: 'warning', message: '3 students struggling with rebuttal structure', action: 'Suggest drill' },
    { id: 2, type: 'success', message: 'Class average improved 15% in speech hooks', action: null },
    { id: 3, type: 'info', message: 'Consider pairing Sarah with Alex for peer review', action: 'Create pairs' }
  ]

  // Filter students based on search
  const filteredStudents = students?.filter((student: any) => {
    const search = searchTerm.toLowerCase()
    
    // Special filters
    if (search === 'at-risk') {
      return student.growthTrend === 'declining' || student.metrics.attendanceRate < 70
    }
    if (search === 'top') {
      return student.metrics.avgPerformance >= 4.0
    }
    if (search === 'no-feedback') {
      return !student.metrics.lastFeedbackDate
    }
    
    // Regular search
    return student.name.toLowerCase().includes(search) ||
           student.studentId.toLowerCase().includes(search) ||
           student.school.toLowerCase().includes(search)
  }) || []

  const activeInsights = aiInsights.filter(insight => !dismissedInsights.includes(insight.id))

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header with Timing Details */}
      <div className="bg-white border-b">
        <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">
                  {course.courseCode}: {course.courseName}
                </h1>
                <div className="flex items-center gap-4 mt-3">
                  <Badge variant="secondary" className="text-sm">{course.courseLevel}</Badge>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">{course.schedule}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-green-600" />
                    <span className="font-medium">{course.enrolledCount} students enrolled</span>
                  </div>
                  {course.isActive && (
                    <Badge className="bg-green-500 text-white">Active Course</Badge>
                  )}
                </div>
              </div>
              
              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => window.location.href = `/dashboard/quick-entry?class=${course.courseCode}`}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Take Attendance
                </Button>
                <Button 
                  variant="default"
                  onClick={() => window.location.href = `/dashboard/recording?class=${course.courseCode}`}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Give Feedback
                </Button>
              </div>
            </div>

            {/* Integrated Tab Navigation */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="bg-transparent border-b rounded-none h-auto p-0">
                <TabsTrigger 
                  value="overview" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 pb-3"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger 
                  value="students" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 pb-3"
                >
                  Students
                </TabsTrigger>
                <TabsTrigger 
                  value="sessions" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 pb-3"
                >
                  Sessions
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 pb-3"
                >
                  Analytics
                </TabsTrigger>
                <TabsTrigger 
                  value="resources" 
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 pb-3"
                >
                  Resources
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Streamlined Today's Session Widget */}
              {course.isActive && (
                <Card className={cn(
                  "border-blue-200 transition-all duration-300",
                  !sessionExpanded && "pb-0"
                )}>
                  <CardHeader 
                    className="cursor-pointer"
                    onClick={() => setSessionExpanded(!sessionExpanded)}
                  >
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Timer className="h-5 w-5" />
                        Today's Session: {todaySession.time}
                        {isSessionLive && (
                          <Badge variant="destructive" className="animate-pulse ml-2">
                            Live
                          </Badge>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant={isSessionLive ? "destructive" : "default"}
                          onClick={(e) => {
                            e.stopPropagation()
                            setIsSessionLive(!isSessionLive)
                          }}
                        >
                          {isSessionLive ? 'End Session' : 'Start Session'}
                        </Button>
                        {sessionExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </div>
                    </div>
                  </CardHeader>
                  {sessionExpanded && (
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Session Details */}
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-sm mb-2">Topic</h4>
                            <p className="text-sm text-muted-foreground">{todaySession.topic}</p>
                          </div>
                          <div>
                            <h4 className="font-medium text-sm mb-2">Objectives</h4>
                            <ul className="text-sm space-y-1">
                              {todaySession.objectives.map((obj, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-muted-foreground">
                                  <ChevronRight className="h-3 w-3 mt-0.5 text-blue-600 flex-shrink-0" />
                                  <span>{obj}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Session Toolkit - Tabbed */}
                        <div className="space-y-3">
                          <Tabs defaultValue="tools" className="w-full">
                            <TabsList className="grid grid-cols-2 h-8">
                              <TabsTrigger value="tools" className="text-xs">Quick Tools</TabsTrigger>
                              <TabsTrigger value="focus" className="text-xs">Focus Students (3)</TabsTrigger>
                            </TabsList>
                            <TabsContent value="tools" className="mt-3">
                              <div className="grid grid-cols-2 gap-2">
                                <Button variant="outline" size="sm" className="justify-start" title="Mark attendance in 1 click">
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  Attendance
                                </Button>
                                <Button variant="outline" size="sm" className="justify-start">
                                  <MessageSquare className="mr-2 h-4 w-4" />
                                  Feedback
                                </Button>
                              </div>
                            </TabsContent>
                            <TabsContent value="focus" className="mt-3">
                              <div className="space-y-2">
                                {todaySession.focusStudents.slice(0, 3).map((student, idx) => (
                                  <div key={idx} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                                    <span className="text-sm font-medium">{student.name}</span>
                                    <Badge variant="outline" className="text-xs text-orange-600">
                                      {student.issue}
                                    </Badge>
                                  </div>
                                ))}
                                <Button variant="ghost" size="sm" className="w-full text-xs">
                                  View All Recommendations
                                </Button>
                              </div>
                            </TabsContent>
                          </Tabs>
                        </div>
                      </div>
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Simplified Stats Cards - Max 4 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      Total Students
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics.totalStudents}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {course.enrolledCount} enrolled
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      Attendance
                      <CheckCircle className="h-4 w-4 text-muted-foreground" title="Average attendance rate across all sessions" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-3">
                      <div className="relative w-14 h-14">
                        <svg className="w-14 h-14 transform -rotate-90">
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            stroke="#e5e7eb"
                            strokeWidth="4"
                            fill="none"
                          />
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            stroke={metrics.avgAttendanceRate > 80 ? "#10b981" : "#f59e0b"}
                            strokeWidth="4"
                            fill="none"
                            strokeDasharray={`${(metrics.avgAttendanceRate / 100) * 150.8} 150.8`}
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                          {metrics.avgAttendanceRate}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Last {course.totalSessions} sessions
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setShowGrowthDetails(!showGrowthDetails)}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      Avg Growth
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <ChevronDown className={cn("h-3 w-3 transition-transform", showGrowthDetails && "rotate-180")} />
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold">{metrics.avgGrowthScore}</span>
                        <span className="text-sm text-green-600 font-medium">↑5%</span>
                      </div>
                      <Progress value={(metrics.avgGrowthScore / 5) * 100} className="h-2" />
                      {/* Inline sparkline placeholder */}
                      <div className="h-8 flex items-end gap-0.5">
                        {[3, 5, 4, 7, 6, 8, 9].map((h, i) => (
                          <div key={i} className="flex-1 bg-blue-200 rounded-t" style={{height: `${h * 4}px`}} />
                        ))}
                      </div>
                    </div>
                    {showGrowthDetails && (
                      <div className="mt-3 pt-3 border-t space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Speech Hooks</span>
                          <span className="font-medium">2.5</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span>Rebuttals</span>
                          <span className="font-medium text-orange-600">2.1</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Weekly Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">+15%</div>
                    <p className="text-xs text-muted-foreground mt-1">Overall improvement</p>
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Top: Confidence</span>
                        <div className="flex items-center gap-1">
                          <div className="w-12 bg-gray-200 rounded-full h-1.5">
                            <div className="bg-green-500 h-1.5 rounded-full" style={{width: '88%'}}></div>
                          </div>
                          <span className="text-xs font-medium">+22%</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Vertical AI Insights - Collapsible */}
              {activeInsights.length > 0 && (
                <Card className="overflow-hidden">
                  <CardHeader 
                    className="cursor-pointer pb-3"
                    onClick={() => setAiInsightsExpanded(!aiInsightsExpanded)}
                  >
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4" />
                        AI Insights ({activeInsights.length})
                      </div>
                      {aiInsightsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </CardTitle>
                  </CardHeader>
                  {aiInsightsExpanded && (
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {activeInsights.slice(0, 3).map((insight) => (
                          <div 
                            key={insight.id} 
                            className={cn(
                              "p-3 rounded-lg border-l-4 flex items-start justify-between gap-3",
                              insight.type === 'warning' && "border-l-orange-400 bg-orange-50",
                              insight.type === 'success' && "border-l-green-400 bg-green-50",
                              insight.type === 'info' && "border-l-blue-400 bg-blue-50"
                            )}
                          >
                            <div className="flex items-start gap-2 flex-1">
                              {insight.type === 'warning' && <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />}
                              {insight.type === 'success' && <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />}
                              {insight.type === 'info' && <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5" />}
                              <div className="flex-1">
                                <p className="text-sm">{insight.message}</p>
                                {insight.action && (
                                  <Button variant="link" size="sm" className="h-auto p-0 mt-1 text-xs">
                                    {insight.action} →
                                  </Button>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => setDismissedInsights([...dismissedInsights, insight.id])}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      {activeInsights.length > 3 && (
                        <Button variant="ghost" size="sm" className="w-full mt-2">
                          View {activeInsights.length - 3} more insights
                        </Button>
                      )}
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Refined Student Table */}
              <Card className="overflow-visible">
                <CardHeader>
                  <CardTitle>Students & Growth Tracking</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {/* Sticky Search Bar - Directly above table */}
                  <div className="sticky top-0 z-20 bg-white border-b px-6 py-3">
                    <div className="flex items-center justify-between">
                      <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search by name or school to filter below..."
                          value={searchTerm}
                          onChange={(e) => {
                            setSearchTerm(e.target.value)
                            setShowSearchTooltip(false)
                          }}
                          onFocus={() => setShowSearchTooltip(false)}
                          className="pl-10 pr-10 w-full transition-all focus:ring-2 focus:ring-blue-500"
                          title="Type here to instantly filter the student list below. Try special filters like 'at-risk' or 'top'!"
                        />
                        {searchTerm && (
                          <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-10 top-2.5 text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="absolute right-1 top-1 h-8 w-8 p-0">
                              <Filter className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSearchTerm('at-risk')}>
                              <AlertCircle className="mr-2 h-4 w-4 text-orange-600" />
                              At-Risk Students
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSearchTerm('top')}>
                              <Award className="mr-2 h-4 w-4 text-green-600" />
                              Top Performers
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setSearchTerm('no-feedback')}>
                              <MessageSquare className="mr-2 h-4 w-4 text-gray-600" />
                              No Recent Feedback
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      {searchTerm && (
                        <div className="ml-4 text-sm text-muted-foreground animate-in fade-in duration-300">
                          <span className="font-medium">{filteredStudents.length}</span>/{students.length} students match
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="px-6 pb-6">
                  {/* Term Start Banner */}
                  {students.every((s: any) => !s.metrics.lastFeedbackDate) && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-blue-600" />
                      <p className="text-sm text-blue-800">
                        Term just started — add feedback after your first session to track growth
                      </p>
                    </div>
                  )}

                  {filteredStudents.length > 0 ? (
                    <div className="rounded-lg border overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-muted/30">
                            <th className="p-4 text-left">
                              <Checkbox 
                                checked={selectedStudents.length === filteredStudents.length && filteredStudents.length > 0}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedStudents(filteredStudents.map((s: any) => s.id))
                                    setShowBulkActions(true)
                                  } else {
                                    setSelectedStudents([])
                                    setShowBulkActions(false)
                                  }
                                }}
                                className={cn(!showBulkActions && "opacity-0 hover:opacity-100")}
                              />
                            </th>
                            <th className="p-4 text-left font-medium">Student</th>
                            <th className="p-4 text-center font-medium">Growth</th>
                            <th className="p-4 text-center font-medium">Attendance</th>
                            <th className="p-4 text-center font-medium">Feedback</th>
                            <th className="p-4 text-left font-medium">Focus</th>
                            <th className="p-4 text-center">
                              <MoreVertical className="h-4 w-4 mx-auto" />
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStudents.map((student: any, index: number) => (
                            <tr 
                              key={student.id} 
                              className={cn(
                                "border-t hover:bg-muted/20 transition-all duration-200",
                                !student.metrics.lastFeedbackDate && "opacity-75",
                                searchTerm && "bg-blue-50/50"
                              )}
                            >
                            <td className="p-4">
                              <Checkbox
                                checked={selectedStudents.includes(student.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedStudents([...selectedStudents, student.id])
                                    setShowBulkActions(true)
                                  } else {
                                    setSelectedStudents(selectedStudents.filter(id => id !== student.id))
                                  }
                                }}
                                className={cn(!showBulkActions && "opacity-0 group-hover:opacity-100")}
                              />
                            </td>
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                  <User className="h-4 w-4 text-gray-600" />
                                </div>
                                <div>
                                  <p className="font-medium">{student.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {student.grade} • {student.school}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-20">
                                  <Progress 
                                    value={(student.metrics.avgPerformance / 5) * 100} 
                                    className={cn(
                                      "h-1.5",
                                      student.growthTrend === 'improving' && "[&>div]:bg-green-500",
                                      student.growthTrend === 'declining' && "[&>div]:bg-red-500"
                                    )}
                                  />
                                </div>
                                <span className="text-sm font-medium">{student.metrics.avgPerformance.toFixed(1)}</span>
                                {student.growthTrend === 'improving' && <TrendingUp className="h-3 w-3 text-green-600" />}
                                {student.growthTrend === 'declining' && <TrendingUp className="h-3 w-3 text-red-600 rotate-180" />}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <span className={cn(
                                "text-sm font-medium",
                                student.metrics.attendanceRate < 80 && "text-orange-600"
                              )}>
                                {student.metrics.attendanceRate}%
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              {student.metrics.lastFeedbackDate ? (
                                <span className="text-sm">
                                  {new Date(student.metrics.lastFeedbackDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400">—</span>
                              )}
                            </td>
                            <td className="p-4">
                              <div className="flex gap-1">
                                {student.focusAreas.slice(0, 2).map((area: string, idx: number) => (
                                  <Badge 
                                    key={idx} 
                                    variant="outline" 
                                    className={cn(
                                      "text-xs",
                                      area === 'Rebuttals' && "border-orange-300 text-orange-700",
                                      area === 'Confidence' && "border-blue-300 text-blue-700"
                                    )}
                                  >
                                    {area}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem>
                                    <MessageSquare className="mr-2 h-4 w-4" />
                                    Add Feedback
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <BarChart3 className="mr-2 h-4 w-4" />
                                    View Profile
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <ArrowUpRight className="mr-2 h-4 w-4" />
                                    Full Details
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  ) : (
                    <div className="py-12 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                        <Search className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
                      <p className="text-gray-600 mb-4">
                        {searchTerm 
                          ? `No matches for "${searchTerm}" — try broadening your search`
                          : 'No students enrolled in this course yet'
                        }
                      </p>
                      {searchTerm && (
                        <Button 
                          variant="outline" 
                          onClick={() => setSearchTerm('')}
                          className="gap-2"
                        >
                          <X className="h-4 w-4" />
                          Clear search
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Bulk Actions Bar */}
                  {showBulkActions && selectedStudents.length > 0 && (
                    <div className="mt-4 p-4 bg-muted/50 rounded-lg flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {selectedStudents.length} student{selectedStudents.length > 1 ? 's' : ''} selected
                      </span>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Bulk Feedback
                        </Button>
                        <Button variant="outline" size="sm">
                          <Target className="mr-2 h-4 w-4" />
                          Set Focus
                        </Button>
                      </div>
                    </div>
                  )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Other Tabs */}
          {activeTab === 'analytics' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Class Growth Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <p className="text-3xl font-bold text-purple-600">+15%</p>
                    <p className="text-muted-foreground mt-1">Average improvement across all metrics</p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { metric: 'Speech Structure', value: 18, color: 'green' },
                      { metric: 'Confidence', value: 22, color: 'green' },
                      { metric: 'Rebuttals', value: 8, color: 'orange' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm">{item.metric}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 bg-gray-200 rounded-full h-2">
                            <div 
                              className={cn(
                                "h-2 rounded-full",
                                item.color === 'green' && "bg-green-500",
                                item.color === 'orange' && "bg-orange-500"
                              )}
                              style={{width: `${item.value * 4}%`}}
                            />
                          </div>
                          <span className={cn(
                            "text-sm font-medium",
                            item.color === 'green' && "text-green-600",
                            item.color === 'orange' && "text-orange-600"
                          )}>
                            +{item.value}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Floating Export FAB */}
        <div className="fixed bottom-6 right-6">
          <Button size="lg" className="rounded-full shadow-lg h-14 w-14" title="Export Report">
            <Download className="h-5 w-5" />
          </Button>
        </div>
      </div>
  )
}