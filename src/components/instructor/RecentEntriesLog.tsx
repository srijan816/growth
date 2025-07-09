'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, User, FileText, Edit, Eye } from 'lucide-react';

export function RecentEntriesLog() {
  const recentEntries = [
    {
      id: '1',
      type: 'Daily Log',
      student: 'Sarah Chen',
      timestamp: '2 hours ago',
      summary: 'Excellent debate performance, ready for challenge',
      flag: 'ready-for-challenge',
      course: 'PSD-301'
    },
    {
      id: '2',
      type: 'Student Profile',
      student: 'Michael Rodriguez',
      timestamp: '4 hours ago',
      summary: 'Updated baseline assessment and goals',
      flag: null,
      course: 'PSD-301'
    },
    {
      id: '3',
      type: 'Bulk Input',
      student: 'Class PSD-301',
      timestamp: '1 day ago',
      summary: 'Session on Parliamentary Debate - 12 students',
      flag: null,
      course: 'PSD-301'
    },
    {
      id: '4',
      type: 'Daily Log',
      student: 'Emma Thompson',
      timestamp: '1 day ago',
      summary: 'Needs encouragement, was distracted during session',
      flag: 'needs-encouragement',
      course: 'PSD-301'
    },
    {
      id: '5',
      type: 'Course Setup',
      student: 'All Students',
      timestamp: '2 days ago',
      summary: 'Updated learning objectives and success criteria',
      flag: null,
      course: 'PSD-301'
    }
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Daily Log': return 'bg-orange-100 text-orange-800';
      case 'Student Profile': return 'bg-green-100 text-green-800';
      case 'Bulk Input': return 'bg-purple-100 text-purple-800';
      case 'Course Setup': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getFlagColor = (flag: string | null) => {
    switch (flag) {
      case 'at-risk': return 'bg-red-100 text-red-800';
      case 'needs-encouragement': return 'bg-yellow-100 text-yellow-800';
      case 'ready-for-challenge': return 'bg-green-100 text-green-800';
      default: return null;
    }
  };

  return (
    <Card className="bg-white border-gray-100 shadow-lg rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          Recent Entries
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentEntries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-blue-50/50 transition-colors">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={getTypeColor(entry.type)}>
                    {entry.type}
                  </Badge>
                  <span className="text-sm text-slate-600">{entry.timestamp}</span>
                  {entry.flag && (
                    <Badge className={getFlagColor(entry.flag)}>
                      {entry.flag.replace('-', ' ')}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-slate-400" />
                  <span className="font-medium text-slate-900">{entry.student}</span>
                  <span className="text-sm text-slate-500">({entry.course})</span>
                </div>
                <p className="text-sm text-slate-600">{entry.summary}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="p-2">
                  <Eye className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" className="p-2">
                  <Edit className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 text-center">
          <Button variant="outline" size="sm">
            View All Entries
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}