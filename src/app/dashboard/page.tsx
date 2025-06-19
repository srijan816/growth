'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/dashboard/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, Users, TrendingUp, Clock, Plus, Loader2, AlertCircle, BookOpen } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'

interface DashboardStats {
  totalStudents: number
  totalCourses: number
  todaysClasses: number
  nextClass: {
    time: string
    name: string
    code: string
  } | null
  activeMetrics: number
  weeklyClasses: number
  currentDay: string
}

interface ScheduleData {
  today: string
  currentTime: string
  schedule: Array<{
    id: string
    code: string
    name: string
    programType: string
    gradeRange: string
    time: string
    studentCount: number
    status: 'next' | 'upcoming' | 'ongoing' | 'completed'
  }>
  recentActivity: Array<{
    id: string
    type: 'improvement' | 'progress' | 'attention'
    studentName: string
    courseName: string
    time: string
    message: string
    avgRating: string
  }>
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [setupLoading, setSetupLoading] = useState(false)
  const [setupSuccess, setSetupSuccess] = useState(false)

  useEffect(() => {
    if (session && !stats && !scheduleData) {
      fetchDashboardData()
    }
  }, [session, stats, scheduleData])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch stats and schedule in parallel
      const [statsRes, scheduleRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/schedule')
      ])

      if (!statsRes.ok || !scheduleRes.ok) {
        throw new Error('Failed to fetch dashboard data')
      }

      const [statsData, scheduleData] = await Promise.all([
        statsRes.json(),
        scheduleRes.json()
      ])

      setStats(statsData)
      setScheduleData(scheduleData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const setupGrowthData = async () => {
    try {
      setSetupLoading(true)
      const response = await fetch('/api/setup-growth-data', {
        method: 'POST'
      })
      
      if (response.ok) {
        setSetupSuccess(true)
        // Refresh dashboard data to show new growth metrics
        await fetchDashboardData()
      } else {
        throw new Error('Setup failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed')
    } finally {
      setSetupLoading(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    )
  }

  if (!session) {
    redirect('/auth/signin')
  }

  if (error) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
          <h1 className="text-2xl font-bold mb-2">
            Welcome back, {session.user.name}! 👋
          </h1>
          <p className="text-blue-100">
            {stats?.todaysClasses === 0 
              ? `No classes scheduled for ${scheduleData?.today}`
              : `You have ${stats?.todaysClasses} ${stats?.todaysClasses === 1 ? 'class' : 'classes'} today`}
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Total Students
              </CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {stats?.totalStudents || 0}
              </div>
              <p className="text-xs text-slate-500">
                {stats?.totalCourses ? `Across ${stats.totalCourses} classes` : 'No active classes'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Classes Today
              </CardTitle>
              <Calendar className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {stats?.todaysClasses || 0}
              </div>
              <p className="text-xs text-slate-500">
                {stats?.nextClass ? `Next at ${stats.nextClass.time}` : 'No upcoming classes'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Growth Metrics
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {stats?.activeMetrics || 0}
              </div>
              <p className="text-xs text-slate-500">
                Active in last 30 days
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                This Week
              </CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {stats?.weeklyClasses || 0}
              </div>
              <p className="text-xs text-slate-500">
                Classes completed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Schedule */}
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900">
                Today's Schedule
              </CardTitle>
              <CardDescription>
                {scheduleData?.today}, {new Date().toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {scheduleData?.schedule.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">No classes scheduled for today</p>
                  <Link href="/dashboard/classes">
                    <Button variant="outline" size="sm" className="mt-4">
                      View All Classes
                    </Button>
                  </Link>
                </div>
              ) : (
                scheduleData?.schedule.map((classItem) => (
                  <div 
                    key={classItem.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      classItem.status === 'next' 
                        ? 'bg-blue-50 border-blue-100' 
                        : classItem.status === 'ongoing'
                        ? 'bg-green-50 border-green-100'
                        : classItem.status === 'completed'
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        classItem.status === 'next' 
                          ? 'bg-blue-600' 
                          : classItem.status === 'ongoing'
                          ? 'bg-green-600'
                          : classItem.status === 'completed'
                          ? 'bg-slate-400'
                          : 'bg-slate-500'
                      }`}>
                        <span className="text-white font-semibold text-sm">
                          {classItem.time}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900">
                          {classItem.gradeRange} {classItem.programType}
                        </h3>
                        <p className="text-sm text-slate-600">
                          {classItem.studentCount} students • {classItem.code}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {classItem.status === 'next' && (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                          Next Up
                        </Badge>
                      )}
                      {classItem.status === 'ongoing' && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                          Ongoing
                        </Badge>
                      )}
                      {classItem.status === 'completed' && (
                        <Badge variant="secondary">Completed</Badge>
                      )}
                      {(classItem.status === 'next' || classItem.status === 'ongoing') && (
                        <Link href={`/dashboard/quick-entry?course=${classItem.id}`}>
                          <Button size="sm" variant="outline">
                            Quick Entry
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-slate-900">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/dashboard/quick-entry">
                <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" />
                  Quick Attendance Entry
                </Button>
              </Link>
              <Link href="/dashboard/students" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="mr-2 h-4 w-4" />
                  View All Students
                </Button>
              </Link>
              <Link href="/dashboard/growth" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Growth Analytics
                </Button>
              </Link>
              <Link href="/dashboard/makeup" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="mr-2 h-4 w-4" />
                  Manage Makeup Classes
                </Button>
              </Link>
              <Link href="/dashboard/import" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <BookOpen className="mr-2 h-4 w-4" />
                  Import Student Data
                </Button>
              </Link>
              
              {setupSuccess && (
                <Alert className="border-green-200 bg-green-50">
                  <AlertCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Growth tracking data setup completed successfully!
                  </AlertDescription>
                </Alert>
              )}
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={setupGrowthData}
                disabled={setupLoading || setupSuccess}
              >
                {setupLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : setupSuccess ? (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Growth Data Ready ✓
                  </>
                ) : (
                  <>
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Setup Growth Tracking Demo
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={async () => {
                  try {
                    setSetupLoading(true);
                    const response = await fetch('/api/feedback/parse-and-store', {
                      method: 'POST'
                    });
                    const data = await response.json();
                    
                    if (data.success) {
                      setSetupSuccess(true);
                      alert(`Successfully parsed ${data.details.totalProcessed} feedback records for ${data.details.totalStudents} students!`);
                    } else {
                      alert(`Parsing failed: ${data.error}`);
                    }
                  } catch (error) {
                    alert('Failed to parse feedback data');
                  } finally {
                    setSetupLoading(false);
                  }
                }}
                disabled={setupLoading}
              >
                {setupLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <BookOpen className="mr-2 h-4 w-4" />
                    Parse & Store Feedback Data
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scheduleData?.recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No recent activity</p>
                <p className="text-xs text-slate-400 mt-1">
                  Activity will appear here once you start recording attendance
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {scheduleData?.recentActivity.map((activity) => (
                  <div 
                    key={activity.id}
                    className={`flex items-center space-x-4 p-3 rounded-lg ${
                      activity.type === 'improvement' 
                        ? 'bg-green-50' 
                        : activity.type === 'progress'
                        ? 'bg-blue-50'
                        : 'bg-orange-50'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      activity.type === 'improvement' 
                        ? 'bg-green-600' 
                        : activity.type === 'progress'
                        ? 'bg-blue-600'
                        : 'bg-orange-600'
                    }`}></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        {activity.studentName} {activity.message}
                      </p>
                      <p className="text-xs text-slate-500">
                        {activity.courseName} • {new Date(activity.time).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {activity.avgRating} ★
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}