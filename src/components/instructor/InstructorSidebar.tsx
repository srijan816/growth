'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Users, 
  Calendar, 
  BarChart3,
  FileText,
  ChevronLeft,
  ChevronRight,
  Keyboard,
  Bell
} from 'lucide-react';
import { InstructorSection } from './InstructorDashboard';

interface InstructorSidebarProps {
  activeSection: InstructorSection;
  onSectionChange: (section: InstructorSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  courseSetupCompleted: boolean;
}

const sidebarItems = [
  {
    id: 'course-setup' as InstructorSection,
    label: 'Course Setup',
    icon: Settings,
    description: 'One-time inputs',
    badge: '1-time',
    color: 'bg-blue-500',
    shortcut: '1'
  },
  {
    id: 'student-profiles' as InstructorSection,
    label: 'Student Profiles',
    icon: Users,
    description: 'Baseline data entry',
    badge: 'Setup',
    color: 'bg-green-500',
    shortcut: '2'
  },
  {
    id: 'daily-logs' as InstructorSection,
    label: 'Daily Logs',
    icon: Calendar,
    description: 'Ongoing observations',
    badge: 'Active',
    color: 'bg-orange-500',
    shortcut: '3'
  },
  {
    id: 'bulk-input' as InstructorSection,
    label: 'Bulk Input',
    icon: BarChart3,
    description: 'Multi-student entry',
    badge: 'Batch',
    color: 'bg-purple-500',
    shortcut: '4'
  },
  {
    id: 'reports' as InstructorSection,
    label: 'Reports',
    icon: FileText,
    description: 'Preview how data displays',
    badge: 'View',
    color: 'bg-cyan-500',
    shortcut: '5'
  }
];

export function InstructorSidebar({ 
  activeSection, 
  onSectionChange, 
  collapsed, 
  onToggleCollapse,
  courseSetupCompleted 
}: InstructorSidebarProps) {
  return (
    <div className="bg-gradient-to-b from-slate-700 via-slate-800 to-teal-900 text-white rounded-3xl shadow-2xl h-full w-full relative">
      {/* Header */}
      <div className="p-6 border-b border-slate-600/30">
        <div className="flex items-center justify-between">
          {!collapsed && (
            <div>
              <h2 className="text-xl font-bold text-white">Instructor</h2>
              <p className="text-sm text-slate-300">Dashboard</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="text-slate-300 hover:text-white hover:bg-slate-600/30 rounded-full"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="p-6 space-y-3">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-200 ${
                isActive 
                  ? 'bg-blue-500/20 text-white shadow-lg border border-blue-400/30' 
                  : 'text-slate-300 hover:bg-slate-600/20 hover:text-white'
              }`}
            >
              <div className={`p-3 rounded-xl ${isActive ? 'bg-blue-500/30' : 'bg-slate-600/30'}`}>
                <Icon className="w-5 h-5" />
              </div>
              
              {!collapsed && (
                <div className="flex-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs border-slate-500 text-slate-400 bg-slate-700/50">
                        {item.id === 'course-setup' && courseSetupCompleted ? 'Complete' : item.badge}
                      </Badge>
                      <kbd className="px-2 py-1 text-xs bg-slate-700/50 rounded border border-slate-600">
                        {item.shortcut}
                      </kbd>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Quick Actions */}
      {!collapsed && (
        <div className="absolute bottom-6 left-6 right-6 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 justify-center text-slate-400 border-slate-600/50 hover:bg-slate-700/30 rounded-xl p-2"
          >
            <Keyboard className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1 justify-center text-slate-400 border-slate-600/50 hover:bg-slate-700/30 rounded-xl p-2"
          >
            <Bell className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}