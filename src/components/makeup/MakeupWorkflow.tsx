'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Users, Search, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { OfflineStorage } from '@/lib/offline-storage';
import OfflineIndicator from '@/components/offline/OfflineIndicator';

interface Student {
  id: string;
  name: string;
  enrollment_id: string;
  course_name: string;
  course_code: string;
  missed_sessions: MissedSession[];
}

interface MissedSession {
  session_id: string;
  session_date: string;
  lesson_number: string;
  topic?: string;
}

interface AvailableClass {
  id: string;
  course_code: string;
  course_name: string;
  day_of_week: string;
  start_time: string;
  session_date: string;
  lesson_number: string;
  topic?: string;
  available_spots: number;
}

interface MakeupEntry {
  student_id: string;
  student_name: string;
  original_enrollment_id: string;
  makeup_class_id: string;
  makeup_class_name: string;
  makeup_session_date: string;
  missed_session_id: string;
  missed_session_date: string;
}

export default function MakeupWorkflow() {
  const [students, setStudents] = useState<Student[]>([]);
  const [availableClasses, setAvailableClasses] = useState<AvailableClass[]>([]);
  const [makeupEntries, setMakeupEntries] = useState<MakeupEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  
  const offlineStorage = OfflineStorage.getInstance();

  useEffect(() => {
    fetchStudentsWithMissedSessions();
    fetchAvailableClasses();
    
    // Set up offline monitoring
    setIsOnline(offlineStorage.getConnectionStatus());
    const unsubscribe = offlineStorage.onStatusChange(setIsOnline);
    
    return unsubscribe;
  }, [selectedDate]);

  const fetchStudentsWithMissedSessions = async () => {
    try {
      const response = await fetch('/api/makeup/students-with-missed-sessions');
      const data = await response.json();
      setStudents(data.students || []);
    } catch (error) {
      console.error('Failed to fetch students with missed sessions:', error);
    }
  };

  const fetchAvailableClasses = async () => {
    try {
      const response = await fetch(`/api/makeup/available-classes?date=${selectedDate}`);
      const data = await response.json();
      setAvailableClasses(data.classes || []);
    } catch (error) {
      console.error('Failed to fetch available classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const addMakeupEntry = (student: Student, missedSession: MissedSession, makeupClass: AvailableClass) => {
    const entry: MakeupEntry = {
      student_id: student.id,
      student_name: student.name,
      original_enrollment_id: student.enrollment_id,
      makeup_class_id: makeupClass.id,
      makeup_class_name: makeupClass.course_name,
      makeup_session_date: makeupClass.session_date,
      missed_session_id: missedSession.session_id,
      missed_session_date: missedSession.session_date
    };

    setMakeupEntries(prev => [...prev, entry]);
  };

  const removeMakeupEntry = (index: number) => {
    setMakeupEntries(prev => prev.filter((_, i) => i !== index));
  };

  const submitMakeupEntries = async () => {
    if (makeupEntries.length === 0) return;

    setSubmitting(true);
    try {
      if (isOnline) {
        // Try online submission first
        try {
          const response = await fetch('/api/makeup/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entries: makeupEntries })
          });

          if (response.ok) {
            alert('Makeup sessions scheduled successfully!');
            setMakeupEntries([]);
            fetchStudentsWithMissedSessions();
          } else {
            throw new Error('Network submission failed');
          }
        } catch (networkError) {
          // Fallback to offline storage
          await offlineStorage.saveMakeupOffline({ entries: makeupEntries });
          alert('Network unavailable. Makeup sessions saved offline and will sync when connection returns.');
          setMakeupEntries([]);
        }
      } else {
        // Save offline
        await offlineStorage.saveMakeupOffline({ entries: makeupEntries });
        alert('Offline mode: Makeup sessions saved locally and will sync when connection returns.');
        setMakeupEntries([]);
      }
    } catch (error) {
      console.error('Failed to submit makeup entries:', error);
      alert('Failed to save makeup sessions');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.course_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Makeup Class Management</h1>
        <div className="flex items-center gap-4">
          <OfflineIndicator />
          <div className="text-sm text-gray-500">
            {format(new Date(selectedDate), 'EEEE, MMMM do, yyyy')}
          </div>
        </div>
      </div>

      {/* Date Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Select Makeup Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            <div>
              <Label htmlFor="makeup-date">Available Classes Date</Label>
              <Input
                id="makeup-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-48"
              />
            </div>
            <div className="text-sm text-gray-600">
              {availableClasses.length} classes available on this date
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Students with Missed Sessions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Students with Missed Sessions
            </CardTitle>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search Students</Label>
                <Input
                  id="search"
                  placeholder="Search by name or course..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {filteredStudents.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No students with missed sessions found</p>
                </div>
              ) : (
                filteredStudents.map((student) => (
                  <div key={student.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{student.name}</h3>
                      <Badge variant="outline">{student.course_code}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{student.course_name}</p>
                    <div className="space-y-2">
                      {student.missed_sessions.map((session) => (
                        <div key={session.session_id} className="flex items-center justify-between bg-red-50 p-2 rounded">
                          <div>
                            <span className="text-sm font-medium">
                              {format(new Date(session.session_date), 'MMM d')} - Lesson {session.lesson_number}
                            </span>
                            {session.topic && (
                              <p className="text-xs text-gray-600">{session.topic}</p>
                            )}
                          </div>
                          <Select onValueChange={(classId) => {
                            const makeupClass = availableClasses.find(c => c.id === classId);
                            if (makeupClass) {
                              addMakeupEntry(student, session, makeupClass);
                            }
                          }}>
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Assign" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableClasses.map((cls) => (
                                <SelectItem key={cls.id} value={cls.id}>
                                  {cls.course_code} {cls.start_time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Available Classes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Available Classes ({format(new Date(selectedDate), 'MMM d')})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {availableClasses.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No classes available on this date</p>
                </div>
              ) : (
                availableClasses.map((cls) => (
                  <div key={cls.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium">{cls.course_code}</h3>
                      <Badge variant="secondary">{cls.start_time}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{cls.course_name}</p>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">
                        {cls.day_of_week} • Lesson {cls.lesson_number}
                      </span>
                      <span className="text-green-600 font-medium">
                        {cls.available_spots} spots available
                      </span>
                    </div>
                    {cls.topic && (
                      <p className="text-xs text-gray-500 mt-1">{cls.topic}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Makeup Assignments */}
      {makeupEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Scheduled Makeup Sessions ({makeupEntries.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {makeupEntries.map((entry, index) => (
                <div key={`${entry.student_name}_${entry.missed_session_date}_${entry.makeup_session_date}_${index}`} className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="font-medium">{entry.student_name}</span>
                      <p className="text-sm text-gray-600">
                        Missed: {format(new Date(entry.missed_session_date), 'MMM d')}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                    <div>
                      <span className="font-medium">{entry.makeup_class_name}</span>
                      <p className="text-sm text-gray-600">
                        Makeup: {format(new Date(entry.makeup_session_date), 'MMM d')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeMakeupEntry(index)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <Button 
                onClick={submitMakeupEntries} 
                disabled={submitting}
                className="w-full"
              >
                {submitting ? 'Scheduling...' : `Schedule ${makeupEntries.length} Makeup Sessions`}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}