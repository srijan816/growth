'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar,
  TrendingUp,
  Star,
  BarChart3,
  Target,
  Award,
  Clock,
  BookOpen,
  MessageSquare,
  ChevronRight,
  Filter
} from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts'

interface AttendanceRecord {
  id: string
  session_id: string
  status: 'present' | 'absent' | 'makeup'
  attitude_efforts?: number
  asking_questions?: number
  application_skills?: number
  application_feedback?: number
  notes?: string
  date: string | Date
  course_code: string
  course_name: string
  unit_number?: string
  lesson_number?: string
}

interface AttendanceViewProps {
  attendance: AttendanceRecord[]
  studentName: string
}

// Rating category labels and colors
const RATING_CATEGORIES = {
  attitude_efforts: { label: 'Attitude & Efforts', color: '#8B5CF6', icon: '💪' },
  asking_questions: { label: 'Asking Questions', color: '#06B6D4', icon: '❓' },
  application_skills: { label: 'Application of Skills', color: '#10B981', icon: '🎯' },
  application_feedback: { label: 'Application of Feedback', color: '#F59E0B', icon: '📝' }
}

// Helper function to format rating for display
const formatRating = (rating?: number | string | null): string => {
  if (rating === undefined || rating === null) return 'N/A'
  const numRating = typeof rating === 'string' ? parseFloat(rating) : rating
  if (isNaN(numRating) || typeof numRating !== 'number') return 'N/A'
  return numRating.toFixed(1)
}

// Helper function to get rating color based on value
const getRatingColor = (rating?: number | string | null): string => {
  if (rating === undefined || rating === null) return 'text-gray-400'
  const numRating = typeof rating === 'string' ? parseFloat(rating) : rating
  if (isNaN(numRating) || typeof numRating !== 'number') return 'text-gray-400'
  if (numRating >= 3.5) return 'text-green-600'
  if (numRating >= 2.5) return 'text-yellow-600'
  return 'text-red-600'
}

// Helper function to get heatmap cell background color
const getHeatmapColor = (rating?: number | null): string => {
  if (rating === null || rating === undefined) return 'bg-gray-100'
  if (rating >= 3.5) return 'bg-green-500'
  if (rating >= 3.0) return 'bg-green-400'
  if (rating >= 2.5) return 'bg-yellow-400'
  if (rating >= 2.0) return 'bg-orange-400'
  if (rating >= 1.5) return 'bg-red-400'
  return 'bg-red-500'
}

// Helper function to get text color for heatmap cells
const getHeatmapTextColor = (rating?: number | null): string => {
  if (rating === null || rating === undefined) return 'text-gray-500'
  if (rating >= 2.5) return 'text-white'
  return 'text-white'
}

// Helper function to get star display
const getStarDisplay = (rating?: number | null) => {
  if (!rating || typeof rating !== 'number') return { filled: 0, total: 4 }
  const filled = Math.floor(rating)
  const hasHalf = rating % 1 >= 0.5
  return { filled, hasHalf, total: 4 }
}

export default function AttendanceView({ attendance, studentName }: AttendanceViewProps) {
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('all')

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log('AttendanceView received:', {
      attendanceCount: attendance.length,
      studentName,
      sampleRecord: attendance[0]
    })
  }

  // Early return if no data
  if (!attendance || attendance.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Attendance Data</h3>
          <p className="text-muted-foreground">
            No attendance records found for {studentName}.
            Attendance data will appear here once sessions are recorded.
          </p>
        </div>
      </div>
    )
  }

  // Process attendance data
  const courses = Array.from(new Set(attendance.map(a => a.course_code)))
  const filteredAttendance = attendance.filter(a =>
    selectedCourse === 'all' || a.course_code === selectedCourse
  )

  // Calculate overall statistics
  const totalSessions = filteredAttendance.length
  const presentSessions = filteredAttendance.filter(a => a.status === 'present').length
  const attendanceRate = totalSessions > 0 ? (presentSessions / totalSessions) * 100 : 0

  if (process.env.NODE_ENV === 'development') {
    console.log('AttendanceView calculations:', {
      totalSessions,
      presentSessions,
      attendanceRate,
      courses,
      filteredCount: filteredAttendance.length
    })
  }

  // Calculate average ratings
  const avgRatings = Object.keys(RATING_CATEGORIES).reduce((acc, category) => {
    const ratings = filteredAttendance
      .map(a => (a as any)[category])
      .filter(r => r !== undefined && r !== null)
      .map(r => typeof r === 'string' ? parseFloat(r) : r)
      .filter(r => !isNaN(r) && typeof r === 'number')

    acc[category] = ratings.length > 0
      ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length
      : 0
    return acc
  }, {} as Record<string, number>)

  if (process.env.NODE_ENV === 'development') {
    console.log('Average ratings calculated:', avgRatings)
  }

  // Prepare heatmap data structure
  const heatmapData = (() => {
    const attendanceBySession = filteredAttendance
      .filter(a => a.status === 'present')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((record) => {
        // Convert string ratings to numbers
        const parseRating = (rating: any) => {
          if (rating === undefined || rating === null) return null
          const parsed = typeof rating === 'string' ? parseFloat(rating) : rating
          return !isNaN(parsed) && typeof parsed === 'number' ? parsed : null
        }

        return {
          session: `${record.unit_number || 'U'}.${record.lesson_number || 'L'}`,
          date: record.date,
          attitude_efforts: parseRating(record.attitude_efforts),
          asking_questions: parseRating(record.asking_questions),
          application_skills: parseRating(record.application_skills),
          application_feedback: parseRating(record.application_feedback)
        }
      })

    // Create heatmap matrix: categories as rows, sessions as columns
    const categories = Object.keys(RATING_CATEGORIES)
    const sessions = attendanceBySession.map(a => a.session)

    const matrix = categories.map(category => {
      const categoryData = attendanceBySession.map(session => ({
        session: session.session,
        value: session[category as keyof typeof session] as number | null
      }))

      // Calculate row average
      const validValues = categoryData.filter(d => d.value !== null).map(d => d.value!)
      const average = validValues.length > 0 ? validValues.reduce((sum, v) => sum + v, 0) / validValues.length : 0

      return {
        category,
        label: RATING_CATEGORIES[category as keyof typeof RATING_CATEGORIES].label,
        data: categoryData,
        average
      }
    })

    // Calculate column averages (session averages)
    const sessionAverages = sessions.map(session => {
      const sessionData = attendanceBySession.find(a => a.session === session)
      if (!sessionData) return { session, average: 0 }

      const values = [
        sessionData.attitude_efforts,
        sessionData.asking_questions,
        sessionData.application_skills,
        sessionData.application_feedback
      ].filter(v => v !== null) as number[]

      const average = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0
      return { session, average }
    })

    return { matrix, sessions, sessionAverages }
  })()

  // Prepare radar chart data for current performance
  const radarData = Object.entries(RATING_CATEGORIES).map(([key, config]) => ({
    category: config.label,
    rating: typeof avgRatings[key] === 'number' ? avgRatings[key] : 0,
    fullMark: 4
  }))

  // Recent sessions for detailed view
  const recentSessions = filteredAttendance
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Attendance & Performance</h3>
          <p className="text-sm text-muted-foreground">
            Track {studentName}'s attendance and 4-category performance ratings
          </p>
        </div>
        
        <div className="flex gap-2">
          <select 
            value={selectedCourse} 
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="all">All Courses</option>
            {courses.map(course => (
              <option key={course} value={course}>{course}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-bold">{attendanceRate.toFixed(1)}%</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {presentSessions} of {totalSessions} sessions
            </p>
          </CardContent>
        </Card>

        {Object.entries(RATING_CATEGORIES).map(([key, config]) => (
          <Card key={key}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{config.label}</p>
                  <p className={`text-2xl font-bold ${getRatingColor(avgRatings[key])}`}>
                    {formatRating(avgRatings[key])}
                  </p>
                </div>
                <div className="text-2xl">{config.icon}</div>
              </div>
              <div className="flex items-center mt-1">
                {[...Array(4)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3 w-3 ${
                      avgRatings[key] && !isNaN(avgRatings[key]) && i < Math.floor(avgRatings[key])
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts and Detailed Views */}
      <Tabs defaultValue="progress" className="space-y-4">
        <TabsList>
          <TabsTrigger value="progress">Performance Heatmap</TabsTrigger>
          <TabsTrigger value="performance">Performance Radar</TabsTrigger>
          <TabsTrigger value="sessions">Session Details</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Heatmap
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Visual representation of performance across categories and sessions. Darker colors indicate higher scores.
              </p>
            </CardHeader>
            <CardContent>
              {heatmapData.matrix.length > 0 && heatmapData.sessions.length > 0 ? (
                <div className="space-y-4">
                  {/* Color Scale Legend */}
                  <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">Score Scale:</span>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-red-500 rounded"></div>
                      <span className="text-xs">0-1.5</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-red-400 rounded"></div>
                      <span className="text-xs">1.5-2</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-orange-400 rounded"></div>
                      <span className="text-xs">2-2.5</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                      <span className="text-xs">2.5-3</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-green-400 rounded"></div>
                      <span className="text-xs">3-3.5</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-4 h-4 bg-green-500 rounded"></div>
                      <span className="text-xs">3.5-4</span>
                    </div>
                  </div>

                  {/* Heatmap Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr>
                          <th className="p-2 text-left font-medium text-sm border-b">Category</th>
                          {heatmapData.sessions.map(session => (
                            <th key={session} className="p-2 text-center font-medium text-xs border-b min-w-[60px]">
                              {session}
                            </th>
                          ))}
                          <th className="p-2 text-center font-medium text-sm border-b bg-gray-50">Avg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {heatmapData.matrix.map((row) => (
                          <tr key={row.category}>
                            <td className="p-2 font-medium text-sm border-r bg-gray-50">
                              {row.label}
                            </td>
                            {row.data.map((cell) => (
                              <td key={cell.session} className="p-0 border border-gray-200">
                                <div
                                  className={`w-full h-12 flex items-center justify-center text-xs font-medium ${getHeatmapColor(cell.value)} ${getHeatmapTextColor(cell.value)}`}
                                  title={`${row.label} - ${cell.session}: ${cell.value !== null ? formatRating(cell.value) : 'N/A'}`}
                                >
                                  {cell.value !== null ? formatRating(cell.value) : '-'}
                                </div>
                              </td>
                            ))}
                            <td className="p-2 text-center font-medium text-sm border-l bg-gray-50">
                              {formatRating(row.average)}
                            </td>
                          </tr>
                        ))}
                        {/* Session averages row */}
                        <tr className="border-t-2">
                          <td className="p-2 font-medium text-sm bg-gray-50">Session Avg</td>
                          {heatmapData.sessionAverages.map((sessionAvg) => (
                            <td key={sessionAvg.session} className="p-2 text-center font-medium text-xs bg-gray-50">
                              {formatRating(sessionAvg.average)}
                            </td>
                          ))}
                          <td className="p-2 text-center font-medium text-sm bg-gray-100">
                            {formatRating(
                              heatmapData.sessionAverages.length > 0
                                ? heatmapData.sessionAverages.reduce((sum, s) => sum + s.average, 0) / heatmapData.sessionAverages.length
                                : 0
                            )}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No attendance data available for the selected filters
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Current Performance Profile
              </CardTitle>
            </CardHeader>
            <CardContent>
              {radarData.some(d => d.rating > 0) ? (
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="category" />
                    <PolarRadiusAxis angle={90} domain={[0, 4]} />
                    <Radar
                      name="Performance"
                      dataKey="rating"
                      stroke="#8B5CF6"
                      fill="#8B5CF6"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No performance data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Recent Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentSessions.length > 0 ? recentSessions.map((session) => (
                  <div key={session.id} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={session.status === 'present' ? 'default' : 'secondary'}>
                          {session.status}
                        </Badge>
                        <span className="font-medium">{session.course_code}</span>
                        <span className="text-sm text-muted-foreground">
                          Unit {session.unit_number} Lesson {session.lesson_number}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(session.date).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {session.status === 'present' && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
                        {Object.entries(RATING_CATEGORIES).map(([key, config]) => {
                          const rating = (session as any)[key]
                          return (
                            <div key={key} className="text-center">
                              <p className="text-xs text-muted-foreground mb-1">{config.label}</p>
                              <div className="flex items-center justify-center gap-1">
                                <span className={`font-medium ${getRatingColor(rating)}`}>
                                  {formatRating(rating)}
                                </span>
                                <div className="flex">
                                  {[...Array(4)].map((_, i) => {
                                    const numRating = typeof rating === 'string' ? parseFloat(rating) : rating
                                    const isActive = numRating && !isNaN(numRating) && i < Math.floor(numRating)
                                    return (
                                      <Star
                                        key={i}
                                        className={`h-3 w-3 ${
                                          isActive
                                            ? 'text-yellow-400 fill-yellow-400'
                                            : 'text-gray-300'
                                        }`}
                                      />
                                    )
                                  })}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    
                    {session.notes && (
                      <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                        <MessageSquare className="h-4 w-4 inline mr-1" />
                        {session.notes}
                      </div>
                    )}
                  </div>
                )) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No attendance records found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
