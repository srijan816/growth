'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon,
  Clock,
  Users,
  BookOpen
} from 'lucide-react';
import { format, addDays, subDays, isSameDay, isToday, startOfDay } from 'date-fns';

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

interface DailyCalendarViewProps {
  onClassSelect: (classSession: ClassSession) => void;
  selectedClass?: ClassSession | null;
}

export function DailyCalendarView({ onClassSelect, selectedClass }: DailyCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get 7 days centered around current date
  const getDayRange = () => {
    const days = [];
    for (let i = -3; i <= 3; i++) {
      days.push(addDays(currentDate, i));
    }
    return days;
  };

  const dayRange = getDayRange();

  useEffect(() => {
    fetchClasses();
  }, [currentDate]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch classes for a week range around current date
      const startDate = format(dayRange[0], 'yyyy-MM-dd');
      const endDate = format(dayRange[dayRange.length - 1], 'yyyy-MM-dd');

      const response = await fetch(`/api/classes/weekly?startDate=${startDate}&endDate=${endDate}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch classes');
      }

      const data = await response.json();
      setClasses(data.classes || []);

    } catch (error) {
      console.error('Error fetching classes:', error);
      setError(error instanceof Error ? error.message : 'Failed to load classes');
    } finally {
      setLoading(false);
    }
  };

  const getClassesForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return classes.filter(cls => cls.sessionDate === dateStr);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'ongoing':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'completed':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setCurrentDate(subDays(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 1));
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* Header with Navigation */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('prev')}
              className="p-2"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="text-center">
              <div className="font-semibold text-lg">
                {format(currentDate, 'EEEE')}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(currentDate, 'MMM d, yyyy')}
              </div>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateDate('next')}
              className="p-2"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
          
          {!isToday(currentDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={goToToday}
              className="mt-2"
            >
              <CalendarIcon className="w-4 h-4 mr-2" />
              Today
            </Button>
          )}
        </CardHeader>
      </Card>

      {/* Day Selector - Horizontal Scroll */}
      <Card>
        <CardContent className="p-3">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {dayRange.map((date, index) => {
              const isSelected = isSameDay(date, currentDate);
              const isTodayDate = isToday(date);
              
              return (
                <Button
                  key={index}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentDate(date)}
                  className={`flex-shrink-0 flex flex-col items-center p-3 h-auto ${
                    isTodayDate ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="text-xs font-medium">
                    {format(date, 'EEE')}
                  </div>
                  <div className="text-lg font-bold">
                    {format(date, 'd')}
                  </div>
                  {getClassesForDate(date).length > 0 && (
                    <div className="w-2 h-2 bg-current rounded-full mt-1 opacity-60" />
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Classes for Selected Date */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Today's Classes
            {loading && <div className="text-sm text-muted-foreground">(Loading...)</div>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-lg">
              {error}
            </div>
          )}

          {(() => {
            const todayClasses = getClassesForDate(currentDate);
            
            if (todayClasses.length === 0) {
              return (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <div>No classes scheduled</div>
                  <div className="text-xs">for {format(currentDate, 'EEEE, MMM d')}</div>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {todayClasses
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map((classSession) => (
                    <Card
                      key={classSession.id}
                      className={`cursor-pointer transition-all hover:shadow-md ${
                        selectedClass?.id === classSession.id 
                          ? 'ring-2 ring-blue-500 bg-blue-50' 
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => onClassSelect(classSession)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h3 className="font-medium text-sm leading-tight">
                              {classSession.courseName}
                            </h3>
                            <div className="text-xs text-muted-foreground mt-1">
                              {classSession.courseCode}
                            </div>
                          </div>
                          <Badge className={`text-xs ${getStatusColor(classSession.status)}`}>
                            {classSession.status}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {classSession.startTime} - {classSession.endTime}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {classSession.enrolledStudents} students
                          </div>
                        </div>

                        {classSession.topic && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <BookOpen className="w-3 h-3" />
                            <span className="truncate">{classSession.topic}</span>
                          </div>
                        )}

                        {(classSession.unitNumber || classSession.lessonNumber) && (
                          <div className="mt-2">
                            <Badge variant="outline" className="text-xs">
                              Unit {classSession.unitNumber}.{classSession.lessonNumber}
                            </Badge>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}