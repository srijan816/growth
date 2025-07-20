'use client'

import { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Lightbulb
} from 'lucide-react'
import Link from 'next/link'
import { DashboardData } from '@/types/data-models'

interface DashboardClientProps {
  initialData: {
    students?: any[];
    dashboardData?: DashboardData | null;
    analysisData?: any;
    session: Session;
    error?: string;
  };
}

export default function DashboardClientV2({ initialData }: DashboardClientProps) {
  const [dailyInsight, setDailyInsight] = useState('')
  const [notifications, setNotifications] = useState<any[]>([])
  const dashboardData = initialData.dashboardData

  // Generate daily AI insight
  useEffect(() => {
    const insights = [
      "3 students in PSD-101 showed 15% improvement in speech hooks this week—review feedback?",
      "Students are struggling with rebuttal structure in debate classes. Consider a focused drill session.",
      "Writing submissions this week show improved thesis statements across all levels.",
      "Critical thinking scores are up 12% this month. Your Socratic questioning technique is working!",
      "Time to celebrate: Average attendance is at 94% this week—highest this semester!"
    ];
    
    const todayInsight = insights[new Date().getDay() % insights.length];
    setDailyInsight(todayInsight);
    
    // Mock notifications
    setNotifications([
      { id: 1, type: 'feedback', message: 'Overdue feedback for 2 students', urgent: true },
      { id: 2, type: 'parent', message: 'Parent viewed report for Sarah Chen', urgent: false },
      { id: 3, type: 'growth', message: '5 students reached milestone this week', urgent: false }
    ]);
  }, []);

  // Use actual course data from the database
  const sessions = dashboardData?.todaysClasses?.map(classData => ({
    id: classData.id,
    code: classData.code,
    name: classData.name,
    startTime: classData.startTime,
    endTime: classData.endTime,
    studentCount: classData.students,
    location: classData.location || 'Room TBD',
    status: classData.status,
    programType: classData.type?.toUpperCase() as 'PSD' | 'WRITING' | 'RAPS' | 'CRITICAL'
  })) || [
    // Fallback mock data if no database data available
    {
      id: '1',
      code: 'PSD-101',
      name: 'Public Speaking Fundamentals',
      startTime: '09:00',
      endTime: '10:30',
      studentCount: 12,
      location: 'Room A',
      status: 'completed' as const,
      programType: 'PSD' as const
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
      programType: 'WRITING' as const
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
      programType: 'RAPS' as const
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
      programType: 'CRITICAL' as const
    }
  ]

  // Quick stats for the header
  const todayStats = {
    totalClasses: sessions.length,
    completedClasses: sessions.filter(s => s.status === 'completed').length,
    totalStudents: sessions.reduce((sum, s) => sum + s.studentCount, 0),
    nextClass: sessions.find(s => s.status === 'upcoming'),
    avgGrowth: 78, // Mock data - would come from API
    growthChange: 5
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Welcome Section */}
      <div className="px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 max-w-2xl">
              <h1 className="text-2xl font-semibold">Welcome back, {initialData.session.user.name}</h1>
              <div className="mt-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-800">{dailyInsight}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Quick Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card className="border-0 shadow-none bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Calendar className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{todayStats.totalClasses} Classes Today</p>
                    <p className="text-xs text-muted-foreground">{todayStats.completedClasses} completed</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-none bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{todayStats.totalStudents} Students</p>
                    <p className="text-xs text-muted-foreground">across all classes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Growth Highlights Card */}
            <Card className="border-0 shadow-none bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Class Progress: {todayStats.avgGrowth}%</p>
                    <p className="text-xs text-green-600">↗ Up {todayStats.growthChange}% from last week</p>
                  </div>
                </div>
              </CardContent>
            </Card>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        {/* Enhanced Next Class Card */}
        {todayStats.nextClass && (
          <Card className="mb-6 border-primary/20 bg-gradient-to-r from-primary/5 to-blue-50">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Clock className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="text-sm text-muted-foreground">Next class starting at {todayStats.nextClass.startTime}</p>
                      <Badge variant="outline" className="text-xs">15 min prep time</Badge>
                    </div>
                    <p className="font-medium text-lg">{todayStats.nextClass.code}: {todayStats.nextClass.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {todayStats.nextClass.studentCount} students • {todayStats.nextClass.location}
                    </p>
                    
                    {/* Quick Prep Section */}
                    <div className="mt-4 p-3 rounded-lg bg-white/60 border border-white/40">
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Focus Areas for Today
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Speech Structure (3 students need attention)</li>
                        <li>• Rebuttal techniques - based on last session feedback</li>
                        <li>• Confidence building exercises</li>
                      </ul>
                    </div>
                    
                    {/* Student Snapshot */}
                    <div className="mt-3 flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>8 improving</span>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>3 need focus</span>
                      </div>
                      <div className="flex items-center gap-1 text-blue-600">
                        <Award className="h-4 w-4" />
                        <span>Class avg: 85%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2">
                  <Link href={`/dashboard/course/${todayStats.nextClass.id}`}>
                    <Button variant="default" size="sm" className="w-full">
                      <span>View Details</span>
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Button variant="outline" size="sm" className="w-full">
                    <FileText className="mr-2 h-4 w-4" />
                    <span>Quick Prep</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Dashboard Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Growth Overview Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Growth Overview - Last 4 Weeks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                  <p className="font-medium">Overall Growth: ↗ 12%</p>
                  <p className="text-sm text-muted-foreground">PSD: +15% • Writing: +8% • RAPS: +10% • Critical: +14%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Top Performers & At-Risk */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Student Highlights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-green-600 mb-2">🏆 Top Performers</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Sarah Chen</span>
                    <Badge variant="secondary" className="text-xs">96%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Marcus Kim</span>
                    <Badge variant="secondary" className="text-xs">94%</Badge>
                  </div>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-orange-600 mb-2">⚠️ Needs Attention</p>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Alex Rivera</span>
                    <Badge variant="outline" className="text-xs">65%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Jordan Smith</span>
                    <Badge variant="outline" className="text-xs">68%</Badge>
                  </div>
                </div>
              </div>
              
              <Button variant="outline" size="sm" className="w-full mt-4">
                <Users className="mr-2 h-4 w-4" />
                View All Students
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link href="/dashboard/recording">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-purple-200 bg-purple-50/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium mb-1">Record Feedback</p>
                    <p className="text-sm text-muted-foreground">Start new session</p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-100">
                    <Sparkles className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/dashboard/students">
            <Card className="hover:shadow-lg transition-all cursor-pointer border-blue-200 bg-blue-50/50">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium mb-1">Student Progress</p>
                    <p className="text-sm text-muted-foreground">Track & analyze</p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-100">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Card className="hover:shadow-lg transition-all cursor-pointer border-orange-200 bg-orange-50/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium mb-1">Generate Report</p>
                  <p className="text-sm text-muted-foreground">AI-powered insights</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-100">
                  <FileText className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border/50">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>Growth Compass v2.1.0</p>
            <div className="flex items-center gap-4">
              <Link href="/help" className="hover:text-foreground transition-colors">Help</Link>
              <Link href="/docs" className="hover:text-foreground transition-colors">Documentation</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}