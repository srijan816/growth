'use client';

import React, { useEffect } from 'react';
import { InstructorSection } from './InstructorDashboard';

interface KeyboardShortcutsProps {
  onSectionChange: (section: InstructorSection) => void;
  onToggleSidebar: () => void;
}

export function KeyboardShortcuts({ onSectionChange, onToggleSidebar }: KeyboardShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle keyboard shortcuts when not in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Check for Alt/Option key modifier (cross-platform)
      if (event.altKey || event.metaKey) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            onSectionChange('course-setup');
            break;
          case '2':
            event.preventDefault();
            onSectionChange('student-profiles');
            break;
          case '3':
            event.preventDefault();
            onSectionChange('daily-logs');
            break;
          case '4':
            event.preventDefault();
            onSectionChange('bulk-input');
            break;
          case '5':
            event.preventDefault();
            onSectionChange('reports');
            break;
          case '[':
            event.preventDefault();
            onToggleSidebar();
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSectionChange, onToggleSidebar]);

  return null; // This component doesn't render anything
}