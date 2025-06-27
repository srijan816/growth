'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Play, 
  Pause, 
  Download, 
  FileText, 
  Clock, 
  User, 
  Mic,
  MessageSquare,
  Filter,
  Search,
  MoreVertical,
  Trash2,
  Edit,
  Eye
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Recording {
  id: string;
  studentName: string;
  instructorName: string;
  originalFilename: string;
  fileSizeBytes: number;
  durationSeconds: number;
  speechTopic: string;
  motion: string;
  speechType: string;
  programType: string;
  status: string;
  transcriptionProvider: string;
  createdAt: string;
  hasTranscription: boolean;
  transcriptionConfidence: number;
  feedbackStatus: string;
  feedbackType: string;
}

interface RecordingsListProps {
  onRecordingSelect?: (recordingId: string) => void;
  refreshKey?: number;
}

export function RecordingsList({ onRecordingSelect, refreshKey }: RecordingsListProps) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [filteredRecordings, setFilteredRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');

  useEffect(() => {
    loadRecordings();
  }, [refreshKey]);

  useEffect(() => {
    filterAndSortRecordings();
  }, [recordings, searchTerm, statusFilter, programFilter, sortBy]);

  const loadRecordings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/recording/upload?limit=50');
      if (!response.ok) {
        throw new Error('Failed to fetch recordings');
      }
      
      const data = await response.json();
      setRecordings(data.recordings || []);
    } catch (error) {
      console.error('Error loading recordings:', error);
      setError(error instanceof Error ? error.message : 'Failed to load recordings');
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortRecordings = () => {
    let filtered = [...recordings];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(recording => 
        recording.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recording.speechTopic.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recording.motion.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(recording => {
        switch (statusFilter) {
          case 'completed':
            return recording.status === 'completed' || recording.feedbackStatus === 'completed';
          case 'processing':
            return recording.status === 'transcribing' || recording.status === 'feedback_generating';
          case 'transcribed':
            return recording.hasTranscription;
          case 'feedback':
            return recording.feedbackStatus === 'completed';
          default:
            return true;
        }
      });
    }

    // Apply program filter
    if (programFilter !== 'all') {
      filtered = filtered.filter(recording => recording.programType === programFilter);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'student':
          return a.studentName.localeCompare(b.studentName);
        case 'duration':
          return (b.durationSeconds || 0) - (a.durationSeconds || 0);
        default:
          return 0;
      }
    });

    setFilteredRecordings(filtered);
  };

  const playRecording = async (recordingId: string) => {
    try {
      if (currentlyPlaying === recordingId) {
        // Stop playing
        setCurrentlyPlaying(null);
        return;
      }

      const response = await fetch(`/api/recording/${recordingId}`);
      if (!response.ok) {
        throw new Error('Failed to get recording details');
      }
      
      const data = await response.json();
      if (data.recording.fileUrl) {
        // Create audio element and play
        const audio = new Audio(data.recording.fileUrl);
        audio.play();
        setCurrentlyPlaying(recordingId);
        
        audio.onended = () => {
          setCurrentlyPlaying(null);
        };
      }
    } catch (error) {
      console.error('Error playing recording:', error);
    }
  };

  const deleteRecording = async (recordingId: string) => {
    if (!confirm('Are you sure you want to delete this recording? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/recording/${recordingId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete recording');
      }

      // Refresh the list
      setRecordings(prev => prev.filter(r => r.id !== recordingId));
    } catch (error) {
      console.error('Error deleting recording:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete recording');
    }
  };

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (recording: Recording) => {
    if (recording.feedbackStatus === 'completed') {
      return <Badge className="bg-green-100 text-green-800">Feedback Ready</Badge>;
    } else if (recording.feedbackStatus === 'processing') {
      return <Badge className="bg-yellow-100 text-yellow-800">Generating Feedback</Badge>;
    } else if (recording.hasTranscription) {
      return <Badge className="bg-blue-100 text-blue-800">Transcribed</Badge>;
    } else if (recording.status === 'transcribing') {
      return <Badge className="bg-yellow-100 text-yellow-800">Transcribing</Badge>;
    } else if (recording.status === 'uploaded') {
      return <Badge className="bg-gray-100 text-gray-800">Uploaded</Badge>;
    } else {
      return <Badge variant="secondary">{recording.status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading recordings...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recordings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="transcribed">Transcribed</SelectItem>
                <SelectItem value="feedback">Has Feedback</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                <SelectItem value="PSD">Public Speaking & Debating</SelectItem>
                <SelectItem value="Writing">Academic Writing</SelectItem>
                <SelectItem value="RAPS">Research Analysis & Problem Solving</SelectItem>
                <SelectItem value="Critical Thinking">Critical Thinking</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="student">Student Name</SelectItem>
                <SelectItem value="duration">Duration</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Recordings List */}
      <div className="space-y-3">
        {filteredRecordings.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Mic className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Recordings Found</h3>
              <p className="text-muted-foreground">
                {recordings.length === 0 
                  ? 'No recordings have been made yet. Start by recording a student speech.'
                  : 'No recordings match your current filters. Try adjusting your search criteria.'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredRecordings.map((recording) => (
            <Card key={recording.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium truncate">{recording.studentName}</h3>
                      {getStatusBadge(recording)}
                      <Badge variant="outline">{recording.programType}</Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-1 truncate">
                      <strong>Topic:</strong> {recording.speechTopic}
                    </p>
                    
                    {recording.motion && (
                      <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                        <strong>Motion:</strong> {recording.motion}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(recording.durationSeconds)}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {recording.instructorName}
                      </span>
                      <span>{formatDate(recording.createdAt)}</span>
                      <span>{formatFileSize(recording.fileSizeBytes)}</span>
                    </div>
                    
                    {recording.hasTranscription && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Transcription confidence: {Math.round(recording.transcriptionConfidence * 100)}%
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => playRecording(recording.id)}
                      disabled={currentlyPlaying === recording.id}
                    >
                      {currentlyPlaying === recording.id ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </Button>
                    
                    {recording.hasTranscription && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRecordingSelect?.(recording.id)}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                    )}
                    
                    {recording.feedbackStatus === 'completed' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onRecordingSelect?.(recording.id)}
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onRecordingSelect?.(recording.id)}>
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit Info
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => deleteRecording(recording.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}