'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, Users, Upload, CheckCircle, AlertTriangle, Save } from 'lucide-react';

export function BulkInputForm() {
  const [selectedClass, setSelectedClass] = useState('');
  const [bulkData, setBulkData] = useState({
    sessionDate: new Date().toISOString().split('T')[0],
    topic: '',
    notes: ''
  });

  const mockClasses = [
    { id: '1', name: 'PSD-301 - Morning Session', students: 12 },
    { id: '2', name: 'PSD-301 - Afternoon Session', students: 8 },
    { id: '3', name: 'PSD-201 - Beginner Group', students: 15 }
  ];

  const mockStudents = [
    { 
      id: '1', 
      name: 'Sarah Chen', 
      effortLevel: 'high', 
      engagementLevel: 'high',
      observation: 'Excellent debate performance today',
      flag: null 
    },
    { 
      id: '2', 
      name: 'Michael Rodriguez', 
      effortLevel: 'medium', 
      engagementLevel: 'high',
      observation: 'Good participation in group discussion',
      flag: null 
    },
    { 
      id: '3', 
      name: 'Emma Thompson', 
      effortLevel: 'low', 
      engagementLevel: 'low',
      observation: 'Seemed distracted during session',
      flag: 'needs-encouragement' 
    },
    { 
      id: '4', 
      name: 'David Park', 
      effortLevel: 'high', 
      engagementLevel: 'high',
      observation: 'Ready for advanced material',
      flag: 'ready-for-challenge' 
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-500 rounded-lg">
          <BarChart3 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Bulk Input</h2>
          <p className="text-slate-600">Enter observations for multiple students at once</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Class Selection */}
        <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Class Selection
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="class">Select Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Choose class" />
                </SelectTrigger>
                <SelectContent>
                  {mockClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      <div>
                        <div className="font-medium">{cls.name}</div>
                        <div className="text-sm text-slate-500">{cls.students} students</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date">Session Date</Label>
              <Input
                id="date"
                type="date"
                value={bulkData.sessionDate}
                onChange={(e) => setBulkData({...bulkData, sessionDate: e.target.value})}
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* Session Info */}
        <Card className="lg:col-span-3 bg-white/80 backdrop-blur-sm border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-green-600" />
              Session Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="topic">Session Topic</Label>
              <Input
                id="topic"
                value={bulkData.topic}
                onChange={(e) => setBulkData({...bulkData, topic: e.target.value})}
                placeholder="e.g., Introduction to Parliamentary Debate Format"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="session-notes">General Session Notes</Label>
              <Textarea
                id="session-notes"
                value={bulkData.notes}
                onChange={(e) => setBulkData({...bulkData, notes: e.target.value})}
                placeholder="Overall session observations, activities covered, etc..."
                className="mt-1 min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student Grid */}
      <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Student Observations
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Progress:</span>
              <Progress value={65} className="w-20" />
              <span className="text-sm font-medium">65%</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {mockStudents.map((student) => (
              <Card key={student.id} className="bg-white border-slate-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-slate-900">{student.name}</h4>
                    <div className="flex gap-2">
                      <Badge className={getEffortColor(student.effortLevel)}>
                        {student.effortLevel}
                      </Badge>
                      {student.flag && (
                        <Badge className={getFlagColor(student.flag)}>
                          {student.flag.replace('-', ' ')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Effort</Label>
                        <Select value={student.effortLevel}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Engagement</Label>
                        <Select value={student.engagementLevel}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs">Observation</Label>
                      <Textarea
                        value={student.observation}
                        placeholder="Quick observation..."
                        className="min-h-[60px] text-sm"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="flex-1">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Done
                      </Button>
                      <Button size="sm" variant="outline">
                        <AlertTriangle className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import from CSV
          </Button>
          <Button variant="outline">
            Load Template
          </Button>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            Save Draft
          </Button>
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Save className="w-4 h-4 mr-2" />
            Save All Observations
          </Button>
        </div>
      </div>
    </div>
  );
}