'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar,
  Users,
  Mic,
  CheckCircle,
  ArrowLeft,
  Clock,
  FileText
} from 'lucide-react';
import { 
  DynamicWeeklyCalendarView,
  DynamicDailyCalendarView,
  DynamicDebateTeamSetup,
  DynamicStudentRecordingSession
} from '@/components/dynamic';

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

interface DebateTeam {
  id: string;
  name: string;
  students: any[];
  side: 'proposition' | 'opposition';
  color: string;
}

interface RecordingSession {
  teams: DebateTeam[];
  motion: string;
  additionalInfo: any;
  classSession: ClassSession;
}

type WorkflowStep = 'calendar' | 'team-setup' | 'recording' | 'completed';

export function FeedbackRecordingWorkflow() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('calendar');
  const [selectedClass, setSelectedClass] = useState<ClassSession | null>(null);
  const [recordingSession, setRecordingSession] = useState<RecordingSession | null>(null);
  const [completedRecordings, setCompletedRecordings] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile screen size
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const steps = [
    { id: 'calendar', title: 'Select Class', icon: Calendar, description: 'Choose a class from your weekly schedule' },
    { id: 'team-setup', title: 'Setup Teams', icon: Users, description: 'Organize students into debate teams' },
    { id: 'recording', title: 'Record Speeches', icon: Mic, description: 'Record student speeches and generate feedback' },
    { id: 'completed', title: 'Complete', icon: CheckCircle, description: 'Review and export feedback' }
  ];

  const getCurrentStepIndex = () => steps.findIndex(step => step.id === currentStep);
  const progressPercentage = ((getCurrentStepIndex() + 1) / steps.length) * 100;

  const handleClassSelect = (classSession: ClassSession) => {
    setSelectedClass(classSession);
    setCurrentStep('team-setup');
  };

  const handleProceedToRecord = (teams: DebateTeam[], motion: string, additionalInfo: any) => {
    if (!selectedClass) return;

    setRecordingSession({
      teams,
      motion,
      additionalInfo,
      classSession: selectedClass
    });
    setCurrentStep('recording');
  };

  const handleRecordingComplete = (recordings: any[]) => {
    setCompletedRecordings(recordings);
    setCurrentStep('completed');
  };

  const handleBackToCalendar = () => {
    setCurrentStep('calendar');
    setSelectedClass(null);
    setRecordingSession(null);
  };

  const handleBackToTeamSetup = () => {
    setCurrentStep('team-setup');
    setRecordingSession(null);
  };

  const handleStartNewSession = () => {
    setCurrentStep('calendar');
    setSelectedClass(null);
    setRecordingSession(null);
    setCompletedRecordings([]);
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

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recording Workflow Progress</CardTitle>
            <Badge variant="outline">
              Step {getCurrentStepIndex() + 1} of {steps.length}
            </Badge>
          </div>
          <Progress value={progressPercentage} className="mt-4" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = getCurrentStepIndex() > index;
              
              return (
                <div
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    isActive 
                      ? 'bg-blue-50 border-blue-300 text-blue-800' 
                      : isCompleted 
                        ? 'bg-green-50 border-green-300 text-green-800'
                        : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    isActive 
                      ? 'bg-blue-600 text-white' 
                      : isCompleted 
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{step.title}</div>
                    <div className="text-xs opacity-75 truncate">{step.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Class Context */}
      {selectedClass && currentStep !== 'calendar' && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div>
                  <div className="font-medium">{selectedClass.courseCode} - {selectedClass.courseName}</div>
                  <div className="text-sm text-muted-foreground flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatTimeRange(selectedClass.startTime, selectedClass.endTime)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {selectedClass.enrolledStudents} students
                    </span>
                    {selectedClass.topic && (
                      <span>Topic: {selectedClass.topic}</span>
                    )}
                  </div>
                </div>
              </div>
              <Button variant="outline" onClick={handleBackToCalendar}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Change Class
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step Content */}
      {currentStep === 'calendar' && (
        isMobile ? (
          <DynamicDailyCalendarView
            onClassSelect={handleClassSelect}
            selectedClass={selectedClass}
          />
        ) : (
          <DynamicWeeklyCalendarView
            onClassSelect={handleClassSelect}
            selectedClass={selectedClass}
          />
        )
      )}

      {currentStep === 'team-setup' && selectedClass && (
        <DynamicDebateTeamSetup
          selectedClass={selectedClass}
          onProceedToRecord={handleProceedToRecord}
          onBackToCalendar={handleBackToCalendar}
        />
      )}

      {currentStep === 'recording' && recordingSession && (
        <DynamicStudentRecordingSession
          recordingSession={recordingSession}
          onRecordingComplete={handleRecordingComplete}
          onBackToTeamSetup={handleBackToTeamSetup}
        />
      )}

      {currentStep === 'completed' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-600" />
              Recording Session Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-8">
              <div className="text-lg font-medium mb-2">
                Successfully recorded speeches for {completedRecordings.length} students
              </div>
              <div className="text-muted-foreground mb-6">
                AI feedback has been generated and is ready for review
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{completedRecordings.length}</div>
                  <div className="text-sm text-muted-foreground">Recordings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {completedRecordings.filter(r => r.feedback).length}
                  </div>
                  <div className="text-sm text-muted-foreground">AI Feedback Generated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {recordingSession?.teams.reduce((acc, team) => acc + team.students.length, 0) || 0}
                  </div>
                  <div className="text-sm text-muted-foreground">Students Participated</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-center gap-4">
              <Button onClick={handleStartNewSession} variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                New Recording Session
              </Button>
              <Button onClick={() => window.location.href = '/dashboard/recording'}>
                <FileText className="w-4 h-4 mr-2" />
                View All Recordings
              </Button>
            </div>

            {/* Session Summary */}
            {recordingSession && (
              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Session Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Class:</span> {recordingSession.classSession.courseCode}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Motion:</span> {recordingSession.motion}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Proposition Team:</span> {recordingSession.teams.find(t => t.side === 'proposition')?.students.length || 0} students
                  </div>
                  <div>
                    <span className="text-muted-foreground">Opposition Team:</span> {recordingSession.teams.find(t => t.side === 'opposition')?.students.length || 0} students
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}