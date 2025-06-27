/**
 * OpenAI GPT-4o mini Realtime Transcription Service
 * Updated to use hybrid approach: Real-time audio capture with periodic server transcription
 * This resolves WebSocket authentication issues while maintaining near real-time experience
 */

export interface TranscriptionConfig {
  apiKey: string;
  language?: string;
  inputAudioFormat?: 'pcm16' | 'g711_ulaw' | 'g711_alaw';
  turnDetection?: {
    type: 'server_vad';
    threshold?: number;
    prefixPaddingMs?: number;
    silenceDurationMs?: number;
  };
  noiseReduction?: {
    type: 'near_field' | 'far_field';
  };
}

export interface TranscriptionCallbacks {
  onPartialTranscript?: (text: string, itemId: string) => void;
  onFinalTranscript?: (text: string, itemId: string) => void;
  onError?: (error: Error) => void;
  onConnectionOpen?: () => void;
  onConnectionClose?: () => void;
}

export class OpenAIRealtimeTranscription {
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private config: TranscriptionConfig;
  private callbacks: TranscriptionCallbacks;
  private isConnected: boolean = false;
  private isStreaming: boolean = false;
  private audioChunks: ArrayBuffer[] = [];
  private transcriptionInterval: NodeJS.Timeout | null = null;
  private currentTranscript: string = '';
  private quotaExceeded: boolean = false;

  constructor(config: TranscriptionConfig, callbacks: TranscriptionCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * Connect to transcription service (simulated connection for hybrid approach)
   */
  public async connect(): Promise<void> {
    try {
      // Simulate connection success
      this.isConnected = true;
      this.callbacks.onConnectionOpen?.();
      console.log('OpenAI Realtime Transcription connected (hybrid mode)');
    } catch (error) {
      console.error('Failed to connect to transcription service:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Start streaming audio from the user's microphone with periodic transcription
   */
  public async startStreaming(): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Service not connected. Call connect() first.');
    }

    try {
      // Get user media
      this.stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 24000
        } 
      });

      // Create audio context
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000
      });
      
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(2048, 1, 1);

      // Collect audio chunks for periodic transcription
      this.processor.onaudioprocess = (e) => {
        if (!this.isStreaming) return;

        const float32Audio = e.inputBuffer.getChannelData(0);
        const pcm16Audio = this.float32ToPCM16(float32Audio);
        this.audioChunks.push(pcm16Audio);
      };

      // Connect audio nodes
      this.source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.isStreaming = true;

      // Start periodic transcription (every 3 seconds for near real-time)
      this.transcriptionInterval = setInterval(() => {
        this.processAudioChunks();
      }, 3000);

    } catch (error) {
      console.error('Failed to start audio streaming:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Process accumulated audio chunks and send for transcription
   */
  private async processAudioChunks(): Promise<void> {
    if (this.audioChunks.length === 0 || this.quotaExceeded) return;

    try {
      // Combine all audio chunks
      const totalLength = this.audioChunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
      const combinedAudio = new ArrayBuffer(totalLength);
      const view = new Uint8Array(combinedAudio);
      
      let offset = 0;
      for (const chunk of this.audioChunks) {
        view.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }

      // Convert to base64 for API transmission
      const audioBase64 = btoa(String.fromCharCode(...new Uint8Array(combinedAudio)));

      // Send to server for transcription
      const response = await fetch('/api/transcription/realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio: audioBase64,
          config: {
            language: this.config.language || 'en'
          }
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          this.quotaExceeded = true;
          this.callbacks.onError?.(new Error('OpenAI quota exceeded. Transcription disabled for this session.'));
          return;
        }
        throw new Error(`Transcription API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.transcript) {
        // Only update if we have new content
        if (result.transcript !== this.currentTranscript) {
          const newText = result.transcript.replace(this.currentTranscript, '').trim();
          if (newText) {
            this.callbacks.onPartialTranscript?.(newText, Date.now().toString());
            
            // After a short delay, move to final transcript
            setTimeout(() => {
              this.callbacks.onFinalTranscript?.(newText, Date.now().toString());
            }, 1000);
          }
          this.currentTranscript = result.transcript;
        }
      }

      // Clear processed chunks
      this.audioChunks = [];

    } catch (error) {
      console.error('Failed to process audio chunks:', error);
      this.callbacks.onError?.(error as Error);
    }
  }

  /**
   * Stop streaming audio
   */
  public stopStreaming(): void {
    this.isStreaming = false;

    // Clear transcription interval FIRST to prevent new API calls
    if (this.transcriptionInterval) {
      clearInterval(this.transcriptionInterval);
      this.transcriptionInterval = null;
    }

    // Process any remaining audio chunks (only if quota not exceeded)
    if (this.audioChunks.length > 0 && !this.quotaExceeded) {
      this.processAudioChunks().catch(error => {
        console.warn('Failed to process final audio chunks:', error);
      });
    } else {
      // Clear chunks without processing if quota exceeded
      this.audioChunks = [];
    }

    // Disconnect audio nodes
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    
    // Stop media stream tracks
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  /**
   * Disconnect from the service
   */
  public disconnect(): void {
    this.stopStreaming();
    this.isConnected = false;
    this.currentTranscript = '';
    this.quotaExceeded = false; // Reset quota flag for next session
    this.callbacks.onConnectionClose?.();
  }

  /**
   * Convert Float32Array audio to PCM16 ArrayBuffer
   */
  private float32ToPCM16(float32Audio: Float32Array): ArrayBuffer {
    const buffer = new ArrayBuffer(float32Audio.length * 2);
    const view = new DataView(buffer);
    
    for (let i = 0; i < float32Audio.length; i++) {
      // Clamp to [-1, 1] range
      let sample = Math.max(-1, Math.min(1, float32Audio[i]));
      
      // Convert to 16-bit PCM
      sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      
      // Write as little-endian
      view.setInt16(i * 2, sample, true);
    }
    
    return buffer;
  }

  /**
   * Check if the service is connected
   */
  public isServiceConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Send a manual end-of-turn signal (not used in hybrid mode)
   */
  public sendEndOfTurn(): void {
    // Process any remaining audio chunks
    if (this.audioChunks.length > 0) {
      this.processAudioChunks();
    }
  }
}

// Export React hook (keeping same interface for compatibility)
export function useOpenAITranscription(
  apiKey: string,
  config?: Partial<TranscriptionConfig>
): {
  connect: () => Promise<void>;
  disconnect: () => void;
  startStreaming: () => Promise<void>;
  stopStreaming: () => void;
  isConnected: boolean;
  partialTranscript: string;
  finalTranscript: string;
  error: Error | null;
} {
  const React = require('react');
  
  const [isConnected, setIsConnected] = React.useState(false);
  const [partialTranscript, setPartialTranscript] = React.useState('');
  const [finalTranscript, setFinalTranscript] = React.useState('');
  const [error, setError] = React.useState<Error | null>(null);
  const serviceRef = React.useRef<OpenAIRealtimeTranscription | null>(null);

  const connect = React.useCallback(async () => {
    if (!apiKey) {
      setError(new Error('OpenAI API key is required'));
      return;
    }

    const service = new OpenAIRealtimeTranscription(
      { apiKey, ...config },
      {
        onPartialTranscript: (text) => setPartialTranscript(text),
        onFinalTranscript: (text) => {
          setFinalTranscript(prev => prev + (prev ? ' ' : '') + text);
          setPartialTranscript('');
        },
        onError: setError,
        onConnectionOpen: () => setIsConnected(true),
        onConnectionClose: () => setIsConnected(false)
      }
    );

    serviceRef.current = service;
    await service.connect();
  }, [apiKey, config]);

  const disconnect = React.useCallback(() => {
    serviceRef.current?.disconnect();
    serviceRef.current = null;
  }, []);

  const startStreaming = React.useCallback(async () => {
    if (!serviceRef.current) {
      throw new Error('Service not connected');
    }
    await serviceRef.current.startStreaming();
  }, []);

  const stopStreaming = React.useCallback(() => {
    serviceRef.current?.stopStreaming();
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      serviceRef.current?.disconnect();
    };
  }, []);

  return {
    connect,
    disconnect,
    startStreaming,
    stopStreaming,
    isConnected,
    partialTranscript,
    finalTranscript,
    error
  };
}