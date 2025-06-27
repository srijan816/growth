'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { OfflineStorage } from '@/lib/offline-storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, Users, ChevronRight, Wifi, WifiOff, Database } from 'lucide-react';
import { format } from 'date-fns';
import OfflineIndicator from '@/components/offline/OfflineIndicator';

interface Course {
  id: string;
  course_code: string;
  program_name: string;
  day_of_week: string;
  start_time: string;
  status: 'next' | 'ongoing' | 'completed' | 'upcoming';
  student_count: number;
  next_session_date: string;
}

interface Student {
  id: string;
  name: string;
  enrollment_id: string;
  attendance_status?: 'present' | 'absent' | 'makeup';
  is_makeup_student?: boolean;
  original_course?: string;
  star_ratings?: {
    attitude_efforts: number;
    asking_questions: number;
    skills_content: number;
    feedback_application: number;
  };
}

const RATING_CATEGORIES = [
  { key: 'attitude_efforts', label: 'Attitude & Efforts' },
  { key: 'asking_questions', label: 'Asking Questions' },
  { key: 'skills_content', label: 'Application of Skills/Content' },
  { key: 'feedback_application', label: 'Application of Feedback' }
] as const;

export default function QuickEntry() {
  const searchParams = useSearchParams();
  const preselectedCourseId = searchParams.get('course');
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  
  const offlineStorage = OfflineStorage.getInstance();

  useEffect(() => {
    fetchTimeAwareCourses();
    
    // Set up offline monitoring
    setIsOnline(offlineStorage.getConnectionStatus());
    const unsubscribe = offlineStorage.onStatusChange(setIsOnline);
    
    return unsubscribe;
  }, []);

  useEffect(() => {
    // Auto-select preselected course if provided
    if (preselectedCourseId && courses.length > 0) {
      const preselected = courses.find(c => c.id === preselectedCourseId);
      if (preselected) {
        setSelectedCourse(preselected);
        fetchStudents(preselected.id);
      }
    }
  }, [preselectedCourseId, courses]);

  const fetchTimeAwareCourses = async () => {
    try {
      const response = await fetch('/api/classes/current');
      const data = await response.json();
      setCourses(data.courses || []);
      
      // Auto-select the first "next" or "ongoing" class only if no preselection
      if (!preselectedCourseId) {
        const activeClass = data.courses?.find((c: Course) => 
          c.status === 'ongoing' || c.status === 'next'
        );
        if (activeClass) {
          setSelectedCourse(activeClass);
          fetchStudents(activeClass.id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (courseId: string) => {
    try {
      const response = await fetch(`/api/classes/${courseId}/students`);
      const data = await response.json();
      setStudents(data.students || []);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    fetchStudents(course.id);
  };

  const updateStudentRating = (studentId: string, category: string, rating: number) => {
    setStudents(prev => prev.map(student => 
      student.id === studentId 
        ? {
            ...student,
            star_ratings: {
              ...student.star_ratings,
              [category]: rating
            } as any
          }
        : student
    ));
  };

  const updateAttendanceStatus = (studentId: string, status: 'present' | 'absent' | 'makeup') => {
    setStudents(prev => prev.map(student => 
      student.id === studentId ? { ...student, attendance_status: status } : student
    ));
  };

  const submitAttendance = async () => {
    if (!selectedCourse) return;
    
    setSubmitting(true);
    try {
      const attendanceData = {
        course_id: selectedCourse.id,
        session_date: selectedCourse.next_session_date,
        lesson_number: '1', // Will be determined by backend
        students: students.map(student => ({
          enrollment_id: student.enrollment_id,
          student_name: student.name,
          status: student.attendance_status || 'present',
          star_rating_1: student.star_ratings?.attitude_efforts || 0,
          star_rating_2: student.star_ratings?.asking_questions || 0,
          star_rating_3: student.star_ratings?.skills_content || 0,
          star_rating_4: student.star_ratings?.feedback_application || 0
        }))
      };

      if (isOnline) {
        // Try online submission first
        try {
          const response = await fetch('/api/attendance/quick-entry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(attendanceData)
          });
          
          if (response.ok) {
            alert('Attendance submitted successfully!');
          } else {
            throw new Error('Network submission failed');
          }
        } catch (networkError) {
          // Fallback to offline storage
          await offlineStorage.saveAttendanceOffline(attendanceData);
          alert('Network unavailable. Attendance saved offline and will sync when connection returns.');
        }
      } else {
        // Save offline
        await offlineStorage.saveAttendanceOffline(attendanceData);
        alert('Offline mode: Attendance saved locally and will sync when connection returns.');
      }
      
      // Reset form
      setStudents(prev => prev.map(student => ({
        ...student,
        attendance_status: 'present',
        star_ratings: {
          attitude_efforts: 0,
          asking_questions: 0,
          skills_content: 0,
          feedback_application: 0
        }
      })));
      
    } catch (error) {
      console.error('Failed to submit attendance:', error);
      alert('Failed to save attendance data');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing': return 'bg-green-100 text-green-800';
      case 'next': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quick Attendance Entry</h1>
        <div className="flex items-center gap-4">
          <OfflineIndicator />
          <div className="text-sm text-gray-500">
            {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </div>
        </div>
      </div>

      {/* Course Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Select Class
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3">
            {courses.map((course) => (
              <div
                key={course.id}
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedCourse?.id === course.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleCourseSelect(course)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{course.course_code}</h3>
                      <Badge className={getStatusColor(course.status)}>
                        {course.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{course.program_name}</p>
                    <p className="text-sm text-gray-500">
                      {course.day_of_week} at {course.start_time}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">{course.student_count}</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Student Attendance */}
      {selectedCourse && (
        <Card>
          <CardHeader>
            <CardTitle>
              Attendance for {selectedCourse.course_code}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {students.map((student) => (
                <div key={student.id} className={`border rounded-lg p-4 ${student.is_makeup_student ? 'bg-blue-50 border-blue-200' : ''}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium">{student.name}</h3>
                      {student.is_makeup_student && (
                        <p className="text-xs text-blue-600">Makeup student from {student.original_course}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {(['present', 'makeup', 'absent'] as const).map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={student.attendance_status === status ? 'default' : 'outline'}
                          onClick={() => updateAttendanceStatus(student.id, status)}
                        >
                          {status}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  {student.attendance_status !== 'absent' && (
                    <div className="grid gap-4">
                      {RATING_CATEGORIES.map((category) => (
                        <div key={category.key} className="flex items-center justify-between">
                          <label className="text-sm font-medium">
                            {category.label}
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="flex">
                              {[1, 2, 3, 4].map((starIndex) => {
                                const currentRating = student.star_ratings?.[category.key as keyof typeof student.star_ratings] || 0;
                                const isFull = currentRating >= starIndex;
                                const isHalf = currentRating >= starIndex - 0.5 && currentRating < starIndex;
                                
                                return (
                                  <div key={`${student.id}_${category.key}_star_${starIndex}`} className="relative">
                                    <button
                                      onClick={() => updateStudentRating(student.id, category.key, starIndex)}
                                      className="p-1 text-gray-300 hover:text-yellow-400 transition-colors"
                                    >
                                      <Star className="h-5 w-5" />
                                    </button>
                                    {isFull && (
                                      <button
                                        onClick={() => updateStudentRating(student.id, category.key, starIndex)}
                                        className="absolute inset-0 p-1 text-yellow-400 pointer-events-none"
                                      >
                                        <Star className="h-5 w-5 fill-current" />
                                      </button>
                                    )}
                                    {isHalf && (
                                      <button
                                        onClick={() => updateStudentRating(student.id, category.key, starIndex - 0.5)}
                                        className="absolute inset-0 p-1 text-yellow-400 pointer-events-none"
                                        style={{
                                          clipPath: 'inset(0 50% 0 0)'
                                        }}
                                      >
                                        <Star className="h-5 w-5 fill-current" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => updateStudentRating(student.id, category.key, starIndex - 0.5)}
                                      className="absolute inset-0 w-1/2 h-full opacity-0 hover:opacity-20 hover:bg-yellow-400 rounded-l"
                                      title={`${starIndex - 0.5} stars`}
                                    />
                                    <button
                                      onClick={() => updateStudentRating(student.id, category.key, starIndex)}
                                      className="absolute inset-0 w-1/2 h-full ml-auto opacity-0 hover:opacity-20 hover:bg-yellow-400 rounded-r"
                                      title={`${starIndex} stars`}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                            <span className="text-sm text-gray-500 min-w-[3rem]">
                              {student.star_ratings?.[category.key as keyof typeof student.star_ratings] || 0}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <Button 
                onClick={submitAttendance} 
                disabled={submitting}
                className="w-full"
              >
                {submitting ? 'Submitting...' : 'Submit Attendance'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}