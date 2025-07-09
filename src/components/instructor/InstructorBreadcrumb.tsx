'use client';

import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { InstructorSection } from './InstructorDashboard';

interface InstructorBreadcrumbProps {
  activeSection: InstructorSection;
}

const sectionLabels = {
  'course-setup': 'Course Setup',
  'student-profiles': 'Student Profiles',
  'daily-logs': 'Daily Logs',
  'bulk-input': 'Bulk Input',
  'reports': 'Reports'
};

export function InstructorBreadcrumb({ activeSection }: InstructorBreadcrumbProps) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Home className="w-4 h-4 text-blue-500" />
      <span className="text-slate-600">Dashboard</span>
      <ChevronRight className="w-4 h-4 text-slate-400" />
      <span className="text-slate-600">Instructor</span>
      <ChevronRight className="w-4 h-4 text-slate-400" />
      <span className="font-medium text-slate-900">{sectionLabels[activeSection]}</span>
    </div>
  );
}