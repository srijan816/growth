'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Search, 
  User, 
  Target
} from 'lucide-react';

interface GrowthAnalytics {
  unitPerformance: Array<{
    unit_number: string;
    program_type: string;
    level: string;
    total_students: number;
    average_performance: number;
    high_performers: number;
    needs_support: number;
  }>;
  skillAnalytics: Array<{
    skill_category: string;
    trend_direction: string;
    average_score: number;
    student_count: number;
    strength_count: number;
    growth_area_count: number;
  }>;
  trendSummary: {
    improving: number;
    stable: number;
    declining: number;
  };
  commonThemes: Array<{
    theme_id: string;
    feedback_themes: {
      name: string;
      theme_type: string;
    };
    frequency: number;
  }>;
}

interface StudentGrowthData {
  student: {
    student_id: string;
    student_name: string;
    course_code: string;
    total_feedback_sessions: number;
    first_feedback: string;
    latest_feedback: string;
    average_score: number;
    skills_assessed: number;
  };
  growthTrends: {
    improving: string[];
    stable: string[];
    declining: string[];
  };
  focusAreas: string[];
  strengths: string[];
  skillProgression: Array<{
    skill_category: string;
    initial_score: number;
    current_score: number;
    growth_rate: number;
    trend_direction: string;
    total_assessments: number;
  }>;
  recentFeedback: Array<{
    id: string;
    feedback_date: string;
    best_aspects: string;
    improvement_areas: string;
    speech_duration: string;
    feedback_sessions: {
      unit_number: string;
      topic: string;
      class_sessions: {
        courses: {
          code: string;
          name: string;
        };
      };
    };
  }>;
}

export default function GrowthTrackingPage() {
  const [analytics, setAnalytics] = useState<GrowthAnalytics | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentGrowthData | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedFeedbackType, setSelectedFeedbackType] = useState<string>('all');
  const [students, setStudents] = useState<Array<{ id: string; name: string; course: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
    fetchStudents();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/growth/analytics');
      const data = await response.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      console.log('Fetching students...');
      
      // First test our test endpoint
      const testResponse = await fetch('/api/test-students');
      const testData = await testResponse.json();
      console.log('Test endpoint response:', testData);
      
      // Get students from feedback data
      const response = await fetch('/api/feedback/students');
      const data = await response.json();
      
      console.log('Students API response:', { status: response.status, data });
      
      if (response.ok && data.isDataReady) {
        // Transform feedback student data to match our interface
        const studentList = data.students.map((student: any) => ({
          id: student.name, // Use name as ID for now
          name: student.name,
          course: student.classes[0] || 'Unknown', // Take first class
          feedbackCount: student.totalFeedbacks,
          classCount: student.classCount,
          feedbackTypes: student.feedbackTypes
        }));
        
        console.log('Transformed student list:', studentList);
        setStudents(studentList);
        setError(null);
      } else if (response.status === 202) {
        // Data not yet parsed
        console.log('Feedback data not yet parsed');
        setStudents([]);
        setError('Feedback data not yet parsed. Please run the parsing process first.');
      } else {
        console.error('Failed to fetch students:', data.error);
        setStudents([]);
        setError(data.error || 'Failed to fetch students');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
      setError('Failed to fetch student data: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentGrowth = async (studentId: string) => {
    try {
      setLoading(true);
      
      // Parse the student ID which might include feedback type info
      let studentName = studentId;
      let feedbackType: string | undefined;
      
      // Handle composite IDs like "StudentName_primary_secondary"
      if (studentId.includes('_')) {
        const parts = studentId.split('_');
        studentName = parts[0];
        
        // Check if this is a name collision case
        if (parts.includes('primary') || parts.includes('secondary')) {
          // User selected a specific feedback type
          if (parts.includes('primary') && !parts.includes('secondary')) {
            feedbackType = 'primary';
          } else if (parts.includes('secondary') && !parts.includes('primary')) {
            feedbackType = 'secondary';
          }
          // If both types, don't filter
        }
      }
      
      console.log('Fetching growth data for:', { studentName, feedbackType });
      
      // Build query string
      const queryParams = new URLSearchParams();
      if (feedbackType) {
        queryParams.append('type', feedbackType);
      }
      
      const url = `/api/feedback/student/${encodeURIComponent(studentName)}${queryParams.toString() ? `?${queryParams}` : ''}`;
      
      // Fetch real student feedback data with optional filtering
      const response = await fetch(url);
      
      if (response.ok) {
        const feedbackData = await response.json();
        
        console.log('Raw feedback data:', feedbackData);
        
        // Check if we have feedback data
        if (!feedbackData.chronologicalFeedback || feedbackData.chronologicalFeedback.length === 0) {
          console.log('No chronological feedback found for student');
          setSelectedStudent(null);
          return;
        }

        // Transform feedback data to match our interface
        console.log('Sample feedback record:', feedbackData.chronologicalFeedback[0]);
        
        const transformedData: StudentGrowthData = {
          student: {
            student_id: studentId,
            student_name: feedbackData.studentName,
            course_code: feedbackData.chronologicalFeedback[0]?.classCode || 'Unknown',
            total_feedback_sessions: feedbackData.chronologicalFeedback.length,
            first_feedback: feedbackData.chronologicalFeedback[0]?.unitNumber || '',
            latest_feedback: feedbackData.chronologicalFeedback[feedbackData.chronologicalFeedback.length - 1]?.unitNumber || '',
            average_score: 0, // Will be calculated by LLM later
            skills_assessed: feedbackData.classes || 1
          },
          growthTrends: {
            improving: [], // Will be analyzed by LLM
            stable: [],
            declining: []
          },
          focusAreas: [], // Will be identified by LLM
          strengths: [], // Will be identified by LLM
          skillProgression: [], // Will be calculated by LLM
          recentFeedback: feedbackData.chronologicalFeedback.map((feedback: any, index: number) => {
            // Add safety checks for each property
            const safeRecord = {
              id: index.toString(),
              feedback_date: feedback.unitNumber || `Unit ${index + 1}`,
              // For secondary feedback, don't split - keep teacher comments unified
              best_aspects: feedback.feedbackType === 'secondary' ? '' : extractBestAspects(feedback.content || ''),
              improvement_areas: feedback.feedbackType === 'secondary' ? '' : extractImprovementAreas(feedback.content || ''),
              teacher_comments: feedback.feedbackType === 'secondary' ? 
                (feedback.content?.includes('TEACHER COMMENTS:') ? 
                  feedback.content.split('TEACHER COMMENTS:')[1]?.trim() : '') : '',
              speech_duration: feedback.duration || '',
              feedback_type: feedback.feedbackType || 'primary',
              motion: feedback.motion || '',
              rubric_scores: feedback.feedbackType === 'secondary' ? extractRubricScoresFromHTML(feedback.htmlContent || '') : [],
              feedback_sessions: {
                unit_number: feedback.unitNumber || `${index + 1}`,
                topic: feedback.topic || feedback.motion || 'Class Activity',
                class_sessions: {
                  courses: {
                    code: feedback.classCode || 'Unknown',
                    name: feedback.className || 'Unknown Class'
                  }
                }
              }
            };
            
            console.log(`Transformed feedback ${index}:`, safeRecord);
            return safeRecord;
          })
        };
        
        console.log('Transformed student data:', transformedData);
        setSelectedStudent(transformedData);
        
        setSelectedStudent(transformedData);
      } else {
        const errorData = await response.json();
        console.error('Student not found:', errorData);
        
        // Show error state
        setSelectedStudent(null);
      }
    } catch (error) {
      console.error('Error fetching student feedback:', error);
      setSelectedStudent(null);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'improving':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'declining':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatSkillName = (skill: string) => {
    return skill.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const extractBestAspects = (content: string): string => {
    // Primary feedback format
    if (content.includes('STRENGTHS:')) {
      const section = content.split('STRENGTHS:')[1]?.split('AREAS FOR IMPROVEMENT:')[0];
      return section?.trim() || '';
    }
    
    // Secondary feedback format - extract positive comments from teacher feedback
    if (content.includes('TEACHER COMMENTS:')) {
      const teacherComments = content.split('TEACHER COMMENTS:')[1]?.trim() || '';
      // Look for positive phrases in teacher comments
      const positiveLines = teacherComments.split('\n').filter(line => 
        line.toLowerCase().includes('nice work') || 
        line.toLowerCase().includes('good work') ||
        line.toLowerCase().includes('good') ||
        line.toLowerCase().includes('nice')
      );
      return positiveLines.join('\n').trim();
    }
    
    return '';
  };

  const extractImprovementAreas = (content: string): string => {
    // Primary feedback format
    if (content.includes('AREAS FOR IMPROVEMENT:')) {
      const section = content.split('AREAS FOR IMPROVEMENT:')[1]?.split('TEACHER COMMENTS:')[0];
      return section?.trim() || '';
    }
    
    // Secondary feedback format - extract improvement suggestions from teacher feedback
    if (content.includes('TEACHER COMMENTS:')) {
      const teacherComments = content.split('TEACHER COMMENTS:')[1]?.trim() || '';
      // Look for improvement phrases in teacher comments
      const improvementLines = teacherComments.split('\n').filter(line => 
        line.toLowerCase().includes('try to') || 
        line.toLowerCase().includes('you need') ||
        line.toLowerCase().includes('we need') ||
        line.toLowerCase().includes('explain')
      );
      return improvementLines.join('\n').trim();
    }
    
    return '';
  };

  const extractRubricScoresFromHTML = (htmlContent: string): Array<{category: string, score: string}> => {
    if (!htmlContent) return [];
    
    const categories = [
      'Student spoke for the duration of the specified time frame',
      'Student offered and/or accepted a point of information',
      'Student spoke in a stylistic and persuasive manner',
      'Student\'s argument is complete',
      'Student argument reflects application of theory',
      'Student\'s rebuttal is effective',
      'Student ably supported teammate',
      'Student applied feedback from previous debate'
    ];
    
    const scores: Array<{category: string, score: string}> = [];
    
    categories.forEach((category, index) => {
      // Use different patterns for different categories
      let searchPatterns = [
        category.substring(0, 40), // Full match first
        category.substring(0, 30), // Shorter match
        category.split(' ').slice(0, 4).join(' '), // First few words
      ];
      
      // Add specific patterns for problematic categories
      if (category.includes('argument is complete')) {
        searchPatterns = ['argument is complete', 'Student\'s argument is complete'];
      }
      if (category.includes('rebuttal is effective')) {
        searchPatterns = ['rebuttal is effective', 'Student\'s rebuttal is effective'];
      }
      
      let foundScore = 'N/A';
      
      for (const pattern of searchPatterns) {
        // Look for the pattern followed by table cells with scores
        const regex = new RegExp(`${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?</th>([\\s\\S]*?)</tr>`, 'i');
        const match = htmlContent.match(regex);
        
        if (match) {
          const rowContent = match[1];
          
          // Look for bold numbers in the entire row content
          const boldMatches = rowContent.match(/<strong>(.*?)<\/strong>/g);
          
          if (boldMatches && boldMatches.length > 0) {
            // Extract the content inside the first bold tag found
            const boldContent = boldMatches[0].replace(/<\/?strong>/g, '');
            foundScore = boldContent.trim();
            break; // Found a score, stop searching
          }
        }
      }
      
      scores.push({
        category: `${index + 1}. ${category.substring(0, 50)}...`,
        score: foundScore
      });
    });
    
    return scores;
  };

  const filteredStudents = students.filter(student => {
    const nameMatch = student.name.toLowerCase().includes(searchTerm.toLowerCase());
    const courseMatch = selectedCourse === 'all' || selectedCourse === '' || student.course === selectedCourse;
    
    let feedbackTypeMatch = true;
    if (selectedFeedbackType !== 'all') {
      feedbackTypeMatch = student.feedbackTypes && student.feedbackTypes.includes(selectedFeedbackType);
    }
    
    return nameMatch && courseMatch && feedbackTypeMatch;
  });

  if (loading && !analytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading growth tracking data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Growth Tracking</h1>
          <p className="text-gray-600">Monitor student progress and skill development over time</p>
          {/* Debug info */}
          <div className="text-xs text-gray-500 mt-2">
            Students loaded: {students.length} | Loading: {loading.toString()} | Error: {error || 'None'}
          </div>
        </div>
        <div className="space-x-2">
          <button 
            onClick={() => window.open('/api/test-students', '_blank')}
            className="px-3 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200"
          >
            Test API
          </button>
          <button 
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchStudents();
            }}
            className="px-3 py-1 text-xs bg-blue-100 rounded hover:bg-blue-200"
          >
            Retry Load
          </button>
          <button 
            onClick={async () => {
              setError(null);
              setLoading(true);
              try {
                const response = await fetch('/api/feedback/reparse', { method: 'POST' });
                const data = await response.json();
                if (data.success) {
                  console.log('Re-parse successful:', data);
                  alert(`Re-parsing complete! Processed ${data.totalProcessed} feedback records for ${data.totalStudents} students.`);
                  fetchStudents();
                } else {
                  console.error('Re-parse failed:', data);
                  setError('Re-parsing failed: ' + (data.error || 'Unknown error'));
                }
              } catch (error) {
                console.error('Re-parse error:', error);
                setError('Failed to re-parse: ' + (error instanceof Error ? error.message : 'Unknown error'));
              } finally {
                setLoading(false);
              }
            }}
            className="px-3 py-1 text-xs bg-orange-100 rounded hover:bg-orange-200"
          >
            Re-parse Data
          </button>
          <button 
            onClick={async () => {
              if (!confirm('This will reset the database tables and clear all data. Continue?')) return;
              
              setError(null);
              setLoading(true);
              try {
                const response = await fetch('/api/feedback/reset-tables', { method: 'POST' });
                const data = await response.json();
                if (data.success) {
                  console.log('Reset successful:', data);
                  alert('Tables reset successfully! Now re-parse the data.');
                  fetchStudents();
                } else {
                  console.error('Reset failed:', data);
                  setError('Reset failed: ' + (data.error || 'Unknown error'));
                }
              } catch (error) {
                console.error('Reset error:', error);
                setError('Failed to reset: ' + (error instanceof Error ? error.message : 'Unknown error'));
              } finally {
                setLoading(false);
              }
            }}
            className="px-3 py-1 text-xs bg-red-100 rounded hover:bg-red-200"
          >
            Reset Tables
          </button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Analytics Overview</TabsTrigger>
          <TabsTrigger value="students">Student Progress</TabsTrigger>
          <TabsTrigger value="skills">Skill Analysis</TabsTrigger>
        </TabsList>

        {/* Analytics Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading analytics data...</p>
              </div>
            </div>
          ) : analytics ? (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Improving Trends</CardTitle>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{analytics?.trendSummary?.improving || 0}</div>
                    <p className="text-xs text-gray-600">Skills showing improvement</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Stable Performance</CardTitle>
                    <Minus className="h-4 w-4 text-gray-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-600">{analytics?.trendSummary?.stable || 0}</div>
                    <p className="text-xs text-gray-600">Skills maintaining level</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{analytics?.trendSummary?.declining || 0}</div>
                    <p className="text-xs text-gray-600">Skills needing support</p>
                  </CardContent>
                </Card>
              </div>

              {/* Unit Performance Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Unit Performance Analysis</CardTitle>
                  <CardDescription>Average performance across curriculum units</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {analytics?.unitPerformance?.slice(0, 10).map((unit, index) => (
                      <div key={index} className="flex items-center space-x-4">
                        <div className="w-16 text-sm font-medium">{unit.unit_number}</div>
                        <div className="flex-1">
                          <div className="flex justify-between text-sm mb-1">
                            <span>{unit.program_type} ({unit.level})</span>
                            <span>{unit.average_performance?.toFixed(1)}/10</span>
                          </div>
                          <Progress 
                            value={(unit.average_performance || 0) * 10} 
                            className="h-2"
                          />
                        </div>
                        <div className="text-sm text-gray-600">
                          {unit.total_students} students
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Common Themes */}
              <Card>
                <CardHeader>
                  <CardTitle>Common Feedback Themes</CardTitle>
                  <CardDescription>Most frequently mentioned areas in feedback</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics?.commonThemes?.slice(0, 8).map((theme, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Badge variant={theme.feedback_themes.theme_type === 'strength' ? 'default' : 'secondary'}>
                            {theme.feedback_themes.theme_type}
                          </Badge>
                          <span className="font-medium">{theme.feedback_themes.name}</span>
                        </div>
                        <span className="text-sm text-gray-600">{theme.frequency} mentions</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No analytics data available</p>
                  <p className="text-sm text-gray-500 mt-2">Set up growth tracking demo data to see analytics</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Student Progress Tab */}
        <TabsContent value="students" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Student Search and Selection */}
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Student Search</CardTitle>
                <CardDescription>Select a student to view their growth progress</CardDescription>
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
                
                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    <SelectItem value="02IPDEC2401">02IPDEC2401</SelectItem>
                    <SelectItem value="02IPDEC2402">02IPDEC2402</SelectItem>
                    <SelectItem value="02IPDEC2404">02IPDEC2404</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={selectedFeedbackType} onValueChange={setSelectedFeedbackType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by feedback type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Feedback Types</SelectItem>
                    <SelectItem value="primary">Primary Only</SelectItem>
                    <SelectItem value="secondary">Secondary Only</SelectItem>
                  </SelectContent>
                </Select>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {error && (
                    <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
                      {error}
                    </div>
                  )}
                  {filteredStudents.length === 0 && !loading && !error ? (
                    <div className="text-gray-500 text-sm p-4 text-center">
                      No students found. Please run "Parse & Store Feedback Data" first.
                    </div>
                  ) : (
                    filteredStudents.map((student) => (
                      <Button
                        key={student.id}
                        variant={selectedStudent?.student.student_id === student.id ? "default" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => fetchStudentGrowth(student.id)}
                      >
                        <User className="h-4 w-4 mr-2 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{student.name}</div>
                          <div className="text-xs text-gray-500 truncate">{student.course}</div>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {student.feedbackTypes && student.feedbackTypes.includes('primary') && (
                              <Badge variant="outline" className="text-xs py-0 px-1 bg-green-50 text-green-700 border-green-200 shrink-0">
                                Primary
                              </Badge>
                            )}
                            {student.feedbackTypes && student.feedbackTypes.includes('secondary') && (
                              <Badge variant="outline" className="text-xs py-0 px-1 bg-blue-50 text-blue-700 border-blue-200 shrink-0">
                                Secondary
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <div className="text-xs text-gray-500">{student.feedbackCount || 0} sessions</div>
                        </div>
                      </Button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Student Progress Details */}
            <div className="lg:col-span-2 space-y-6">
              {selectedStudent ? (
                <>
                  {/* Student Overview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <User className="h-5 w-5" />
                        <span>{selectedStudent.student.student_name}</span>
                      </CardTitle>
                      <CardDescription>{selectedStudent.student.course_code}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {selectedStudent.student.total_feedback_sessions}
                          </div>
                          <div className="text-sm text-gray-600">Feedback Sessions</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {selectedStudent.student.average_score?.toFixed(1)}
                          </div>
                          <div className="text-sm text-gray-600">Average Score</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {selectedStudent.student.skills_assessed}
                          </div>
                          <div className="text-sm text-gray-600">Skills Assessed</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {selectedStudent.strengths.length}
                          </div>
                          <div className="text-sm text-gray-600">Strengths</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Growth Trends */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Growth Trends</CardTitle>
                      <CardDescription>Skill development patterns over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-green-700 mb-2">Improving Skills</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedStudent.growthTrends.improving.map((skill) => (
                              <Badge key={skill} className="bg-green-50 text-green-700 border-green-200">
                                {getTrendIcon('improving')}
                                <span className="ml-1">{formatSkillName(skill)}</span>
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-gray-700 mb-2">Stable Skills</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedStudent.growthTrends.stable.map((skill) => (
                              <Badge key={skill} className="bg-gray-50 text-gray-700 border-gray-200">
                                {getTrendIcon('stable')}
                                <span className="ml-1">{formatSkillName(skill)}</span>
                              </Badge>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h4 className="font-medium text-red-700 mb-2">Focus Areas</h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedStudent.focusAreas.map((skill) => (
                              <Badge key={skill} className="bg-red-50 text-red-700 border-red-200">
                                <Target className="h-3 w-3 mr-1" />
                                {formatSkillName(skill)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Skill Progression */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Skill Progression</CardTitle>
                      <CardDescription>Detailed progress in each skill area</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selectedStudent.skillProgression.map((skill) => (
                          <div key={skill.skill_category} className="border rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                              <h5 className="font-medium">{formatSkillName(skill.skill_category)}</h5>
                              <Badge className={getTrendColor(skill.trend_direction)}>
                                {getTrendIcon(skill.trend_direction)}
                                <span className="ml-1">{skill.trend_direction}</span>
                              </Badge>
                            </div>
                            <div className="flex justify-between text-sm text-gray-600 mb-2">
                              <span>Initial: {skill.initial_score}</span>
                              <span>Current: {skill.current_score}</span>
                              <span>Growth: +{(skill.current_score - skill.initial_score).toFixed(1)}</span>
                            </div>
                            <Progress 
                              value={(skill.current_score / 10) * 100} 
                              className="h-2"
                            />
                            <div className="text-xs text-gray-500 mt-1">
                              {skill.total_assessments} assessments • {skill.growth_rate > 0 ? '+' : ''}{skill.growth_rate.toFixed(2)} pts/month
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Feedback */}
                  {selectedStudent.recentFeedback.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Recent Feedback</CardTitle>
                        <CardDescription>Latest feedback sessions</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {selectedStudent.recentFeedback.map((feedback) => (
                            <div key={feedback.id} className="border rounded-lg p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h5 className="font-medium">
                                    Unit {feedback.feedback_sessions?.unit_number || 'Unknown'}: {feedback.feedback_sessions?.topic || 'No topic'}
                                  </h5>
                                  <div className="text-sm text-gray-600">
                                    {feedback.speech_duration && `Duration: ${feedback.speech_duration}`}
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                {/* Secondary feedback - show motion and unified teacher comments */}
                                {feedback.feedback_type === 'secondary' ? (
                                  <>
                                    {feedback.motion && (
                                      <div>
                                        <span className="text-sm font-medium text-blue-700">Motion:</span>
                                        <p className="text-sm text-gray-700 italic">{feedback.motion}</p>
                                      </div>
                                    )}
                                    <div>
                                      <span className="text-sm font-medium text-purple-700">Rubric Assessment:</span>
                                      {feedback.rubric_scores && feedback.rubric_scores.length > 0 ? (
                                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                          {feedback.rubric_scores.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center p-2 bg-blue-50 rounded text-xs">
                                              <span className="text-gray-700">{item.category}</span>
                                              <span className={`font-bold px-2 py-1 rounded ${
                                                item.score === 'N/A' ? 'bg-gray-200 text-gray-600' :
                                                ['4', '5'].includes(item.score) ? 'bg-green-200 text-green-800' :
                                                ['2', '3'].includes(item.score) ? 'bg-yellow-200 text-yellow-800' :
                                                'bg-red-200 text-red-800'
                                              }`}>
                                                {item.score}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-xs text-gray-500 mb-2">8 categories evaluated (scores require bold detection from original document)</p>
                                      )}
                                    </div>
                                    {feedback.teacher_comments && (
                                      <div>
                                        <span className="text-sm font-medium text-gray-700">Teacher Feedback:</span>
                                        <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded mt-1">
                                          {feedback.teacher_comments.split('\n').map((line, idx) => (
                                            <div key={idx} className="mb-1">• {line.trim()}</div>
                                          )).filter(item => item.props.children[1])}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  /* Primary feedback - show strengths and improvement areas */
                                  <>
                                    {feedback.best_aspects && (
                                      <div>
                                        <span className="text-sm font-medium text-green-700">Strengths:</span>
                                        <div className="text-sm text-gray-700 bg-green-50 p-3 rounded mt-1">
                                          {feedback.best_aspects.split(/[•\n]/).filter(point => point.trim()).map((point, idx) => (
                                            <div key={idx} className="mb-1">• {point.trim()}</div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {feedback.improvement_areas && (
                                      <div>
                                        <span className="text-sm font-medium text-orange-700">Areas for Improvement:</span>
                                        <div className="text-sm text-gray-700 bg-orange-50 p-3 rounded mt-1">
                                          {feedback.improvement_areas.split(/[•\n]/).filter(point => point.trim()).map((point, idx) => (
                                            <div key={idx} className="mb-1">• {point.trim()}</div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Raw Feedback Data */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Chronological Feedback History</CardTitle>
                      <CardDescription>All feedback in chronological order (for LLM analysis)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {selectedStudent.recentFeedback.map((feedback) => (
                          <div key={feedback.id} className="border-l-4 border-blue-200 pl-4 py-2">
                            <div className="flex justify-between items-center mb-1">
                              <h6 className="font-medium text-sm">
                                Unit {feedback.feedback_sessions?.unit_number || 'Unknown'}
                              </h6>
                              <Badge variant="outline" className="text-xs">
                                {feedback.feedback_sessions?.class_sessions?.courses?.code || 'Unknown'}
                              </Badge>
                            </div>
                            <div className="text-xs text-gray-600 mb-2">
                              {feedback.feedback_sessions?.topic || 'No topic'}
                              {feedback.speech_duration && ` • ${feedback.speech_duration}`}
                            </div>
                            <div className="text-sm text-gray-800 space-y-3">
                              {feedback.best_aspects && (
                                <div>
                                  <div className="font-medium text-green-700 mb-1">STRENGTHS:</div>
                                  <div className="bg-green-50 p-3 rounded">
                                    {feedback.best_aspects.split(/[•\n]/).filter(point => point.trim()).map((point, idx) => (
                                      <div key={idx} className="mb-1">• {point.trim()}</div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {feedback.improvement_areas && (
                                <div>
                                  <div className="font-medium text-blue-700 mb-1">AREAS FOR IMPROVEMENT:</div>
                                  <div className="bg-blue-50 p-3 rounded">
                                    {feedback.improvement_areas.split(/[•\n]/).filter(point => point.trim()).map((point, idx) => (
                                      <div key={idx} className="mb-1">• {point.trim()}</div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
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

        {/* Skills Analysis Tab */}
        <TabsContent value="skills" className="space-y-6">
          {analytics?.skillAnalytics?.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Skill Category Analysis</CardTitle>
                <CardDescription>Performance trends across all skill categories</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics?.skillAnalytics?.map((skill, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Badge className={getTrendColor(skill.trend_direction)}>
                          {getTrendIcon(skill.trend_direction)}
                          <span className="ml-1">{skill.trend_direction}</span>
                        </Badge>
                        <div>
                          <h5 className="font-medium">{formatSkillName(skill.skill_category)}</h5>
                          <div className="text-sm text-gray-600">
                            {skill.student_count} students • Avg: {skill.average_score?.toFixed(1)}/10
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-green-600">{skill.strength_count} strengths</div>
                        <div className="text-red-600">{skill.growth_area_count} focus areas</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-96">
                <div className="text-center">
                  <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No skill analysis data available</p>
                  <p className="text-sm text-gray-500 mt-2">Set up growth tracking demo data to see skill analytics</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}