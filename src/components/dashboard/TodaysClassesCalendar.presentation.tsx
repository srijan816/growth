import React from 'react'
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
  Loader2
} from 'lucide-react'
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
}

interface TodaysClassesCalendarProps {
  classes: TodaysClass[]
  loading: boolean
  error: string | null
  onRefresh?: () => void
  className?: string
}

// Pure presentation component
export function TodaysClassesCalendarPresentation({ 
  classes, 
  loading, 
  error, 
  onRefresh,
  className 
}: TodaysClassesCalendarProps) {
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

  const getPriorityIcon = (priority: TodaysClass['priority']) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'medium':
        return <TrendingUp className="w-4 h-4 text-yellow-500" />
      case 'low':
        return <Star className="w-4 h-4 text-blue-500" />
      default:
        return null
    }
  }

  const getStatusIcon = (status: TodaysClass['status']) => {
    switch (status) {
      case 'upcoming':
        return <Clock className="w-4 h-4" />
      case 'ongoing':
        return <BookOpen className="w-4 h-4" />
      case 'completed':
        return <ArrowRight className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Today's Classes
          </CardTitle>
          <CardDescription>Your scheduled classes for today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Today's Classes
          </CardTitle>
          <CardDescription>Your scheduled classes for today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            {onRefresh && (
              <Button onClick={onRefresh} variant="outline">
                Try Again
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (classes.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Today's Classes
          </CardTitle>
          <CardDescription>Your scheduled classes for today</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No classes scheduled for today</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Today's Classes
        </CardTitle>
        <CardDescription>
          {classes.length} class{classes.length !== 1 ? 'es' : ''} scheduled for today
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {classes.map((classItem, index) => (
            <ClassCard 
              key={`${classItem.code}-${index}`}
              classItem={classItem}
              getStatusColor={getStatusColor}
              getPriorityIcon={getPriorityIcon}
              getStatusIcon={getStatusIcon}
            />
          ))}
          
          <div className="pt-4 border-t">
            <Link href="/dashboard/today">
              <Button variant="outline" className="w-full">
                <Calendar className="w-4 h-4 mr-2" />
                View Full Schedule
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Separate component for individual class cards
interface ClassCardProps {
  classItem: TodaysClass
  getStatusColor: (status: TodaysClass['status']) => string
  getPriorityIcon: (priority: TodaysClass['priority']) => React.ReactNode
  getStatusIcon: (status: TodaysClass['status']) => React.ReactNode
}

function ClassCard({ 
  classItem, 
  getStatusColor, 
  getPriorityIcon, 
  getStatusIcon 
}: ClassCardProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          {getStatusIcon(classItem.status)}
        </div>
        <div className="flex-grow min-w-0">
          <div className="flex items-center space-x-2">
            <p className="font-medium text-sm truncate">
              {classItem.code}
            </p>
            {getPriorityIcon(classItem.priority)}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {classItem.name}
          </p>
          <div className="flex items-center space-x-2 mt-1">
            <span className="text-xs text-muted-foreground">
              {classItem.time}
            </span>
            {classItem.location && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs text-muted-foreground">
                  {classItem.location}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1 text-xs text-muted-foreground">
          <Users className="w-3 h-3" />
          <span>{classItem.studentCount}</span>
        </div>
        <Badge 
          variant="secondary" 
          className={`text-xs ${getStatusColor(classItem.status)}`}
        >
          {classItem.status}
        </Badge>
      </div>
    </div>
  )
}