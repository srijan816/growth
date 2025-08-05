'use client';

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  Mic,
  Play,
  Pause,
  Square,
  RotateCcw,
  Clock,
  Volume2,
  Settings,
  CheckCircle,
  FileText,
  Wifi,
  WifiOff,
  ArrowRight
} from 'lucide-react';
import RecordRTC from 'recordrtc';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useUploader } from '@/hooks/useUploader';
import { useChunkedTranscription } from '@/hooks/useChunkedTranscription';

interface AudioRecorderProps {
  studentId?: string;
  studentName?: string;
  sessionId?: string;
  onRecordingComplete?: (data: any) => void;
  onSpeakerTransition?: () => void; // New callback for speaker transitions
  speechTopic?: string;
  motion?: string;
  speechType?: 'speech' | 'debate' | 'presentation';
  programType?: 'PSD' | 'Critical Thinking' | 'Academic Writing' | 'RAPS';
  autoGenerateFeedback?: boolean;
  feedbackType?: 'primary' | 'secondary';
  enableLiveTranscription?: boolean;
}

export function AudioRecorder({
  studentId,
  studentName,
  sessionId,
  onRecordingComplete,
  onSpeakerTransition,
  speechTopic = '',
  motion = '',
  speechType = 'speech',
  programType = 'PSD',
  autoGenerateFeedback = true,
  feedbackType = 'primary',
  enableLiveTranscription = true
}: AudioRecorderProps) {
  // Custom hooks for separation of concerns
  const recorder = useAudioRecorder();
  const uploader = useUploader();
  
  // State for speaker transition detection and segments
  const [speakerTransition, setSpeakerTransition] = useState<{
    detected: boolean;
    phrase: string;
    sentence: string;
  } | null>(null);
  
  const [speakerSegments, setSpeakerSegments] = useState<Array<{
    speaker: string;
    transcript: string;
    startTime: number;
    endTime?: number;
  }>>([]);
  
  const [currentSpeaker, setCurrentSpeaker] = useState<string>('1st Proposition');
  
  // Memoize the transcription config for chunked recording
  const transcriptionConfig = React.useMemo(() => ({
    chunkDurationSeconds: 20, // 20-second chunks as suggested
    sampleRate: 44100, // High quality audio
    channels: 1 // Mono audio
  }), []);
  
  // Create ref for the speaker transition handler using refs to avoid circular dependencies
  const handleSpeakerTransition = useCallback((detectedPhrase: string, fullSentence: string) => {
    console.log(`🎙️🎙️🎙️ SPEAKER TRANSITION DETECTED IN AUDIORECORDER 🎙️🎙️🎙️`);
    console.log(`📋 Detected phrase: "${detectedPhrase}"`);
    console.log(`📝 Full sentence: "${fullSentence}"`);
    console.log(`🎤 Currently recording: ${recorder.state.isRecording}`);
    console.log(`📊 Student name: ${studentName}`);
    console.log(`🔄 onRecordingComplete available: ${!!onRecordingComplete}`);
    
    // Update UI to show transition detected
    setSpeakerTransition({
      detected: true,
      phrase: detectedPhrase,
      sentence: fullSentence
    });
    
    // Update speaker segments from transcription service
    if (transcriptionActionsRef.current?.getSpeakerSegments) {
      const segments = transcriptionActionsRef.current.getSpeakerSegments();
      setSpeakerSegments(segments);
      
      // Update current speaker to the latest one
      if (segments.length > 0) {
        const latestSegment = segments[segments.length - 1];
        setCurrentSpeaker(latestSegment.speaker);
      }
    }
    
    // Clear the indicator after 5 seconds
    setTimeout(() => {
      setSpeakerTransition(null);
    }, 5000);
    
    // DON'T stop recording - just notify parent to advance to next speaker
    if (recorder.state.isRecording) {
      console.log('🎙️ SPEAKER TRANSITION DETECTED - NOTIFYING PARENT COMPONENT');
      
      // Call the parent callback to advance to next speaker
      if (onSpeakerTransition) {
        console.log('🚀 Calling onSpeakerTransition to advance to next speaker');
        onSpeakerTransition();
      } else {
        console.warn('⚠️ No onSpeakerTransition callback provided');
      }
      
      console.log('📝 Transition detected, continuing single recording session');
      console.log('🔄 Audio and timer will continue uninterrupted');
      
    } else {
      console.log('⚠️ Speaker transition detected but not currently recording');
    }
  }, [recorder.state.isRecording, recorder.actions, recorder.state.recordedBlob, recorder.state.duration, onRecordingComplete, studentName]);
  
  // Create transcription callbacks
  const transcriptionCallbacks = React.useMemo(() => ({
    onSpeakerTransition: handleSpeakerTransition
  }), [handleSpeakerTransition]);
  
  // Create transcription instance with callbacks
  const transcription = useChunkedTranscription(transcriptionConfig, transcriptionCallbacks);

  // Store actions in a ref to avoid dependency issues
  const transcriptionActionsRef = useRef(transcription?.actions);
  useEffect(() => {
    if (transcription?.actions) {
      transcriptionActionsRef.current = transcription.actions;
    }
  }, [transcription?.actions]);

  // Connect to transcription service when component mounts (if enabled)
  useEffect(() => {
    let mounted = true;
    
    const connectTranscription = async () => {
      if (enableLiveTranscription && mounted) {
        try {
          await transcriptionActionsRef.current.connect();
        } catch (error) {
          console.error('Failed to connect to GPT-4o mini transcription:', error);
        }
      }
    };
    
    connectTranscription();
    
    return () => {
      mounted = false;
      // Use the ref to avoid stale closures
      transcriptionActionsRef.current.disconnect();
    };
  }, [enableLiveTranscription]); // Only depend on enableLiveTranscription

  // Start live transcription when recording starts
  const handleRecordingStart = async () => {
    // Reset speaker state for new recording
    setSpeakerSegments([]);
    setCurrentSpeaker('1st Proposition');
    
    await recorder.actions.start();
    
    if (enableLiveTranscription && transcription?.state.isConnected) {
      try {
        await transcription.actions.startTranscription();
        
        // Update speaker segments periodically during recording
        const updateInterval = setInterval(() => {
          if (transcriptionActionsRef.current?.getSpeakerSegments) {
            const segments = transcriptionActionsRef.current.getSpeakerSegments();
            setSpeakerSegments(segments);
            
            if (segments.length > 0) {
              const latestSegment = segments[segments.length - 1];
              if (!latestSegment.endTime) {
                setCurrentSpeaker(latestSegment.speaker);
              }
            }
          }
        }, 2000); // Update every 2 seconds
        
        // Clear interval when recording stops
        const originalStop = transcription.actions.stopTranscription;
        transcription.actions.stopTranscription = () => {
          clearInterval(updateInterval);
          originalStop();
        };
        
      } catch (error) {
        console.warn('Failed to start live transcription:', error);
      }
    }
  };

  // Stop live transcription when recording stops
  const handleRecordingStop = async () => {
    console.log('🛑 User pressed STOP - stopping everything');
    
    // Stop transcription FIRST to prevent new chunks from being processed
    if (enableLiveTranscription && transcription?.actions) {
      console.log('🛑 Stopping transcription service');
      transcription.actions.stopTranscription();
    }
    
    // Then stop the recorder
    console.log('🛑 Stopping audio recorder');
    await recorder.actions.stop();
    
    console.log('✅ Both recording and transcription stopped');
  };

  const handleSaveRecording = async () => {
    // Use complete audio from chunked transcription if available, otherwise fall back to recorder
    const completeAudio = transcription?.actions?.getCompleteAudio();
    const audioToSave = completeAudio || recorder.state.recordedBlob;
    
    if (!audioToSave) return;

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('audio', audioToSave, `recording-${Date.now()}.webm`);
      formData.append('studentId', studentId || '');
      formData.append('sessionId', sessionId || '');
      formData.append('speechTopic', speechTopic);
      formData.append('motion', motion);
      formData.append('speechType', speechType);
      formData.append('programType', programType);
      formData.append('duration', transcription?.state?.totalDuration?.toString() || recorder.state.duration.toString());
      formData.append('autoGenerateFeedback', autoGenerateFeedback.toString());
      formData.append('feedbackType', feedbackType);
      formData.append('transcriptionProvider', 'gpt-4o-mini-transcribe');
      formData.append('previewTranscription', transcription?.state?.fullTranscript || 'Chunked transcription was enabled');

      const result = await uploader.upload(formData);
      
      // Call completion callback
      if (onRecordingComplete) {
        onRecordingComplete({
          recording: result,
          duration: recorder.state.duration,
          speechTopic,
          motion,
          transcription: transcription?.state?.fullTranscript
        });
      }

    } catch (error) {
      console.error('Error saving recording:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    switch (recorder.state.status) {
      case 'recording': return 'bg-red-100 text-red-800 border-red-300';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'stopped': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const displayError = recorder.state.error || uploader.state.error || transcription?.state?.error;
  const isQuotaError = transcription?.state?.quotaExceeded || transcription?.state?.error?.includes('quota exceeded');


  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Recording Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="w-5 h-5" />
              Audio Recording
              {studentName && (
                <Badge variant="default" className="bg-blue-600">
                  🎙️ {studentName}
                </Badge>
              )}
              {speechTopic && (
                <Badge variant="outline">{speechTopic}</Badge>
              )}
            </div>
            <Badge className={getStatusColor()}>
              {recorder.state.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {displayError && (
            <div className={`p-3 border rounded-lg text-sm ${
              isQuotaError 
                ? 'bg-yellow-50 border-yellow-200 text-yellow-700' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {isQuotaError ? (
                <>
                  <strong>Transcription temporarily disabled:</strong> OpenAI quota exceeded. 
                  Recording will continue normally, but live transcription is unavailable.
                </>
              ) : (
                displayError
              )}
            </div>
          )}

          {/* Motion Display */}
          {motion && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-medium text-blue-800 mb-1">Motion:</div>
              <div className="text-sm text-blue-700">{motion}</div>
            </div>
          )}

          {/* Transcription Provider */}
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              <span className="text-sm font-medium">Transcription:</span>
            </div>
            <div className="flex gap-2">
              {enableLiveTranscription ? (
                <Badge 
                  variant="outline" 
                  className={`${
                    isQuotaError 
                      ? 'bg-orange-50 text-orange-700 border-orange-300'
                      : transcription?.state?.isConnected 
                        ? 'bg-green-50 text-green-700 border-green-300' 
                        : 'bg-yellow-50 text-yellow-700 border-yellow-300'
                  }`}
                >
                  {isQuotaError ? (
                    <>
                      <WifiOff className="w-3 h-3 mr-1" />
                      Quota Exceeded
                    </>
                  ) : (
                    <>
                      <Wifi className="w-3 h-3 mr-1" />
                      GPT-4o Mini {transcription?.state?.isConnected ? 'Ready' : 'Connecting...'}
                    </>
                  )}
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                  Live Transcription Disabled
                </Badge>
              )}
            </div>
          </div>

          {/* Recording Display */}
          <div className="text-center space-y-4">
            {/* Timer and Audio Level */}
            <div className="flex items-center justify-center gap-6">
              <div className="text-3xl font-mono font-bold">
                {formatTime(recorder.state.duration)}
              </div>
              
              {recorder.state.isRecording && (
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-muted-foreground" />
                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 transition-all duration-100"
                      style={{ width: `${recorder.state.audioLevel}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">{recorder.state.audioLevel}%</span>
                </div>
              )}
            </div>

            {/* Recording Indicator */}
            {recorder.state.isRecording && (
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-red-600">
                  {recorder.state.isPaused ? 'Recording Paused' : 'Recording...'}
                </span>
                {enableLiveTranscription && transcription?.state?.isRecording && (
                  <span className="text-xs text-blue-600 ml-2">+ Chunk {transcription?.state?.currentChunk}</span>
                )}
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="flex flex-wrap justify-center gap-3 px-4">
            {recorder.state.status === 'idle' && (
              <Button
                onClick={handleRecordingStart}
                size="lg"
                className="bg-red-600 hover:bg-red-700 min-w-[140px] px-6 py-3"
              >
                <Mic className="w-4 h-4 mr-2" />
                Start Recording
              </Button>
            )}

            {recorder.state.isRecording && !recorder.state.isPaused && (
              <>
                <Button
                  onClick={recorder.actions.pause}
                  variant="outline"
                  size="lg"
                  className="min-w-[100px] px-6 py-3"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
                <Button
                  onClick={handleRecordingStop}
                  variant="destructive"
                  size="lg"
                  className="min-w-[100px] px-6 py-3"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </>
            )}

            {recorder.state.isPaused && (
              <>
                <Button
                  onClick={recorder.actions.resume}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 min-w-[120px] px-6 py-3"
                >
                  <Mic className="w-4 h-4 mr-2" />
                  Resume
                </Button>
                <Button
                  onClick={handleRecordingStop}
                  variant="destructive"
                  size="lg"
                  className="min-w-[100px] px-6 py-3"
                >
                  <Square className="w-4 h-4 mr-2" />
                  Stop
                </Button>
              </>
            )}

            {(recorder.state.status === 'stopped' || !transcription?.state?.isRecording) && (
              <>
                <Button
                  onClick={recorder.actions.play}
                  variant="outline"
                  disabled={recorder.state.isPlaying}
                  className="min-w-[100px] px-6 py-3"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {recorder.state.isPlaying ? 'Playing...' : 'Play'}
                </Button>
                <Button
                  onClick={recorder.actions.pausePlayback}
                  variant="outline"
                  disabled={!recorder.state.isPlaying}
                  className="min-w-[100px] px-6 py-3"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
                <Button
                  onClick={() => {
                    recorder.actions.reset();
                    transcription?.actions?.clearTranscripts();
                  }}
                  variant="outline"
                  className="min-w-[100px] px-6 py-3"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                <Button
                  onClick={handleSaveRecording}
                  disabled={uploader.state.isProcessing || (!transcription?.actions?.getCompleteAudio() && !recorder.state.recordedBlob)}
                  className="bg-green-600 hover:bg-green-700 min-w-[180px] px-6 py-3"
                >
                  {uploader.state.isProcessing ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      {uploader.state.processingStatus || 'Processing...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Save Complete Recording
                    </>
                  )}
                </Button>
              </>
            )}

            {uploader.state.result && (
              <div className="text-center text-green-600">
                <CheckCircle className="w-6 h-6 mx-auto mb-2" />
                <p className="font-medium">Recording saved successfully!</p>
              </div>
            )}
          </div>

          {/* Processing Status */}
          {uploader.state.isProcessing && uploader.state.processingStatus && (
            <div className="text-center">
              <Progress value={33} className="mb-2" />
              <p className="text-sm text-muted-foreground">{uploader.state.processingStatus}</p>
            </div>
          )}

          {/* Hidden audio element for playback */}
          <audio
            ref={recorder.refs.audioRef}
            onEnded={() => {/* Handled by hook */}}
            onPause={() => {/* Handled by hook */}}
            onPlay={() => {/* Handled by hook */}}
          />
        </CardContent>
      </Card>

      {/* Live Transcription Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Chunked Transcription
            <Badge 
              variant="outline" 
              className={`${
                enableLiveTranscription && transcription?.state?.isConnected
                  ? 'bg-green-50 text-green-700 border-green-300'
                  : 'bg-gray-50 text-gray-700 border-gray-300'
              }`}
            >
              {enableLiveTranscription ? (
                transcription?.state?.isConnected ? 'Active' : 'Connecting...'
              ) : (
                'Disabled'
              )}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="min-h-[300px] max-h-[400px] overflow-y-auto p-4 bg-gray-50 rounded-lg border">
            {enableLiveTranscription ? (
              <div className="space-y-4">
                {/* Speaker Transition Indicator */}
                {speakerTransition && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <ArrowRight className="w-4 h-4" />
                      <div className="text-sm font-medium">Speaker Transition Detected</div>
                    </div>
                    <div className="text-xs text-yellow-700 mt-1">
                      Keywords: "{speakerTransition.phrase}"
                    </div>
                    <div className="text-xs text-yellow-600 mt-1 italic">
                      "{speakerTransition.sentence}"
                    </div>
                  </div>
                )}
                
                {/* Latest chunk transcript (partial) - Show current activity */}
                {transcription?.state?.partialTranscript && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="text-xs text-blue-700 mb-1 font-medium flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      Processing Chunk {transcription?.state?.currentChunk}:
                    </div>
                    <div className="text-sm text-blue-800">
                      {transcription?.state?.partialTranscript}
                    </div>
                  </div>
                )}
                
                {/* Complete Transcript Display */}
                {speakerSegments.length > 0 || transcription?.state?.fullTranscript ? (
                  <div className="space-y-3">
                    {/* Speaker Segments - Show ALL segments */}
                    {speakerSegments.length > 0 && (
                      <>
                        <div className="text-xs text-muted-foreground mb-2 font-medium">
                          Debate Transcript ({speakerSegments.length} speaker{speakerSegments.length > 1 ? 's' : ''} detected):
                        </div>
                        {speakerSegments.map((segment, index) => (
                          <div key={index} className="p-3 bg-white border rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className={
                                segment.speaker.includes('Proposition') 
                                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                                  : 'bg-red-50 text-red-700 border-red-300'
                              }>
                                {segment.speaker}
                              </Badge>
                              {!segment.endTime && (
                                <Badge variant="default" className="bg-green-600">
                                  Currently Speaking
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm whitespace-pre-wrap">
                              {segment.transcript || 'Waiting for speech...'}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                    
                    {/* Full Transcript as fallback if no segments */}
                    {speakerSegments.length === 0 && transcription?.state?.fullTranscript && (
                      <div className="p-3 bg-white border rounded-lg">
                        <div className="text-xs text-muted-foreground mb-1 font-medium">
                          Complete Transcript ({transcription?.state?.currentChunk} chunks):
                        </div>
                        <div className="text-sm whitespace-pre-wrap">
                          {transcription?.state?.fullTranscript}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-16">
                    <FileText className="w-8 h-8 mx-auto mb-2" />
                    <p className="font-medium">Ready for debate transcription</p>
                    <p className="text-sm mt-2">
                      {transcription?.state?.isConnected 
                        ? 'Start recording to see speaker-segmented transcription'
                        : 'Preparing transcription service...'
                      }
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-16">
                <FileText className="w-8 h-8 mx-auto mb-2" />
                <p className="font-medium">Live transcription disabled</p>
                <p className="text-sm mt-2">Enable live transcription to see real-time speech-to-text</p>
              </div>
            )}
          </div>

          {/* Connection status */}
          <div className="text-center">
            {enableLiveTranscription ? (
              <Badge 
                variant="outline" 
                className={`${
                  transcription?.state?.isConnected
                    ? 'bg-green-50 text-green-700 border-green-300'
                    : 'bg-red-50 text-red-700 border-red-300'
                }`}
              >
                {transcription?.state?.isConnected ? (
                  <>✓ Ready for 20-second chunk transcription</>
                ) : (
                  <>⚠ Preparing chunked transcription...</>
                )}
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                Live transcription disabled
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}