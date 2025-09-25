'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Play,
  Pause,
  Download,
  FileText,
  Search,
  Mic,
  Calendar,
  Clock,
  User,
  Volume2,
  Eye,
  FileDown
} from 'lucide-react';

interface Recording {
  id: string;
  studentName: string;
  originalFilename: string;
  fileSizeBytes: number;
  durationSeconds: number;
  speechTopic: string;
  motion: string;
  speechType: string;
  status: string;
  createdAt: string;
  hasTranscription: boolean;
  transcriptionConfidence?: number;
}

interface TranscriptData {
  text: string;
  metadata: any;
  filepath?: string;
}

export function RecordingsLibrary() {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [selectedTranscript, setSelectedTranscript] = useState<TranscriptData | null>(null);
  const [showTranscriptDialog, setShowTranscriptDialog] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      const response = await fetch('/api/recording/upload?limit=50');
      const data = await response.json();
      setRecordings(data.recordings || []);
    } catch (error) {
      console.error('Failed to fetch recordings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayRecording = async (recording: Recording) => {
    if (selectedRecording?.id === recording.id && isPlaying) {
      // Pause if clicking the same recording
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      // Play new recording
      setSelectedRecording(recording);
      const url = `/api/recordings/audio/${recording.id}.webm`;
      setAudioUrl(url);
      setIsPlaying(true);
      
      // Wait for state update then play
      setTimeout(() => {
        audioRef.current?.play();
      }, 100);
    }
  };

  const handleViewTranscript = async (recording: Recording) => {
    try {
      const response = await fetch(`/api/recordings/transcripts?recordingId=${recording.id}`);
      const data = await response.json();
      
      if (data.error) {
        alert('Transcript not available for this recording');
        return;
      }
      
      setSelectedTranscript(data);
      setSelectedRecording(recording);
      setShowTranscriptDialog(true);
    } catch (error) {
      console.error('Failed to fetch transcript:', error);
      alert('Failed to load transcript');
    }
  };

  const handleDownloadTranscript = async (recordingId: string, format: 'txt' | 'md' | 'json') => {
    try {
      const response = await fetch(`/api/recordings/transcripts?recordingId=${recordingId}&format=${format}`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transcript_${recordingId}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download transcript:', error);
      alert('Failed to download transcript');
    }
  };

  const handleDownloadAudio = (recording: Recording) => {
    const url = `/api/recordings/audio/${recording.id}.webm`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `${recording.studentName}_${recording.speechTopic}_${recording.id}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredRecordings = recordings.filter(recording =>
    recording.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recording.speechTopic.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recording.motion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Recordings Library
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search recordings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Badge variant="outline">
                {recordings.length} recordings
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All Recordings</TabsTrigger>
              <TabsTrigger value="transcribed">With Transcripts</TabsTrigger>
              <TabsTrigger value="recent">Recent (7 days)</TabsTrigger>
            </TabsList>
            
            <TabsContent value="all" className="mt-4">
              <RecordingsTable 
                recordings={filteredRecordings}
                onPlay={handlePlayRecording}
                onViewTranscript={handleViewTranscript}
                onDownloadAudio={handleDownloadAudio}
                selectedRecording={selectedRecording}
                isPlaying={isPlaying}
              />
            </TabsContent>
            
            <TabsContent value="transcribed" className="mt-4">
              <RecordingsTable 
                recordings={filteredRecordings.filter(r => r.hasTranscription)}
                onPlay={handlePlayRecording}
                onViewTranscript={handleViewTranscript}
                onDownloadAudio={handleDownloadAudio}
                selectedRecording={selectedRecording}
                isPlaying={isPlaying}
              />
            </TabsContent>
            
            <TabsContent value="recent" className="mt-4">
              <RecordingsTable 
                recordings={filteredRecordings.filter(r => {
                  const recordingDate = new Date(r.createdAt);
                  const sevenDaysAgo = new Date();
                  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                  return recordingDate > sevenDaysAgo;
                })}
                onPlay={handlePlayRecording}
                onViewTranscript={handleViewTranscript}
                onDownloadAudio={handleDownloadAudio}
                selectedRecording={selectedRecording}
                isPlaying={isPlaying}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Hidden audio player */}
      {audioUrl && (
        <audio 
          ref={audioRef} 
          src={audioUrl} 
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      {/* Transcript Dialog */}
      <Dialog open={showTranscriptDialog} onOpenChange={setShowTranscriptDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Speech Transcript</DialogTitle>
            <DialogDescription>
              {selectedRecording && (
                <div className="flex items-center gap-4 mt-2">
                  <Badge variant="outline">
                    <User className="w-3 h-3 mr-1" />
                    {selectedRecording.studentName}
                  </Badge>
                  <Badge variant="outline">
                    <Calendar className="w-3 h-3 mr-1" />
                    {formatDate(selectedRecording.createdAt)}
                  </Badge>
                  <Badge variant="outline">
                    <Clock className="w-3 h-3 mr-1" />
                    {formatDuration(selectedRecording.durationSeconds)}
                  </Badge>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          
          {selectedTranscript && (
            <div className="space-y-4">
              {selectedTranscript.metadata && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Topic:</span> {selectedTranscript.metadata.speechTopic}
                    </div>
                    <div>
                      <span className="font-medium">Type:</span> {selectedTranscript.metadata.speechType}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Motion:</span> {selectedTranscript.metadata.motion}
                    </div>
                    <div>
                      <span className="font-medium">Word Count:</span> {selectedTranscript.metadata.wordCount}
                    </div>
                    <div>
                      <span className="font-medium">Confidence:</span> {(selectedTranscript.metadata.confidence * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}
              
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap p-4 bg-background border rounded-lg max-h-96 overflow-y-auto">
                  {selectedTranscript.text}
                </div>
              </div>
              
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => handleDownloadTranscript(selectedRecording!.id, 'txt')}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Download TXT
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleDownloadTranscript(selectedRecording!.id, 'md')}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Download MD
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => handleDownloadTranscript(selectedRecording!.id, 'json')}
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Download JSON
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface RecordingsTableProps {
  recordings: Recording[];
  onPlay: (recording: Recording) => void;
  onViewTranscript: (recording: Recording) => void;
  onDownloadAudio: (recording: Recording) => void;
  selectedRecording: Recording | null;
  isPlaying: boolean;
}

function RecordingsTable({ 
  recordings, 
  onPlay, 
  onViewTranscript, 
  onDownloadAudio,
  selectedRecording,
  isPlaying 
}: RecordingsTableProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (recordings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No recordings found
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Student</TableHead>
          <TableHead>Topic</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Size</TableHead>
          <TableHead>Date</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {recordings.map((recording) => (
          <TableRow key={recording.id}>
            <TableCell className="font-medium">{recording.studentName}</TableCell>
            <TableCell>
              <div>
                <div className="font-medium">{recording.speechTopic}</div>
                {recording.motion && (
                  <div className="text-xs text-muted-foreground truncate max-w-xs">
                    {recording.motion}
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{recording.speechType}</Badge>
            </TableCell>
            <TableCell>{formatDuration(recording.durationSeconds || 0)}</TableCell>
            <TableCell>{formatFileSize(recording.fileSizeBytes)}</TableCell>
            <TableCell>{formatDate(recording.createdAt)}</TableCell>
            <TableCell>
              <div className="flex gap-1">
                <Badge 
                  variant={recording.status === 'completed' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {recording.status}
                </Badge>
                {recording.hasTranscription && (
                  <Badge variant="outline" className="text-xs">
                    <FileText className="w-3 h-3" />
                  </Badge>
                )}
              </div>
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onPlay(recording)}
                  title="Play recording"
                >
                  {selectedRecording?.id === recording.id && isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                {recording.hasTranscription && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewTranscript(recording)}
                    title="View transcript"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDownloadAudio(recording)}
                  title="Download audio"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}