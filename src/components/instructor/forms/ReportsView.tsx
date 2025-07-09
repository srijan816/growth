'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { FileText, Download, Share2, Eye, TrendingUp, BarChart3, PieChart, Users } from 'lucide-react';

export function ReportsView() {
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('last-month');

  const mockStudents = [
    { id: '1', name: 'Sarah Chen', course: 'PSD-301' },
    { id: '2', name: 'Michael Rodriguez', course: 'PSD-301' },
    { id: '3', name: 'Emma Thompson', course: 'PSD-301' },
    { id: '4', name: 'David Park', course: 'PSD-301' }
  ];

  const mockGrowthData = {
    overallProgress: 78,
    objectives: [
      { name: 'Persuasive Argumentation', progress: 85, trend: 'up' },
      { name: 'Speech Structure', progress: 75, trend: 'up' },
      { name: 'Vocal Delivery', progress: 82, trend: 'stable' },
      { name: 'Research Skills', progress: 70, trend: 'down' },
      { name: 'Rebuttal Techniques', progress: 88, trend: 'up' }
    ],
    recentObservations: [
      { date: '2024-01-08', observation: 'Excellent debate performance today', flag: null },
      { date: '2024-01-05', observation: 'Showed great improvement in structure', flag: null },
      { date: '2024-01-03', observation: 'Ready for advanced material', flag: 'ready-for-challenge' },
      { date: '2024-01-01', observation: 'Good participation in group discussion', flag: null }
    ]
  };

  const reportTypes = [
    { id: 'individual', name: 'Individual Student Report', icon: Users },
    { id: 'class', name: 'Class Summary Report', icon: BarChart3 },
    { id: 'progress', name: 'Progress Tracking Report', icon: TrendingUp },
    { id: 'intervention', name: 'Intervention Alert Report', icon: FileText }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-cyan-500 rounded-lg">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reports</h2>
          <p className="text-slate-600">Preview how your instructor inputs are displayed</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Report Configuration */}
        <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Report Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="student">Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {mockStudents.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="timeframe">Timeframe</Label>
              <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last-week">Last Week</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="last-quarter">Last Quarter</SelectItem>
                  <SelectItem value="all-time">All Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="pt-4 border-t">
              <Label className="text-sm font-medium">Report Types</Label>
              <div className="mt-2 space-y-2">
                {reportTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      className="w-full p-2 text-left text-sm rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2"
                    >
                      <Icon className="w-4 h-4 text-blue-600" />
                      {type.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Growth Progress Preview */}
        <Card className="lg:col-span-3 bg-white/80 backdrop-blur-sm border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Growth Progress Preview
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button size="sm" variant="outline">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Overall Progress */}
              <div>
                <h4 className="font-medium text-slate-900 mb-4">Overall Progress</h4>
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {mockGrowthData.overallProgress}%
                  </div>
                  <Progress value={mockGrowthData.overallProgress} className="mb-3" />
                  <p className="text-sm text-slate-600">Above expectations</p>
                </div>
              </div>

              {/* Objective Breakdown */}
              <div>
                <h4 className="font-medium text-slate-900 mb-4">Learning Objectives</h4>
                <div className="space-y-3">
                  {mockGrowthData.objectives.map((obj, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700">{obj.name}</span>
                          <Badge variant="outline" className={`text-xs ${
                            obj.trend === 'up' ? 'text-green-600' : 
                            obj.trend === 'down' ? 'text-red-600' : 'text-yellow-600'
                          }`}>
                            {obj.trend}
                          </Badge>
                        </div>
                        <Progress value={obj.progress} className="mt-1 h-2" />
                      </div>
                      <span className="text-sm font-medium text-slate-600 ml-3">
                        {obj.progress}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Observations Preview */}
      <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Recent Observations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockGrowthData.recentObservations.map((obs, index) => (
              <div key={index} className="flex items-start gap-4 p-3 border rounded-lg">
                <div className="text-sm text-slate-500 whitespace-nowrap">
                  {obs.date}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-900">{obs.observation}</p>
                  {obs.flag && (
                    <Badge className="mt-1 text-xs bg-green-100 text-green-800">
                      {obs.flag.replace('-', ' ')}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview Actions */}
      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline">
            <PieChart className="w-4 h-4 mr-2" />
            Class Analytics
          </Button>
          <Button variant="outline">
            <Users className="w-4 h-4 mr-2" />
            Compare Students
          </Button>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            <Eye className="w-4 h-4 mr-2" />
            Preview Report
          </Button>
          <Button className="bg-cyan-600 hover:bg-cyan-700">
            <Download className="w-4 h-4 mr-2" />
            Generate Report
          </Button>
        </div>
      </div>
    </div>
  );
}