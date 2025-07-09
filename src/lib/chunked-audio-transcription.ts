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
        console.log(`🎤 Data available for chunk ${this.currentChunkNumber}, size: ${event.data.size} bytes`);
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          this.completeAudioChunks.push(event.data); // Store for complete audio
          console.log(`💾 Stored audio chunk ${this.currentChunkNumber} (${event.data.size} bytes)`);
        } else {
          console.log(`⚠️ Chunk ${this.currentChunkNumber} has no audio data (size: 0)`);
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

    // DON'T set isRecording to false yet - we need to process the final chunk first
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
      this.isRecording = false;
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
      console.log(`❌ Cannot start chunk ${this.currentChunkNumber + 1} - recording:${this.isRecording}, stopped:${this.isStopped}, mediaRecorder:${!!this.mediaRecorder}, mediaRecorderState:${this.mediaRecorder?.state}`);
      return;
    }

    this.currentChunkNumber++;
    this.audioChunks = []; // Clear previous chunk data (but keep completeAudioChunks)

    console.log(`🎤 Starting chunk ${this.currentChunkNumber} (total chunks so far: ${this.currentChunkNumber})`);
    console.log(`🔄 MediaRecorder state before start: ${this.mediaRecorder.state}`);

    // Ensure MediaRecorder is ready
    if (this.mediaRecorder.state === 'recording') {
      console.log(`⚠️ MediaRecorder already recording - stopping first`);
      this.mediaRecorder.stop();
      // Wait a moment before starting new chunk
      setTimeout(() => {
        if (this.mediaRecorder && this.isRecording && !this.isStopped) {
          this.mediaRecorder.start();
          console.log(`🎤 ✅ Started chunk ${this.currentChunkNumber} after stopping previous`);
        }
      }, 100);
    } else {
      // Start recording this chunk
      this.mediaRecorder.start();
      console.log(`🎤 ✅ Started chunk ${this.currentChunkNumber} normally`);
    }

    // Use adaptive timing based on voice activity detection
    this.chunkTimer = setTimeout(() => {
      // Check if still recording before proceeding
      if (this.isRecording && !this.isStopped) {
        console.log(`⏰ Timer fired for chunk ${this.currentChunkNumber} - checking for natural break`);
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

    console.log(`🔍 Checking natural break for chunk ${this.currentChunkNumber}, MediaRecorder state: ${this.mediaRecorder.state}`);

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    this.analyser.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
    const silenceThreshold = 30; // Adjust based on testing

    console.log(`🔊 Audio level: ${average.toFixed(1)}, threshold: ${silenceThreshold}`);

    if (average < silenceThreshold) {
      // Found silence - good time to break
      if (this.mediaRecorder.state === 'recording' && !this.isStopped) {
        console.log(`🔇 Silence detected - stopping chunk ${this.currentChunkNumber} at natural break`);
        this.mediaRecorder.stop();
      } else {
        console.log(`⚠️ Silence detected but MediaRecorder not recording (state: ${this.mediaRecorder.state})`);
      }
    } else {
      // Still speaking - wait a bit more but ensure we eventually stop
      const maxWaitTime = 3000; // Reduced to 3 seconds to prevent too long chunks
      console.log(`🗣️ Still speaking (level: ${average.toFixed(1)}) - waiting max ${maxWaitTime}ms before force stop`);
      
      setTimeout(() => {
        // Force stop to ensure chunk progression
        if (this.isRecording && this.mediaRecorder && this.mediaRecorder.state === 'recording' && !this.isStopped) {
          console.log(`⏰ Force stopping chunk ${this.currentChunkNumber} after wait period`);
          this.mediaRecorder.stop();
        } else {
          console.log(`❌ Cannot force stop - MediaRecorder state: ${this.mediaRecorder?.state}, isRecording: ${this.isRecording}, isStopped: ${this.isStopped}`);
        }
      }, maxWaitTime);
    }
  }

  /**
   * Process the current chunk for transcription
   */
  private async processCurrentChunk(): Promise<void> {
    console.log(`🔄 Processing chunk ${this.currentChunkNumber} - audioChunks:${this.audioChunks.length}, isStopped:${this.isStopped}, isRecording:${this.isRecording}, isFinalChunk:${this.isFinalChunk}`);
    
    // Check if we have audio data to process
    if (this.audioChunks.length === 0) {
      console.log(`❌ Skipping chunk ${this.currentChunkNumber} processing - no audio data`);
      
      // Even without audio data, we should continue to next chunk (might be silence)
      if (!this.isFinalChunk && !this.isStopped && this.isRecording) {
        console.log(`🔄 No audio data but continuing to next chunk ${this.currentChunkNumber + 1} (might be silence period)`);
        setTimeout(() => {
          if (this.isRecording && !this.isStopped) {
            this.startNextChunk();
          }
        }, 100);
      }
      return;
    }

    // Only skip if explicitly stopped by user, not due to errors
    if (this.isStopped) {
      console.log(`❌ Skipping chunk ${this.currentChunkNumber} processing - recording stopped by user`);
      return;
    }

    try {
      // Combine all chunk data into a single blob
      const chunkBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
      
      // Convert to WAV format if possible (for better compatibility)
      const wavBlob = await this.convertToWav(chunkBlob);
      
      // Check again if stopped before sending for transcription (only check user stop, not errors)
      if (this.isStopped) {
        console.log(`❌ Skipping transcription for chunk ${this.currentChunkNumber} - recording stopped by user`);
        return;
      }
      
      // Send for transcription
      const transcript = await this.transcribeChunk(wavBlob, this.currentChunkNumber);
      
      // Check once more if stopped after transcription (only check user stop, not errors)
      if (this.isStopped) {
        console.log(`❌ Discarding transcript for chunk ${this.currentChunkNumber} - recording stopped by user during transcription`);
        return;
      }
      
      if (transcript.trim()) {
        // Add to recent transcripts buffer
        this.recentTranscripts.push(transcript);
        if (this.recentTranscripts.length > 6) {
          this.recentTranscripts.shift(); // Keep only last 6 transcripts for better context
        }
        
        console.log(`📝 Chunk ${this.currentChunkNumber} transcript: "${transcript}"`);
        console.log(`📝 Added to buffer. Total chunks in buffer: ${this.recentTranscripts.length}`);
        console.log(`📝 Current buffer: [${this.recentTranscripts.map((t, i) => `"${t.substring(0, 30)}..."`).join(', ')}]`);
        
        // Update current speaker segment with new transcript
        this.updateCurrentSpeakerSegment(transcript);
        
        // Check for speaker transition
        this.checkForSpeakerTransition(transcript);
        
        this.callbacks.onChunkTranscribed?.(transcript, this.currentChunkNumber);
      } else {
        console.log(`📝 Chunk ${this.currentChunkNumber} produced empty transcript (possibly silence or hallucination filtered)`);
      }

      // Decision point: start next chunk or stop recording
      console.log(`🤔 Chunk ${this.currentChunkNumber} processed. Decision time: isFinalChunk:${this.isFinalChunk}, isStopped:${this.isStopped}, isRecording:${this.isRecording}`);
      
      // Start next chunk if this is not the final chunk and user hasn't stopped
      if (!this.isFinalChunk && !this.isStopped && this.isRecording) {
        console.log(`🎤 ✅ Conditions met - Starting next chunk ${this.currentChunkNumber + 1}`);
        this.startNextChunk();
      } else if (this.isFinalChunk) {
        // Final chunk processed - now we can mark recording as stopped
        this.isRecording = false;
        this.isFinalChunk = false;
        console.log('✅ Final chunk processed - recording complete');
        this.callbacks.onRecordingStop?.();
        this.callbacks.onRecordingComplete?.();
      } else if (this.isStopped) {
        // User stopped recording
        this.isRecording = false;
        console.log('✅ Recording stopped by user');
        this.callbacks.onRecordingStop?.();
      } else {
        console.log(`❓ Unexpected state - not starting next chunk. isFinalChunk:${this.isFinalChunk}, isStopped:${this.isStopped}, isRecording:${this.isRecording}`);
      }

    } catch (error) {
      console.error(`❌ Failed to process chunk ${this.currentChunkNumber}:`, error);
      this.callbacks.onError?.(error as Error);
      
      // Decision point after error
      console.log(`🤔 Error in chunk ${this.currentChunkNumber}. Decision time: isFinalChunk:${this.isFinalChunk}, isStopped:${this.isStopped}, isRecording:${this.isRecording}`);
      
      // Even on error, continue with next chunk unless user explicitly stopped or this is final chunk
      if (!this.isFinalChunk && !this.isStopped && this.isRecording) {
        console.log(`🔄 ✅ Error processing chunk ${this.currentChunkNumber}, but continuing to next chunk ${this.currentChunkNumber + 1}`);
        this.startNextChunk();
      } else if (this.isFinalChunk) {
        // Final chunk processed with error - still mark as complete
        this.isRecording = false;
        this.isFinalChunk = false;
        console.log('✅ Final chunk processed (with error) - recording complete');
        this.callbacks.onRecordingStop?.();
        this.callbacks.onRecordingComplete?.();
      } else if (this.isStopped) {
        // User stopped recording during error
        this.isRecording = false;
        console.log('✅ Recording stopped by user (during error)');
        this.callbacks.onRecordingStop?.();
      } else {
        console.log(`❓ Unexpected error state - not starting next chunk. isFinalChunk:${this.isFinalChunk}, isStopped:${this.isStopped}, isRecording:${this.isRecording}`);
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
   */
  private checkForSpeakerTransition(transcript: string): void {
    console.log(`🔍 Checking transition in: "${transcript}"`);
    
    // Specific required words that must ALL appear within a couple of sentences
    const requiredWords = ['thank', 'speaker', 'speech', 'invite'];
    const inviteVariations = ['invite', 'inviting', 'invites']; // Accept multiple forms
    
    // Get full context from recent transcripts + current (last 5 chunks for better coverage)
    const contextFromRecent = this.recentTranscripts.slice(-4).join(' ');
    const fullContext = (contextFromRecent + ' ' + transcript).toLowerCase();
    console.log(`📝 Full context for analysis (${fullContext.length} chars): "${fullContext.substring(0, 200)}..."`);
    console.log(`🗓️ Recent chunks: ${this.recentTranscripts.length}, Current chunk: "${transcript}"`);
    
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
      
      console.log(`🎙️🎙️🎙️ SPEAKER TRANSITION DETECTED - SEGMENTING TRANSCRIPT 🎙️🎙️🎙️`);
      
      // Segment the transcript at the transition point
      this.segmentTranscriptAtTransition(bestSentence, foundWords);
      
      // Trigger transition callback for UI update (but don't stop recording)
      this.callbacks.onSpeakerTransition?.(
        'thank + speaker + speech + invite/inviting',
        bestSentence
      );
      
      // Clear recent transcripts to avoid re-triggering
      this.recentTranscripts = [];
      return;
    }
  }

  /**
   * Segment transcript at transition point without stopping recording
   */
  private segmentTranscriptAtTransition(transitionSentence: string, foundWords: string[]): void {
    console.log(`🔪 Segmenting transcript at transition: "${transitionSentence}"`);
    
    // Find the transition sentence in our recent transcripts
    const allText = this.recentTranscripts.join(' ');
    const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let transitionIndex = -1;
    let bestMatch = 0;
    
    // Find the sentence with the most transition keywords
    sentences.forEach((sentence, index) => {
      const lowerSentence = sentence.toLowerCase();
      let matches = 0;
      if (lowerSentence.includes('thank')) matches++;
      if (lowerSentence.includes('speaker')) matches++;
      if (lowerSentence.includes('speech')) matches++;
      if (lowerSentence.includes('invite') || lowerSentence.includes('inviting')) matches++;
      
      if (matches > bestMatch) {
        bestMatch = matches;
        transitionIndex = index;
      }
    });
    
    if (transitionIndex >= 0) {
      // Split content: before transition = current speaker, after = next speaker
      const beforeTransition = sentences.slice(0, transitionIndex).join('. ');
      const afterTransition = sentences.slice(transitionIndex + 1).join('. ');
      
      console.log(`📝 Current speaker content: "${beforeTransition}"`);
      console.log(`📝 Next speaker content: "${afterTransition}"`);
      
      // Finalize current speaker segment
      this.finalizeSpeakerSegment(beforeTransition);
      
      // Start new speaker segment
      this.startNewSpeakerSegment(afterTransition);
    }
  }

  /**
   * Finalize the current speaker segment with specific content
   */
  private finalizeSpeakerSegment(content?: string): void {
    const currentSegment = this.speakerSegments.find(s => !s.endTime);
    if (currentSegment) {
      currentSegment.endTime = Date.now();
      currentSegment.transcript = content || this.recentTranscripts.slice(0, -2).join(' ');
      console.log(`📝 Finalized segment for ${currentSegment.speaker}: "${currentSegment.transcript.substring(0, 50)}..."`);
    }
  }

  /**
   * Start a new speaker segment with initial content
   */
  private startNewSpeakerSegment(initialContent?: string): void {
    // Determine next speaker name using debate order logic
    const speakerNumber = this.speakerSegments.length + 1; // Next speaker number
    
    // For debate: Prop 1 → Opp 1 → Prop 2 → Opp 2 → Prop 3 → Opp 3
    const isOddSpeaker = speakerNumber % 2 === 1;
    const side = isOddSpeaker ? 'Proposition' : 'Opposition';
    const position = Math.ceil(speakerNumber / 2);
    
    this.currentSpeaker = `${position}${position === 1 ? 'st' : position === 2 ? 'nd' : position === 3 ? 'rd' : 'th'} ${side}`;
    
    // Create new segment
    const newSegment = {
      speaker: this.currentSpeaker,
      transcript: initialContent || '',
      startTime: Date.now()
    };
    
    this.speakerSegments.push(newSegment);
    this.segmentStartTime = Date.now();
    
    console.log(`🎙️ Started new segment for ${this.currentSpeaker}`);
    if (initialContent) {
      console.log(`📝 Initial content: "${initialContent}"`);
    }
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
      console.log(`🔄 Updated ${currentSegment.speaker} transcript: "${currentSegment.transcript.substring(0, 50)}..."`);
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