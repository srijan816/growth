'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Clock, Users, ChevronRight, Calendar } from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';

interface Course {
  id: string;
  code: string;
  name: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  student_count: number;
  current_unit: number;
  current_lesson: number;
  next_unit: number;
  next_lesson: number;
}

interface Student {
  id: string;
  name: string;
  enrollment_id: string;
  attendance_status: 'present' | 'absent' | 'makeup';
  ratings: {
    attitude_efforts: number;
    asking_questions: number;
    application_skills: number;
    application_feedback: number;
  };
}

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  label: string;
}

const StarRating: React.FC<StarRatingProps> = ({ value, onChange, label }) => {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);

  const handleStarClick = (starIndex: number, isHalf: boolean) => {
    const newValue = starIndex + (isHalf ? 0.5 : 1);
    onChange(newValue);
  };

  const renderStar = (starIndex: number) => {
    const currentValue = hoveredValue !== null ? hoveredValue : value;
    const isFilled = currentValue >= starIndex + 1;
    const isHalfFilled = currentValue >= starIndex + 0.5 && currentValue < starIndex + 1;

    return (
      <div
        key={starIndex}
        className="relative cursor-pointer w-6 h-6"
        onMouseLeave={() => setHoveredValue(null)}
      >
        {/* Background star (always gray) */}
        <Star className="absolute w-6 h-6 text-gray-300" />

        {/* Half star overlay */}
        {isHalfFilled && (
          <div className="absolute top-0 left-0 w-3 h-6 overflow-hidden">
            <Star className="w-6 h-6 text-yellow-400 fill-yellow-400" />
          </div>
        )}

        {/* Full star overlay */}
        {isFilled && (
          <Star className="absolute w-6 h-6 text-yellow-400 fill-yellow-400" />
        )}

        {/* Left half click area */}
        <div
          className="absolute left-0 top-0 w-3 h-6 z-10"
          onMouseEnter={() => setHoveredValue(starIndex + 0.5)}
          onClick={() => handleStarClick(starIndex, true)}
        />
        {/* Right half click area */}
        <div
          className="absolute right-0 top-0 w-3 h-6 z-10"
          onMouseEnter={() => setHoveredValue(starIndex + 1)}
          onClick={() => handleStarClick(starIndex, false)}
        />
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="flex items-center gap-1">
        {[0, 1, 2, 3].map(renderStar)}
        <span className="ml-2 text-sm text-gray-600 min-w-[2rem]">
          {value.toFixed(1)}
        </span>
      </div>
    </div>
  );
};

export default function AttendanceInterface() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Get current week's dates (Tuesday to Saturday)
  const getWeekDates = () => {
    const today = new Date();
    const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 1 }); // Monday
    const tuesday = addDays(startOfCurrentWeek, 1); // Tuesday
    
    return {
      tuesday: addDays(tuesday, 0),
      wednesday: addDays(tuesday, 1),
      thursday: addDays(tuesday, 2),
      friday: addDays(tuesday, 3),
      saturday: addDays(tuesday, 4)
    };
  };

  const weekDates = getWeekDates();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/attendance/courses');
      const data = await response.json();
      setCourses(data.courses || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (courseId: string) => {
    try {
      const response = await fetch(`/api/attendance/students?course_id=${courseId}`);
      const data = await response.json();
      
      // Initialize students with default ratings
      const studentsWithRatings = data.students.map((student: any) => ({
        ...student,
        attendance_status: 'present' as const,
        ratings: {
          attitude_efforts: 0,
          asking_questions: 0,
          application_skills: 0,
          application_feedback: 0
        }
      }));
      
      setStudents(studentsWithRatings);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const handleCourseSelect = (course: Course) => {
    setSelectedCourse(course);
    fetchStudents(course.id);
  };

  const updateAttendanceStatus = (studentId: string, status: 'present' | 'absent' | 'makeup') => {
    setStudents(prev => prev.map(student => 
      student.id === studentId ? { ...student, attendance_status: status } : student
    ));
  };

  const updateRating = (studentId: string, category: keyof Student['ratings'], value: number) => {
    setStudents(prev => prev.map(student => 
      student.id === studentId 
        ? { 
            ...student, 
            ratings: { ...student.ratings, [category]: value }
          } 
        : student
    ));
  };

  const submitAttendance = async () => {
    if (!selectedCourse) return;
    
    setSubmitting(true);
    try {
      const attendanceData = {
        course_id: selectedCourse.id,
        unit_number: selectedCourse.next_unit,
        lesson_number: selectedCourse.next_lesson,
        session_date: new Date().toISOString().split('T')[0],
        students: students.map(student => ({
          student_id: student.id,
          enrollment_id: student.enrollment_id,
          status: student.attendance_status,
          attitude_efforts: student.ratings.attitude_efforts,
          asking_questions: student.ratings.asking_questions,
          application_skills: student.ratings.application_skills,
          application_feedback: student.ratings.application_feedback
        }))
      };

      const response = await fetch('/api/attendance/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attendanceData)
      });

      if (response.ok) {
        alert('Attendance submitted successfully!');
        // Reset form
        setStudents(prev => prev.map(student => ({
          ...student,
          attendance_status: 'present' as const,
          ratings: {
            attitude_efforts: 0,
            asking_questions: 0,
            application_skills: 0,
            application_feedback: 0
          }
        })));
        setSelectedCourse(null);
        fetchCourses(); // Refresh to get updated lesson numbers
      } else {
        throw new Error('Failed to submit attendance');
      }
    } catch (error) {
      console.error('Failed to submit attendance:', error);
      alert('Failed to submit attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const getDayColor = (dayOfWeek: string) => {
    const today = format(new Date(), 'EEEE').toLowerCase();
    return dayOfWeek.toLowerCase() === today ? 'bg-blue-100 border-blue-300' : 'bg-gray-50';
  };

  if (loading) {
    return <div className="p-6">Loading courses...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Take Attendance</h1>
        <div className="text-sm text-gray-500">
          {format(new Date(), 'EEEE, MMMM do, yyyy')}
        </div>
      </div>

      {!selectedCourse ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                This Week's Classes (Tuesday - Saturday)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => {
                  const dayDate = weekDates[day as keyof typeof weekDates];
                  const dayCourses = courses.filter(course => 
                    course.day_of_week.toLowerCase() === day
                  );

                  return (
                    <div key={day} className={`p-4 rounded-lg border ${getDayColor(day)}`}>
                      <h3 className="font-semibold text-lg mb-3 capitalize">
                        {day} - {format(dayDate, 'MMM do')}
                      </h3>
                      
                      {dayCourses.length > 0 ? (
                        <div className="grid gap-3">
                          {dayCourses.map(course => (
                            <div key={course.id} className="flex items-center justify-between p-3 bg-white rounded border">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <Badge variant="outline">{course.code}</Badge>
                                  <span className="font-medium">{course.name}</span>
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {course.start_time} - {course.end_time}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    {course.student_count} students
                                  </span>
                                  <span className="text-blue-600 font-medium">
                                    Next: Unit {course.next_unit} Lesson {course.next_lesson}
                                  </span>
                                </div>
                              </div>
                              <Button 
                                onClick={() => handleCourseSelect(course)}
                                className="ml-4"
                              >
                                Take Attendance
                                <ChevronRight className="h-4 w-4 ml-1" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 italic">No classes scheduled</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Course Header */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="outline">{selectedCourse.code}</Badge>
                    {selectedCourse.name}
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Unit {selectedCourse.next_unit} Lesson {selectedCourse.next_lesson} • {selectedCourse.student_count} students
                  </p>
                </div>
                <Button variant="outline" onClick={() => setSelectedCourse(null)}>
                  Back to Course List
                </Button>
              </div>
            </CardHeader>
          </Card>

          {/* Student Attendance */}
          <Card>
            <CardHeader>
              <CardTitle>Student Attendance & Performance Ratings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {students.map((student) => (
                  <div key={student.id} className="border rounded-lg p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium">{student.name}</h3>
                      <div className="flex gap-2">
                        {(['present', 'makeup', 'absent'] as const).map((status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant={student.attendance_status === status ? 'default' : 'outline'}
                            onClick={() => updateAttendanceStatus(student.id, status)}
                          >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {student.attendance_status === 'present' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-4 border-t">
                        <StarRating
                          label="Attitude & Efforts"
                          value={student.ratings.attitude_efforts}
                          onChange={(value) => updateRating(student.id, 'attitude_efforts', value)}
                        />
                        <StarRating
                          label="Asking Questions"
                          value={student.ratings.asking_questions}
                          onChange={(value) => updateRating(student.id, 'asking_questions', value)}
                        />
                        <StarRating
                          label="Application of Skills"
                          value={student.ratings.application_skills}
                          onChange={(value) => updateRating(student.id, 'application_skills', value)}
                        />
                        <StarRating
                          label="Application of Feedback"
                          value={student.ratings.application_feedback}
                          onChange={(value) => updateRating(student.id, 'application_feedback', value)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t">
                <Button 
                  onClick={submitAttendance} 
                  disabled={submitting}
                  className="w-full"
                  size="lg"
                >
                  {submitting ? 'Submitting...' : `Submit Attendance for Unit ${selectedCourse.next_unit} Lesson ${selectedCourse.next_lesson}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
