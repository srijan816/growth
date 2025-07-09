'use client';

import React from 'react';
import { InstructorSection } from './InstructorDashboard';
import { CourseSetupForm } from './forms/CourseSetupForm';
import { StudentProfilesForm } from './forms/StudentProfilesForm';
import { DailyLogsForm } from './forms/DailyLogsForm';
import { BulkInputForm } from './forms/BulkInputForm';
import { ReportsView } from './forms/ReportsView';
import { RecentEntriesLog } from './RecentEntriesLog';
import { QuickActions } from './QuickActions';
import { StudentStatusIndicators } from './StudentStatusIndicators';
import { Settings } from 'lucide-react';

interface InstructorMainPanelProps {
  activeSection: InstructorSection;
  courseSetupCompleted: boolean;
  onCourseSetupComplete: () => void;
}

export function InstructorMainPanel({ activeSection, courseSetupCompleted, onCourseSetupComplete }: InstructorMainPanelProps) {
  const renderActiveForm = () => {
    switch (activeSection) {
      case 'course-setup':
        return <CourseSetupForm onComplete={onCourseSetupComplete} />;
      case 'student-profiles':
        return <StudentProfilesForm />;
      case 'daily-logs':
        return <DailyLogsForm />;
      case 'bulk-input':
        return <BulkInputForm />;
      case 'reports':
        return <ReportsView />;
      default:
        return <CourseSetupForm />;
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-2xl h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Instructor Dashboard</h1>
            <p className="text-gray-600 text-sm">Manage your courses and track student progress</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-500">Last updated: 2 min ago</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Active Form Section */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-lg">
            <div className="p-6">
              {renderActiveForm()}
            </div>
          </div>

          {/* Middle Section: Recent Entries + Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Entries Log */}
            <div className="lg:col-span-2">
              <RecentEntriesLog />
            </div>

            {/* Quick Actions */}
            <div>
              <QuickActions />
            </div>
          </div>

          {/* Bottom Section: Student Status Indicators */}
          <div>
            <StudentStatusIndicators />
          </div>

          {/* Course Setup Summary (if completed) */}
          {courseSetupCompleted && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500 rounded-lg">
                    <Settings className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900">Course Setup Complete</h3>
                    <p className="text-sm text-blue-600">Course configuration saved successfully</p>
                  </div>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="text-blue-600 hover:text-blue-800 text-sm underline"
                >
                  Edit Setup
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}