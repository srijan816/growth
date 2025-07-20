import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown,
  Star,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  Award
} from 'lucide-react'

interface PerformanceTabProps {
  student: any
}

export default function PerformanceTab({ student }: PerformanceTabProps) {
  const [timeRange, setTimeRange] = useState('3months')

  // Generate mock performance data if not available
  const generateMockData = () => {
    const months = ['Sept', 'Oct', 'Nov', 'Dec', 'Jan']
    return months.map((month, index) => ({
      month,
      participation: 3 + Math.random() * 2,
      understanding: 3 + Math.random() * 2,
      skills: 3 + Math.random() * 2,
      collaboration: 3 + Math.random() * 2,
      effort: 3 + Math.random() * 2,
      average: 3.5 + Math.random() * 1.5
    }))
  }

  const performanceData = generateMockData()

  // Radar chart data for current ratings
  const radarData = [
    {
      category: 'Participation',
      value: student.ratings?.categories?.participation || 3.5,
      fullMark: 5
    },
    {
      category: 'Understanding',
      value: student.ratings?.categories?.understanding || 3.0,
      fullMark: 5
    },
    {
      category: 'Skills',
      value: student.ratings?.categories?.skills || 3.2,
      fullMark: 5
    },
    {
      category: 'Collaboration',
      value: student.ratings?.categories?.collaboration || 3.4,
      fullMark: 5
    },
    {
      category: 'Effort',
      value: student.ratings?.categories?.effort || 3.0,
      fullMark: 5
    }
  ]

  // Mock class history data
  const classHistory = Array(10).fill(null).map((_, index) => ({
    date: new Date(Date.now() - index * 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
    course: student.courses?.[0]?.code || '[Course Placeholder]',
    attendance: index % 5 === 0 ? 'absent' : index % 7 === 0 ? 'makeup' : 'present',
    ratings: {
      participation: 3 + Math.random() * 2,
      understanding: 3 + Math.random() * 2,
      skills: 3 + Math.random() * 2,
      collaboration: 3 + Math.random() * 2,
      effort: 3 + Math.random() * 2
    },
    homework: index % 3 !== 0,
    notes: index % 4 === 0 ? 'Great participation today!' : ''
  }))

  const getAttendanceBadge = (status: string) => {
    switch (status) {
      case 'present':
        return <Badge className="bg-green-100 text-green-700">Present</Badge>
      case 'absent':
        return <Badge className="bg-red-100 text-red-700">Absent</Badge>
      case 'makeup':
        return <Badge className="bg-yellow-100 text-yellow-700">Makeup</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Performance Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall Rating</p>
                <p className="text-2xl font-bold">{student.ratings?.average?.toFixed(1) || '0.0'}/5</p>
              </div>
              <Star className="h-8 w-8 fill-yellow-400 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Attendance Rate</p>
                <p className="text-2xl font-bold">{student.attendance?.rate?.toFixed(0) || '0'}%</p>
              </div>
              <Calendar className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Homework</p>
                <p className="text-2xl font-bold">{student.homework?.submissionRate?.toFixed(0) || '0'}%</p>
              </div>
              <FileText className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Growth Trend</p>
                <p className="text-2xl font-bold capitalize">{student.ratings?.trend || 'stable'}</p>
              </div>
              {student.ratings?.trend === 'up' ? (
                <TrendingUp className="h-8 w-8 text-green-600" />
              ) : student.ratings?.trend === 'down' ? (
                <TrendingDown className="h-8 w-8 text-red-600" />
              ) : (
                <Award className="h-8 w-8 text-gray-600" />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Star Ratings Graph */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Star Ratings Over Time</CardTitle>
              <CardDescription>Track performance trends across categories</CardDescription>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">1 Month</SelectItem>
                <SelectItem value="3months">3 Months</SelectItem>
                <SelectItem value="6months">6 Months</SelectItem>
                <SelectItem value="1year">1 Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="participation" 
                stroke="#3b82f6" 
                name="Participation"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="understanding" 
                stroke="#10b981" 
                name="Understanding"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="skills" 
                stroke="#f59e0b" 
                name="Skills"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="collaboration" 
                stroke="#8b5cf6" 
                name="Collaboration"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="effort" 
                stroke="#ef4444" 
                name="Effort"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="average" 
                stroke="#000" 
                name="Average"
                strokeWidth={3}
                strokeDasharray="5 5"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Current Performance Radar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Performance Profile</CardTitle>
            <CardDescription>Skills assessment across all categories</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="category" />
                <PolarRadiusAxis domain={[0, 5]} />
                <Radar 
                  name="Current Rating" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.6} 
                />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
            <CardDescription>AI-generated analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Strengths</p>
                  <ul className="text-sm text-muted-foreground space-y-1 mt-1">
                    <li>• Strong collaboration skills in group activities</li>
                    <li>• Consistent participation and engagement</li>
                    <li>• Shows improvement in critical thinking</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <Award className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Areas for Growth</p>
                  <ul className="text-sm text-muted-foreground space-y-1 mt-1">
                    <li>• Develop confidence in public speaking</li>
                    <li>• Strengthen research and evidence skills</li>
                    <li>• Work on time management during tasks</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t">
              <p className="text-sm text-muted-foreground">
                {student.growthInsight || '[Performance Insight Placeholder]'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Class History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Class History</CardTitle>
          <CardDescription>Detailed attendance and performance records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Course</th>
                  <th className="text-left p-2">Attendance</th>
                  <th className="text-left p-2">Ratings</th>
                  <th className="text-left p-2">Homework</th>
                  <th className="text-left p-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {classHistory.map((session, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2">{session.date}</td>
                    <td className="p-2">{session.course}</td>
                    <td className="p-2">{getAttendanceBadge(session.attendance)}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span>{((Object.values(session.ratings).reduce((a: number, b: number) => a + b, 0) / 5)).toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="p-2">
                      {session.homework ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600" />
                      )}
                    </td>
                    <td className="p-2 max-w-xs truncate">{session.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}