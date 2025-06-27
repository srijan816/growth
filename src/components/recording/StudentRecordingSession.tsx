'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Mic,
  Play,
  Pause,
  Square,
  CheckCircle,
  Clock,
  User,
  ArrowLeft,
  ArrowRight,
  SkipForward,
  Trophy,
  Target,
  Users
} from 'lucide-react';
import { AudioRecorder } from './AudioRecorder';

interface Student {
  id: string;
  name: string;
  email?: string;
  studentNumber?: string;
  enrollmentId: string;
}

interface DebateTeam {
  id: string;
  name: string;
  students: Student[];
  side: 'proposition' | 'opposition';
  color: string;
}

interface RecordingSession {
  teams: DebateTeam[];
  motion: string;
  additionalInfo: any;
  classSession: any;
}

interface StudentRecordingSessionProps {
  recordingSession: RecordingSession;
  onRecordingComplete: (recordings: any[]) => void;
  onBackToTeamSetup: () => void;
}

interface StudentRecording {
  studentId: string;
  studentName: string;
  team: string;
  position: number;
  recordingId?: string;
  status: 'pending' | 'recording' | 'completed' | 'skipped';
  recordingData?: any;
}

export function StudentRecordingSession({ 
  recordingSession, 
  onRecordingComplete, 
  onBackToTeamSetup 
}: StudentRecordingSessionProps) {
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(true); // Auto-start session

  // Flatten all students from both teams with their positions
  const allStudents = React.useMemo(() => {
    const students: StudentRecording[] = [];
    
    // Add safety check for recordingSession and teams
    if (!recordingSession?.teams || !Array.isArray(recordingSession.teams)) {
      return students;
    }
    
    recordingSession.teams.forEach(team => {
      if (team && team.students && Array.isArray(team.students)) {
        team.students.forEach((student, index) => {
          if (student && student.id && student.name) {
            students.push({
              studentId: student.id,
              studentName: student.name,
              team: team.name || 'Unknown Team',
              position: index + 1,
              status: 'pending'
            });
          }
        });
      }
    });

    return students;
  }, [recordingSession]);

  // Initialize recordings from allStudents
  const [recordings, setRecordings] = useState<StudentRecording[]>(allStudents);

  const currentStudent = recordings[currentStudentIndex];
  const completedCount = recordings.filter(r => r?.status === 'completed').length;
  const totalCount = recordings.length;
  const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  
  // If no students are available, show a message
  if (totalCount === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Available</h3>
            <p className="text-gray-600 mb-4">
              Please go back to team setup and assign students to teams before recording.
            </p>
            <Button onClick={onBackToTeamSetup} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Team Setup
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getTeamInfo = (teamName: string) => {
    // Add safety check for recordingSession and teams
    const team = recordingSession?.teams?.find(t => t.name === teamName);
    const side = team?.side || 'proposition';
    
    return {
      side,
      icon: side === 'proposition' ? Trophy : Target,
      color: side === 'proposition' ? 'text-green-600' : 'text-red-600',
      bgColor: side === 'proposition' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
    };
  };

  const handleRecordingComplete = (recordingData: any) => {
    console.log('📝 handleRecordingComplete called:', {
      currentStudentIndex,
      currentStudent: currentStudent?.studentName,
      speakerTransition: recordingData.speakerTransition,
      autoAdvanced: recordingData.autoAdvanced,
      transitionPhrase: recordingData.transitionPhrase
    });

    setRecordings(prev => prev.map((rec, index) => 
      index === currentStudentIndex 
        ? { 
            ...rec, 
            status: 'completed',
            recordingId: recordingData.recording?.id,
            recordingData 
          }
        : rec
    ));

    // Check if this was triggered by speaker transition
    if (recordingData.speakerTransition && recordingData.autoAdvanced) {
      console.log('🎤 Speaker transition auto-advance detected');
      console.log(`🔄 Advancing from ${currentStudent?.studentName} (index ${currentStudentIndex}) to next student`);
      
      // Auto-advance to next student
      if (currentStudentIndex < recordings.length - 1) {
        const nextIndex = currentStudentIndex + 1;
        const nextStudent = recordings[nextIndex];
        console.log(`🎯 Moving to next student: ${nextStudent?.studentName} (index ${nextIndex})`);
        setCurrentStudentIndex(nextIndex);
      } else {
        console.log('🏁 All recordings complete');
        // All recordings complete
        const completedRecordings = recordings.map((rec, index) => 
          index === currentStudentIndex 
            ? { 
                ...rec, 
                status: 'completed',
                recordingId: recordingData.recording?.id,
                recordingData 
              }
            : rec
        );
        onRecordingComplete(completedRecordings.filter(r => r.status === 'completed'));
      }
    } else {
      console.log('📝 Manual completion - auto-advance to next student');
      // Manual completion - auto-advance to next student
      if (currentStudentIndex < recordings.length - 1) {
        const nextIndex = currentStudentIndex + 1;
        const nextStudent = recordings[nextIndex];
        console.log(`🎯 Moving to next student: ${nextStudent?.studentName} (index ${nextIndex})`);
        setCurrentStudentIndex(nextIndex);
      } else {
        console.log('🏁 All recordings complete');
        // All recordings complete
        const completedRecordings = recordings.map((rec, index) => 
          index === currentStudentIndex 
            ? { 
                ...rec, 
                status: 'completed',
                recordingId: recordingData.recording?.id,
                recordingData 
              }
            : rec
        );
        onRecordingComplete(completedRecordings.filter(r => r.status === 'completed'));
      }
    }
  };

  const handleSkipStudent = () => {
    setRecordings(prev => prev.map((rec, index) => 
      index === currentStudentIndex 
        ? { ...rec, status: 'skipped' }
        : rec
    ));

    if (currentStudentIndex < recordings.length - 1) {
      setCurrentStudentIndex(prev => prev + 1);
    } else {
      // Session complete
      onRecordingComplete(recordings.filter(r => r.status === 'completed'));
    }
  };

  const handlePreviousStudent = () => {
    if (currentStudentIndex > 0) {
      setCurrentStudentIndex(prev => prev - 1);
    }
  };

  const handleNextStudent = () => {
    if (currentStudentIndex < recordings.length - 1) {
      setCurrentStudentIndex(prev => prev + 1);
    }
  };

  const getPositionLabel = (student: StudentRecording): string => {
    // Add safety checks for undefined values
    if (!student || !student.team) {
      return `Student ${student?.position || 1}`;
    }
    
    // Find the team safely
    const team = recordingSession?.teams?.find(t => t.name === student.team);
    if (!team || !team.side) {
      return `Student ${student.position}`;
    }
    
    const positions = {
      proposition: ['1st Proposition', '2nd Proposition', '3rd Proposition', '4th Proposition'],
      opposition: ['1st Opposition', '2nd Opposition', '3rd Opposition', '4th Opposition']
    };
    
    const positionArray = positions[team.side];
    if (!positionArray) {
      return `Student ${student.position}`;
    }
    
    return positionArray[student.position - 1] || `${student.position}${team.side === 'proposition' ? 'st Prop' : 'st Opp'}`;
  };

  const formatTime = (minutes: number): string => {
    return `${minutes}:00`;
  };

  if (!sessionStarted) {
    return (
      <div className="space-y-6">
        {/* Session Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Recording Session Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Motion */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-2">Debate Motion</h3>
              <p className="text-blue-700">{recordingSession.motion}</p>
            </div>

            {/* Session Details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{totalCount}</div>
                <div className="text-sm text-muted-foreground">Total Students</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatTime(parseInt(recordingSession.additionalInfo.timeLimit))}</div>
                <div className="text-sm text-muted-foreground">Time per Speaker</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{recordingSession.additionalInfo.format}</div>
                <div className="text-sm text-muted-foreground">Debate Format</div>
              </div>
            </div>

            {/* Teams Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recordingSession.teams.map(team => {
                const teamInfo = getTeamInfo(team.name);
                const TeamIcon = teamInfo.icon;
                
                return (
                  <Card key={team.id} className={teamInfo.bgColor}>
                    <CardHeader>
                      <CardTitle className={`flex items-center gap-2 ${teamInfo.color}`}>
                        <TeamIcon className="w-5 h-5" />
                        {team.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {team.students.map((student, index) => (
                          <div key={student.id} className="flex items-center gap-3 p-2 bg-white rounded border">
                            <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold text-white ${
                              team.side === 'proposition' ? 'bg-green-600' : 'bg-red-600'
                            }`}>
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{student.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {getPositionLabel({ 
                                  studentId: student.id, 
                                  studentName: student.name, 
                                  team: team.name, 
                                  position: index + 1, 
                                  status: 'pending' 
                                })}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Start Session */}
            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={onBackToTeamSetup}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Team Setup
              </Button>
              <Button 
                onClick={() => setSessionStarted(true)}
                size="lg"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Mic className="w-4 h-4 mr-2" />
                Start Recording Session
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recording Progress</CardTitle>
            <Badge variant="outline">
              {completedCount} of {totalCount} students
            </Badge>
          </div>
          <Progress value={progressPercentage} className="mt-4" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {recordings.map((student, index) => {
              const teamInfo = getTeamInfo(student.team);
              const isCurrent = index === currentStudentIndex;
              
              return (
                <div
                  key={`student-${student.studentId}-${index}`}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                    isCurrent 
                      ? 'bg-blue-100 border-blue-300 text-blue-800'
                      : student.status === 'completed'
                        ? 'bg-green-100 border-green-300 text-green-800'
                        : student.status === 'skipped'
                          ? 'bg-gray-100 border-gray-300 text-gray-600'
                          : 'bg-white border-gray-200'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    student.status === 'completed' ? 'bg-green-500' :
                    student.status === 'skipped' ? 'bg-gray-400' :
                    isCurrent ? 'bg-blue-500' : 'bg-gray-300'
                  }`} />
                  <span className="text-sm font-medium">{student.studentName}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Current Student */}
      {currentStudent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Now Recording: {currentStudent.studentName}
                </CardTitle>
                <p className="text-muted-foreground mt-1">
                  {getPositionLabel(currentStudent)} • {getTeamInfo(currentStudent.team).side}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={getTeamInfo(currentStudent.team).color}>
                  {currentStudent.team}
                </Badge>
                <Badge variant="outline">
                  Position {currentStudent.position}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Motion Reminder */}
              <div className="p-3 bg-muted rounded-lg">
                <div className="text-sm font-medium text-muted-foreground mb-1">Motion:</div>
                <div className="text-sm">{recordingSession.motion}</div>
              </div>

              {/* Time Limit */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Time Limit: {formatTime(parseInt(recordingSession.additionalInfo.timeLimit))}
                </span>
                <span>Format: {recordingSession.additionalInfo.format}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recording Interface */}
      <AudioRecorder
        studentId={currentStudent?.studentId}
        studentName={currentStudent?.studentName}
        sessionId={recordingSession.classSession.id}
        onRecordingComplete={handleRecordingComplete}
        speechTopic={getPositionLabel(currentStudent)}
        motion={recordingSession.motion}
        speechType="debate"
        programType={recordingSession.classSession.courseCode?.includes('PSD') ? 'PSD' : 'Critical Thinking'}
        autoGenerateFeedback={true}
        feedbackType="secondary"
      />

      {/* Navigation Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="outline" 
              onClick={handlePreviousStudent}
              disabled={currentStudentIndex === 0}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous Student
            </Button>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleSkipStudent}
              >
                <SkipForward className="w-4 h-4 mr-2" />
                Skip Student
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleNextStudent}
                disabled={currentStudentIndex === recordings.length - 1}
              >
                Next Student
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>

            <Button 
              onClick={() => onRecordingComplete(recordings.filter(r => r.status === 'completed'))}
              variant="destructive"
            >
              End Session
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}