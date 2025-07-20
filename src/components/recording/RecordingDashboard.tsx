'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { AudioRecorder } from './AudioRecorder';
import { RecordingsList } from './RecordingsList';
import { FeedbackViewer } from './FeedbackViewer';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Mic, 
  FileAudio, 
  MessageSquare, 
  BarChart3, 
  Settings,
  Users,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface DashboardStats {
  totalRecordings: number;
  completedFeedback: number;
  transcriptionSuccessRate: number;
  totalStudents: number;
  averageProcessingTime: number;
}

interface RecentActivity {
  id: string;
  type: 'recording' | 'transcription' | 'feedback';
  studentName: string;
  timestamp: string;
  status: 'completed' | 'processing' | 'failed';
  details: string;
}

export function RecordingDashboard() {
  const [activeTab, setActiveTab] = useState('record');
  const [stats, setStats] = useState<DashboardStats>({
    totalRecordings: 0,
    completedFeedback: 0,
    transcriptionSuccessRate: 95,
    totalStudents: 0,
    averageProcessingTime: 45,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [selectedRecording, setSelectedRecording] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    loadDashboardStats();
    loadRecentActivity();
  }, [refreshKey]);

  const loadDashboardStats = async () => {
    try {
      const response = await fetch('/api/recording/upload');
      if (response.ok) {
        const data = await response.json();
        const recordings = data.recordings || [];
        
        setStats({
          totalRecordings: recordings.length,
          completedFeedback: recordings.filter((r: any) => r.feedbackStatus === 'completed').length,
          transcriptionSuccessRate: recordings.length > 0 
            ? Math.round((recordings.filter((r: any) => r.hasTranscription).length / recordings.length) * 100)
            : 0,
          totalStudents: new Set(recordings.map((r: any) => r.studentName)).size,
          averageProcessingTime: 45, // Would calculate from actual data
        });
      }
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    }
  };

  const loadRecentActivity = async () => {
    try {
      const response = await fetch('/api/recording/upload?limit=5');
      if (response.ok) {
        const data = await response.json();
        const recordings = data.recordings || [];
        
        const activity: RecentActivity[] = recordings.map((recording: any) => ({
          id: recording.id,
          type: recording.feedbackStatus ? 'feedback' : recording.hasTranscription ? 'transcription' : 'recording',
          studentName: recording.studentName,
          timestamp: recording.createdAt,
          status: recording.status === 'completed' ? 'completed' : 
                  recording.status === 'failed' ? 'failed' : 'processing',
          details: `${recording.speechTopic} - ${recording.programType}`,
        }));
        
        setRecentActivity(activity);
      }
    } catch (error) {
      console.error('Error loading recent activity:', error);
    }
  };

  const handleRecordingComplete = (recordingData: any) => {
    console.log('Recording completed:', recordingData);
    setRefreshKey(prev => prev + 1);
    
    // Show the new recording in the list
    setActiveTab('recordings');
  };

  const handleRecordingSelect = (recordingId: string) => {
    setSelectedRecording(recordingId);
    setActiveTab('feedback');
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActivityTypeIcon = (type: string) => {
    switch (type) {
      case 'recording':
        return <Mic className="w-4 h-4" />;
      case 'transcription':
        return <FileAudio className="w-4 h-4" />;
      case 'feedback':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <Settings className="w-4 h-4" />;
    }
  };

  const handleGenerateSessions = async () => {
    try {
      const response = await fetch('/api/classes/generate-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const result = await response.json();
      if (result.success) {
        alert(`Generated ${result.sessionsCreated} sessions for ${result.courses} courses`);
        window.location.reload();
      } else {
        alert('Failed to generate sessions');
      }
    } catch (error) {
      alert('Error generating sessions');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Generate Sessions Button */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold">Recording Dashboard</h2>
          <p className="text-gray-600">Manage recordings and generate weekly sessions</p>
        </div>
        <Button 
          onClick={handleGenerateSessions}
          className="bg-blue-500 hover:bg-blue-600"
        >
          Generate Weekly Sessions
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Recordings</p>
                <p className="text-2xl font-bold">{stats.totalRecordings}</p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <Mic className="h-4 w-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">AI Feedback Generated</p>
                <p className="text-2xl font-bold">{stats.completedFeedback}</p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Transcription Success</p>
                <p className="text-2xl font-bold">{stats.transcriptionSuccessRate}%</p>
              </div>
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Students Recorded</p>
                <p className="text-2xl font-bold">{stats.totalStudents}</p>
              </div>
              <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Tabs */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="record" className="flex items-center gap-2">
                <Mic className="w-4 h-4" />
                Record
              </TabsTrigger>
              <TabsTrigger value="recordings" className="flex items-center gap-2">
                <FileAudio className="w-4 h-4" />
                Recordings
              </TabsTrigger>
              <TabsTrigger value="feedback" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Feedback
              </TabsTrigger>
            </TabsList>

            <TabsContent value="record" className="space-y-4">
              <AudioRecorder 
                onRecordingComplete={handleRecordingComplete}
                className="w-full"
              />
            </TabsContent>

            <TabsContent value="recordings" className="space-y-4">
              <RecordingsList 
                onRecordingSelect={handleRecordingSelect}
                refreshKey={refreshKey}
              />
            </TabsContent>

            <TabsContent value="feedback" className="space-y-4">
              {selectedRecording ? (
                <FeedbackViewer recordingId={selectedRecording} />
              ) : (
                <Card>
                  <CardContent className="p-8 text-center">
                    <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Recording Selected</h3>
                    <p className="text-muted-foreground mb-4">
                      Select a recording from the Recordings tab to view its feedback.
                    </p>
                    <Button 
                      onClick={() => setActiveTab('recordings')}
                      variant="outline"
                    >
                      Browse Recordings
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivity.length > 0 ? (
                recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-2 mt-1">
                      {getActivityTypeIcon(activity.type)}
                      {getStatusIcon(activity.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {activity.studentName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.details}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No recent activity
                </p>
              )}
            </CardContent>
          </Card>

          {/* Processing Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Transcription Service</span>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Online
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>AI Feedback Generator</span>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Online
                  </Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Storage System</span>
                  <Badge variant="outline" className="text-green-600 border-green-600">
                    Local
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Average Processing Time</span>
                  <span className="font-medium">{stats.averageProcessingTime}s</span>
                </div>
                <Progress value={75} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => setActiveTab('record')}
              >
                <Mic className="w-4 h-4 mr-2" />
                New Recording
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setRefreshKey(prev => prev + 1)}
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                View Analytics
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}