'use client';

import React, { useEffect, useRef } from 'react';

interface TranscriptionMarqueeProps {
  transcript: string;
  className?: string;
}

export function TranscriptionMarquee({ transcript, className = '' }: TranscriptionMarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !textRef.current) return;

    // Auto-scroll to bottom when new text is added
    const container = containerRef.current;
    container.scrollTop = container.scrollHeight;
  }, [transcript]);

  // Show placeholder if no transcript yet
  const displayText = transcript || 'Waiting for speech...';

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-y-auto bg-black/90 rounded-lg p-6 ${className}`}
      style={{ maxHeight: '150px', minHeight: '150px' }}
    >
      <div ref={textRef} className="space-y-2">
        {displayText.split('\n').map((line, index) => (
          <p 
            key={index} 
            className="text-white/90 text-lg leading-relaxed animate-fadeIn"
            style={{
              animation: 'fadeIn 0.5s ease-in',
              animationDelay: `${index * 0.05}s`,
              animationFillMode: 'both'
            }}
          >
            {line}
          </p>
        ))}
      </div>
      
      {/* Gradient overlay for smooth fade effect */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/90 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-black/90 to-transparent pointer-events-none" />
      
      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}