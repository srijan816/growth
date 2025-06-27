'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  MessageSquare, 
  FileAudio, 
  Download, 
  Edit, 
  Check, 
  Star,
  Clock,
  User,
  Brain,
  Eye,
  ThumbsUp,
  AlertCircle,
  PlayCircle
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

interface RecordingDetail {
  id: string;
  studentName: string;
  instructorName: string;
  speechTopic: string;
  motion: string;
  speechType: string;
  programType: string;
  durationSeconds: number;
  status: string;
  createdAt: string;
  fileUrl: string;
  transcription: {
    id: string;
    text: string;
    confidence: number;
    wordCount: number;
    speakingRate: number;
    provider: string;
    processingDuration: number;
  } | null;
  feedback: {
    id: string;
    type: 'primary' | 'secondary';
    status: string;
    strengths: string[];
    improvementAreas: string[];
    rubricScores: Record<string, number>;
    teacherComments: string;
    confidenceMetrics: {
      overallScore: number;
      contentRelevance: number;
      rubricAccuracy: number;
      feedbackQuality: number;
    };
    reviewedBy: string | null;
    reviewedAt: string | null;
    reviewerName: string | null;
  } | null;
}

interface FeedbackViewerProps {
  recordingId: string;
}

export function FeedbackViewer({ recordingId }: FeedbackViewerProps) {
  const [recording, setRecording] = useState<RecordingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedFeedback, setEditedFeedback] = useState<any>({});
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    loadRecordingDetails();
  }, [recordingId]);

  const loadRecordingDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/recording/${recordingId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch recording details');
      }
      
      const data = await response.json();
      setRecording(data.recording);
      
      if (data.recording.feedback) {
        setEditedFeedback({
          strengths: data.recording.feedback.strengths || [],
          improvementAreas: data.recording.feedback.improvementAreas || [],
          rubricScores: data.recording.feedback.rubricScores || {},
          teacherComments: data.recording.feedback.teacherComments || '',
        });
      }
    } catch (error) {
      console.error('Error loading recording details:', error);
      setError(error instanceof Error ? error.message : 'Failed to load recording');
    } finally {
      setLoading(false);
    }
  };

  const playAudio = () => {
    if (recording?.fileUrl) {
      const audio = new Audio(recording.fileUrl);
      audio.play();
      setIsPlaying(true);
      
      audio.onended = () => {
        setIsPlaying(false);
      };
    }
  };

  const generateFeedback = async () => {
    try {
      setError(null);
      
      const response = await fetch(`/api/recording/${recordingId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackType: 'secondary',
          includeTranscript: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate feedback');
      }

      // Reload recording details to show new feedback
      await loadRecordingDetails();
    } catch (error) {
      console.error('Error generating feedback:', error);
      setError(error instanceof Error ? error.message : 'Failed to generate feedback');
    }
  };

  const saveFeedbackEdits = async () => {
    try {
      setError(null);
      
      const response = await fetch(`/api/recording/${recordingId}/feedback`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editedFeedback,
          markAsReviewed: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save feedback changes');
      }

      setIsEditing(false);
      await loadRecordingDetails();
    } catch (error) {
      console.error('Error saving feedback:', error);
      setError(error instanceof Error ? error.message : 'Failed to save feedback');
    }
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRubricLabel = (rubricKey: string): string => {
    const labels = {
      rubric_1: 'Duration Management',
      rubric_2: 'Point of Information',
      rubric_3: 'Style/Persuasion',
      rubric_4: 'Argument Completeness',
      rubric_5: 'Theory Application',
      rubric_6: 'Rebuttal Effectiveness',
      rubric_7: 'Teammate Support',
      rubric_8: 'Feedback Application',
    };
    return labels[rubricKey as keyof typeof labels] || rubricKey;
  };

  const getScoreColor = (score: number): string => {
    if (score === 0) return 'text-gray-500';
    if (score <= 2) return 'text-red-500';
    if (score <= 3) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading recording details...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!recording) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Recording Not Found</h3>
          <p className="text-muted-foreground">
            The requested recording could not be found.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Recording Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{recording.studentName}</CardTitle>
              <p className="text-muted-foreground mt-1">{recording.speechTopic}</p>
              {recording.motion && (
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Motion:</strong> {recording.motion}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Badge>{recording.programType}</Badge>
              <Badge variant="outline">{recording.speechType}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span>{formatDuration(recording.durationSeconds)}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-muted-foreground" />
              <span>{recording.instructorName}</span>
            </div>
            <div className="flex items-center gap-2">
              <PlayCircle className="w-4 h-4 text-muted-foreground" />
              <Button 
                variant="link" 
                className="p-0 h-auto text-sm"
                onClick={playAudio}
                disabled={isPlaying}
              >
                {isPlaying ? 'Playing...' : 'Play Recording'}
              </Button>
            </div>
            <div className="text-muted-foreground">
              {formatDate(recording.createdAt)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="feedback" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="feedback">AI Feedback</TabsTrigger>
          <TabsTrigger value="transcription">Transcription</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4">
          {!recording.feedback ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No AI Feedback Generated</h3>
                <p className="text-muted-foreground mb-4">
                  Generate AI-powered feedback based on the speech transcription.
                </p>
                {recording.transcription ? (
                  <Button onClick={generateFeedback}>
                    <Brain className="w-4 h-4 mr-2" />
                    Generate AI Feedback
                  </Button>
                ) : (
                  <Alert>
                    <AlertDescription>
                      Transcription is required before generating feedback.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Feedback Header */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        {recording.feedback.type === 'primary' ? 'Primary' : 'Secondary'} Feedback
                      </CardTitle>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>AI Confidence: {Math.round(recording.feedback.confidenceMetrics.overallScore * 100)}%</span>
                        {recording.feedback.reviewedBy && (
                          <span className="flex items-center gap-1">
                            <Check className="w-3 h-3 text-green-500" />
                            Reviewed by {recording.feedback.reviewerName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!isEditing ? (
                        <Button variant="outline" onClick={() => setIsEditing(true)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      ) : (
                        <div className="flex gap-2">
                          <Button variant="outline" onClick={() => setIsEditing(false)}>
                            Cancel
                          </Button>
                          <Button onClick={saveFeedbackEdits}>
                            <Check className="w-4 h-4 mr-2" />
                            Save
                          </Button>
                        </div>
                      )}
                      <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* Feedback Content */}
              {recording.feedback.type === 'secondary' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Rubric Scores */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Rubric Scores</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {Object.entries(recording.feedback.rubricScores).map(([key, score]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{getRubricLabel(key)}</span>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${getScoreColor(score)}`}>
                              {score === 0 ? 'N/A' : score}/5
                            </span>
                            <div className="flex">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star 
                                  key={star}
                                  className={`w-3 h-3 ${
                                    star <= score ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Teacher Comments */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Teacher Comments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isEditing ? (
                        <Textarea
                          value={editedFeedback.teacherComments}
                          onChange={(e) => setEditedFeedback(prev => ({
                            ...prev,
                            teacherComments: e.target.value
                          }))}
                          rows={8}
                          placeholder="Enter detailed feedback comments..."
                        />
                      ) : (
                        <p className="text-sm leading-relaxed">
                          {recording.feedback.teacherComments}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Strengths */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ThumbsUp className="w-4 h-4" />
                        Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {recording.feedback.strengths.map((strength, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></span>
                            <span className="text-sm">{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  {/* Improvement Areas */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Areas for Improvement
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {recording.feedback.improvementAreas.map((area, index) => (
                          <li key={index} className="flex items-start gap-2">
                            <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></span>
                            <span className="text-sm">{area}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* AI Confidence Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>AI Analysis Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Overall Score</div>
                      <div className="text-2xl font-bold">
                        {Math.round(recording.feedback.confidenceMetrics.overallScore * 100)}%
                      </div>
                      <Progress 
                        value={recording.feedback.confidenceMetrics.overallScore * 100} 
                        className="h-2 mt-1"
                      />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Content Relevance</div>
                      <div className="text-2xl font-bold">
                        {Math.round(recording.feedback.confidenceMetrics.contentRelevance * 100)}%
                      </div>
                      <Progress 
                        value={recording.feedback.confidenceMetrics.contentRelevance * 100} 
                        className="h-2 mt-1"
                      />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Rubric Accuracy</div>
                      <div className="text-2xl font-bold">
                        {Math.round(recording.feedback.confidenceMetrics.rubricAccuracy * 100)}%
                      </div>
                      <Progress 
                        value={recording.feedback.confidenceMetrics.rubricAccuracy * 100} 
                        className="h-2 mt-1"
                      />
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Feedback Quality</div>
                      <div className="text-2xl font-bold">
                        {Math.round(recording.feedback.confidenceMetrics.feedbackQuality * 100)}%
                      </div>
                      <Progress 
                        value={recording.feedback.confidenceMetrics.feedbackQuality * 100} 
                        className="h-2 mt-1"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Transcription Tab */}
        <TabsContent value="transcription" className="space-y-4">
          {!recording.transcription ? (
            <Card>
              <CardContent className="p-8 text-center">
                <FileAudio className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Transcription Available</h3>
                <p className="text-muted-foreground">
                  The speech has not been transcribed yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Speech Transcription</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Provider: {recording.transcription.provider}</span>
                    <span>Confidence: {Math.round(recording.transcription.confidence * 100)}%</span>
                    <span>Word Count: {recording.transcription.wordCount}</span>
                    <span>Speaking Rate: {recording.transcription.speakingRate} WPM</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {recording.transcription.text}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Speech Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {formatDuration(recording.durationSeconds)}
                  </div>
                  <div className="text-sm text-muted-foreground">Speech Duration</div>
                </div>
                
                {recording.transcription && (
                  <>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {recording.transcription.wordCount}
                      </div>
                      <div className="text-sm text-muted-foreground">Word Count</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="text-3xl font-bold text-purple-600">
                        {recording.transcription.speakingRate}
                      </div>
                      <div className="text-sm text-muted-foreground">Words per Minute</div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}