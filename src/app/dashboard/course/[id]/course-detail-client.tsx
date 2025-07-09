'use client'

import { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import DashboardLayout from '@/components/dashboard/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Calendar,
  Users,
  Clock,
  MapPin,
  ChevronLeft,
  ChevronRight,
  User,
  TrendingUp,
  BookOpen,
  FileText
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface CourseDetailClientProps {
  courseId: number
  session: Session
}

interface CourseSession {
  id: string
  date: Date
  time: string
  topic: string
  attendees: number
  status: 'completed' | 'ongoing' | 'upcoming'
}

// Mock course data
const courseData: Record<number, any> = {
  1: {
    title: "Public Speaking & Debating",
    code: "PSD",
    instructor: "Srijan",
    totalStudents: 24,
    description: "Master the art of public speaking and debating through structured practice and feedback.",
    meetingTime: "Monday & Wednesday, 4:00 PM - 5:30 PM",
    location: "Room 201, Building A"
  },
  2: {
    title: "Academic Writing",
    code: "WRITING",
    instructor: "Srijan",
    totalStudents: 18,
    description: "Develop strong academic writing skills for essays, research papers, and creative writing.",
    meetingTime: "Tuesday & Thursday, 3:00 PM - 4:30 PM",
    location: "Room 305, Building B"
  },
  3: {
    title: "Research Analysis",
    code: "RAPS",
    instructor: "Srijan",
    totalStudents: 22,
    description: "Learn research methodologies and analytical thinking for problem-solving.",
    meetingTime: "Wednesday & Friday, 2:00 PM - 3:30 PM",
    location: "Lab 101, Building C"
  },
  // Add more courses as needed
}

// Generate mock sessions for the month
const generateSessions = (courseId: number): CourseSession[] => {
  const sessions: CourseSession[] = []
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  
  // Get course meeting days
  const meetingDays = courseId === 1 ? [1, 3] : courseId === 2 ? [2, 4] : [3, 5] // Mon/Wed, Tue/Thu, Wed/Fri
  
  // Generate sessions for the current month
  for (let day = 1; day <= 31; day++) {
    const date = new Date(currentYear, currentMonth, day)
    if (date.getMonth() !== currentMonth) break
    
    const dayOfWeek = date.getDay()
    if (meetingDays.includes(dayOfWeek)) {
      const isPast = date < today
      const isToday = date.toDateString() === today.toDateString()
      
      sessions.push({
        id: `session-${courseId}-${day}`,
        date,
        time: courseId === 1 ? "4:00 PM - 5:30 PM" : courseId === 2 ? "3:00 PM - 4:30 PM" : "2:00 PM - 3:30 PM",
        topic: isPast ? `Session ${Math.floor(day / 7) + 1}: Topic covered` : `Session ${Math.floor(day / 7) + 1}: Upcoming topic`,
        attendees: isPast ? Math.floor(Math.random() * 5) + 15 : 0,
        status: isPast ? 'completed' : isToday ? 'ongoing' : 'upcoming'
      })
    }
  }
  
  return sessions
}

export default function CourseDetailClient({ courseId, session }: CourseDetailClientProps) {
  const router = useRouter()
  const [selectedMonth, setSelectedMonth] = useState(new Date())
  const [selectedSession, setSelectedSession] = useState<CourseSession | null>(null)
  
  const course = courseData[courseId] || courseData[1] // Fallback to first course
  const sessions = generateSessions(courseId)
  
  // Get calendar data
  const firstDayOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1)
  const lastDayOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0)
  const firstDayOfWeek = firstDayOfMonth.getDay()
  const daysInMonth = lastDayOfMonth.getDate()
  
  const calendarDays = []
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null)
  }
  // Add all days of the month
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i)
  }
  
  const getSessionForDay = (day: number | null) => {
    if (!day) return null
    return sessions.find(s => 
      s.date.getDate() === day && 
      s.date.getMonth() === selectedMonth.getMonth() &&
      s.date.getFullYear() === selectedMonth.getFullYear()
    )
  }
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                     'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard')}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-semibold text-foreground">{course.title}</h1>
              <p className="text-muted-foreground">{course.code} • {course.instructor}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Course Info */}
          <div className="lg:col-span-1 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Course Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">{course.description}</p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{course.totalStudents} Students Enrolled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{course.meetingTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{course.location}</span>
                  </div>
                </div>
                
                <div className="pt-4 space-y-2">
                  <Button className="w-full" variant="outline">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    View Growth Analytics
                  </Button>
                  <Button className="w-full" variant="outline">
                    <FileText className="mr-2 h-4 w-4" />
                    Feedback Reports
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Selected Session Details */}
            {selectedSession && (
              <Card>
                <CardHeader>
                  <CardTitle>Session Details</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-medium">{selectedSession.topic}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedSession.date.toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Time</span>
                      <span className="text-sm font-medium">{selectedSession.time}</span>
                    </div>
                    {selectedSession.status === 'completed' && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Attendees</span>
                        <span className="text-sm font-medium">{selectedSession.attendees} / {course.totalStudents}</span>
                      </div>
                    )}
                    <div className="pt-2">
                      {selectedSession.status === 'completed' ? (
                        <Link href={`/dashboard/classes?session=${selectedSession.id}`}>
                          <Button className="w-full" size="sm">
                            View Session Details
                          </Button>
                        </Link>
                      ) : selectedSession.status === 'ongoing' ? (
                        <Link href="/dashboard/classes">
                          <Button className="w-full" size="sm">
                            Take Attendance
                          </Button>
                        </Link>
                      ) : (
                        <Button className="w-full" size="sm" variant="outline" disabled>
                          Upcoming Session
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Calendar */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Session Calendar</CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium min-w-[150px] text-center">
                      {monthNames[selectedMonth.getMonth()]} {selectedMonth.getFullYear()}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1">
                  {/* Day headers */}
                  {dayNames.map(day => (
                    <div key={day} className="text-center text-sm font-medium text-muted-foreground p-2">
                      {day}
                    </div>
                  ))}
                  
                  {/* Calendar days */}
                  {calendarDays.map((day, index) => {
                    const session = day ? getSessionForDay(day) : null
                    const isToday = day === new Date().getDate() && 
                                   selectedMonth.getMonth() === new Date().getMonth() &&
                                   selectedMonth.getFullYear() === new Date().getFullYear()
                    
                    return (
                      <div
                        key={index}
                        className={cn(
                          "min-h-[80px] p-2 border rounded-lg cursor-pointer transition-colors",
                          !day && "invisible",
                          session && "hover:bg-accent",
                          session?.status === 'completed' && "bg-green-50 border-green-200",
                          session?.status === 'ongoing' && "bg-blue-50 border-blue-200",
                          session?.status === 'upcoming' && "bg-gray-50 border-gray-200",
                          isToday && "ring-2 ring-primary",
                          selectedSession?.id === session?.id && "ring-2 ring-offset-2 ring-primary"
                        )}
                        onClick={() => session && setSelectedSession(session)}
                      >
                        {day && (
                          <>
                            <div className="text-sm font-medium">{day}</div>
                            {session && (
                              <div className="mt-1">
                                <Badge 
                                  variant={
                                    session.status === 'completed' ? 'default' : 
                                    session.status === 'ongoing' ? 'secondary' : 
                                    'outline'
                                  }
                                  className="text-xs w-full justify-center"
                                >
                                  {session.status === 'completed' ? 'Done' : 
                                   session.status === 'ongoing' ? 'Today' : 
                                   'Soon'}
                                </Badge>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
                
                {/* Legend */}
                <div className="mt-4 flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
                    <span className="text-muted-foreground">Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded"></div>
                    <span className="text-muted-foreground">Ongoing</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
                    <span className="text-muted-foreground">Upcoming</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

// Utility function for className conditionals
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}