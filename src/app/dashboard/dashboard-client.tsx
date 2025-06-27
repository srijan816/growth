'use client'

import { useState, useEffect } from 'react'
import { Session } from 'next-auth'
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
  Trophy,
  CheckCircle,
  Database
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Link from 'next/link'
import AIRecommendations from '@/components/ai/AIRecommendations'
import TodaysClassesCalendar from '@/components/dashboard/TodaysClassesCalendar'
import FileUpload from '@/components/feedback/FileUpload'
import DatabaseViewer from '@/components/database/DatabaseViewer'
import { InstructorPermissions } from '@/lib/instructor-permissions'

interface Student {
  id: string;
  name: string;
  feedbackCount: number;
  courses: string[];
}

interface DashboardClientProps {
  initialData: {
    students?: Student[];
    analysisData?: any;
    session: Session;
    permissions: InstructorPermissions;
    instructorName?: string;
    error?: string;
  };
}

// Client Component - handles state and interactivity
export default function DashboardClient({ initialData }: DashboardClientProps) {
  const [students, setStudents] = useState<Student[]>(initialData.students || []);
  const [analysisData, setAnalysisData] = useState(initialData.analysisData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialData.error || null);
  const [useAI, setUseAI] = useState(false);
  const [nextStudent, setNextStudent] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter students based on search
  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const refreshAnalysis = async (startFromParam?: string, freshStart = false) => {
    if (freshStart) {
      setAnalysisData(null);
      setNextStudent(null);
    }
    
    try {
      setIsAnalyzing(true);
      setError(null);

      let analysisUrl = `/api/feedback/analysis${useAI ? '?useAI=true' : ''}`;
      if (startFromParam) {
        analysisUrl += `&startFrom=${encodeURIComponent(startFromParam)}`;
      }
      
      console.log('📡 Fetching analysis:', analysisUrl);
      const analysisResponse = await fetch(analysisUrl);
      
      if (analysisResponse.ok) {
        const analysis = await analysisResponse.json();
        console.log('📊 Received analysis:', {
          attentionNeeded: analysis.attentionNeeded?.length || 0,
          successStories: analysis.successStories?.length || 0,
          keyInsights: analysis.keyInsights?.length || 0,
          studentAnalyses: analysis.studentAnalyses?.length || 0,
          isDataReady: analysis.isDataReady
        });
        
        if (analysis.isDataReady) {
          setAnalysisData(analysis);
          
          // Update next student for batch processing
          if (analysis.batchInfo?.nextStudent) {
            setNextStudent(analysis.batchInfo.nextStudent);
            console.log(`📋 Next batch will start from: ${analysis.batchInfo.nextStudent}`);
          } else {
            setNextStudent(null);
            console.log('✅ All students analyzed!');
          }
        }
      } else {
        console.error('Analysis API returned error:', analysisResponse.status);
        const errorText = await analysisResponse.text();
        console.error('Error details:', errorText);
        setError('Failed to load analysis data');
      }
    } catch (err) {
      console.error('Failed to refresh analysis:', err);
      setError('Failed to refresh analysis');
    } finally {
      setLoading(false);
      setIsAnalyzing(false);
    }
  };

  const processNextBatch = () => {
    if (nextStudent) {
      refreshAnalysis(nextStudent);
    }
  };

  const forceRefreshData = async () => {
    setLoading(true);
    setError(null);
    console.log('🔄 Forcing fresh data fetch');
    
    try {
      // Reparse instructor-specific data
      const parseResponse = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (parseResponse.ok) {
        const parseResult = await parseResponse.json();
        console.log('✅ Reparsed instructor data:', parseResult.summary);
      } else {
        console.error('Failed to reparse instructor data:', await parseResponse.text());
      }
    } catch (err) {
      console.error('Error reparsing instructor data:', err);
    }
    
    // Fetch updated students data
    try {
      const studentsResponse = await fetch('/api/feedback/students');
      
      if (studentsResponse.ok) {
        const studentsData = await studentsResponse.json();
        if (studentsData.isDataReady) {
          const studentList = studentsData.students.map((student: any, index: number) => ({
            id: student.id || `fallback_${student.name}_${index}`, // Use API-provided ID or fallback
            name: student.name,
            feedbackCount: student.totalFeedbacks || 0,
            courses: student.classes || []
          }));
          setStudents(studentList);
          console.log('💾 Updated students data');
        }
      }
    } catch (err) {
      console.error('Failed to fetch updated students:', err);
      setError('Failed to refresh student data');
    } finally {
      setLoading(false);
    }
  };

  // Load analysis if we don't have it yet
  useEffect(() => {
    if (!analysisData && students.length > 0 && !loading) {
      console.log('Loading initial analysis...');
      refreshAnalysis();
    }
  }, [analysisData, students.length]);

  if (error && students.length === 0) {
    const isParsingError = error.includes('parse') || error.includes('No feedback data found');
    
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto mt-8">
          <Alert variant={isParsingError ? "default" : "destructive"}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="mt-2">
              <div className="space-y-4">
                <p>{error}</p>
                {isParsingError && (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      To get started, you need to parse the feedback data from your instructor files.
                    </p>
                    <div className="flex gap-3">
                      <Button 
                        onClick={forceRefreshData}
                        disabled={loading}
                        className="flex items-center gap-2"
                      >
                        {loading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <TrendingUp className="h-4 w-4" />
                        )}
                        Parse Instructor Data
                      </Button>
                      {initialData.permissions.canAccessAllData && (
                        <Button 
                          variant="outline"
                          onClick={async () => {
                            try {
                              setLoading(true);
                              // Parse all data for test instructor
                              const response = await fetch('/api/feedback', { method: 'POST' });
                              if (response.ok) {
                                await forceRefreshData();
                              }
                            } catch (err) {
                              console.error('Failed to parse all data:', err);
                            }
                          }}
                          disabled={loading}
                        >
                          Parse All Data
                        </Button>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>• <strong>Parse Instructor Data:</strong> Process feedback files for your assigned students</p>
                      <p>• <strong>Parse All Data:</strong> Process all feedback files (admin only)</p>
                    </div>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
  }

  // Handle case where there are no students but no error (e.g., instructor has no students assigned)
  if (students.length === 0 && !error) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto mt-8">
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription className="mt-2">
              <div className="space-y-4">
                <p>No students found for instructor {initialData.instructorName}.</p>
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    This could mean:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1 ml-4">
                    <li>• No feedback data has been parsed yet</li>
                    <li>• No students are assigned to this instructor</li>
                    <li>• Feedback files don't contain data for this instructor</li>
                  </ul>
                  <Button 
                    onClick={forceRefreshData}
                    disabled={loading}
                    className="flex items-center gap-2"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <TrendingUp className="h-4 w-4" />
                    )}
                    Parse & Reload Data
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </DashboardLayout>
    );
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
                {initialData.instructorName && (
                  <span className="font-medium">
                    {initialData.instructorName}'s Students - 
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
                    {analysisData.batchInfo?.processingTime && (
                      <span className="ml-2 text-emerald-200">
                        - Processed in {(analysisData.batchInfo.processingTime / 1000).toFixed(1)}s
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
                    setUseAI(e.target.checked);
                    setTimeout(() => refreshAnalysis(), 100);
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
                    .map((student: any) => student.skills?.find((s: any) => s.skillName === skillName))
                    .filter(Boolean);
                  
                  const avgLevel = skillData.length > 0 
                    ? skillData.reduce((sum: number, skill: any) => sum + skill.currentLevel, 0) / skillData.length
                    : 0;
                  
                  const trendingUp = skillData.filter((skill: any) => skill.progress > 0).length;
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
              <div className="text-center py-12 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No skill analysis data available yet.</p>
                <p className="text-sm mt-2">Enable AI Analysis to see detailed skill breakdowns.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Rest of the dashboard content... */}
        {/* I'll continue with the remaining sections in the same pattern */}
        
        {/* File Upload for Admin Users */}
        {initialData.permissions.canAccessAllData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FileUpload 
              onUploadComplete={forceRefreshData}
              allowedInstructors={['Test Instructor', 'Srijan', 'Saurav', 'Jami', 'Mai', 'Tamkeen', 'Naveen', 'Gabi']}
              defaultInstructor={initialData.instructorName}
            />
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-green-600" />
                  Integration Status
                </CardTitle>
                <CardDescription>
                  External script integration has been replaced with unified parsing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Python scripts eliminated</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Direct database storage</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Real-time processing</span>
                  </div>
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm">Unified workflow</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Database Viewer - Temporary for all instructors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-purple-600" />
              Database Viewer
            </CardTitle>
            <CardDescription>
              Temporary view of parsed feedback data in the database
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DatabaseViewer onMigrationNeeded={forceRefreshData} />
          </CardContent>
        </Card>

        {/* Students Grid */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  Students ({filteredStudents.length})
                </CardTitle>
                <CardDescription>
                  Monitor individual student growth and progress
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredStudents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map((student) => (
                  <Card key={student.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{student.name}</h3>
                            <p className="text-sm text-gray-500">{student.feedbackCount} sessions</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {student.courses.slice(0, 2).map((course, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {course}
                            </Badge>
                          ))}
                          {student.courses.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{student.courses.length - 2} more
                            </Badge>
                          )}
                        </div>
                        <div className="flex justify-between items-center pt-2">
                          <Link href={`/dashboard/growth?student=${encodeURIComponent(student.name)}`}>
                            <Button size="sm" variant="outline" className="text-xs">
                              View Growth
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No students found matching your search.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}