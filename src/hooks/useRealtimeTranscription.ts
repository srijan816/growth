/**
 * Custom hook for OpenAI realtime transcription
 * Integrates with audio recording for live transcription
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { OpenAIRealtimeTranscription, TranscriptionConfig } from '@/lib/openai-realtime-transcription';

export interface TranscriptionState {
  isConnected: boolean;
  isStreaming: boolean;
  partialTranscript: string;
  finalTranscript: string;
  error: string | null;
}

export interface UseRealtimeTranscriptionReturn {
  state: TranscriptionState;
  actions: {
    connect: () => Promise<void>;
    disconnect: () => void;
    startTranscription: (stream?: MediaStream) => Promise<void>;
    stopTranscription: () => void;
    clearTranscripts: () => void;
  };
}

export function useRealtimeTranscription(
  apiKey?: string,
  config?: Partial<TranscriptionConfig>
): UseRealtimeTranscriptionReturn {
  const [state, setState] = useState<TranscriptionState>({
    isConnected: false,
    isStreaming: false,
    partialTranscript: '',
    finalTranscript: '',
    error: null
  });

  const serviceRef = useRef<OpenAIRealtimeTranscription | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const configRef = useRef(config);

  // Update config ref when config changes
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Get API key from environment if not provided
  const openaiApiKey = apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  const connect = useCallback(async () => {
    if (!openaiApiKey) {
      setState(prev => ({ 
        ...prev, 
        error: 'OpenAI API key is required. Set NEXT_PUBLIC_OPENAI_API_KEY in your environment.' 
      }));
      return;
    }

    try {
      const service = new OpenAIRealtimeTranscription(
        { apiKey: openaiApiKey, ...configRef.current },
        {
          onPartialTranscript: (text) => {
            setState(prev => ({ ...prev, partialTranscript: text }));
          },
          onFinalTranscript: (text) => {
            setState(prev => ({
              ...prev,
              finalTranscript: prev.finalTranscript + (prev.finalTranscript ? ' ' : '') + text,
              partialTranscript: '' // Clear partial when final is received
            }));
          },
          onError: (error) => {
            setState(prev => ({ 
              ...prev, 
              error: error.message,
              isStreaming: false 
            }));
          },
          onConnectionOpen: () => {
            setState(prev => ({ 
              ...prev, 
              isConnected: true,
              error: null 
            }));
          },
          onConnectionClose: () => {
            setState(prev => ({ 
              ...prev, 
              isConnected: false,
              isStreaming: false 
            }));
          }
        }
      );

      serviceRef.current = service;
      await service.connect();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to transcription service';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isConnected: false 
      }));
    }
  }, [openaiApiKey]);

  const disconnect = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.disconnect();
      serviceRef.current = null;
    }
    setState(prev => ({
      ...prev,
      isConnected: false,
      isStreaming: false
    }));
  }, []);

  const startTranscription = useCallback(async (stream?: MediaStream) => {
    if (!serviceRef.current) {
      setState(prev => ({ 
        ...prev, 
        error: 'Transcription service not connected. Call connect() first.' 
      }));
      return;
    }

    try {
      // If a stream is provided, use it. Otherwise, the service will create its own
      if (stream) {
        streamRef.current = stream;
        // For now, the service creates its own stream
        // In the future, we could modify the service to accept an existing stream
      }

      await serviceRef.current.startStreaming();
      setState(prev => ({ 
        ...prev, 
        isStreaming: true,
        error: null 
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start transcription';
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        isStreaming: false 
      }));
    }
  }, []);

  const stopTranscription = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.stopStreaming();
    }
    setState(prev => ({ 
      ...prev, 
      isStreaming: false 
    }));
  }, []);

  const clearTranscripts = useCallback(() => {
    setState(prev => ({
      ...prev,
      partialTranscript: '',
      finalTranscript: ''
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (serviceRef.current) {
        serviceRef.current.disconnect();
      }
    };
  }, []);

  return {
    state,
    actions: {
      connect,
      disconnect,
      startTranscription,
      stopTranscription,
      clearTranscripts
    }
  };
}