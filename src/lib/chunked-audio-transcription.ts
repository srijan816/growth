/**
 * Chunked Audio Recording and Transcription Service
 * Based on the proven Python approach: record in chunks, save to file, transcribe each chunk
 * Much more reliable than WebSocket-based real-time transcription
 */

export interface ChunkedTranscriptionConfig {
  chunkDurationSeconds?: number; // Default 20 seconds
  sampleRate?: number; // Default 44100 Hz
  channels?: number; // Default 1 (mono)
}

export interface ChunkedTranscriptionCallbacks {
  onChunkTranscribed?: (text: string, chunkNumber: number) => void;
  onChunkRecorded?: (chunkNumber: number, totalChunks: number) => void;
  onError?: (error: Error) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onRecordingComplete?: () => void; // Called after final chunk is processed
  onSpeakerTransition?: (detectedPhrase: string, fullSentence: string) => void; // Called when speaker transition is detected
}

export interface ChunkedTranscriptionState {
  isRecording: boolean;
  currentChunk: number;
  totalDuration: number;
  fullTranscript: string;
  chunks: Array<{ number: number; transcript: string; duration: number }>;
  error: string | null;
}

export class ChunkedAudioTranscription {
  private config: ChunkedTranscriptionConfig;
  private callbacks: ChunkedTranscriptionCallbacks;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private isRecording: boolean = false;
  private chunkTimer: NodeJS.Timeout | null = null;
  private currentChunkNumber: number = 0;
  private audioChunks: Blob[] = [];
  private completeAudioChunks: Blob[] = []; // Store all chunks for complete audio
  private startTime: number = 0;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private isFinalChunk: boolean = false;
  private isStopped: boolean = false;
  private activeTranscriptions: Map<number, AbortController> = new Map();
  private recentTranscripts: string[] = []; // Buffer to store recent transcripts for context
  private pendingTransition: {
    detected: boolean;
    combination: string;
    sentence: string;
    foundWords: string[];
  } | null = null;
  private speakerSegments: Array<{speaker: string; transcript: string; startTime: number; endTime?: number}> = [];
  private currentSpeaker: string = 'Speaker 1';
  private segmentStartTime: number = 0;

  constructor(config: ChunkedTranscriptionConfig = {}, callbacks: ChunkedTranscriptionCallbacks = {}) {
    this.config = {
      chunkDurationSeconds: 20,
      sampleRate: 44100,
      channels: 1,
      ...config
    };
    this.callbacks = callbacks;
  }

  /**
   * Start chunked recording and transcription
   */
  public async startRecording(): Promise<void> {
    if (this.isRecording) {
      throw new Error('Recording already in progress');
    }

    // Reset stop flag and clear any pending transcriptions
    this.isStopped = false;
    this.activeTranscriptions.clear();
    this.recentTranscripts = [];
    this.pendingTransition = null;
    this.speakerSegments = [];
    this.currentSpeaker = 'Speaker 1';
    this.segmentStartTime = Date.now();

    try {
      // Get user media with high quality settings
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channels,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Setup audio analysis for voice activity detection
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.source = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.source.connect(this.analyser);

      // Create MediaRecorder for high quality audio
      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 128000
      };

      this.mediaRecorder = new MediaRecorder(this.stream, options);
      this.currentChunkNumber = 0;
      this.audioChunks = [];
      this.completeAudioChunks = []; // Reset complete audio storage
      this.startTime = Date.now();
      this.isRecording = true;

      // Initialize first speaker segment
      this.speakerSegments.push({
        speaker: this.currentSpeaker,
        transcript: '',
        startTime: this.startTime
      });

      // Handle data available (chunk completed)
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          this.completeAudioChunks.push(event.data); // Store for complete audio
        }
      };

      // Handle chunk stop (process for transcription)
      this.mediaRecorder.onstop = () => {
        this.processCurrentChunk();
      };

      // Start first chunk
      this.startNextChunk();
      this.callbacks.onRecordingStart?.();

    } catch (error) {
      console.error('Failed to start chunked recording:', error);
      this.callbacks.onError?.(error as Error);
      throw error;
    }
  }

  /**
   * Stop recording and process final chunk
   */
  public stopRecording(): void {
    console.log('🛑 Stopping recording - cleaning up all processes');
    
    if (!this.isRecording && this.isStopped) return;

    this.isRecording = false;
    this.isStopped = true;

    // Cancel all active transcriptions immediately
    for (const [chunkNumber, controller] of this.activeTranscriptions) {
      console.log(`🚫 Cancelling transcription for chunk ${chunkNumber}`);
      controller.abort();
    }
    this.activeTranscriptions.clear();

    // Clear chunk timer immediately
    if (this.chunkTimer) {
      clearTimeout(this.chunkTimer);
      this.chunkTimer = null;
    }

    // Stop media stream FIRST to prevent new audio data
    if (this.stream) {
      console.log('🎤 Stopping media stream tracks');
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped track: ${track.kind}, state: ${track.readyState}`);
      });
      this.stream = null;
    }

    // Clean up audio analysis immediately
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    // Stop MediaRecorder and capture final chunk
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      console.log('🎤 Stopping MediaRecorder and processing final chunk');
      
      // Set flag to indicate this is the final chunk
      this.isFinalChunk = true;
      
      // Keep the handlers so we can process the final chunk
      this.mediaRecorder.stop();
      
      // The final chunk will be processed in the onstop handler
      // After that, recording will be marked as complete
    } else {
      // No active recorder, just mark as stopped
      console.log('✅ Recording completely stopped - no more chunks will be processed');
      this.callbacks.onRecordingStop?.();
    }
  }

  /**
   * Get the complete recorded audio as a single blob
   */
  public getCompleteAudio(): Blob | null {
    if (this.completeAudioChunks.length === 0) return null;
    return new Blob(this.completeAudioChunks, { type: 'audio/webm' });
  }

  /**
   * Start recording the next chunk with voice activity detection
   */
  private startNextChunk(): void {
    // Strong check - don't start if stopped or not recording
    if (!this.isRecording || !this.mediaRecorder || this.isStopped) {
      console.log(`❌ Cannot start chunk ${this.currentChunkNumber + 1} - recording:${this.isRecording}, stopped:${this.isStopped}, mediaRecorder:${!!this.mediaRecorder}`);
      return;
    }

    this.currentChunkNumber++;
    this.audioChunks = []; // Clear previous chunk data (but keep completeAudioChunks)

    console.log(`🎤 Starting chunk ${this.currentChunkNumber}`);

    // Start recording this chunk
    this.mediaRecorder.start();

    // Use adaptive timing based on voice activity detection
    this.chunkTimer = setTimeout(() => {
      // Check if still recording before proceeding
      if (this.isRecording && !this.isStopped) {
        this.checkForNaturalBreak();
      } else {
        console.log(`❌ Skipping natural break check for chunk ${this.currentChunkNumber} - recording stopped`);
      }
    }, this.config.chunkDurationSeconds! * 1000);

    this.callbacks.onChunkRecorded?.(this.currentChunkNumber, this.currentChunkNumber);
  }

  /**
   * Check for natural speech breaks to avoid cutting words
   */
  private checkForNaturalBreak(): void {
    // Strong check - don't proceed if stopped
    if (!this.isRecording || !this.mediaRecorder || !this.analyser || this.isStopped) {
      console.log(`❌ Skipping natural break check - recording:${this.isRecording}, stopped:${this.isStopped}`);
      return;
    }

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    const silenceThreshold = 30; // Adjust based on testing

    if (average < silenceThreshold) {
      // Found silence - good time to break
      if (this.mediaRecorder.state === 'recording' && !this.isStopped) {
        this.mediaRecorder.stop();
      }
    } else {
      // Still speaking - wait a bit more (max 5 extra seconds)
      const maxWaitTime = 5000; // 5 seconds
      const waitTime = Math.min(1000, maxWaitTime); // Check every 1 second
      
      setTimeout(() => {
        // Triple check before forcing stop
        if (this.isRecording && this.mediaRecorder && this.mediaRecorder.state === 'recording' && !this.isStopped) {
          // Force stop after reasonable delay to prevent infinite chunks
          this.mediaRecorder.stop();
        } else {
          console.log(`❌ Skipping forced stop - recording stopped during wait`);
        }
      }, waitTime);
    }
  }

  /**
   * Process the current chunk for transcription
   */
  private async processCurrentChunk(): Promise<void> {
    // Triple check stop state at the beginning
    if (this.audioChunks.length === 0 || this.isStopped || !this.isRecording) {
      console.log(`❌ Skipping chunk ${this.currentChunkNumber} processing - stopped:${this.isStopped}, recording:${this.isRecording}, chunks:${this.audioChunks.length}`);
      return;
    }

    try {
      // Combine all chunk data into a single blob
      const chunkBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      
      // Convert to WAV format if possible (for better compatibility)
      const wavBlob = await this.convertToWav(chunkBlob);
      
      // Check again if stopped before sending for transcription
      if (this.isStopped || !this.isRecording) {
        console.log(`❌ Skipping transcription for chunk ${this.currentChunkNumber} - recording stopped`);
        return;
      }
      
      // Send for transcription
      const transcript = await this.transcribeChunk(wavBlob, this.currentChunkNumber);
      
      // Check once more if stopped after transcription
      if (this.isStopped || !this.isRecording) {
        console.log(`❌ Discarding transcript for chunk ${this.currentChunkNumber} - recording stopped during transcription`);
        return;
      }
      
      if (transcript.trim()) {
        // Add to recent transcripts buffer
        this.recentTranscripts.push(transcript);
        if (this.recentTranscripts.length > 5) {
          this.recentTranscripts.shift(); // Keep only last 5 transcripts
        }
        
        // Check for speaker transition
        this.checkForSpeakerTransition(transcript);
        
        this.callbacks.onChunkTranscribed?.(transcript, this.currentChunkNumber);
      }

      // Start next chunk ONLY if still recording and not stopped
      if (this.isRecording && !this.isFinalChunk && !this.isStopped) {
        this.startNextChunk();
      } else if (this.isFinalChunk) {
        // Reset the flag for future recordings
        this.isFinalChunk = false;
        // Notify that recording is complete
        this.callbacks.onRecordingComplete?.();
      }

    } catch (error) {
      console.error(`Failed to process chunk ${this.currentChunkNumber}:`, error);
      this.callbacks.onError?.(error as Error);
      
      // Continue with next chunk ONLY if still recording and not stopped
      if (this.isRecording && !this.isFinalChunk && !this.isStopped) {
        this.startNextChunk();
      } else if (this.isFinalChunk) {
        // Reset the flag for future recordings
        this.isFinalChunk = false;
        // Notify that recording is complete even if transcription failed
        this.callbacks.onRecordingComplete?.();
      }
    }
  }

  /**
   * Convert audio blob to WAV format for better API compatibility
   */
  private async convertToWav(audioBlob: Blob): Promise<Blob> {
    // For now, return the original blob
    // In a production app, you might want to implement actual WAV conversion
    // using an audio processing library like lamejs or similar
    return audioBlob;
  }

  /**
   * Send audio chunk to transcription API
   */
  private async transcribeChunk(audioBlob: Blob, chunkNumber: number): Promise<string> {
    // Check if stopped before starting transcription
    if (this.isStopped) {
      throw new Error('Recording stopped - cancelling transcription');
    }

    const formData = new FormData();
    formData.append('audio', audioBlob, `chunk-${chunkNumber}.webm`);
    formData.append('chunkNumber', chunkNumber.toString());

    // Create an AbortController for this transcription
    const abortController = new AbortController();
    this.activeTranscriptions.set(chunkNumber, abortController);

    try {
      const response = await fetch('/api/transcription/chunk', {
        method: 'POST',
        body: formData,
        signal: abortController.signal
      });

      // Remove from active transcriptions when complete
      this.activeTranscriptions.delete(chunkNumber);

      if (!response.ok) {
      if (response.status === 429) {
        // Quota exceeded - return empty string to continue gracefully
        console.warn(`Transcription quota exceeded for chunk ${chunkNumber}`);
        return '';
      }
      throw new Error(`Transcription failed for chunk ${chunkNumber}: ${response.status}`);
    }

    const result = await response.json();
    return result.transcript || '';
    } catch (error) {
      // Remove from active transcriptions on error
      this.activeTranscriptions.delete(chunkNumber);
      
      // Check if the error is due to abort
      if (error instanceof Error && error.name === 'AbortError') {
        console.log(`Transcription aborted for chunk ${chunkNumber}`);
        return '';
      }
      
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Check for speaker transition keywords in the transcript
   */
  private checkForSpeakerTransition(transcript: string): void {
    console.log(`🔍 Checking transition in: "${transcript}"`);
    
    // Specific required words that must ALL appear within a couple of sentences
    const requiredWords = ['thank', 'speaker', 'speech', 'invite'];
    const inviteVariations = ['invite', 'inviting']; // Accept both forms
    
    // Get full context from recent transcripts + current (last 3 chunks for "couple of sentences")
    const fullContext = (this.recentTranscripts.slice(-3).join(' ') + ' ' + transcript).toLowerCase();
    console.log(`📝 Full context for analysis: "${fullContext}"`);
    
    // Check if all required words are present
    const foundWords = [];
    let hasInviteVariation = false;
    
    // Check for the first three required words
    for (const word of ['thank', 'speaker', 'speech']) {
      if (fullContext.includes(word)) {
        foundWords.push(word);
      }
    }
    
    // Check for invite/inviting variations
    for (const variation of inviteVariations) {
      if (fullContext.includes(variation)) {
        foundWords.push('invite/inviting');
        hasInviteVariation = true;
        break;
      }
    }
    
    console.log(`📋 Found words so far: [${foundWords.join(', ')}] (need 4 total)`);
    
    // Check if we have all 4 required elements
    if (foundWords.length === 4 && hasInviteVariation) {
      console.log(`✅ Found ALL required transition words: thank, speaker, speech, invite/inviting`);
      
      // Find the sentences containing all the transition words
      const allText = this.recentTranscripts.join(' ') + ' ' + transcript;
      const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      // Find the sentence that contains the most transition words (likely the main transition sentence)
      let bestSentence = transcript;
      let maxWordsInSentence = 0;
      
      for (const sentence of sentences.slice(-3)) { // Check last 3 sentences
        const lowerSentence = sentence.toLowerCase();
        let wordsInThisSentence = 0;
        
        if (lowerSentence.includes('thank')) wordsInThisSentence++;
        if (lowerSentence.includes('speaker')) wordsInThisSentence++;
        if (lowerSentence.includes('speech')) wordsInThisSentence++;
        if (lowerSentence.includes('invite') || lowerSentence.includes('inviting')) wordsInThisSentence++;
        
        if (wordsInThisSentence > maxWordsInSentence) {
          maxWordsInSentence = wordsInThisSentence;
          bestSentence = sentence.trim();
        }
      }
      
      console.log(`🎙️ Speaker transition confirmed with all 4 words: thank, speaker, speech, invite/inviting`);
      console.log(`📝 Main transition sentence: "${bestSentence}"`);
      
      // Wait for the next sentence (after transition) to trigger the actual transition
      this.pendingTransition = {
        detected: true,
        combination: 'thank + speaker + speech + invite/inviting',
        sentence: bestSentence,
        foundWords: foundWords
      };
      
      console.log(`⏳ Pending transition - waiting for next sentence after transition words`);
      return; // Don't trigger immediately, wait for next sentence
    }
    
    // Check if we have a pending transition and this is the next sentence
    if (this.pendingTransition && this.pendingTransition.detected) {
      console.log(`🚀 Triggering pending transition - this is the next sentence after transition keywords`);
      console.log(`📝 New speaker starts with: "${transcript}"`);
      
      // Now trigger the actual transition
      this.finalizeSpeakerSegment();
      this.startNewSpeakerSegment();
      
      this.callbacks.onSpeakerTransition?.(
        this.pendingTransition.combination,
        this.pendingTransition.sentence
      );
      
      // Clear pending transition and recent transcripts
      this.pendingTransition = null;
      this.recentTranscripts = [];
    }
  }

  /**
   * Finalize the current speaker segment
   */
  private finalizeSpeakerSegment(): void {
    const currentSegment = this.speakerSegments.find(s => !s.endTime);
    if (currentSegment) {
      currentSegment.endTime = Date.now();
      currentSegment.transcript = this.recentTranscripts.slice(0, -2).join(' '); // Exclude transition sentence
      console.log(`📝 Finalized segment for ${currentSegment.speaker}: "${currentSegment.transcript.substring(0, 50)}..."`);
    }
  }

  /**
   * Start a new speaker segment
   */
  private startNewSpeakerSegment(): void {
    // Determine next speaker name
    const speakerNumber = this.speakerSegments.length + 2; // Next speaker
    this.currentSpeaker = `Speaker ${speakerNumber}`;
    
    // Create new segment
    const newSegment = {
      speaker: this.currentSpeaker,
      transcript: '',
      startTime: Date.now()
    };
    
    this.speakerSegments.push(newSegment);
    this.segmentStartTime = Date.now();
    
    console.log(`🎙️ Started new segment for ${this.currentSpeaker}`);
  }

  /**
   * Get all speaker segments
   */
  public getSpeakerSegments(): Array<{speaker: string; transcript: string; startTime: number; endTime?: number}> {
    return [...this.speakerSegments];
  }

  /**
   * Get current recording state
   */
  public getState(): ChunkedTranscriptionState {
    const currentTime = this.isRecording ? Date.now() : this.startTime;
    const totalDuration = this.startTime ? Math.floor((currentTime - this.startTime) / 1000) : 0;

    return {
      isRecording: this.isRecording,
      currentChunk: this.currentChunkNumber,
      totalDuration,
      fullTranscript: '', // Will be built from chunks
      chunks: [], // Will be populated as chunks are processed
      error: null
    };
  }

  /**
   * Check if recording is active
   */
  public isActive(): boolean {
    return this.isRecording;
  }
}