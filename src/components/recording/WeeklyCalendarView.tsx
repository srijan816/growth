'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  ChevronLeft, 
  ChevronRight,
  Clock,
  Users,
  MapPin
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, addWeeks, subWeeks, isSameDay, parseISO } from 'date-fns';

interface ClassSession {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  sessionDate: string;
  startTime: string;
  endTime: string;
  topic: string;
  unitNumber: string;
  lessonNumber: string;
  status: string;
  enrolledStudents: number;
}

interface WeeklyCalendarViewProps {
  onClassSelect: (classSession: ClassSession) => void;
  selectedClass?: ClassSession | null;
}

export function WeeklyCalendarView({ onClassSelect, selectedClass }: WeeklyCalendarViewProps) {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const timeSlots = [
    '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
    '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM'
  ];

  useEffect(() => {
    loadWeeklyClasses();
  }, [currentWeek]);

  const loadWeeklyClasses = async () => {
    try {
      setLoading(true);
      setError(null);

      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(weekEnd, 'yyyy-MM-dd');

      const response = await fetch(`/api/classes/weekly?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) {
        throw new Error('Failed to fetch weekly classes');
      }

      const data = await response.json();
      setClasses(data.classes || []);
    } catch (error) {
      console.error('Error loading weekly classes:', error);
      setError(error instanceof Error ? error.message : 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek(prev => direction === 'prev' ? subWeeks(prev, 1) : addWeeks(prev, 1));
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  const getClassesForDay = (day: Date): ClassSession[] => {
    return classes.filter(cls => isSameDay(parseISO(cls.sessionDate), day));
  };

  const getClassPosition = (startTime: string, endTime: string): { top: number; height: number } => {
    const parseTime = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    };

    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    const duration = endMinutes - startMinutes;

    // Calendar starts at 8:00 AM (480 minutes from midnight)
    const calendarStart = 8 * 60;
    const hourHeight = 60; // pixels per hour

    const top = ((startMinutes - calendarStart) / 60) * hourHeight;
    const height = (duration / 60) * hourHeight;

    return { top: Math.max(0, top), height: Math.max(30, height) };
  };

  const formatTimeRange = (startTime: string, endTime: string): string => {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':').map(Number);
      const ampm = hours >= 12 ? 'PM' : 'AM';
      const displayHours = hours % 12 || 12;
      return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    };

    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'ongoing':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'upcoming':
        return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'cancelled':
        return 'bg-red-100 border-red-300 text-red-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading weekly schedule...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Weekly Schedule
              </CardTitle>
              <div className="text-lg font-medium text-muted-foreground">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigateWeek('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
              <Button variant="outline" size="sm" onClick={() => navigateWeek('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="grid grid-cols-8 border-b">
            {/* Time column header */}
            <div className="p-4 border-r bg-muted/50 text-center font-medium text-sm">
              GMT-08
            </div>
            
            {/* Day headers */}
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="p-4 border-r bg-muted/50 text-center">
                <div className="font-medium text-sm">
                  {format(day, 'EEE').toUpperCase()}
                </div>
                <div className={`text-2xl font-bold mt-1 ${
                  isSameDay(day, new Date()) 
                    ? 'bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto' 
                    : ''
                }`}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Calendar Body */}
          <div className="grid grid-cols-8" style={{ minHeight: '600px' }}>
            {/* Time slots column */}
            <div className="border-r">
              {timeSlots.map((time, index) => (
                <div 
                  key={time} 
                  className="h-15 border-b border-gray-100 p-2 text-xs text-muted-foreground text-right"
                  style={{ height: '60px' }}
                >
                  {index % 2 === 0 ? time : ''}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day) => (
              <div key={day.toISOString()} className="border-r relative">
                {/* Hour grid lines */}
                {timeSlots.map((_, index) => (
                  <div 
                    key={index} 
                    className="h-15 border-b border-gray-50"
                    style={{ height: '60px' }}
                  />
                ))}

                {/* Classes for this day */}
                <div className="absolute inset-0">
                  {getClassesForDay(day).map((classSession) => {
                    const position = getClassPosition(classSession.startTime, classSession.endTime);
                    const isSelected = selectedClass?.id === classSession.id;
                    
                    return (
                      <div
                        key={classSession.id}
                        className={`absolute left-1 right-1 rounded-lg border-l-4 cursor-pointer transition-all hover:shadow-md p-2 ${
                          getStatusColor(classSession.status)
                        } ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                        style={{
                          top: `${position.top}px`,
                          height: `${position.height}px`,
                          minHeight: '40px'
                        }}
                        onClick={() => onClassSelect(classSession)}
                      >
                        <div className="text-xs font-semibold truncate">
                          {classSession.courseCode}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {classSession.courseName}
                        </div>
                        <div className="text-xs font-medium mt-1">
                          {formatTimeRange(classSession.startTime, classSession.endTime)}
                        </div>
                        {classSession.topic && (
                          <div className="text-xs text-muted-foreground truncate mt-1">
                            {classSession.topic}
                          </div>
                        )}
                        <div className="flex items-center gap-1 mt-1">
                          <Users className="w-3 h-3" />
                          <span className="text-xs">{classSession.enrolledStudents}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Selected Class Details */}
      {selectedClass && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Class</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Course</div>
                <div className="font-medium">{selectedClass.courseCode} - {selectedClass.courseName}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Time</div>
                <div className="font-medium flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatTimeRange(selectedClass.startTime, selectedClass.endTime)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Students</div>
                <div className="font-medium flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {selectedClass.enrolledStudents} enrolled
                </div>
              </div>
              {selectedClass.topic && (
                <div className="md:col-span-3">
                  <div className="text-sm text-muted-foreground">Topic</div>
                  <div className="font-medium">{selectedClass.topic}</div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="p-4">
            <div className="text-red-600 text-sm">{error}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}