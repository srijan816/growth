/**
 * React hook for chunked audio transcription
 * Provides a simple interface for recording in chunks and getting progressive transcription
 * Based on the proven Python tkinter approach
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ChunkedAudioTranscription, ChunkedTranscriptionConfig } from '@/lib/chunked-audio-transcription';

export interface ChunkedTranscriptionHookState {
  isRecording: boolean;
  currentChunk: number;
  totalDuration: number;
  partialTranscript: string; // Latest chunk transcript
  fullTranscript: string; // All chunks combined
  error: string | null;
  isConnected: boolean; // For compatibility with existing interface
  quotaExceeded: boolean;
}

export interface UseChunkedTranscriptionCallbacks {
  onSpeakerTransition?: (detectedPhrase: string, fullSentence: string) => void;
}

export interface UseChunkedTranscriptionReturn {
  state: ChunkedTranscriptionHookState;
  actions: {
    connect: () => Promise<void>;
    disconnect: () => void;
    startTranscription: () => Promise<void>;
    stopTranscription: () => void;
    clearTranscripts: () => void;
    getCompleteAudio: () => Blob | null;
    getSpeakerSegments: () => Array<{speaker: string; transcript: string; startTime: number; endTime?: number}>;
  };
}

export function useChunkedTranscription(
  config?: ChunkedTranscriptionConfig,
  callbacks?: UseChunkedTranscriptionCallbacks
): UseChunkedTranscriptionReturn {
  // Memoize config to prevent infinite re-renders
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);
  const [state, setState] = useState<ChunkedTranscriptionHookState>({
    isRecording: false,
    currentChunk: 0,
    totalDuration: 0,
    partialTranscript: '',
    fullTranscript: '',
    error: null,
    isConnected: false,
    quotaExceeded: false
  });

  const serviceRef = useRef<ChunkedAudioTranscription | null>(null);
  const transcriptChunks = useRef<string[]>([]);
  const durationInterval = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Initialize service
  const connect = useCallback(async () => {
    try {
      const service = new ChunkedAudioTranscription(
        configRef.current,
        {
          onChunkTranscribed: (text, chunkNumber) => {
            console.log(`Chunk ${chunkNumber} transcribed:`, text);
            
            // Store this chunk's transcript
            transcriptChunks.current[chunkNumber - 1] = text;
            
            // Update state with latest chunk and full transcript
            setState(prev => ({
              ...prev,
              partialTranscript: text,
              fullTranscript: transcriptChunks.current.filter(Boolean).join(' '),
              error: null
            }));
          },
          onChunkRecorded: (chunkNumber, totalChunks) => {
            setState(prev => ({
              ...prev,
              currentChunk: chunkNumber
            }));
          },
          onError: (error) => {
            console.error('Chunked transcription error:', error);
            const isQuotaError = error.message.includes('quota') || error.message.includes('429');
            setState(prev => ({
              ...prev,
              error: error.message,
              quotaExceeded: isQuotaError
            }));
          },
          onRecordingStart: () => {
            startTimeRef.current = Date.now();
            setState(prev => ({
              ...prev,
              isRecording: true,
              error: null
            }));
            
            // Start duration timer
            durationInterval.current = setInterval(() => {
              const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
              setState(prev => ({
                ...prev,
                totalDuration: elapsed
              }));
            }, 1000);
          },
          onRecordingStop: () => {
            setState(prev => ({
              ...prev,
              isRecording: false
            }));
            
            // Clear duration timer
            if (durationInterval.current) {
              clearInterval(durationInterval.current);
              durationInterval.current = null;
            }
          },
          onSpeakerTransition: callbacks?.onSpeakerTransition
        }
      );

      serviceRef.current = service;
      setState(prev => ({
        ...prev,
        isConnected: true,
        error: null
      }));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize transcription service';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isConnected: false
      }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.stopRecording();
      serviceRef.current = null;
    }
    
    if (durationInterval.current) {
      clearInterval(durationInterval.current);
      durationInterval.current = null;
    }
    
    setState(prev => ({
      ...prev,
      isConnected: false,
      isRecording: false
    }));
  }, []);

  const startTranscription = useCallback(async () => {
    if (!serviceRef.current) {
      throw new Error('Service not connected. Call connect() first.');
    }

    try {
      transcriptChunks.current = []; // Reset chunks
      await serviceRef.current.startRecording();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start transcription';
      setState(prev => ({
        ...prev,
        error: errorMessage
      }));
      throw error;
    }
  }, []);

  const stopTranscription = useCallback(() => {
    console.log('🔴 stopTranscription called from hook');
    if (serviceRef.current) {
      console.log('🔴 Calling service stopRecording');
      serviceRef.current.stopRecording();
    } else {
      console.log('❌ No service available to stop');
    }
    
    // Immediately update state to show stopped
    setState(prev => ({
      ...prev,
      isRecording: false
    }));
  }, []);

  const clearTranscripts = useCallback(() => {
    transcriptChunks.current = [];
    setState(prev => ({
      ...prev,
      partialTranscript: '',
      fullTranscript: '',
      currentChunk: 0,
      totalDuration: 0,
      error: null,
      quotaExceeded: false
    }));
  }, []);

  const getCompleteAudio = useCallback(() => {
    return serviceRef.current?.getCompleteAudio() || null;
  }, []);

  const getSpeakerSegments = useCallback(() => {
    return serviceRef.current?.getSpeakerSegments() || [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // Memoize the actions object to prevent unnecessary re-renders
  const actions = useMemo(() => ({
    connect,
    disconnect,
    startTranscription,
    stopTranscription,
    clearTranscripts,
    getCompleteAudio,
    getSpeakerSegments
  }), [connect, disconnect, startTranscription, stopTranscription, clearTranscripts, getCompleteAudio, getSpeakerSegments]);

  return {
    state,
    actions
  };
}