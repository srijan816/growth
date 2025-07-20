'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from 'next/navigation'
import { 
  Clock, 
  Calendar, 
  Save, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Info
} from 'lucide-react'

interface Course {
  id: string
  courseCode: string
  courseName: string
  courseLevel: string
  courseType: string
  studentCount: number
  startTime: string | null
  endTime: string | null
  dayOfWeek: number[]
  isActive: boolean
}

interface CourseScheduleUpdate {
  courseId: string
  startTime: string | null
  endTime: string | null
  dayOfWeek: number[]
  isActive: boolean
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' }
]

export default function SetSchedulePage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [scheduleUpdates, setScheduleUpdates] = useState<Map<string, CourseScheduleUpdate>>(new Map())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    fetchCourses()
  }, [])

  const fetchCourses = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/courses/schedule')
      const data = await response.json()
      
      if (response.ok) {
        setCourses(data.courses)
        
        // Initialize updates map with existing values
        const initialUpdates = new Map<string, CourseScheduleUpdate>()
        data.courses.forEach((course: Course) => {
          initialUpdates.set(course.id, {
            courseId: course.id,
            startTime: course.startTime,
            endTime: course.endTime,
            dayOfWeek: course.dayOfWeek || [],
            isActive: course.isActive
          })
        })
        setScheduleUpdates(initialUpdates)
      } else {
        setError('Failed to load courses')
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
      setError('Failed to load courses')
    } finally {
      setLoading(false)
    }
  }

  const handleTimeChange = (courseId: string, field: 'startTime' | 'endTime', value: string) => {
    const current = scheduleUpdates.get(courseId) || {
      courseId,
      startTime: null,
      endTime: null,
      dayOfWeek: [],
      isActive: true
    }
    
    setScheduleUpdates(new Map(scheduleUpdates.set(courseId, {
      ...current,
      [field]: value || null
    })))
  }

  const handleDayToggle = (courseId: string, day: number) => {
    const current = scheduleUpdates.get(courseId) || {
      courseId,
      startTime: null,
      endTime: null,
      dayOfWeek: [],
      isActive: true
    }
    
    // Ensure dayOfWeek is always an array
    const currentDays = Array.isArray(current.dayOfWeek) ? current.dayOfWeek : []
    
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day].sort()
    
    setScheduleUpdates(new Map(scheduleUpdates.set(courseId, {
      ...current,
      dayOfWeek: newDays
    })))
  }

  const handleActiveToggle = (courseId: string) => {
    const current = scheduleUpdates.get(courseId) || {
      courseId,
      startTime: null,
      endTime: null,
      dayOfWeek: [],
      isActive: true
    }
    
    setScheduleUpdates(new Map(scheduleUpdates.set(courseId, {
      ...current,
      isActive: !current.isActive
    })))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      // Convert map to array and filter out unchanged values
      const updates = Array.from(scheduleUpdates.values())
      
      const response = await fetch('/api/courses/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })
      
      const data = await response.json()
      
      if (response.ok) {
        toast({
          title: "Schedule Updated",
          description: `Successfully updated ${data.results.filter((r: any) => r.success).length} course schedules`,
        })
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          router.push('/dashboard')
        }, 1500)
      } else {
        throw new Error(data.error || 'Failed to save schedules')
      }
    } catch (error) {
      console.error('Error saving schedules:', error)
      toast({
        title: "Error",
        description: "Failed to save course schedules",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const getCoursesWithSchedule = () => courses.filter(c => {
    const update = scheduleUpdates.get(c.id)
    return update?.startTime && update?.endTime
  }).length

  const getActiveCourses = () => courses.filter(c => {
    const update = scheduleUpdates.get(c.id)
    return update?.isActive !== false
  }).length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading courses...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen p-6">
        <Card className="max-w-2xl mx-auto border-red-200 bg-red-50">
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
    <div className="min-h-screen p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Calendar className="mr-3 h-8 w-8 text-blue-600" />
          Set Course Schedules
        </h1>
        <p className="text-gray-600 mt-2">
          Configure start and end times for your courses. Only courses with schedules will appear in Today's view.
        </p>
      </div>

      {/* Progress Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Total Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{courses.length}</div>
            <p className="text-sm text-gray-600">Available for scheduling</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Scheduled</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{getCoursesWithSchedule()}</div>
            <p className="text-sm text-gray-600">Have time slots set</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600">{getActiveCourses()}</div>
            <p className="text-sm text-gray-600">Will appear in schedules</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Banner */}
      <Card className="mb-6 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Quick Tips:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Set times in 24-hour format (e.g., 14:30 for 2:30 PM)</li>
                <li>Select the days when each course meets</li>
                <li>Uncheck "Active" for courses that are temporarily not running</li>
                <li>Courses without times won't appear in the schedule</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Course Schedule Cards */}
      <div className="space-y-4">
        {courses.map((course) => {
          const update = scheduleUpdates.get(course.id)
          const hasSchedule = update?.startTime && update?.endTime
          
          return (
            <Card key={course.id} className={`transition-all ${!update?.isActive ? 'opacity-60' : ''}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      {course.courseCode}
                      {hasSchedule && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </CardTitle>
                    <CardDescription>{course.courseName}</CardDescription>
                    <div className="flex gap-2 mt-2">
                      <Badge variant="secondary">{course.courseLevel}</Badge>
                      <Badge variant="outline">{course.studentCount} students</Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`active-${course.id}`}
                      checked={update?.isActive !== false}
                      onCheckedChange={() => handleActiveToggle(course.id)}
                    />
                    <Label htmlFor={`active-${course.id}`} className="cursor-pointer">
                      Active
                    </Label>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {/* Time Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`start-${course.id}`} className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Start Time
                    </Label>
                    <Input
                      id={`start-${course.id}`}
                      type="time"
                      value={update?.startTime || ''}
                      onChange={(e) => handleTimeChange(course.id, 'startTime', e.target.value)}
                      className="mt-1"
                      disabled={update?.isActive === false}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor={`end-${course.id}`} className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      End Time
                    </Label>
                    <Input
                      id={`end-${course.id}`}
                      type="time"
                      value={update?.endTime || ''}
                      onChange={(e) => handleTimeChange(course.id, 'endTime', e.target.value)}
                      className="mt-1"
                      disabled={update?.isActive === false}
                    />
                  </div>
                </div>

                {/* Day Selection */}
                <div>
                  <Label className="mb-2 block">Days of Week</Label>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => (
                      <Button
                        key={day.value}
                        type="button"
                        variant={Array.isArray(update?.dayOfWeek) && update.dayOfWeek.includes(day.value) ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleDayToggle(course.id, day.value)}
                        disabled={update?.isActive === false}
                      >
                        {day.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Action Buttons */}
      <div className="mt-8 flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard')}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="min-w-[120px]"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Schedules
            </>
          )}
        </Button>
      </div>
    </div>
  )
}