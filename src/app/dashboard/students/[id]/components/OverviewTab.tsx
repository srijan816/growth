import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { 
  User, 
  Mail, 
  Phone,
  Calendar,
  BookOpen,
  Star,
  TrendingUp,
  TrendingDown,
  Minus,
  Upload,
  FileText,
  Award,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface OverviewTabProps {
  student: any
}

export default function OverviewTab({ student }: OverviewTabProps) {
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Minus className="h-4 w-4 text-gray-600" />
    }
  }

  const formatDate = (date: string | null) => {
    if (!date) return '[Date Placeholder]'
    return new Date(date).toLocaleDateString()
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Basic Information Card */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-4">
            {/* Student Photo */}
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={student.photo} />
                <AvatarFallback className="text-2xl">
                  {student.name ? student.name.split(' ').map((n: string) => n[0]).join('') : 'S'}
                </AvatarFallback>
              </Avatar>
              <Button
                size="sm"
                variant="outline"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                title="Upload photo"
              >
                <Upload className="h-4 w-4" />
              </Button>
            </div>

            {/* Student Details */}
            <div className="w-full space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Name:</span>
                <span className="font-medium">{student.name || '[Name Placeholder]'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-medium">{student.studentIdExternal || '[ID Placeholder]'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Grade:</span>
                <span className="font-medium">{student.grade || '[Grade Placeholder]'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">School:</span>
                <span className="font-medium text-right">{student.school || '[School Placeholder]'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Enrolled:</span>
                <span className="font-medium">{formatDate(student.enrollDate)}</span>
              </div>
            </div>

            {/* Current Courses */}
            <div className="w-full pt-3 border-t">
              <p className="text-sm font-medium mb-2">Current Courses</p>
              <div className="space-y-1">
                {student.courses && student.courses.length > 0 ? (
                  student.courses.map((course: any) => (
                    <Badge key={course.id} variant="secondary" className="w-full justify-start">
                      <BookOpen className="h-3 w-3 mr-1" />
                      {course.code} - {course.level || '[Level Placeholder]'}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="outline" className="w-full justify-center">
                    [No Courses Enrolled]
                  </Badge>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="w-full pt-3 border-t space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{student.parentEmail || '[Email Placeholder]'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{student.parentPhone || '[Phone Placeholder]'}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats Card */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">Quick Stats</CardTitle>
          <CardDescription>Performance overview at a glance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Star Rating Average */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Star Rating Average</span>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-semibold">
                  {student.ratings?.average ? `${student.ratings.average.toFixed(1)}/5` : '[Avg Placeholder]'}
                </span>
              </div>
            </div>
            <Progress 
              value={(student.ratings?.average || 0) * 20} 
              className="h-2"
            />
            <p className="text-xs text-muted-foreground">
              Across 5 categories • {getTrendIcon(student.ratings?.trend || 'stable')} {student.ratings?.trend || 'stable'} trend
            </p>
          </div>

          {/* Recent Attendance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Recent Attendance</span>
              <span className="text-sm font-semibold">
                {student.attendance ? `${student.attendance.rate.toFixed(0)}%` : '[Rate Placeholder]'}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Present: {student.attendance?.present || 0} | 
              Absent: {student.attendance?.absent || 0} | 
              Makeup: {student.attendance?.makeup || 0}
            </div>
          </div>

          {/* Homework Submission */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Homework Submission</span>
              <span className="text-sm font-semibold">
                {student.homework ? `${student.homework.submissionRate.toFixed(0)}%` : '[Rate Placeholder]'}
              </span>
            </div>
            <Progress 
              value={student.homework?.submissionRate || 0} 
              className="h-2"
            />
          </div>

          {/* Growth Insight */}
          <div className="pt-3 border-t">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-purple-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium mb-1">AI Growth Insight</p>
                <p className="text-xs text-muted-foreground">
                  {student.growthInsight || '[Growth Insight Placeholder]'}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 space-y-2">
            <Button className="w-full" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              View Full History
            </Button>
            <Button variant="outline" className="w-full" size="sm">
              <Award className="h-4 w-4 mr-2" />
              Generate Report Preview
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Card */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle className="text-lg">Recent Activity</CardTitle>
          <CardDescription>Latest feedback and achievements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Recent Feedback */}
            <div>
              <p className="text-sm font-medium mb-2">Latest Feedback</p>
              {student.feedback?.recent && student.feedback.recent.length > 0 ? (
                <div className="space-y-2">
                  {student.feedback.recent.slice(0, 3).map((fb: any, index: number) => (
                    <div key={fb.id || index} className="p-2 rounded-lg bg-gray-50 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{fb.class_code || '[Class]'}</span>
                        <span className="text-muted-foreground">{formatDate(fb.created_at)}</span>
                      </div>
                      <p className="text-muted-foreground line-clamp-2">
                        {fb.content || '[Feedback content placeholder]'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">[No recent feedback]</p>
              )}
            </div>

            {/* Achievements */}
            <div className="pt-3 border-t">
              <p className="text-sm font-medium mb-2">Achievements</p>
              {student.achievements && student.achievements.length > 0 ? (
                <div className="space-y-2">
                  {student.achievements.slice(0, 2).map((achievement: any, index: number) => (
                    <div key={achievement.id || index} className="flex items-start gap-2">
                      <Award className="h-4 w-4 text-yellow-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium">{achievement.title || '[Achievement]'}</p>
                        <p className="text-xs text-muted-foreground">
                          {achievement.competition || '[Competition]'} • {formatDate(achievement.date)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">[No achievements recorded]</p>
              )}
            </div>

            {/* Upcoming Classes */}
            <div className="pt-3 border-t">
              <p className="text-sm font-medium mb-2">Upcoming Classes</p>
              <div className="space-y-1">
                {student.courses && student.courses.length > 0 ? (
                  student.courses.slice(0, 2).map((course: any) => (
                    <div key={course.id} className="flex items-center justify-between text-xs">
                      <span>{course.code}</span>
                      <span className="text-muted-foreground">
                        {course.day_of_week || '[Day]'} {course.start_time || '[Time]'}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">[No upcoming classes]</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}