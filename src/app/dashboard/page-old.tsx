'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/dashboard/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  TrendingUp, 
  TrendingDown, 
  Search, 
  User, 
  Target,
  Calendar, 
  Users, 
  Plus, 
  Loader2, 
  AlertCircle,
  BarChart3,
  Trophy
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'
import AIRecommendations from '@/components/ai/AIRecommendations'
import TodaysClassesCalendar from '@/components/dashboard/TodaysClassesCalendar'

interface Student {
  id: string
  name: string
  feedbackCount: number
  courses: string[]
}

export default function GrowthOverviewPage() {
  const { data: session, status } = useSession()
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [dataFetched, setDataFetched] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [useAI, setUseAI] = useState(false)
  const [nextStudent, setNextStudent] = useState<string | null>(null)
  const [initialLoad, setInitialLoad] = useState(true)
  const [isAnalyzing, setIsAnalyzing] = useState(false)

  // Load cached data on component mount
  useEffect(() => {
    const instructorKey = session?.user?.name || 'unknown'
    const cachedStudents = localStorage.getItem(`dashboardStudents_${instructorKey}`)
    const cachedAnalysis = localStorage.getItem(`dashboardAnalysis_${instructorKey}`)
    
    if (cachedStudents && initialLoad) {
      try {
        const parsedStudents = JSON.parse(cachedStudents)
        console.log('📦 Loading cached students:', parsedStudents.length)
        setStudents(parsedStudents)
        
        if (cachedAnalysis) {
          const parsedAnalysis = JSON.parse(cachedAnalysis)
          console.log('📦 Loading cached analysis')
          setAnalysisData(parsedAnalysis)
        }
        
        setInitialLoad(false)
        setDataFetched(true)
      } catch (error) {
        console.error('Error parsing cached data:', error)
        localStorage.removeItem(`dashboardStudents_${instructorKey}`)
        localStorage.removeItem(`dashboardAnalysis_${instructorKey}`)
      }
    }
  }, [initialLoad, session?.user?.name])

  useEffect(() => {
    console.log('Dashboard useEffect triggered:', { status, hasSession: !!session, dataFetched, initialLoad })
    
    if (status === 'loading') return
    
    if (!session) {
      redirect('/auth/signin')
      return
    }
    
    // Only fetch fresh data if we don't have cached data and initial load is complete
    if (session && !dataFetched && !initialLoad) {
      console.log('Fetching fresh data for dashboard...')
      fetchData()
    }
  }, [session, status, dataFetched, initialLoad])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch students data
      const studentsResponse = await fetch('/api/feedback/students')
      
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json()
        if (studentsData.isDataReady) {
          const studentList = studentsData.students.map((student: any, index: number) => ({
            id: student.id || `fallback_${student.name}_${index}`, // Use API-provided ID or fallback
            name: student.name,
            feedbackCount: student.totalFeedbacks || 0,
            courses: student.classes || []
          }))
          setStudents(studentList)
          
          // Cache students data with instructor key
          const instructorKey = session?.user?.name || 'unknown'
          localStorage.setItem(`dashboardStudents_${instructorKey}`, JSON.stringify(studentList))
          console.log('💾 Cached students data for instructor:', instructorKey)
          
          // Only fetch analysis if we have students
          if (studentList.length > 0) {
            const analysisUrl = `/api/feedback/analysis${useAI ? '?useAI=true' : ''}${nextStudent ? `&startFrom=${encodeURIComponent(nextStudent)}` : ''}`
            const analysisResponse = await fetch(analysisUrl)
            
            if (analysisResponse.ok) {
              const analysis = await analysisResponse.json()
              setAnalysisData(analysis)
              
              // Cache analysis data with instructor key
              localStorage.setItem(`dashboardAnalysis_${instructorKey}`, JSON.stringify(analysis))
              console.log('💾 Cached analysis data for instructor:', instructorKey)
              
              // Update next student for batch processing
              if (analysis.batchInfo?.nextStudent) {
                setNextStudent(analysis.batchInfo.nextStudent)
              } else {
                setNextStudent(null)
              }
            }
          }
        }
      } else {
        setError('Failed to fetch students')
      }
    } catch (err) {
      setError('Failed to load data')
      console.error('Error in fetchData:', err)
    } finally {
      setLoading(false)
      setDataFetched(true)
    }
  }

  const fetchStudentGrowth = async (studentId: string) => {
    try {
      const response = await fetch(`/api/feedback/student/${encodeURIComponent(studentId)}`)
      if (response.ok) {
        const data = await response.json()
        setSelectedStudent(data)
      }
    } catch (error) {
      console.error('Error fetching student data:', error)
    }
  }

  const handleStudentClick = (studentId: string) => {
    fetchStudentGrowth(studentId)
    setTimeout(() => {
      const studentTab = document.querySelector('[data-state="inactive"][value="students"]') as HTMLElement
      if (studentTab) studentTab.click()
    }, 100)
  }

  const refreshAnalysis = async (startFrom?: string, resetBatch: boolean = false) => {
    if (students.length === 0) {
      console.log('No students to analyze')
      return
    }
    
    if (isAnalyzing) {
      console.log('⏸️ Analysis already in progress, skipping...')
      return
    }
    
    try {
      setLoading(true)
      setIsAnalyzing(true)
      
      // If resetting batch, clear nextStudent
      if (resetBatch) {
        setNextStudent(null)
      }
      
      const startFromParam = startFrom || (resetBatch ? null : nextStudent)
      let analysisUrl = `/api/feedback/analysis${useAI ? '?useAI=true' : ''}`
      
      if (startFromParam) {
        analysisUrl += `&startFrom=${encodeURIComponent(startFromParam)}`
      }
      
      console.log('📡 Fetching analysis:', analysisUrl)
      const analysisResponse = await fetch(analysisUrl)
      
      if (analysisResponse.ok) {
        const analysis = await analysisResponse.json()
        console.log('📊 Received analysis:', {
          attentionNeeded: analysis.attentionNeeded?.length || 0,
          successStories: analysis.successStories?.length || 0,
          keyInsights: analysis.keyInsights?.length || 0,
          studentAnalyses: analysis.studentAnalyses?.length || 0,
          isDataReady: analysis.isDataReady
        })
        
        // Only update if we got valid data
        if (analysis.isDataReady) {
          setAnalysisData(analysis)
          
          // Cache fresh analysis with instructor key
          const instructorKey = session?.user?.name || 'unknown'
          localStorage.setItem(`dashboardAnalysis_${instructorKey}`, JSON.stringify(analysis))
          console.log('💾 Updated cached analysis data for instructor:', instructorKey)
          
          // Update next student for batch processing
          if (analysis.batchInfo?.nextStudent) {
            setNextStudent(analysis.batchInfo.nextStudent)
            console.log(`📋 Next batch will start from: ${analysis.batchInfo.nextStudent}`)
          } else {
            setNextStudent(null)
            console.log('✅ All students analyzed!')
          }
        } else {
          console.log('⚠️ Data not ready, keeping existing analysis')
        }
      } else {
        console.error('Analysis API returned error:', analysisResponse.status)
        const errorText = await analysisResponse.text()
        console.error('Error details:', errorText)
      }
    } catch (err) {
      console.error('Failed to refresh analysis:', err)
    } finally {
      setLoading(false)
      setIsAnalyzing(false)
    }
  }

  const processNextBatch = () => {
    if (nextStudent) {
      refreshAnalysis(nextStudent)
    }
  }

  const forceRefreshData = async () => {
    // Clear cache and force fresh fetch
    const instructorKey = session?.user?.name || 'unknown'
    localStorage.removeItem(`dashboardStudents_${instructorKey}`)
    localStorage.removeItem(`dashboardAnalysis_${instructorKey}`)
    setDataFetched(false)
    setInitialLoad(false)
    console.log('🔄 Forcing fresh data fetch for instructor:', instructorKey)
    
    // First, reparse instructor-specific data
    try {
      setLoading(true)
      const parseResponse = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (parseResponse.ok) {
        const parseResult = await parseResponse.json()
        console.log('✅ Reparsed instructor data:', parseResult.summary)
      } else {
        console.error('Failed to reparse instructor data:', await parseResponse.text())
      }
    } catch (err) {
      console.error('Error reparsing instructor data:', err)
    }
    
    // Then fetch the updated data
    await fetchData()
  }

  // Handle authentication loading
  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="ml-2 text-gray-600">Checking authentication...</span>
        </div>
      </DashboardLayout>
    )
  }

  // This shouldn't happen due to useEffect redirect, but just in case
  if (!session) {
    return null
  }

  if (error) {
    return (
      <DashboardLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Growth-Centered Hero Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2 flex items-center">
                <TrendingUp className="mr-3 h-8 w-8" />
                Growth Overview
                {loading && <Loader2 className="ml-3 h-5 w-5 animate-spin" />}
              </h1>
              <p className="text-emerald-50">
                {session?.user?.name && (
                  <span className="font-medium">
                    {session.user.name}'s Students - 
                  </span>
                )}
                Track student skill development and progress
                {loading && <span className="ml-2">Loading student data...</span>}
                {analysisData && (
                  <span className="ml-2">
                    ({analysisData.analysisType === 'ai-powered' ? 'AI-Powered' : 'Rule-Based'} Analysis)
                    {analysisData.instructorView && analysisData.instructorView !== 'all' && (
                      <span className="ml-2 text-emerald-200">
                        - {analysisData.instructorView} view
                      </span>
                    )}
                    {analysisData.totalAvailableStudents > analysisData.analyzedStudents && (
                      <span className="ml-2 text-yellow-100">
                        - Analyzing {analysisData.analyzedStudents} of {analysisData.totalAvailableStudents} students for performance
                      </span>
                    )}
                    {analysisData.batchInfo && (
                      <span className="ml-2">
                        - Batch: {analysisData.batchInfo.currentBatch} students 
                        ({analysisData.batchInfo.processedCount} AI, {analysisData.batchInfo.cachedCount} cached)
                      </span>
                    )}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useAI"
                  checked={useAI}
                  onChange={(e) => {
                    setUseAI(e.target.checked)
                    setTimeout(() => refreshAnalysis(), 100)
                  }}
                  className="rounded"
                />
                <label htmlFor="useAI" className="text-sm text-emerald-100">
                  Use AI Analysis
                </label>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshAnalysis(undefined, true)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                disabled={loading}
              >
                Start Fresh Analysis
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={forceRefreshData}
                className="bg-orange-400/20 border-orange-300/30 text-white hover:bg-orange-400/30"
                disabled={loading}
              >
                Reload Data
              </Button>
              {useAI && nextStudent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={processNextBatch}
                  className="bg-emerald-400/20 border-emerald-300/30 text-white hover:bg-emerald-400/30"
                  disabled={loading}
                >
                  Next Batch →
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Core Skills Tracking */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Core Skills Performance (9 Metrics)
            </CardTitle>
            <CardDescription>
              Tracking progress across the 9 fundamental debate skills
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analysisData?.studentAnalyses?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  'Hook Development',
                  'Speech Time Management', 
                  'Vocal Projection',
                  'Clarity & Fluency',
                  'Argument Structure & Depth',
                  'Rebuttal Skills',
                  'Examples & Illustrations',
                  'Engagement (POIs)',
                  'Speech Structure & Organization'
                ].map((skillName) => {
                  // Calculate average for this skill across all students
                  const skillData = analysisData.studentAnalyses
                    .map(student => student.skills?.find(s => s.skillName === skillName))
                    .filter(Boolean);
                  
                  const avgLevel = skillData.length > 0 
                    ? skillData.reduce((sum, skill) => sum + skill.currentLevel, 0) / skillData.length
                    : 0;
                  
                  const trendingUp = skillData.filter(skill => skill.progress > 0).length;
                  const total = skillData.length;
                  
                  return (
                    <div key={skillName} className="p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm text-gray-900">{skillName}</h4>
                        <span className="text-xs text-gray-600">
                          {avgLevel > 0 ? `${avgLevel.toFixed(1)}/10` : 'No data'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={avgLevel * 10} className="flex-1 h-2" />
                        <div className="flex items-center text-xs text-gray-600">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {total > 0 ? Math.round((trendingUp / total) * 100) : 0}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">No skills data available yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  Skills tracking will appear when students have structured feedback with measurable assessments
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dynamic Actionable Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attention Needed Card */}
          <Card className="border shadow-sm bg-white hover:shadow-md transition-shadow h-[450px] flex flex-col">
            <CardHeader className="pb-4 px-6">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <span className="text-lg font-semibold">Attention Needed</span>
                </div>
                <Badge variant="destructive" className="text-xs px-2 py-1">
                  {analysisData?.attentionNeeded?.length || 0} students
                </Badge>
              </CardTitle>
              <CardDescription className="text-gray-600">
                Students with declining growth or consecutive low scores
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-6 flex-1 overflow-y-auto">
              {(analysisData?.attentionNeeded || []).slice(0, 5).map((student: any, i: number) => (
                <div key={i} className="p-4 bg-red-50 rounded-lg border border-red-100 hover:border-red-200 cursor-pointer transition-all hover:shadow-sm"
                     onClick={() => handleStudentClick(student.studentName)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{student.studentName}</p>
                      <p className="text-xs text-red-600">{student.reason} - Unit {student.unitNumber}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-xs px-2 py-1 rounded ${
                        student.severity === 'high' ? 'bg-red-100 text-red-700' :
                        student.severity === 'medium' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {student.severity}
                      </span>
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-600">Suggested: {student.suggestedAction}</p>
                    {student.reasoning && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                          AI Analysis →
                        </summary>
                        <p className="mt-1 text-gray-600 italic">{student.reasoning}</p>
                      </details>
                    )}
                  </div>
                </div>
              ))}
              {(!analysisData?.attentionNeeded || analysisData.attentionNeeded.length === 0) && (
                <div className="text-center py-6 text-gray-600">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No attention alerts available</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Analysis requires structured feedback with specific skill assessments
                  </p>
                </div>
              )}
              {students.length > 3 && (
                <Link href="/dashboard/students?filter=needs-help">
                  <Button variant="outline" className="w-full text-red-600 border-red-200 hover:bg-red-50">
                    View All ({Math.max(3, Math.floor(students.length * 0.15))})
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Key Insights Card */}
          <Card className="border shadow-sm bg-white hover:shadow-md transition-shadow h-[450px] flex flex-col">
            <CardHeader className="pb-4 px-6">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  <span className="text-lg font-semibold">Key Insights</span>
                </div>
                <Badge className="bg-purple-100 text-purple-700 text-xs">
                  This Week
                </Badge>
              </CardTitle>
              <CardDescription className="text-gray-600">
                Emerging trends and patterns across your classes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-6 flex-1 overflow-y-auto">
              {(analysisData?.keyInsights || []).slice(0, 5).map((insight: any, i: number) => (
                <div key={i} className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {insight.title}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        {insight.description}
                        {insight.affectedStudents && (
                          <span className="ml-1">({insight.affectedStudents} students)</span>
                        )}
                        {insight.metric && (
                          <span className="ml-1">({insight.metric.toFixed(0)}%)</span>
                        )}
                      </p>
                      {insight.reasoning && (
                        <details className="mt-1 text-xs">
                          <summary className="cursor-pointer text-purple-600 hover:text-purple-800">
                            How AI found this →
                          </summary>
                          <p className="mt-1 text-gray-600 italic">{insight.reasoning}</p>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {(!analysisData?.keyInsights || analysisData.keyInsights.length === 0) && (
                <div className="text-center py-6 text-gray-600">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No insights available yet</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Insights require measurable feedback data across multiple students
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Successes & Celebrations Card */}
          <Card className="border shadow-sm bg-white hover:shadow-md transition-shadow h-[450px] flex flex-col">
            <CardHeader className="pb-4 px-6">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="text-lg font-semibold">Successes & Celebrations</span>
                </div>
                <Badge className="bg-green-100 text-green-700 text-xs">
                  🎉 {analysisData?.successStories?.length || 0}
                </Badge>
              </CardTitle>
              <CardDescription className="text-gray-600">
                Students making significant progress
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 px-6 flex-1 overflow-y-auto">
              {(analysisData?.successStories || []).slice(0, 5).map((story: any, i: number) => (
                <div key={i} className="p-4 bg-green-50 rounded-lg border border-green-100 hover:border-green-200 cursor-pointer transition-all hover:shadow-sm"
                     onClick={() => handleStudentClick(story.studentName)}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{story.studentName}</p>
                      <p className="text-xs text-green-600">{story.achievement}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-bold text-green-700">{story.metric}</span>
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    </div>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${
                        story.badge === 'top10' ? 'bg-yellow-100 text-yellow-700' :
                        story.badge === 'mostImproved' ? 'bg-blue-100 text-blue-700' :
                        story.badge === 'breakthrough' ? 'bg-purple-100 text-purple-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {story.badge === 'top10' ? 'Top 10%' :
                         story.badge === 'mostImproved' ? 'Most Improved' :
                         story.badge === 'breakthrough' ? 'Breakthrough' :
                         'Success'}
                      </Badge>
                      <span className="text-xs text-gray-600">{story.readyForNext}</span>
                    </div>
                    {story.reasoning && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-green-600 hover:text-green-800">
                          AI Analysis →
                        </summary>
                        <p className="mt-1 text-gray-600 italic">{story.reasoning}</p>
                      </details>
                    )}
                  </div>
                </div>
              ))}
              {(!analysisData?.successStories || analysisData.successStories.length === 0) && (
                <div className="text-center py-6 text-gray-600">
                  <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No success stories available yet</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Success tracking requires detailed performance assessments over time
                  </p>
                </div>
              )}
              {students.length > 3 && (
                <Link href="/dashboard/students?filter=top-performers">
                  <Button variant="outline" className="w-full text-green-600 border-green-200 hover:bg-green-50">
                    View All Success Stories
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Growth Analytics Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 h-auto p-1">
            <TabsTrigger value="overview" className="text-sm px-4 py-3">Growth Snapshots</TabsTrigger>
            <TabsTrigger value="students" className="text-sm px-4 py-3">Student Progress</TabsTrigger>
            <TabsTrigger value="insights" className="text-sm px-4 py-3">Today's Classes</TabsTrigger>
          </TabsList>

          {/* Growth Snapshots Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Most Improved Students */}
              <Card className="border shadow-sm bg-white hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-gray-900">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Most Improved
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Students showing significant growth trends
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {students.length > 0 ? (
                      <div className="text-center py-8">
                        <TrendingUp className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-600">Growth analysis not available</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Showing {students.length} students - analysis requires structured feedback data
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <TrendingUp className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">No students found</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Top Performing Students */}
              <Card className="border shadow-sm bg-white hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-gray-900">
                    <Target className="h-5 w-5 mr-2" />
                    Top Performing
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Students with highest overall scores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {students.length > 0 ? (
                      <div className="text-center py-8">
                        <Target className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-600">Performance analysis not available</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Showing {students.length} students - analysis requires structured feedback data
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Target className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">No students found</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Needs Help Students */}
              <Card className="border shadow-sm bg-white hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center text-gray-900">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Needs Help
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Students requiring additional support
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {students.length > 0 ? (
                      <div className="text-center py-8">
                        <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-600">Support analysis not available</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Showing {students.length} students - analysis requires structured feedback data
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">No students found</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            
          </TabsContent>

          {/* Student Progress Tab */}
          <TabsContent value="students" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg">Find Student</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  <div className="border rounded-lg max-h-96 overflow-y-auto">
                    <div className="p-3 border-b bg-gray-50">
                      <h4 className="font-medium text-sm">Students ({students.length})</h4>
                    </div>
                    <div className="p-2 space-y-1">
                      {students.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map((student) => (
                        <Button
                          key={student.id}
                          variant={selectedStudent?.studentName === student.name ? "default" : "ghost"}
                          className="w-full justify-start h-auto p-3 text-left"
                          onClick={() => fetchStudentGrowth(student.id)}
                        >
                          <User className="h-4 w-4 mr-2 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{student.name}</div>
                            <div className="text-xs text-gray-500">
                              {student.feedbackCount} feedback sessions
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="lg:col-span-2">
                {selectedStudent ? (
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center space-x-2">
                          <User className="h-5 w-5" />
                          <span>{selectedStudent.studentName}</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-blue-600">
                                {selectedStudent.chronologicalFeedback?.length || 0}
                              </div>
                              <div className="text-sm text-gray-600">Sessions</div>
                            </div>
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">
                                {selectedStudent.classes || 1}
                              </div>
                              <div className="text-sm text-gray-600">Programs</div>
                            </div>
                          </div>

                          {selectedStudent.chronologicalFeedback && (
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                              <h4 className="font-semibold">Growth Timeline</h4>
                              {selectedStudent.chronologicalFeedback.slice(0, 5).map((feedback: any, index: number) => (
                                <div key={index} className="border-l-4 border-blue-200 pl-4 py-2">
                                  <h6 className="font-medium text-sm">
                                    Unit {feedback.unitNumber || index + 1}
                                  </h6>
                                  <p className="text-xs text-gray-600">{feedback.topic || 'Class Activity'}</p>
                                  {feedback.content && (
                                    <div className="text-sm text-gray-700 mt-2">
                                      {feedback.content.substring(0, 200)}...
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* AI Recommendations Section */}
                    <AIRecommendations 
                      studentName={selectedStudent.studentName}
                      programType="PSD"
                    />
                  </div>
                ) : (
                  <Card>
                    <CardContent className="flex items-center justify-center h-96">
                      <div className="text-center">
                        <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">Select a student to view their growth progress</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Today's Classes Tab */}
          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today's Classes Calendar */}
              <TodaysClassesCalendar />
              
              {/* Quick Actions Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>
                    Common tasks and system setup
                  </CardDescription>
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
                      All Student Profiles
                    </Button>
                  </Link>
                  <Link href="/dashboard/today" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Calendar className="mr-2 h-4 w-4" />
                      View All Today's Students
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start text-purple-600 border-purple-200 hover:bg-purple-50"
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/setup-recommendations-table', { method: 'POST' })
                        const data = await response.json()
                        if (data.success) {
                          alert('AI Recommendations system setup complete!')
                        } else {
                          alert('Setup failed: ' + data.error)
                        }
                      } catch (error) {
                        alert('Setup error: ' + error)
                      }
                    }}
                  >
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Setup AI System
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}