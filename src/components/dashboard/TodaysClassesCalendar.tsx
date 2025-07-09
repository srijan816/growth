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
  Star
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
  className?: string
}

export default function TodaysClassesCalendar({ className }: TodaysClassesCalendarProps) {
  const [classes, setClasses] = useState<TodaysClass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchTodaysClasses()
  }, [])

  // Determine which classes are scheduled for today based on the class name/description
  const isClassScheduledToday = (classCode: string, className: string, todayWeekday: number): boolean => {
    // Extract day information from class name/description
    // Looking for patterns like "Thursday", "Thu", "Tue", "Wednesday", etc.
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
    
    // Check if any of today's day names appear in the class name
    return todayNames.some(day => classNameLower.includes(day))
  }

  const fetchTodaysClasses = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Get students from feedback data to simulate classes
      const response = await fetch('/api/feedback/students')
      const data = await response.json()
      
      if (response.ok && data.isDataReady) {
        // Group students by classes and filter for today's schedule only
        const classMap = new Map<string, { students: any[], classNames: string[] }>()
        const today = new Date().getDay() // 0 = Sunday, 1 = Monday, etc.
        
        data.students.forEach((student: any) => {
          if (student.classes && student.classNames) {
            student.classes.forEach((code: string, index: number) => {
              if (code && code.trim()) {
                const name = student.classNames[index] || code
                
                // Only include classes that are scheduled for today
                const classScheduledToday = isClassScheduledToday(code, name, today)
                
                if (classScheduledToday) {
                  if (!classMap.has(code)) {
                    classMap.set(code, { students: [], classNames: [name] })
                  }
                  
                  classMap.get(code)?.students.push(student)
                }
              }
            })
          }
        })
        
        // Convert to today's class format
        const todaysClasses = Array.from(classMap.entries()).map(([code, data]) => {
          const classTime = generateClassTime(code)
          return {
            code,
            name: data.classNames[0] || code,
            time: classTime,
            duration: '90 min',
            studentCount: data.students.length,
            location: generateLocation(code),
            status: determineStatus(classTime),
            priority: determinePriority(data.students.length)
          } as TodaysClass
        })
        
        // Sort by time
        todaysClasses.sort((a, b) => a.time.localeCompare(b.time))
        setClasses(todaysClasses)
      } else {
        setError('No class data available')
      }
    } catch (error) {
      console.error('Error fetching today\'s classes:', error)
      setError('Failed to load class schedule')
    } finally {
      setLoading(false)
    }
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'ongoing':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'completed':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'upcoming':
        return <Clock className="h-4 w-4" />
      case 'ongoing':
        return <TrendingUp className="h-4 w-4" />
      case 'completed':
        return <Star className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  const getPriorityColor = (priority: string) => {
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

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Today's Classes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading schedule...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="mr-2 h-5 w-5" />
            Today's Classes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-red-600">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Calendar className="mr-2 h-5 w-5 text-blue-600" />
            Today's Classes
          </div>
          <Badge variant="secondary" className="text-xs">
            {new Date().toLocaleDateString('en-US', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            })}
          </Badge>
        </CardTitle>
        <CardDescription>
          Click on any class to view and manage students
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {classes.map((classItem) => (
            <Link
              key={classItem.code}
              href={`/dashboard/today?class=${classItem.code}`}
              className="block"
            >
              <div className="group p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer bg-white hover:bg-blue-50">
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
            </Link>
          ))}
          
          {classes.length === 0 && (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No classes today</h3>
              <p className="text-gray-600">Your schedule is clear for today.</p>
            </div>
          )}
        </div>
        
        {classes.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>{classes.length} classes scheduled</span>
              <Link href="/dashboard/today">
                <Button variant="outline" size="sm">
                  View All Students
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}