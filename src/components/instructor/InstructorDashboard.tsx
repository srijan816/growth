'use client';

import React, { useState } from 'react';
import { InstructorSidebar } from './InstructorSidebar';
import { InstructorMainPanel } from './InstructorMainPanel';
import { InstructorBreadcrumb } from './InstructorBreadcrumb';
import { KeyboardShortcuts } from './KeyboardShortcuts';

export type InstructorSection = 'course-setup' | 'student-profiles' | 'daily-logs' | 'bulk-input' | 'reports';

export interface InstructorDashboardProps {}

export function InstructorDashboard({}: InstructorDashboardProps) {
  const [activeSection, setActiveSection] = useState<InstructorSection>('course-setup');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [courseSetupCompleted, setCourseSetupCompleted] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-300 via-blue-400 to-blue-500 p-8">
      {/* Keyboard Shortcuts */}
      <KeyboardShortcuts 
        onSectionChange={setActiveSection}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <div className="flex gap-4 h-[calc(100vh-4rem)] max-w-8xl mx-auto">
        {/* Sidebar */}
        <div className={`transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-96'}`}>
          <InstructorSidebar
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            courseSetupCompleted={courseSetupCompleted}
          />
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          <InstructorMainPanel 
            activeSection={activeSection} 
            courseSetupCompleted={courseSetupCompleted}
            onCourseSetupComplete={() => {
              setCourseSetupCompleted(true);
              setActiveSection('student-profiles');
            }}
          />
        </div>
      </div>
    </div>
  );
}