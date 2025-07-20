'use client'

import { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  TrendingUp, 
  TrendingDown,
  Users, 
  Calendar, 
  Database,
  AlertCircle,
  Star,
  BookOpen,
  BarChart3,
  Clock,
  ArrowRight,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'
import { DashboardData, ProgramMetrics, TodaysClassData } from '@/types/data-models'
import TodaysClassesCalendarContainer from '@/components/dashboard/TodaysClassesCalendar.container'

interface DashboardClientProps {
  initialData: {
    students?: any[];
    dashboardData?: DashboardData | null;
    analysisData?: any;
    session: Session;
    permissions: InstructorPermissions;
    instructorName?: string;
    error?: string;
  };
}

export default function DashboardClient({ initialData }: DashboardClientProps) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(initialData.dashboardData || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(initialData.error || null)
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())

  const refreshData = async () => {
    setLoading(true)
    try {
      // For now, just update the timestamp since we have the data already
      // In the future, this could call the API to get fresh data
      setLastUpdated(new Date())
      setError(null)
      
      // Simulate a small delay to show the loading state
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (err) {
      setError('Failed to refresh dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (error && !dashboardData) {
    return (
      <div className="p-6">
        <Card className="border-red-200 bg-red-50">
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
    <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {initialData.instructorName || initialData.session.user.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Updated: {lastUpdated.toLocaleTimeString()}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={loading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overall Metrics Cards */}
        {dashboardData?.overallMetrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                    <p className="text-2xl font-bold">{dashboardData.overallMetrics.totalStudents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <BookOpen className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Active Classes</p>
                    <p className="text-2xl font-bold">{dashboardData.overallMetrics.totalActiveClasses}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <BarChart3 className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Attendance Rate</p>
                    <p className="text-2xl font-bold">{dashboardData.overallMetrics.averageAttendanceRate.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Growth Rate</p>
                    <p className="text-2xl font-bold">{dashboardData.overallMetrics.averageGrowthRate.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Today's Classes Calendar */}
        <TodaysClassesCalendarContainer />

        {/* Program Cards Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Programs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {dashboardData?.programs.map((program) => (
              <ProgramCard key={program.programType} program={program} />
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        {dashboardData?.recentActivity && dashboardData.recentActivity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.recentActivity.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <p className="text-sm font-medium">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.studentName && `${activity.studentName} • `}
                          {activity.timestamp.toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
}

interface ProgramCardProps {
  program: ProgramMetrics
}

function ProgramCard({ program }: ProgramCardProps) {
  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <div className="h-4 w-4" />
    }
  }

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'up':
        return 'text-green-600'
      case 'down':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  const getProgramColor = (programType: string) => {
    switch (programType) {
      case 'PSD':
        return 'from-purple-500 to-purple-700'
      case 'WRITING':
        return 'from-red-500 to-red-700'
      case 'RAPS':
        return 'from-teal-500 to-teal-700'
      case 'CRITICAL':
        return 'from-green-500 to-green-700'
      default:
        return 'from-gray-500 to-gray-700'
    }
  }

  return (
    <Link href={`/dashboard/program/${program.programType.toLowerCase()}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 cursor-pointer aspect-square">
        {/* Program Header */}
        <div className={`p-4 text-white relative h-32 bg-gradient-to-r ${getProgramColor(program.programType)}`}>
          <div className="relative z-10">
            <h3 className="text-lg font-semibold mb-1">{program.programName}</h3>
            <p className="text-white/90 text-sm font-medium">{program.programType}</p>
          </div>
        </div>
        
        {/* Program Stats */}
        <CardContent className="p-4 flex-1">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{program.totalStudents}</span>
              </div>
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{program.totalClasses}</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <Database className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Attendance</span>
                <span className="font-medium">{program.averageAttendance.toFixed(1)}%</span>
              </div>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                {getTrendIcon(program.trendDirection)}
                <span className="text-muted-foreground">Growth</span>
                <span className={`font-medium ${getTrendColor(program.trendDirection)}`}>
                  {program.averageGrowth.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          
          {/* Progress indicators */}
          <div className="mt-3 space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full" 
                style={{ width: `${program.completionRate}%` }}
              ></div>
            </div>
            <div className="text-xs text-muted-foreground text-center">
              {program.completionRate.toFixed(1)}% completion rate
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}