'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Filter, ChevronDown, Star, TrendingUp, AlertCircle, Calendar, User, BookOpen } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Types
interface Student {
  id: string;
  student_id_external?: string;
  name: string;
  level: 'primary' | 'secondary';
  grade: string;
  courses: string[];
  starAverage: number;
  feedbackSessions: number;
  lastActivity: string;
  needsMakeup: boolean;
  focusAreas: string[];
  homeworkCompleted: boolean;
  isHidden?: boolean;
  isDeparted?: boolean;
}

interface StatsData {
  totalStudents: number;
  topPerformers: number;
  needSupport: number;
}

// Performance status helper
function getPerformanceStatus(starAvg: number): { label: string; color: string; icon: React.ReactNode } {
  if (starAvg >= 3.5) {
    return { label: 'Top Performer', color: 'text-blue-600 bg-blue-50', icon: <Star className="w-4 h-4" /> };
  } else if (starAvg >= 2.5) {
    return { label: 'Growing', color: 'text-green-600 bg-green-50', icon: <TrendingUp className="w-4 h-4" /> };
  } else {
    return { label: 'Needs Help', color: 'text-red-600 bg-red-50', icon: <AlertCircle className="w-4 h-4" /> };
  }
}

// Student Card Component
function StudentCard({ student }: { student: Student }) {
  const router = useRouter();
  const performanceStatus = getPerformanceStatus(student.starAverage);
  
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => router.push(`/dashboard/students/${student.id}`)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold">
              {student.name.charAt(0)}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">{student.name}</h3>
              <p className="text-sm text-gray-500">{student.grade} • {student.level === 'primary' ? 'Primary' : 'Secondary'}</p>
            </div>
          </div>
          {student.needsMakeup && (
            <Badge variant="secondary" className="bg-yellow-50 text-yellow-700">
              <Calendar className="w-3 h-3 mr-1" />
              Makeup
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Feedback Sessions</span>
          <span className="font-medium">{student.feedbackSessions}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge className={cn("flex items-center space-x-1", performanceStatus.color)}>
            {performanceStatus.icon}
            <span>{performanceStatus.label}</span>
          </Badge>
          <div className="flex items-center text-sm text-gray-600">
            <Star className="w-4 h-4 mr-1 text-yellow-500 fill-yellow-500" />
            {student.starAverage.toFixed(1)}
          </div>
        </div>
        
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-700">Focus Areas:</p>
          <div className="flex flex-wrap gap-1">
            {student.focusAreas.slice(0, 2).map((area, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {area}
              </Badge>
            ))}
            {student.focusAreas.length > 2 && (
              <Badge variant="outline" className="text-xs">+{student.focusAreas.length - 2}</Badge>
            )}
          </div>
        </div>
        
        <Button 
          className="w-full mt-3" 
          variant="default"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/dashboard/students/${student.id}`);
          }}
        >
          Analyze & Get Recommendations
        </Button>
      </CardContent>
    </Card>
  );
}

// Stats Card Component
function StatsCard({ title, value, icon, color }: { title: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
          </div>
          <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center", color)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading Skeleton
function StudentCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div>
              <Skeleton className="h-5 w-32 mb-1" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <div className="flex items-center space-x-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-12" />
        </div>
        <div className="space-y-1">
          <Skeleton className="h-4 w-20" />
          <div className="flex gap-1">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-16" />
          </div>
        </div>
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  );
}

// Main Students Page Component
export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('grid');
  
  const ITEMS_PER_PAGE = 20;
  
  // Fetch students data
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await fetch('/api/students');
        console.log('Response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Students data received:', data.length, 'students');
          console.log('First student:', data[0]);
          setStudents(data);
        } else {
          console.error('API error:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('Error details:', errorText);
          setStudents([]);
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStudents();
  }, []);
  
  // Calculate stats
  const stats: StatsData = useMemo(() => {
    const activeStudents = students.filter(s => !s.isHidden && !s.isDeparted);
    return {
      totalStudents: activeStudents.length,
      topPerformers: activeStudents.filter(s => s.starAverage >= 3.5).length,
      needSupport: activeStudents.filter(s => s.starAverage < 2.5 || s.feedbackSessions === 0).length
    };
  }, [students]);
  
  // Filter and sort students
  const filteredStudents = useMemo(() => {
    let filtered = students.filter(s => !s.isHidden && !s.isDeparted);
    
    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s as any).student_id_external?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.courses.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Type filter
    switch (filterType) {
      case 'myStudents':
        // In real implementation, this would filter based on teacher's assigned students
        filtered = filtered.slice(0, Math.floor(filtered.length * 0.6));
        break;
      case 'makeups':
        filtered = filtered.filter(s => s.needsMakeup);
        break;
      case 'primary':
        filtered = filtered.filter(s => s.level === 'primary');
        break;
      case 'secondary':
        filtered = filtered.filter(s => s.level === 'secondary');
        break;
      case 'needsAttention':
        filtered = filtered.filter(s => s.starAverage < 2.5);
        break;
    }
    
    // Course filter
    if (selectedCourse !== 'all') {
      filtered = filtered.filter(s => s.courses.includes(selectedCourse));
    }
    
    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'performance':
          return b.starAverage - a.starAverage;
        case 'activity':
          return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
        default:
          return 0;
      }
    });
    
    // Prioritize my students and makeups
    if (filterType === 'all') {
      const myStudents = filtered.slice(0, Math.floor(filtered.length * 0.6));
      const makeups = filtered.filter(s => s.needsMakeup && !myStudents.includes(s));
      const others = filtered.filter(s => !myStudents.includes(s) && !makeups.includes(s));
      filtered = [...myStudents, ...makeups, ...others];
    }
    
    return filtered;
  }, [students, searchTerm, filterType, selectedCourse, sortBy]);
  
  // Paginate
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStudents.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredStudents, currentPage]);
  
  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);
  
  // Get unique courses
  const allCourses = useMemo(() => {
    const courses = new Set<string>();
    students.forEach(s => s.courses.forEach(c => courses.add(c)));
    return Array.from(courses).sort();
  }, [students]);
  
  const handleLoadMore = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  }, [currentPage, totalPages]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Section */}
      <div className="bg-white border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">All Students</h1>
              <p className="text-gray-600 mt-1">Track progress and provide personalized support for every student</p>
            </div>
            <div className="flex items-center space-x-3">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter students" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="myStudents">My Students Only</SelectItem>
                  <SelectItem value="makeups">Makeups</SelectItem>
                  <SelectItem value="primary">Primary Level</SelectItem>
                  <SelectItem value="secondary">Secondary Level</SelectItem>
                  <SelectItem value="needsAttention">Needs Attention</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name (A-Z)</SelectItem>
                  <SelectItem value="performance">Performance</SelectItem>
                  <SelectItem value="activity">Recent Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatsCard
              title="Total Students"
              value={loading ? 0 : stats.totalStudents}
              icon={<User className="w-6 h-6 text-purple-600" />}
              color="bg-purple-100"
            />
            <StatsCard
              title="Top Performers"
              value={loading ? 0 : stats.topPerformers}
              icon={<Star className="w-6 h-6 text-blue-600" />}
              color="bg-blue-100"
            />
            <StatsCard
              title="Need Support"
              value={loading ? 0 : stats.needSupport}
              icon={<AlertCircle className="w-6 h-6 text-red-600" />}
              color="bg-red-100"
            />
          </div>
          
          {/* Search and Course Filter */}
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search by name, student ID, or course..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes ({allCourses.length})</SelectItem>
                {allCourses.map(course => (
                  <SelectItem key={course} value={course}>{course}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="px-6 pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="grid">Student Grid</TabsTrigger>
            <TabsTrigger value="roster">Roster</TabsTrigger>
            <TabsTrigger value="progress">Progress Overview</TabsTrigger>
            <TabsTrigger value="makeup">Makeup Log</TabsTrigger>
          </TabsList>
          
          <TabsContent value="grid" className="mt-0">
            {/* Student Grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <StudentCardSkeleton key={i} />
                ))}
              </div>
            ) : filteredStudents.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-gray-500">No students found matching your criteria</p>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {paginatedStudents.map(student => (
                    <StudentCard key={student.id} student={student} />
                  ))}
                </div>
                
                {currentPage < totalPages && (
                  <div className="mt-8 text-center">
                    <Button variant="outline" onClick={handleLoadMore}>
                      Load More ({filteredStudents.length - paginatedStudents.length} remaining)
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="roster">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Course Roster</h3>
              {allCourses.map(course => {
                const courseStudents = filteredStudents.filter(s => s.courses.includes(course));
                return (
                  <div key={course} className="mb-6">
                    <h4 className="font-medium text-gray-700 mb-2">{course} ({courseStudents.length} students)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {courseStudents.map(student => (
                        <Link
                          key={student.id}
                          href={`/dashboard/students/${student.id}`}
                          className="p-3 bg-gray-50 rounded hover:bg-gray-100 transition-colors flex items-center justify-between"
                        >
                          <span className="font-medium">{student.name}</span>
                          <Badge variant="outline" className="text-xs">
                            <Star className="w-3 h-3 mr-1" />
                            {student.starAverage.toFixed(1)}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                );
              })}
            </Card>
          </TabsContent>
          
          <TabsContent value="progress">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Progress Overview</h3>
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <BookOpen className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p>[Progress Chart Placeholder]</p>
                  <p className="text-sm mt-1">Class-wide performance trends will appear here</p>
                </div>
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="makeup">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Makeup Log</h3>
              <div className="space-y-3">
                {filteredStudents.filter(s => s.needsMakeup).map(student => (
                  <div key={student.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-semibold">
                        {student.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-gray-600">Last activity: {student.lastActivity}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/students/${student.id}`}>Schedule Makeup</Link>
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

