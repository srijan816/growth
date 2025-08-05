'use client'

import { useState, useEffect } from 'react'
import { Session } from 'next-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  User, 
  Mail, 
  Phone, 
  Calendar,
  Clock,
  BookOpen,
  TrendingUp,
  MessageSquare,
  FileText,
  Download,
  ArrowLeft,
  Star,
  Award,
  Target,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Upload
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import FeedbackView from '@/components/dashboard/feedback-view'
import AttendanceView from '@/components/dashboard/attendance-view'
import { GrowthDashboard } from '@/components/growth/GrowthDashboard'

interface StudentProfileClientProps {
  student: any
  feedback: any[]
  attendance: any[]
  session: Session
}

export default function StudentProfileClient({ 
  student, 
  feedback, 
  attendance,
  session 
}: StudentProfileClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('overview')
  const [primaryFeedback, setPrimaryFeedback] = useState<any[]>([])
  const [secondaryFeedback, setSecondaryFeedback] = useState<any[]>([])
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(true)

  // Calculate metrics
  const avgRating = feedback.length > 0
    ? feedback.reduce((acc, f) => {
        const ratings = [
          f.metadata?.attitude_rating,
          f.metadata?.asking_questions_rating,
          f.metadata?.application_rating,
          f.metadata?.feedback_rating
        ].filter(r => r !== undefined && r !== null)
        const avg = ratings.length > 0 
          ? ratings.reduce((sum, r) => sum + parseFloat(r), 0) / ratings.length
          : 0
        return acc + avg
      }, 0) / feedback.length
    : 0

  const attendanceRate = attendance.length > 0
    ? (attendance.filter(a => a.status === 'present').length / attendance.length) * 100
    : 0

  const getProgramColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'psd': return 'bg-blue-100 text-blue-700'
      case 'writing': return 'bg-purple-100 text-purple-700'
      case 'raps': return 'bg-green-100 text-green-700'
      case 'critical': return 'bg-orange-100 text-orange-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // Categorize feedback by primary/secondary
  useEffect(() => {
    const categorizeFeedback = async () => {
      setIsLoadingFeedback(true)
      try {
        const response = await fetch(`/api/students/${student.id}/categorize-feedback`)
        if (response.ok) {
          const { primary, secondary } = await response.json()
          setPrimaryFeedback(primary)
          setSecondaryFeedback(secondary)
        } else {
          // Fallback to simple categorization if API fails
          const currentGrade = parseInt(student.grade_level?.replace('Grade ', '') || '0')
          if (currentGrade <= 6) {
            setPrimaryFeedback(feedback)
            setSecondaryFeedback([])
          } else {
            setPrimaryFeedback([])
            setSecondaryFeedback(feedback)
          }
        }
      } catch (error) {
        console.error('Error categorizing feedback:', error)
        // Fallback categorization
        setPrimaryFeedback(feedback)
        setSecondaryFeedback([])
      } finally {
        setIsLoadingFeedback(false)
      }
    }

    if (feedback.length > 0) {
      categorizeFeedback()
    } else {
      setIsLoadingFeedback(false)
    }
  }, [student.id, student.grade_level, feedback])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-semibold">{student.name}</h1>
                <p className="text-sm text-muted-foreground">
                  Student ID: {student.student_id_external || student.student_number} • {student.grade_level || 'Grade N/A'} • {student.school || 'School N/A'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export Report
              </Button>
              <Link href={`/dashboard/recording?student=${student.id}`}>
                <Button size="sm">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Add Feedback
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Star className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                  <p className="text-xl font-semibold">{avgRating.toFixed(1)}/5</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Attendance</p>
                  <p className="text-xl font-semibold">{attendanceRate.toFixed(0)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-100">
                  <MessageSquare className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Feedback Entries</p>
                  <p className="text-xl font-semibold">{feedback.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100">
                  <TrendingUp className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Growth Score</p>
                  <p className="text-xl font-semibold">82%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="growth">
              <Sparkles className="h-4 w-4 mr-1" />
              Growth Analytics
            </TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
            <TabsTrigger value="progress">Attendance & Performance</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{student.parent_email || 'No email provided'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{student.parent_phone || 'No phone provided'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Student ID: {student.student_id_external || student.student_number}</span>
                </div>
              </CardContent>
            </Card>

            {/* Enrolled Courses */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Enrolled Courses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {student.courses?.map((course: any) => (
                    <div key={course.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{course.code}: {course.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {course.day_of_week} • {course.start_time} - {course.end_time}
                          </p>
                        </div>
                      </div>
                      <Badge className={getProgramColor(course.type)}>
                        {course.type}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Performance Highlights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Award className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-600">Strengths</p>
                      <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                        <li>• Excellent participation in class discussions</li>
                        <li>• Strong critical thinking skills</li>
                        <li>• Consistent improvement in public speaking</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Target className="h-5 w-5 text-orange-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-orange-600">Areas for Growth</p>
                      <ul className="text-sm text-muted-foreground mt-1 space-y-1">
                        <li>• Time management during presentations</li>
                        <li>• Incorporating more evidence in arguments</li>
                        <li>• Building confidence in impromptu speaking</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="attendance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Record</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {attendance.map((record) => (
                    <div key={record.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{record.course_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(record.date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={record.status === 'present' ? 'default' : 'secondary'}>
                        {record.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="growth" className="space-y-4">
            <GrowthDashboard 
              studentId={student.id}
              timeframe="month"
            />
          </TabsContent>

          <TabsContent value="progress" className="space-y-4">
            <AttendanceView
              attendance={attendance}
              studentName={student.name}
            />
          </TabsContent>

          <TabsContent value="feedback" className="space-y-4">
            <FeedbackView 
              primaryFeedback={primaryFeedback}
              secondaryFeedback={secondaryFeedback}
              isLoadingFeedback={isLoadingFeedback}
              studentGrade={student.grade_level}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}