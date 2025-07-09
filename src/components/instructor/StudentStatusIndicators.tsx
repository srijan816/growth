'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Flag,
  Star,
  Clock,
  Target
} from 'lucide-react';

export function StudentStatusIndicators() {
  const studentStatus = [
    {
      id: '1',
      name: 'Sarah Chen',
      course: 'PSD-301',
      progress: 85,
      trend: 'up',
      effortLevel: 'high',
      engagementLevel: 'high',
      lastEntry: '2 hours ago',
      flag: 'ready-for-challenge',
      nextAction: 'Provide advanced material'
    },
    {
      id: '2',
      name: 'Michael Rodriguez',
      course: 'PSD-301',
      progress: 72,
      trend: 'up',
      effortLevel: 'medium',
      engagementLevel: 'high',
      lastEntry: '4 hours ago',
      flag: null,
      nextAction: 'Continue current path'
    },
    {
      id: '3',
      name: 'Emma Thompson',
      course: 'PSD-301',
      progress: 58,
      trend: 'down',
      effortLevel: 'low',
      engagementLevel: 'low',
      lastEntry: '1 day ago',
      flag: 'needs-encouragement',
      nextAction: 'One-on-one check-in'
    },
    {
      id: '4',
      name: 'David Park',
      course: 'PSD-301',
      progress: 78,
      trend: 'stable',
      effortLevel: 'high',
      engagementLevel: 'high',
      lastEntry: '6 hours ago',
      flag: null,
      nextAction: 'Maintain current approach'
    },
    {
      id: '5',
      name: 'Lisa Wong',
      course: 'PSD-301',
      progress: 42,
      trend: 'down',
      effortLevel: 'medium',
      engagementLevel: 'low',
      lastEntry: '2 days ago',
      flag: 'at-risk',
      nextAction: 'Immediate intervention'
    },
    {
      id: '6',
      name: 'James Miller',
      course: 'PSD-301',
      progress: 91,
      trend: 'up',
      effortLevel: 'high',
      engagementLevel: 'high',
      lastEntry: '3 hours ago',
      flag: 'ready-for-challenge',
      nextAction: 'Leadership opportunities'
    }
  ];

  const getEffortColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
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

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-red-600" />;
      default: return <div className="w-4 h-4 rounded-full bg-gray-400" />;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 60) return 'bg-blue-500';
    if (progress >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="bg-white border-gray-100 shadow-lg rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            Student Status Dashboard
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-red-100 text-red-800">
              <AlertTriangle className="w-3 h-3 mr-1" />
              2 At Risk
            </Badge>
            <Badge className="bg-yellow-100 text-yellow-800">
              <Star className="w-3 h-3 mr-1" />
              1 Needs Support
            </Badge>
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              2 Ready for Challenge
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {studentStatus.map((student) => (
            <Card key={student.id} className="bg-white border-slate-200 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-slate-900">{student.name}</h4>
                    <p className="text-sm text-slate-500">{student.course}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(student.trend)}
                    <span className="text-sm font-medium text-slate-600">{student.progress}%</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-500">Progress</span>
                      <span className="text-xs font-medium">{student.progress}%</span>
                    </div>
                    <Progress value={student.progress} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${getEffortColor(student.effortLevel)}`}>
                        {student.effortLevel}
                      </Badge>
                      <Badge className={`text-xs ${getEffortColor(student.engagementLevel)}`}>
                        {student.engagementLevel}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <Clock className="w-3 h-3" />
                      {student.lastEntry}
                    </div>
                  </div>

                  {student.flag && (
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-orange-600" />
                      <Badge className={getFlagColor(student.flag)}>
                        {student.flag.replace('-', ' ')}
                      </Badge>
                    </div>
                  )}

                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Target className="w-3 h-3" />
                      <span>{student.nextAction}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1 text-xs">
                      View Details
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 text-xs">
                      Add Note
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}