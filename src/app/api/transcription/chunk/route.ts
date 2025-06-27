/**
 * Chunked Audio Transcription API
 * Handles individual audio chunks from the chunked recording system
 * Based on the proven Python approach for reliable transcription
 */

import { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  // Use environment variable - Next.js automatically loads from .env.local
  const apiKey = process.env.OPENAI_API_KEY;
  
  // Safety check: ensure we're using the correct API key from .env.local
  if (apiKey && !apiKey.startsWith('sk-proj-')) {
    console.error('WARNING: Using wrong API key from shell environment instead of .env.local');
    return Response.json({ 
      error: 'API key configuration error - check environment variables' 
    }, { status: 500 });
  }
  if (!apiKey) {
    return Response.json({ error: 'OpenAI API key not configured' }, { status: 500 });
  }

  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const chunkNumber = formData.get('chunkNumber') as string;

    if (!audioFile) {
      return Response.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Skip tiny chunks (likely silence or corrupted data)
    if (audioFile.size < 1000) {
      console.log(`Skipping tiny chunk ${chunkNumber}, size: ${audioFile.size} bytes`);
      return Response.json({ 
        success: true,
        transcript: '',
        chunkNumber: parseInt(chunkNumber),
        quotaExceeded: false,
        message: 'Chunk too small - skipped'
      });
    }

    console.log(`Processing chunk ${chunkNumber}, size: ${audioFile.size} bytes`);
    console.log(`Using API key: ${apiKey?.substring(0, 15)}...`);
    console.log(`Audio file type: ${audioFile.type}, name: ${audioFile.name}`);

    // Create FormData for OpenAI API 
    // Using gpt-4o-mini-transcribe: 16K context window, 2K max output tokens
    const openaiFormData = new FormData();
    openaiFormData.append('file', audioFile, `chunk-${chunkNumber}.webm`);
    openaiFormData.append('model', 'gpt-4o-mini-transcribe'); // GPT-4o-mini with 16K context, 2K output
    openaiFormData.append('response_format', 'text'); // Plain text output

    // Add prompt to reduce hallucinations (within 16K context window)
    openaiFormData.append('prompt', 'This is a student speech or debate recording. Transcribe accurately without adding any text that was not spoken.');
    
    // Send to OpenAI Transcription API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: openaiFormData,
    });

    console.log(`OpenAI API response status: ${response.status}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`OpenAI API error details:`, errorData);
      
      // Handle quota exceeded gracefully
      if (response.status === 429) {
        console.warn(`Quota exceeded for chunk ${chunkNumber}:`, errorData);
        return Response.json({ 
          success: true,
          transcript: '',
          chunkNumber: parseInt(chunkNumber),
          quotaExceeded: true,
          message: 'Quota exceeded - continuing without transcription'
        });
      }
      
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    let transcript = await response.text(); // response_format is 'text', so we get plain text
    
    // Filter out common Whisper hallucinations and prompt leakage
    const hallucinations = [
      'thank you for watching',
      'thanks for watching',
      'please subscribe',
      'like and subscribe',
      'see you next time',
      'bye bye',
      'thank you very much',
      'music playing',
      '[music]',
      '[applause]',
      'subtitles by',
      'translated by',
      'transcribe accurately without adding any text that was not spoken',
      'this is a student speech or debate recording',
      'do you see the text here',
      'that student made that comment unknowingly'
    ];
    
    // Check if the transcript is likely a hallucination
    const lowerTranscript = transcript.toLowerCase().trim();
    const isLikelyHallucination = hallucinations.some(h => 
      lowerTranscript === h.toLowerCase() || 
      lowerTranscript.includes(h.toLowerCase())
    );
    
    if (isLikelyHallucination) {
      console.warn(`Detected likely hallucination in chunk ${chunkNumber}: "${transcript}"`);
      transcript = ''; // Return empty string for hallucinations
    }
    
    console.log(`Chunk ${chunkNumber} transcribed: "${transcript.substring(0, 50)}..."`);

    return Response.json({ 
      success: true, 
      transcript: transcript.trim(),
      chunkNumber: parseInt(chunkNumber),
      quotaExceeded: false
    });

  } catch (error) {
    console.error('Chunk transcription error:', error);
    
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Transcription failed',
      success: false 
    }, { status: 500 });
  }
}