'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { OfflineStorage } from '@/lib/offline-storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, Users, ChevronRight, ChevronLeft, Wifi, WifiOff, Database } from 'lucide-react';
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
  const preselectedCourseCode = searchParams.get('class');
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  
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
    if (preselectedCourseCode && courses.length > 0) {
      const preselected = courses.find(c => c.course_code === preselectedCourseCode);
      if (preselected) {
        setSelectedCourse(preselected);
        fetchStudents(preselected.id);
      }
    }
  }, [preselectedCourseCode, courses]);

  const fetchTimeAwareCourses = async () => {
    try {
      const response = await fetch('/api/classes/current');
      const data = await response.json();
      setCourses(data.courses || []);
      
      // Auto-select the first "next" or "ongoing" class only if no preselection
      if (!preselectedCourseCode) {
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

  // Skip course selection if we have a preselected course
  const showCourseSelection = !preselectedCourseCode || !selectedCourse;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">
          {selectedCourse ? `${selectedCourse.course_code} - Attendance` : 'Quick Attendance Entry'}
        </h1>
        <div className="flex items-center gap-4">
          <OfflineIndicator />
          <div className="text-sm text-gray-500">
            {format(new Date(), 'EEEE, MMMM do, yyyy')}
          </div>
        </div>
      </div>

      {/* Course Selection - Only show if not preselected */}
      {showCourseSelection && (
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
      )}

      {/* Student Attendance */}
      {selectedCourse && students.length > 0 && (
        <Card>
          <CardHeader className="bg-[#1a237e] text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => setCurrentStudentIndex(Math.max(0, currentStudentIndex - 1))}
                  disabled={currentStudentIndex === 0}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <div className="text-center">
                  <h2 className="text-xl font-semibold">{students[currentStudentIndex]?.name || 'Student Name'}</h2>
                  <p className="text-sm opacity-80">Student {currentStudentIndex + 1} of {students.length}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                  onClick={() => setCurrentStudentIndex(Math.min(students.length - 1, currentStudentIndex + 1))}
                  disabled={currentStudentIndex === students.length - 1}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-80">{selectedCourse.course_code}</p>
                <p className="text-lg font-medium">Unit {Math.floor(currentStudentIndex / 4) + 1} Lesson {(currentStudentIndex % 4) + 1}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {[students[currentStudentIndex]].filter(Boolean).map((student) => (
                <div key={student.id} className={`p-6 ${student.is_makeup_student ? 'bg-blue-50' : ''}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-lg">{student.name}</h3>
                      {student.is_makeup_student && (
                        <p className="text-xs text-blue-600">Makeup student from {student.original_course}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Attendance</span>
                        <select
                          value={student.attendance_status || 'present'}
                          onChange={(e) => updateAttendanceStatus(student.id, e.target.value as any)}
                          className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="present">Present</option>
                          <option value="makeup">Makeup</option>
                          <option value="absent">Absent</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">Homework Tracking</span>
                        <select
                          className="border rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="complete">Complete</option>
                          <option value="incomplete">Incomplete</option>
                          <option value="na">N/A</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  {student.attendance_status !== 'absent' && (
                    <div className="space-y-3">
                      <div className="text-sm font-medium text-gray-700 mb-2">Rating</div>
                      {RATING_CATEGORIES.map((category) => (
                        <div key={category.key} className="flex items-center justify-between py-1">
                          <label className="text-sm text-gray-600 min-w-[180px]">
                            {category.label}
                          </label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((starIndex) => {
                              const currentRating = student.star_ratings?.[category.key as keyof typeof student.star_ratings] || 0;
                              const isFilled = currentRating >= starIndex;
                              
                              return (
                                <button
                                  key={`${student.id}_${category.key}_star_${starIndex}`}
                                  onClick={() => {
                                    // Toggle rating: if clicking on current rating, set to 0, otherwise set to starIndex
                                    const newRating = currentRating === starIndex ? 0 : starIndex;
                                    updateStudentRating(student.id, category.key, newRating);
                                  }}
                                  className="p-0.5 focus:outline-none transition-colors"
                                  type="button"
                                >
                                  <Star 
                                    className={`h-6 w-6 ${
                                      isFilled 
                                        ? 'fill-yellow-400 text-yellow-400' 
                                        : 'fill-gray-200 text-gray-300 hover:fill-gray-300'
                                    } transition-colors`}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-6 border-t flex justify-between">
              <Button
                variant="outline"
                onClick={() => setCurrentStudentIndex(Math.max(0, currentStudentIndex - 1))}
                disabled={currentStudentIndex === 0}
              >
                Previous Student
              </Button>
              <Button 
                onClick={submitAttendance} 
                disabled={submitting}
                className="px-8"
              >
                {submitting ? 'Submitting...' : 'Submit All'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentStudentIndex(Math.min(students.length - 1, currentStudentIndex + 1))}
                disabled={currentStudentIndex === students.length - 1}
              >
                Next Student
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}