/**
 * Custom hook for managing audio recording logic
 * Separates recording concerns from UI rendering
 */

import { useState, useRef, useEffect } from 'react';
import RecordRTC from 'recordrtc';

export interface AudioRecorderState {
  isRecording: boolean;
  isPaused: boolean;
  isPlaying: boolean;
  duration: number;
  recordedBlob: Blob | null;
  audioUrl: string | null;
  status: 'idle' | 'recording' | 'paused' | 'stopped' | 'processing' | 'completed';
  audioLevel: number;
  error: string | null;
}

export interface UseAudioRecorderReturn {
  state: AudioRecorderState;
  actions: {
    start: () => Promise<void>;
    pause: () => void;
    resume: () => void;
    stop: () => Promise<void>;
    play: () => void;
    pausePlayback: () => void;
    reset: () => void;
  };
  refs: {
    audioRef: React.RefObject<HTMLAudioElement>;
  };
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<AudioRecorderState>({
    isRecording: false,
    isPaused: false,
    isPlaying: false,
    duration: 0,
    recordedBlob: null,
    audioUrl: null,
    status: 'idle',
    audioLevel: 0,
    error: null
  });

  const mediaRecorderRef = useRef<RecordRTC | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    // Clear intervals and animation frames
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    
    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    // Revoke object URL
    if (state.audioUrl) {
      URL.revokeObjectURL(state.audioUrl);
    }
  };

  const setupAudioAnalyzer = async (stream: MediaStream) => {
    try {
      audioContextRef.current = new AudioContext();
      analyzerRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Optimized settings for performance
      analyzerRef.current.fftSize = 128;
      analyzerRef.current.smoothingTimeConstant = 0.8;
      source.connect(analyzerRef.current);
      
      const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
      
      // Throttled audio level updates
      const updateAudioLevel = () => {
        if (analyzerRef.current && state.isRecording) {
          analyzerRef.current.getByteFrequencyData(dataArray);
          const max = Math.max(...dataArray);
          setState(prev => ({ ...prev, audioLevel: Math.round((max / 255) * 100) }));
          
          // Update every 200ms
          setTimeout(() => {
            if (state.isRecording) {
              updateAudioLevel();
            }
          }, 200);
        }
      };
      
      updateAudioLevel();
    } catch (error) {
      console.warn('Audio analyzer setup failed:', error);
    }
  };

  const start = async () => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000 // Match OpenAI's recommended sample rate
        } 
      });
      
      streamRef.current = stream;
      
      // Setup audio level monitoring
      await setupAudioAnalyzer(stream);
      
      // Setup recorder
      mediaRecorderRef.current = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/wav',
        recorderType: RecordRTC.StereoAudioRecorder,
        numberOfAudioChannels: 1,
        desiredSampRate: 24000, // Match OpenAI's sample rate
        timeSlice: 1000
      });

      mediaRecorderRef.current.startRecording();
      
      setState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        status: 'recording',
        duration: 0
      }));

      // Start duration timer
      intervalRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          duration: prev.duration + 1
        }));
      }, 1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      setState(prev => ({
        ...prev,
        error: 'Failed to start recording. Please check microphone permissions.'
      }));
    }
  };

  const pause = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.pauseRecording();
      setState(prev => ({
        ...prev,
        isPaused: true
      }));
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };

  const resume = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.resumeRecording();
      setState(prev => ({
        ...prev,
        isPaused: false
      }));
      
      // Resume timer
      intervalRef.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          duration: prev.duration + 1
        }));
      }, 1000);
    }
  };

  const stop = async () => {
    console.log('🔴 useAudioRecorder: stop() called');
    
    return new Promise<void>((resolve) => {
      // Clear timer immediately
      if (intervalRef.current) {
        console.log('🔴 useAudioRecorder: clearing interval timer');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Stop animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      
      // Stop all tracks FIRST
      if (streamRef.current) {
        console.log('🔴 useAudioRecorder: stopping media stream tracks');
        streamRef.current.getTracks().forEach((track, index) => {
          console.log(`🔴 Stopping track ${index}: ${track.kind}, state: ${track.readyState}`);
          track.stop();
        });
        streamRef.current = null;
      }
      
      // Close audio context
      if (audioContextRef.current) {
        console.log('🔴 useAudioRecorder: closing audio context');
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
      
      // Update state immediately to show stopped
      setState(prev => ({
        ...prev,
        isRecording: false,
        isPaused: false,
        status: 'stopped',
        audioLevel: 0
      }));
      
      if (mediaRecorderRef.current) {
        console.log('🔴 useAudioRecorder: stopping RecordRTC');
        mediaRecorderRef.current.stopRecording(() => {
          console.log('🔴 useAudioRecorder: RecordRTC stopped, processing blob');
          const blob = mediaRecorderRef.current!.getBlob();
          const audioUrl = URL.createObjectURL(blob);
          
          setState(prev => ({
            ...prev,
            recordedBlob: blob,
            audioUrl
          }));

          console.log('✅ useAudioRecorder: stop complete');
          resolve();
        });
      } else {
        console.log('✅ useAudioRecorder: no mediaRecorder to stop');
        resolve();
      }
    });
  };

  const play = () => {
    if (state.audioUrl && audioRef.current) {
      audioRef.current.src = state.audioUrl;
      audioRef.current.play();
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  };

  const pausePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  };

  const reset = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    
    cleanup();
    
    setState({
      isRecording: false,
      isPaused: false,
      isPlaying: false,
      duration: 0,
      recordedBlob: null,
      audioUrl: null,
      status: 'idle',
      audioLevel: 0,
      error: null
    });
  };

  return {
    state,
    actions: {
      start,
      pause,
      resume,
      stop,
      play,
      pausePlayback,
      reset
    },
    refs: {
      audioRef
    }
  };
}