/**
 * Simple transcription hook using OpenAI Whisper API
 * This provides post-recording transcription instead of real-time
 * More reliable than WebSocket-based real-time transcription
 */

import { useState, useCallback } from 'react';

export interface SimpleTranscriptionState {
  isProcessing: boolean;
  result: string;
  error: string | null;
  confidence: number;
}

export interface UseSimpleTranscriptionReturn {
  state: SimpleTranscriptionState;
  transcribeBlob: (audioBlob: Blob) => Promise<string>;
  reset: () => void;
}

export function useSimpleTranscription(
  apiKey?: string
): UseSimpleTranscriptionReturn {
  const [state, setState] = useState<SimpleTranscriptionState>({
    isProcessing: false,
    result: '',
    error: null,
    confidence: 0
  });

  const openaiApiKey = apiKey || process.env.NEXT_PUBLIC_OPENAI_API_KEY;

  const transcribeBlob = useCallback(async (audioBlob: Blob): Promise<string> => {
    if (!openaiApiKey) {
      setState(prev => ({ 
        ...prev, 
        error: 'OpenAI API key is required' 
      }));
      return '';
    }

    setState(prev => ({ 
      ...prev, 
      isProcessing: true, 
      error: null, 
      result: '' 
    }));

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.wav');
      formData.append('model', 'gpt-4o-mini-transcribe');
      formData.append('response_format', 'verbose_json');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const result = await response.json();
      const transcriptionText = result.text || '';
      const confidence = result.segments?.length > 0 
        ? result.segments.reduce((acc: number, seg: any) => acc + (seg.confidence || 0), 0) / result.segments.length
        : 0.95;

      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        result: transcriptionText,
        confidence: confidence
      }));

      return transcriptionText;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Transcription failed';
      setState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: errorMessage 
      }));
      return '';
    }
  }, [openaiApiKey]);

  const reset = useCallback(() => {
    setState({
      isProcessing: false,
      result: '',
      error: null,
      confidence: 0
    });
  }, []);

  return {
    state,
    transcribeBlob,
    reset
  };
}