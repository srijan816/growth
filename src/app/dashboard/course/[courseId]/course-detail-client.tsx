'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
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
  Award,
  MapPin,
  School,
  BookOpen
} from 'lucide-react'
import { Progress } from "@/components/ui/progress"
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface CourseDetailClientProps {
  courseData: any
}

export default function CourseDetailClient({ courseData }: CourseDetailClientProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedStudents, setSelectedStudents] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [showBulkActions, setShowBulkActions] = useState(false)

  const { course, metrics, students, recentSessions } = courseData

  // Filter students based on search
  const filteredStudents = students?.filter((student: any) => {
    if (!searchTerm) return true
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
    
    // Regular search - with null checks
    return (student.name?.toLowerCase().includes(search) || false) ||
           (student.studentId?.toLowerCase().includes(search) || false) ||
           (student.school?.toLowerCase().includes(search) || false)
  }) || []

  // Format time display
  const formatTime = (time: string) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':').map(Number)
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHours = hours % 12 || 12
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`
  }

  const getNextSessionTime = () => {
    // Calculate next session based on day of week
    const today = new Date()
    const todayName = today.toLocaleDateString('en-US', { weekday: 'long' })
    
    if (course.dayOfWeek === todayName) {
      return `Today at ${formatTime(course.startTime)}`
    } else {
      return `${course.dayOfWeek} at ${formatTime(course.startTime)}`
    }
  }

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
                  <span className="font-medium">{getNextSessionTime()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{course.schedule}</span>
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
              <Link href={`/dashboard/quick-entry?class=${course.courseCode}`}>
                <Button variant="outline">
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Take Attendance
                </Button>
              </Link>
              <Link href={`/dashboard/recording?class=${course.courseCode}`}>
                <Button variant="default">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Give Feedback
                </Button>
              </Link>
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
                Students ({students.length})
              </TabsTrigger>
              <TabsTrigger 
                value="schedule" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-4 pb-3"
              >
                Schedule & Timing
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
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
                    Attendance Rate
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.avgAttendanceRate}%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last {course.totalSessions} sessions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    Avg Growth Score
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.avgGrowthScore.toFixed(1)}/5</div>
                  <Progress value={(metrics.avgGrowthScore / 5) * 100} className="h-2 mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    Recent Activity
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.recentActivity}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last 7 days
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Sessions */}
            {recentSessions.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Recent Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentSessions.map((session: any) => (
                      <div key={session.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">
                            {new Date(session.date).toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.topic || 'General Session'}
                          </p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-sm text-center">
                            <p className="font-medium">{session.attendanceCount}</p>
                            <p className="text-xs text-muted-foreground">Present</p>
                          </div>
                          <div className="text-sm text-center">
                            <p className="font-medium">{session.avgRating.toFixed(1)}</p>
                            <p className="text-xs text-muted-foreground">Avg Rating</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'students' && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Enrolled Students</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
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
              </div>
            </CardHeader>
            <CardContent>
              {filteredStudents.length > 0 ? (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="p-4 text-left font-medium">Student</th>
                        <th className="p-4 text-center font-medium">Grade</th>
                        <th className="p-4 text-left font-medium">School</th>
                        <th className="p-4 text-center font-medium">Attendance</th>
                        <th className="p-4 text-center font-medium">Performance</th>
                        <th className="p-4 text-center font-medium">Last Feedback</th>
                        <th className="p-4 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((student: any, index: number) => (
                        <tr key={student.id} className="border-t hover:bg-muted/20">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-gray-600" />
                              </div>
                              <div>
                                <p className="font-medium">{student.name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground">
                                  ID: {student.studentId || 'N/A'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <Badge variant="outline">{student.grade || 'N/A'}</Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <School className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{student.school || 'N/A'}</span>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <span className={cn(
                              "font-medium",
                              student.metrics.attendanceRate < 80 && "text-orange-600"
                            )}>
                              {student.metrics.attendanceRate}%
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-2">
                              <Progress 
                                value={(student.metrics.avgPerformance / 5) * 100} 
                                className="w-16 h-2"
                              />
                              <span className="text-sm font-medium">
                                {student.metrics.avgPerformance.toFixed(1)}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            {student.metrics.lastFeedbackDate ? (
                              <span className="text-sm">
                                {new Date(student.metrics.lastFeedbackDate).toLocaleDateString()}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">No feedback</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <User className="mr-2 h-4 w-4" />
                                  View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <MessageSquare className="mr-2 h-4 w-4" />
                                  Add Feedback
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
                  <p className="text-muted-foreground">
                    {searchTerm ? 'No students match your search' : 'No students enrolled'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Class Schedule & Timing</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-medium mb-3">Schedule Details</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Day of Week</p>
                            <p className="text-sm text-muted-foreground">{course.dayOfWeek}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Clock className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Time</p>
                            <p className="text-sm text-muted-foreground">
                              {formatTime(course.startTime)} - {formatTime(course.endTime)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Timer className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Duration</p>
                            <p className="text-sm text-muted-foreground">90 minutes</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="font-medium mb-3">Course Information</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <BookOpen className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Program Type</p>
                            <p className="text-sm text-muted-foreground">{course.courseType}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Users className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Max Capacity</p>
                            <p className="text-sm text-muted-foreground">
                              {course.enrolledCount} / {course.studentCount || 20} students
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <CheckCircle className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">Total Sessions</p>
                            <p className="text-sm text-muted-foreground">{course.totalSessions} completed</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-3">
                      Next class: <span className="font-medium text-foreground">{getNextSessionTime()}</span>
                    </p>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/quick-entry?class=${course.courseCode}`}>
                        <Button variant="outline" size="sm">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Prepare Attendance
                        </Button>
                      </Link>
                      <Link href={`/dashboard/recording?class=${course.courseCode}`}>
                        <Button variant="outline" size="sm">
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Schedule Recording
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}