'use client'

import { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { 
  Calendar,
  Clock,
  Users,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Bell,
  Target,
  Award,
  AlertCircle,
  BookOpen,
  FileText,
  MessageSquare,
  LineChart,
  CheckCircle2,
  Lightbulb,
  ClipboardList,
  ChevronRight,
  Timer,
  AlertTriangle,
  UserCheck,
  ChevronDown,
  MoreVertical,
  ChevronUp
} from 'lucide-react'
import Link from 'next/link'
import { DashboardData } from '@/types/data-models'
import { cn } from '@/lib/utils'

interface DashboardClientProps {
  initialData: {
    students?: any[];
    dashboardData?: DashboardData | null;
    analysisData?: any;
    session: Session;
    error?: string;
  };
}

export default function DashboardClientV3({ initialData }: DashboardClientProps) {
  const [currentTime, setCurrentTime] = useState(new Date())
  const dashboardData = initialData.dashboardData

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // Process classes data
  const todaysClasses = dashboardData?.todaysClasses || []
  
  // Find current/next class
  const now = currentTime
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes()
  
  const processedClasses = todaysClasses.map(cls => {
    const [startHour, startMin] = (cls.startTime || '00:00').split(':').map(Number)
    const startMinutes = startHour * 60 + startMin
    
    // Assume 90-minute classes if no end time
    const endMinutes = startMinutes + 90
    
    let status: 'upcoming' | 'ongoing' | 'completed'
    if (currentTimeMinutes < startMinutes) {
      status = 'upcoming'
    } else if (currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes) {
      status = 'ongoing'
    } else {
      status = 'completed'
    }
    
    return {
      ...cls,
      status,
      startMinutes,
      endMinutes,
      minutesUntil: startMinutes - currentTimeMinutes
    }
  }).sort((a, b) => a.startMinutes - b.startMinutes)

  const ongoingClass = processedClasses.find(c => c.status === 'ongoing')
  const nextClass = processedClasses.find(c => c.status === 'upcoming')
  
  // Use nextUpcomingClass from dashboard data if no class today
  const currentOrNextClass = ongoingClass || nextClass || dashboardData?.nextUpcomingClass

  // Mock high-priority tasks
  const [tasks] = useState([
    {
      id: 1,
      title: "Submit feedback for PSD-101",
      dueIn: "Overdue by 2 days",
      type: "feedback",
      urgent: true,
      studentCount: 3
    },
    {
      id: 2,
      title: "Approve lesson plans for next week",
      dueIn: "Due tomorrow",
      type: "planning",
      urgent: true,
      classCount: 4
    },
    {
      id: 3,
      title: "Monthly progress reports",
      dueIn: "Due Friday",
      type: "reporting",
      urgent: false,
      studentCount: 15
    }
  ])

  // Mock student alerts (lower priority)
  const [studentAlerts] = useState([
    { id: 1, name: "Alex Chen", issue: "3 consecutive absences", severity: "high" },
    { id: 2, name: "Sarah Kim", issue: "Performance drop (-15%)", severity: "medium" },
    { id: 3, name: "Michael Liu", issue: "Ready for advanced level", severity: "positive" }
  ])

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal Header */}
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Main Content - Prioritized Layout */}
      <div className="px-6 pb-6">
        {/* COMPACT Next Class Section - Full width but reduced height */}
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-3">
            {ongoingClass ? "Current Class" : "Next Class"}
          </h2>
          {currentOrNextClass ? (
            <Card className={cn(
              "shadow-sm transition-all",
              ongoingClass ? "border-green-500/50 bg-green-50/30" : ""
            )}>
              <CardContent className="p-5">
                <div className="grid grid-cols-[1fr,auto] gap-6">
                  {/* Left side - Class info */}
                  <div>
                    {/* Class Title and Status */}
                    <div className="flex items-center gap-3 mb-3">
                      <Link href={`/dashboard/course/${currentOrNextClass.code}`} className="hover:underline">
                        <h3 className="text-xl font-semibold">
                          {currentOrNextClass.code}: {currentOrNextClass.name}
                        </h3>
                      </Link>
                      {ongoingClass && (
                        <Badge className="bg-green-500 text-white">ONGOING</Badge>
                      )}
                      {nextClass && nextClass.minutesUntil > 0 && nextClass.minutesUntil <= 30 && (
                        <Badge variant="destructive">Starting in {nextClass.minutesUntil} min</Badge>
                      )}
                      {!ongoingClass && !nextClass && currentOrNextClass?.whenText && (
                        <Badge variant="secondary">{currentOrNextClass.whenText}</Badge>
                      )}
                    </div>

                    {/* Time and Location Row */}
                    <div className="flex items-center gap-6 text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {currentOrNextClass.startTime} - {currentOrNextClass.endTime || 'TBD'}
                      </span>
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {currentOrNextClass.students} students
                      </span>
                      <span>{currentOrNextClass.location}</span>
                    </div>

                    {/* Stats badges - more spacious */}
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-100 text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-medium">8 Students Improving</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-100 text-orange-700">
                        <AlertCircle className="h-4 w-4" />
                        <span className="font-medium">3 Need Attention</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-100 text-blue-700">
                        <TrendingUp className="h-4 w-4" />
                        <span className="font-medium">85% Average Progress</span>
                      </div>
                    </div>
                  </div>

                  {/* Right side - Actions */}
                  <div className="flex gap-2">
                    <Link href={`/dashboard/lessons/${currentOrNextClass.code}`}>
                      <Button variant="outline" size="default">
                        <BookOpen className="mr-2 h-4 w-4" />
                        Lesson Plan
                      </Button>
                    </Link>
                    <Link href={`/dashboard/quick-entry?class=${currentOrNextClass.code}`}>
                      <Button variant="secondary" size="default">
                        <ClipboardList className="mr-2 h-4 w-4" />
                        Attendance
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Collapsible Full Schedule */}
                {processedClasses.length > 1 && (
                  <Collapsible className="mt-3">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground">
                        <ChevronRight className="h-3 w-3 mr-1" />
                        Today's Full Schedule ({processedClasses.length} classes)
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-2">
                        {processedClasses.map((cls, idx) => (
                          <div key={cls.id} className="flex items-center">
                            <Link href={`/dashboard/course/${cls.code}`}>
                              <div className={cn(
                                "px-2 py-1 rounded text-xs whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity",
                                cls.status === 'completed' && "bg-gray-100 text-gray-600",
                                cls.status === 'ongoing' && "bg-green-100 text-green-700 font-medium",
                                cls.status === 'upcoming' && "bg-blue-50 text-blue-700"
                              )}>
                                <div className="font-medium">{cls.code}</div>
                                <div className="text-[10px]">{cls.startTime}</div>
                              </div>
                            </Link>
                            {idx < processedClasses.length - 1 && (
                              <ChevronRight className="h-3 w-3 text-gray-400 mx-0.5" />
                            )}
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-medium">No Upcoming Classes</p>
                <p className="text-sm text-muted-foreground">You don't have any classes scheduled.</p>
                <Link href="/dashboard/today">
                  <Button variant="outline" size="sm" className="mt-4">
                    View Full Schedule
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* SECOND PRIORITY: High-Priority Tasks with Accordion */}
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Tasks & Reminders
            {tasks.filter(t => t.urgent).length > 0 && (
              <Badge variant="destructive">{tasks.filter(t => t.urgent).length} urgent</Badge>
            )}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tasks.map((task) => (
              <Card key={task.id} className={cn(
                "transition-all hover:shadow-md",
                task.urgent ? "border-red-300 bg-red-50/50" : ""
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      task.type === 'feedback' && "bg-purple-100",
                      task.type === 'planning' && "bg-blue-100",
                      task.type === 'reporting' && "bg-orange-100"
                    )}>
                      {task.type === 'feedback' && <MessageSquare className="h-5 w-5 text-purple-600" />}
                      {task.type === 'planning' && <BookOpen className="h-5 w-5 text-blue-600" />}
                      {task.type === 'reporting' && <FileText className="h-5 w-5 text-orange-600" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-sm mb-1">{task.title}</h3>
                      <p className={cn(
                        "text-xs",
                        task.urgent ? "text-red-600 font-semibold" : "text-muted-foreground"
                      )}>
                        {task.dueIn}
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-xs text-muted-foreground mb-3">
                    {task.studentCount && <p>• {task.studentCount} students involved</p>}
                    {task.classCount && <p>• {task.classCount} classes affected</p>}
                  </div>
                  
                  <Button 
                    size="sm" 
                    variant={task.urgent ? "default" : "secondary"} 
                    className="w-full"
                  >
                    {task.type === 'feedback' && "Submit Feedback"}
                    {task.type === 'planning' && "Review Plans"}
                    {task.type === 'reporting' && "Generate Report"}
                    <ArrowRight className="ml-2 h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Stats and Student Alerts Row */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
          {/* Left side - Stats Cards */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Platform Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="h-5 w-5 text-muted-foreground" />
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <p className="text-2xl font-bold">{dashboardData?.overallMetrics?.totalStudents || 156}</p>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <UserCheck className="h-5 w-5 text-muted-foreground" />
                    <Badge variant="secondary" className="text-xs">Good</Badge>
                  </div>
                  <p className="text-2xl font-bold">{dashboardData?.overallMetrics?.averageAttendanceRate?.toFixed(0) || 92}%</p>
                  <p className="text-sm text-muted-foreground">Attendance Rate</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <TrendingUp className="h-5 w-5 text-muted-foreground" />
                    <div className="text-xs text-green-600">+12%</div>
                  </div>
                  <p className="text-2xl font-bold">{dashboardData?.overallMetrics?.averageGrowthRate?.toFixed(0) || 78}%</p>
                  <p className="text-sm text-muted-foreground">Avg Growth</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <Badge variant="outline" className="text-xs">Active</Badge>
                  </div>
                  <p className="text-2xl font-bold">{dashboardData?.overallMetrics?.totalActiveClasses || 24}</p>
                  <p className="text-sm text-muted-foreground">Active Classes</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right side - Student Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Student Alerts
                </span>
                <Badge variant="outline" className="text-xs">{studentAlerts.length} new</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {studentAlerts.map(alert => (
                <div key={alert.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className={cn(
                    "w-2 h-2 rounded-full mt-1.5",
                    alert.severity === 'high' && "bg-red-500",
                    alert.severity === 'medium' && "bg-yellow-500",
                    alert.severity === 'positive' && "bg-green-500"
                  )} />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{alert.name}</p>
                    <p className="text-xs text-muted-foreground">{alert.issue}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full">
                View All Alerts
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Footer */}
        <div className="mt-8 pt-8 border-t">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
            <p className="text-sm text-muted-foreground">Frequently used features</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Link href="/dashboard/students">
              <Button variant="outline" className="w-full">
                <Users className="mr-2 h-4 w-4" />
                View Students
              </Button>
            </Link>
            <Link href="/dashboard/reports">
              <Button variant="outline" className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                Generate Reports
              </Button>
            </Link>
            <Link href="/dashboard/analytics">
              <Button variant="outline" className="w-full">
                <LineChart className="mr-2 h-4 w-4" />
                Analytics
              </Button>
            </Link>
            <Link href="/dashboard/courses">
              <Button variant="outline" className="w-full">
                <BookOpen className="mr-2 h-4 w-4" />
                Manage Courses
              </Button>
            </Link>
            <Link href="/dashboard/makeup">
              <Button variant="outline" className="w-full">
                <Calendar className="mr-2 h-4 w-4" />
                Schedule Makeup
              </Button>
            </Link>
            <Link href="/dashboard/import">
              <Button variant="outline" className="w-full">
                <Sparkles className="mr-2 h-4 w-4" />
                Import Data
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}