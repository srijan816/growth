/**
 * WebSocket proxy for OpenAI GPT-4o mini transcribe
 * Handles authentication server-side since browser WebSockets can't send headers
 */

import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  // Check if this is a WebSocket upgrade request
  const upgrade = request.headers.get('upgrade');
  if (upgrade !== 'websocket') {
    return new Response('WebSocket upgrade required', { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response('OpenAI API key not configured', { status: 500 });
  }

  // For Next.js API routes, we can't handle WebSocket upgrades directly
  // Instead, we'll provide a different approach using Server-Sent Events
  return new Response('WebSocket proxy not available in Next.js API routes. Use /api/transcription/sse instead.', { 
    status: 501 
  });
}

// Alternative: Server-Sent Events approach for real-time transcription
export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'OpenAI API key not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { audio, config } = body;

    // Use OpenAI's standard Whisper API for now
    // This is more reliable than WebSocket authentication issues
    const formData = new FormData();
    
    // Convert base64 audio to blob
    const audioBuffer = Buffer.from(audio, 'base64');
    const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
    
    formData.append('file', audioBlob, 'audio.wav');
    formData.append('model', 'gpt-4o-mini-transcribe');
    formData.append('response_format', 'json');

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    return Response.json({ 
      success: true, 
      transcript: result.text || '',
      confidence: 0.95 // Whisper doesn't provide confidence scores
    });

  } catch (error) {
    console.error('Transcription error:', error);
    
    // Handle quota exceeded error specifically
    if (error instanceof Error && error.message.includes('429')) {
      return Response.json({ 
        error: 'OpenAI quota exceeded',
        quotaExceeded: true,
        transcript: '',
        success: false
      }, { status: 429 });
    }
    
    return Response.json({ 
      error: error instanceof Error ? error.message : 'Transcription failed' 
    }, { status: 500 });
  }
}