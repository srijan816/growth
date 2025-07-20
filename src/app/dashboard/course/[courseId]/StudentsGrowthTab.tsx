'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Grid3X3, 
  List, 
  TrendingUp, 
  TrendingDown,
  Minus,
  User,
  Calendar,
  MessageSquare,
  Target,
  ArrowUpRight
} from 'lucide-react'

interface Student {
  id: string
  studentId: string
  name: string
  grade: string
  school: string
  enrollmentDate: string
  metrics: {
    attendanceRate: number
    avgPerformance: number
    feedbackCount: number
    lastFeedbackDate: string | null
  }
  growthTrend: 'improving' | 'stable' | 'declining'
  focusAreas: string[]
}

interface StudentsGrowthTabProps {
  students: Student[]
  courseId: string
  onRefresh: () => void
}

export default function StudentsGrowthTab({ students, courseId, onRefresh }: StudentsGrowthTabProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'name' | 'growth' | 'attendance'>('name')

  // Filter and sort students
  const filteredStudents = students
    .filter(student => 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.studentId.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'growth':
          return b.metrics.avgPerformance - a.metrics.avgPerformance
        case 'attendance':
          return b.metrics.attendanceRate - a.metrics.attendanceRate
        default:
          return a.name.localeCompare(b.name)
      }
    })

  const getGrowthIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Minus className="h-4 w-4 text-gray-600" />
    }
  }

  const getGrowthColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600 bg-green-50'
      case 'declining':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div className="flex gap-2 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="name">Sort by Name</option>
            <option value="growth">Sort by Growth</option>
            <option value="attendance">Sort by Attendance</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Students Display */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student) => (
            <Card key={student.id} className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-gray-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{student.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {student.grade} • {student.school}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className={getGrowthColor(student.growthTrend)}>
                    {getGrowthIcon(student.growthTrend)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Growth</p>
                    <p className="font-semibold flex items-center gap-1">
                      {student.metrics.avgPerformance.toFixed(1)}/5.0
                      {student.growthTrend === 'improving' && (
                        <span className="text-green-600 text-xs">+15%</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Attendance</p>
                    <p className="font-semibold">{student.metrics.attendanceRate}%</p>
                  </div>
                </div>

                {/* Last Feedback */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageSquare className="h-3 w-3" />
                  <span>
                    {student.metrics.lastFeedbackDate 
                      ? `Feedback ${new Date(student.metrics.lastFeedbackDate).toLocaleDateString()}`
                      : 'No feedback yet'
                    }
                  </span>
                </div>

                {/* Focus Areas */}
                {student.focusAreas.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Focus Areas</p>
                    <div className="flex flex-wrap gap-1">
                      {student.focusAreas.map((area, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Target className="mr-1 h-3 w-3" />
                    View Details
                  </Button>
                  <Button variant="outline" size="sm">
                    <MessageSquare className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Student</th>
                  <th className="text-left p-4">Grade/School</th>
                  <th className="text-center p-4">Growth</th>
                  <th className="text-center p-4">Attendance</th>
                  <th className="text-center p-4">Feedback</th>
                  <th className="text-left p-4">Focus Areas</th>
                  <th className="text-center p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student) => (
                  <tr key={student.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium">{student.name}</p>
                          <p className="text-xs text-muted-foreground">{student.studentId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-sm">{student.grade}</p>
                      <p className="text-xs text-muted-foreground">{student.school}</p>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-medium">{student.metrics.avgPerformance.toFixed(1)}</span>
                        {getGrowthIcon(student.growthTrend)}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className="font-medium">{student.metrics.attendanceRate}%</span>
                    </td>
                    <td className="p-4 text-center">
                      <span className="text-sm">{student.metrics.feedbackCount}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {student.focusAreas.map((area, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {area}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <Button variant="ghost" size="sm">
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {filteredStudents.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <User className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
            <p className="text-gray-600">
              {searchTerm ? 'Try adjusting your search terms' : 'No students enrolled in this course'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}