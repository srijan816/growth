'use client'

import { useState, useEffect } from 'react'
import { CalendarView } from '@/components/dashboard/CalendarView'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar,
  Clock,
  Users,
  MapPin,
  CheckCircle,
  Circle,
  ArrowRight,
  BookOpen,
  AlertCircle,
  Settings,
  Mic,
  MessageSquare,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DynamicFeedbackRecordingWorkflow } from '@/components/dynamic'

interface Session {
  id: string
  code: string
  name: string
  startTime: string
  endTime: string
  studentCount: number
  location: string
  status: 'upcoming' | 'ongoing' | 'completed'
  programType: string
  students: Array<{ id: string; name: string; attended: boolean }>
}

export default function TodaySchedulePage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recordingDialogOpen, setRecordingDialogOpen] = useState(false)
  const [selectedRecordingClass, setSelectedRecordingClass] = useState<Session | null>(null)
  const [isHoliday, setIsHoliday] = useState(false)

  useEffect(() => {
    fetchTodaysSessions()
    // Refresh every minute to update session status
    const interval = setInterval(fetchTodaysSessions, 60000)
    return () => clearInterval(interval)
  }, [selectedDate])

  const fetchTodaysSessions = async () => {
    try {
      setLoading(true)
      
      // Use the standardized API endpoint
      const dateStr = selectedDate.toISOString().split('T')[0]
      const response = await fetch(`/api/classes/today?date=${dateStr}`)
      const data = await response.json()
      
      if (response.ok) {
        setIsHoliday(data.isHoliday || false)
        
        if (data.classes) {
          // Transform to session format expected by this component
          const transformedSessions: Session[] = data.classes.map((cls: any) => ({
            id: cls.id,
            code: cls.code,
            name: cls.name,
            startTime: cls.startTime,
            endTime: cls.endTime,
            studentCount: cls.students,
            location: cls.location,
            status: cls.status,
            programType: cls.type,
            students: [] // Would be populated from enrollments
          }))
          
          setSessions(transformedSessions)
        } else {
          setSessions([])
        }
      } else {
        setError(data.error || 'Failed to load schedule')
      }
    } catch (error) {
      console.error('Error fetching sessions:', error)
      setError('Failed to load today\'s schedule')
    } finally {
      setLoading(false)
    }
  }

  // Mock data for fallback
  const mockSessions: Session[] = [
    {
      id: '1',
      code: 'PSD-101',
      name: 'Public Speaking Fundamentals',
      startTime: '09:00',
      endTime: '10:30',
      studentCount: 12,
      location: 'Room A',
      status: 'completed' as const,
      programType: 'PSD' as const,
      students: [
        { id: '1', name: 'Sarah Johnson', attended: true },
        { id: '2', name: 'Mike Chen', attended: true },
        { id: '3', name: 'Emma Davis', attended: false },
      ]
    },
    {
      id: '2',
      code: 'WRITING-201',
      name: 'Creative Writing Workshop',
      startTime: '11:00',
      endTime: '12:30',
      studentCount: 8,
      location: 'Room B',
      status: 'ongoing' as const,
      programType: 'WRITING' as const,
      students: [
        { id: '4', name: 'Alex Kumar', attended: true },
        { id: '5', name: 'Lisa Wang', attended: true },
      ]
    },
    {
      id: '3',
      code: 'RAPS-301',
      name: 'Research Methods',
      startTime: '14:00',
      endTime: '15:30',
      studentCount: 10,
      location: 'Lab 1',
      status: 'upcoming' as const,
      programType: 'RAPS' as const,
      students: []
    },
    {
      id: '4',
      code: 'CRITICAL-101',
      name: 'Logic and Reasoning',
      startTime: '16:00',
      endTime: '17:00',
      studentCount: 15,
      location: 'Room C',
      status: 'upcoming' as const,
      programType: 'CRITICAL' as const,
      students: []
    }
  ]

  const upcomingClasses = sessions.filter(s => s.status === 'upcoming')
  const ongoingClass = sessions.find(s => s.status === 'ongoing')
  const completedClasses = sessions.filter(s => s.status === 'completed')

  const goToToday = () => {
    setSelectedDate(new Date())
  }

  const goToPrevDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    setSelectedDate(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    setSelectedDate(newDate)
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const isToday = selectedDate.toDateString() === new Date().toDateString()

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading schedule...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold mb-2">
            {isToday 
              ? "Today's Schedule" 
              : `Schedule for ${formatDate(selectedDate)}`
            }
          </h1>
          <p className="text-muted-foreground">
            {isHoliday 
              ? "Holiday - No classes scheduled"
              : isToday 
                ? "Manage your classes and track student attendance" 
                : `View scheduled classes for ${selectedDate.toLocaleDateString()}`
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={goToPrevDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {!isToday && (
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={goToNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Link href="/set-schedule">
            <Button variant="outline" size="sm">
              <Settings className="mr-2 h-4 w-4" />
              Set Schedules
            </Button>
          </Link>
        </div>
      </div>

      {/* Current/Next Class Highlight */}
      {(ongoingClass || upcomingClasses[0]) && selectedDate.toDateString() === new Date().toDateString() && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {ongoingClass ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Currently Teaching
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4" />
                    Next Class
                  </>
                )}
              </CardTitle>
              {ongoingClass ? (
                <Badge variant="default" className="bg-green-600">In Progress</Badge>
              ) : (
                <Badge variant="secondary">Upcoming</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              const currentClass = ongoingClass || upcomingClasses[0]
              return (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-lg">{currentClass.code}: {currentClass.name}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{currentClass.startTime} - {currentClass.endTime}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{currentClass.location}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{currentClass.studentCount} students</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    {ongoingClass ? (
                      <>
                        <Link href="/dashboard/attendance">
                          <Button size="sm">
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Take Attendance
                          </Button>
                        </Link>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedRecordingClass(ongoingClass)
                            setRecordingDialogOpen(true)
                          }}
                        >
                          <Mic className="mr-2 h-4 w-4" />
                          Record Feedback
                        </Button>
                      </>
                    ) : (
                      <>
                        <Link href={`/dashboard/class/${currentClass.id}/prepare`}>
                          <Button size="sm">
                            <BookOpen className="mr-2 h-4 w-4" />
                            Prepare Class
                          </Button>
                        </Link>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedRecordingClass(currentClass)
                            setRecordingDialogOpen(true)
                          }}
                        >
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Pre-Record Setup
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* No Sessions Message */}
      {sessions.length === 0 && !error && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isHoliday ? "Holiday" : "No Classes Scheduled"}
            </h3>
            <p className="text-gray-600 mb-4">
              {isHoliday 
                ? `${formatDate(selectedDate)} is a holiday. No classes are scheduled.`
                : isToday 
                  ? "You don't have any classes scheduled for today."
                  : `No classes scheduled for ${formatDate(selectedDate)}.`}
            </p>
            {!isHoliday && (
              <Link href="/set-schedule">
                <Button>
                  <Settings className="mr-2 h-4 w-4" />
                  Set Course Schedules
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-red-700">
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Calendar View */}
      {sessions.length > 0 && (
        <CalendarView 
          sessions={sessions}
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onRecordFeedback={(session) => {
            setSelectedRecordingClass(session)
            setRecordingDialogOpen(true)
          }}
          hideNavigation={true}
        />
      )}

      {/* Class List by Status */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Completed Classes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Completed ({completedClasses.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {completedClasses.map(session => (
              <div key={session.id} className="p-3 border rounded-lg bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm">{session.code}</p>
                  <Badge variant="secondary" className="text-xs">
                    {session.startTime} - {session.endTime}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{session.name}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {session.students.filter(s => s.attended).length}/{session.studentCount} attended
                  </span>
                  <Link href={`/dashboard/class/${session.id}/review`}>
                    <Button size="sm" variant="ghost" className="h-7 px-2">
                      <span className="text-xs">Review</span>
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Ongoing Classes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              In Progress ({sessions.filter(s => s.status === 'ongoing').length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessions.filter(s => s.status === 'ongoing').map(session => (
              <div key={session.id} className="p-3 border rounded-lg bg-green-50 border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm">{session.code}</p>
                  <Badge variant="default" className="text-xs bg-green-600">
                    Live Now
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{session.name}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {session.location} • {session.studentCount} students
                  </span>
                  <div className="flex gap-1">
                    <Link href="/dashboard/attendance">
                      <Button size="sm" variant="ghost" className="h-7 px-2">
                        <CheckCircle className="h-3 w-3" />
                      </Button>
                    </Link>
                    <Button 
                      size="sm" 
                      variant="default" 
                      className="h-7 px-2"
                      onClick={() => {
                        setSelectedRecordingClass(session)
                        setRecordingDialogOpen(true)
                      }}
                    >
                      <Mic className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Upcoming Classes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Circle className="h-4 w-4 text-blue-600" />
              Upcoming ({upcomingClasses.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {upcomingClasses.map(session => (
              <div key={session.id} className="p-3 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm">{session.code}</p>
                  <Badge variant="outline" className="text-xs">
                    {session.startTime}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2">{session.name}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {session.location} • {session.studentCount} students
                  </span>
                  <div className="flex gap-1">
                    <Link href={`/dashboard/class/${session.id}/prepare`}>
                      <Button size="sm" variant="ghost" className="h-7 px-2">
                        <BookOpen className="h-3 w-3" />
                      </Button>
                    </Link>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="h-7 px-2"
                      onClick={() => {
                        setSelectedRecordingClass(session)
                        setRecordingDialogOpen(true)
                      }}
                    >
                      <Mic className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        </div>
      )}

      {/* Recording Dialog */}
      <Dialog open={recordingDialogOpen} onOpenChange={setRecordingDialogOpen}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-2xl">
              Record Feedback - {selectedRecordingClass?.code}: {selectedRecordingClass?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 pt-0 h-full overflow-auto">
            {selectedRecordingClass && (
              <DynamicFeedbackRecordingWorkflow 
                preSelectedClass={{
                  id: selectedRecordingClass.id,
                  courseId: selectedRecordingClass.id,
                  courseCode: selectedRecordingClass.code,
                  courseName: selectedRecordingClass.name,
                  sessionDate: selectedDate.toISOString(),
                  startTime: selectedRecordingClass.startTime,
                  endTime: selectedRecordingClass.endTime,
                  topic: '',
                  unitNumber: '',
                  lessonNumber: '',
                  status: selectedRecordingClass.status,
                  enrolledStudents: selectedRecordingClass.studentCount
                }}
                onClose={() => setRecordingDialogOpen(false)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}