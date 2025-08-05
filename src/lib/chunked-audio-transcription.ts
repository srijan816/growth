/**
 * Chunked Audio Recording and Transcription Service
 * Based on the proven Python approach: record in chunks, save to file, transcribe each chunk
 * Much more reliable than WebSocket-based real-time transcription
 */

export interface ChunkedTranscriptionConfig {
  chunkDurationSeconds?: number; // Default 20 seconds
  overlapSeconds?: number; // Default 2 seconds overlap between chunks
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
      overlapSeconds: 2,
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
        console.log(`🎤 Data available for chunk ${this.currentChunkNumber}, size: ${event.data.size} bytes`);
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          this.completeAudioChunks.push(event.data); // Store for complete audio
          console.log(`💾 Stored audio chunk ${this.currentChunkNumber} (${event.data.size} bytes)`);
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

    // Stop MediaRecorder first
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      console.log('🎤 Stopping MediaRecorder');
      this.isFinalChunk = true;
      this.mediaRecorder.stop();
    }

    // Stop media stream
    if (this.stream) {
      console.log('🎤 Stopping media stream tracks');
      this.stream.getTracks().forEach(track => {
        track.stop();
        console.log(`Stopped track: ${track.kind}, state: ${track.readyState}`);
      });
      this.stream = null;
    }

    // Clean up audio analysis
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
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
   * Start recording the next chunk
   */
  private startNextChunk(): void {
    if (!this.isRecording || !this.mediaRecorder || this.isStopped) {
      console.log(`❌ Cannot start chunk ${this.currentChunkNumber + 1} - recording:${this.isRecording}, stopped:${this.isStopped}`);
      return;
    }

    this.currentChunkNumber++;
    this.audioChunks = []; // Clear previous chunk data

    console.log(`🎤 Starting chunk ${this.currentChunkNumber}`);

    // Start recording
    this.mediaRecorder.start();
    console.log(`🎤 ✅ Started chunk ${this.currentChunkNumber}`);

    // Set timer for chunk duration
    this.chunkTimer = setTimeout(() => {
      if (this.isRecording && !this.isStopped && this.mediaRecorder?.state === 'recording') {
        console.log(`⏰ Stopping chunk ${this.currentChunkNumber} after ${this.config.chunkDurationSeconds}s`);
        this.mediaRecorder.stop();
      }
    }, this.config.chunkDurationSeconds! * 1000);

    this.callbacks.onChunkRecorded?.(this.currentChunkNumber, this.currentChunkNumber);
  }

  /**
   * Process the current chunk for transcription
   */
  private async processCurrentChunk(): Promise<void> {
    console.log(`🔄 Processing chunk ${this.currentChunkNumber} - audioChunks:${this.audioChunks.length}, isStopped:${this.isStopped}, isRecording:${this.isRecording}, isFinalChunk:${this.isFinalChunk}`);
    
    // Check if we have audio data to process
    if (this.audioChunks.length === 0) {
      console.log(`❌ Skipping chunk ${this.currentChunkNumber} processing - no audio data`);
      
      // Continue recording if not final chunk
      if (!this.isFinalChunk && !this.isStopped && this.isRecording) {
        console.log(`🔄 Starting next chunk`);
        this.startNextChunk();
      }
      return;
    }

    try {
      // Create chunk blob
      const chunkBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      
      // Start next chunk IMMEDIATELY to minimize gap (BEFORE async processing)
      if (!this.isFinalChunk && !this.isStopped && this.isRecording) {
        console.log(`🎤 Starting next chunk immediately to avoid gaps`);
        this.startNextChunk();
      }
      
      // Process transcription asynchronously while next chunk records
      const wavBlob = await this.convertToWav(chunkBlob);
      const transcript = await this.transcribeChunk(wavBlob, this.currentChunkNumber);
      
      if (transcript.trim()) {
        console.log(`📝 Chunk ${this.currentChunkNumber} transcript: "${transcript}"`);
        
        // ALWAYS update current speaker segment with new transcript
        this.updateCurrentSpeakerSegment(transcript);
        
        // Check for speaker transition AFTER updating the segment
        this.checkForSpeakerTransition(transcript);
        
        // Call chunk transcribed callback
        this.callbacks.onChunkTranscribed?.(transcript, this.currentChunkNumber);
      }

    } catch (error) {
      console.error(`❌ Failed to process chunk ${this.currentChunkNumber}:`, error);
      this.callbacks.onError?.(error as Error);
    }
    
    // Handle completion
    if (this.isFinalChunk) {
      this.isRecording = false;
      this.isFinalChunk = false;
      console.log('✅ Final chunk processed - recording complete');
      this.callbacks.onRecordingStop?.();
      this.callbacks.onRecordingComplete?.();
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
    // Don't throw error if stopped - we still want to transcribe final chunks
    if (this.isStopped) {
      console.log(`📝 Transcribing chunk ${chunkNumber} even though recording stopped (final processing)`);
    }

    const formData = new FormData();
    formData.append('audio', audioBlob, `chunk-${chunkNumber}.webm`);
    formData.append('chunkNumber', chunkNumber.toString());

    // Create an AbortController for this transcription
    const abortController = new AbortController();
    this.activeTranscriptions.set(chunkNumber, abortController);

    try {
      // Add timeout to prevent hanging requests
      const timeoutId = setTimeout(() => {
        console.log(`⏰ Transcription timeout for chunk ${chunkNumber} - aborting`);
        abortController.abort();
      }, 30000); // 30 second timeout

      const response = await fetch('/api/transcription/chunk', {
        method: 'POST',
        body: formData,
        signal: abortController.signal
      });

      clearTimeout(timeoutId); // Clear timeout on successful response

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
   * Returns true if a transition was detected and handled
   */
  private checkForSpeakerTransition(transcript: string): boolean {
    console.log(`🔍 Checking transition in: "${transcript}"`);
    
    // Specific required words that must ALL appear within a couple of sentences
    const requiredWords = ['thank', 'speaker', 'speech', 'invite'];
    const inviteVariations = ['invite', 'inviting', 'invites']; // Accept multiple forms
    
    // Get the current speaker segment's full transcript
    const currentSegment = this.speakerSegments.find(s => !s.endTime);
    const currentTranscript = currentSegment?.transcript || '';
    
    // Use only the current speaker's transcript for checking (not recent chunks)
    const fullContext = currentTranscript.toLowerCase();
    console.log(`📝 Checking in current speaker's transcript (${fullContext.length} chars)`);
    
    // Clean the context by removing extra spaces and normalizing
    const cleanContext = fullContext.replace(/\s+/g, ' ').trim();
    
    // Check if all required words are present
    const foundWords = [];
    let hasInviteVariation = false;
    
    // More flexible word matching - allow for slight variations and typos
    const wordPatterns = {
      'thank': /\b(thank|thanks|thanking)\b/i,
      'speaker': /\b(speaker|speakers|speaking)\b/i,
      'speech': /\b(speech|speeches|speak)\b/i
    };
    
    // Check for the first three required words with flexible patterns
    for (const [word, pattern] of Object.entries(wordPatterns)) {
      if (pattern.test(cleanContext)) {
        foundWords.push(word);
        console.log(`✅ Found '${word}' pattern in context`);
      } else {
        console.log(`❌ Missing '${word}' pattern in context`);
      }
    }
    
    // Check for invite/inviting variations with flexible matching
    const invitePattern = /\b(invite|invites|inviting|invitation)\b/i;
    if (invitePattern.test(cleanContext)) {
      foundWords.push('invite/inviting');
      hasInviteVariation = true;
      console.log(`✅ Found 'invite' pattern in context`);
    } else {
      console.log(`❌ Missing 'invite' pattern in context`);
    }
    
    console.log(`📋 Found words so far: [${foundWords.join(', ')}] (need 4 total)`);
    
    // Check if we have all 4 required elements
    if (foundWords.length === 4 && hasInviteVariation) {
      console.log(`✅ Found ALL required transition words: thank, speaker, speech, invite/inviting`);
      
      // Find the sentences containing the transition words
      const sentences = currentTranscript.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      // Find the sentence that contains the most transition words (likely the main transition sentence)
      let bestSentence = transcript;
      let maxWordsInSentence = 0;
      
      for (const sentence of sentences) {
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
      
      console.log(`🎙️🎙️🎙️ SPEAKER TRANSITION DETECTED - MOVING TO NEXT SPEAKER 🎙️🎙️🎙️`);
      
      // Finalize current speaker segment (keep ALL content including transition)
      this.finalizeSpeakerSegment();
      
      // Start new speaker segment
      this.startNewSpeakerSegment();
      
      // Trigger transition callback for UI update (but don't stop recording)
      this.callbacks.onSpeakerTransition?.(
        'thank + speaker + speech + invite/inviting',
        bestSentence
      );
      
      return true; // Transition was detected
    }
    
    return false; // No transition detected
  }

  // REMOVED: segmentTranscriptAtTransition method - no longer needed

  /**
   * Finalize the current speaker segment
   */
  private finalizeSpeakerSegment(): void {
    const currentSegment = this.speakerSegments.find(s => !s.endTime);
    if (currentSegment) {
      currentSegment.endTime = Date.now();
      console.log(`📝 Finalized segment for ${currentSegment.speaker}: "${currentSegment.transcript.substring(0, 50)}..."`);
    }
  }

  /**
   * Start a new speaker segment
   */
  private startNewSpeakerSegment(): void {
    // Determine next speaker name using debate order logic
    const speakerNumber = this.speakerSegments.length + 1; // Next speaker number
    
    // For debate: Prop 1 → Opp 1 → Prop 2 → Opp 2 → Prop 3 → Opp 3
    const isOddSpeaker = speakerNumber % 2 === 1;
    const side = isOddSpeaker ? 'Proposition' : 'Opposition';
    const position = Math.ceil(speakerNumber / 2);
    
    this.currentSpeaker = `${position}${position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th'} ${side}`;
    
    // Create new segment with empty transcript
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
   * Update current speaker segment with new transcript
   */
  private updateCurrentSpeakerSegment(newTranscript: string): void {
    const currentSegment = this.speakerSegments.find(s => !s.endTime);
    if (currentSegment) {
      // Append new transcript to current segment
      if (currentSegment.transcript) {
        currentSegment.transcript += ' ' + newTranscript;
      } else {
        currentSegment.transcript = newTranscript;
      }
      console.log(`🔄 Updated ${currentSegment.speaker} transcript (length: ${currentSegment.transcript.length})`);
    } else {
      console.log(`⚠️ No current speaker segment to update`);
    }
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