'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, User, FileText, Flag, AlertTriangle, CheckCircle, Star } from 'lucide-react';

export function DailyLogsForm() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [observationData, setObservationData] = useState({
    spotlightObservation: '',
    effortLevel: '',
    engagementLevel: '',
    interventionFlag: '',
    notes: ''
  });

  const mockStudents = [
    { id: '1', name: 'Sarah Chen', course: 'PSD-301' },
    { id: '2', name: 'Michael Rodriguez', course: 'PSD-301' },
    { id: '3', name: 'Emma Thompson', course: 'PSD-301' },
    { id: '4', name: 'David Park', course: 'PSD-301' }
  ];

  const effortLevels = [
    { value: 'high', label: 'High', color: 'bg-green-100 text-green-800' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'low', label: 'Low', color: 'bg-red-100 text-red-800' }
  ];

  const interventionFlags = [
    { value: 'at-risk', label: 'At Risk', icon: AlertTriangle, color: 'bg-red-100 text-red-800' },
    { value: 'needs-encouragement', label: 'Needs Encouragement', icon: Star, color: 'bg-yellow-100 text-yellow-800' },
    { value: 'ready-for-challenge', label: 'Ready for Challenge', icon: CheckCircle, color: 'bg-green-100 text-green-800' }
  ];

  const quickObservations = [
    "Had a breakthrough 'aha!' moment",
    "Showed great leadership in group work",
    "Was unusually quiet today",
    "Made significant improvement in presentation skills",
    "Struggled with time management",
    "Demonstrated excellent critical thinking",
    "Needed extra support with concept",
    "Showed increased confidence"
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-500 rounded-lg">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Daily Logs</h2>
          <p className="text-slate-600">Record ongoing observations and student progress</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Date and Student Selection */}
        <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Session Info
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="student">Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select student" />
                </SelectTrigger>
                <SelectContent>
                  {mockStudents.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{student.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Spotlight Observation */}
        <Card className="lg:col-span-2 bg-white/80 backdrop-blur-sm border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Spotlight Observation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="spotlight">Specific Observable Event</Label>
              <Textarea
                id="spotlight"
                value={observationData.spotlightObservation}
                onChange={(e) => setObservationData({...observationData, spotlightObservation: e.target.value})}
                placeholder="Describe a specific, observable event or behavior..."
                className="mt-1 min-h-[120px]"
              />
            </div>
            <div>
              <Label className="text-sm text-slate-600 mb-2 block">Quick Templates</Label>
              <div className="flex flex-wrap gap-2">
                {quickObservations.map((obs, index) => (
                  <button
                    key={index}
                    onClick={() => setObservationData({...observationData, spotlightObservation: obs})}
                    className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                  >
                    {obs}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Effort & Engagement */}
        <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-600" />
              Effort & Engagement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="effort">Effort Level</Label>
              <Select value={observationData.effortLevel} onValueChange={(value) => setObservationData({...observationData, effortLevel: value})}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select effort level" />
                </SelectTrigger>
                <SelectContent>
                  {effortLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center gap-2">
                        <Badge className={level.color}>{level.label}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="engagement">Engagement Level</Label>
              <Select value={observationData.engagementLevel} onValueChange={(value) => setObservationData({...observationData, engagementLevel: value})}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select engagement" />
                </SelectTrigger>
                <SelectContent>
                  {effortLevels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div className="flex items-center gap-2">
                        <Badge className={level.color}>{level.label}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Intervention Flags and Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-red-600" />
              Intervention Flags
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="intervention">Flag Type</Label>
              <Select value={observationData.interventionFlag} onValueChange={(value) => setObservationData({...observationData, interventionFlag: value})}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select flag (if any)" />
                </SelectTrigger>
                <SelectContent>
                  {interventionFlags.map((flag) => {
                    const Icon = flag.icon;
                    return (
                      <SelectItem key={flag.value} value={flag.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span>{flag.label}</span>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-slate-600">
              <p><strong>At Risk:</strong> Needs immediate attention</p>
              <p><strong>Needs Encouragement:</strong> Could benefit from extra support</p>
              <p><strong>Ready for Challenge:</strong> Prepared for advanced material</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Additional Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="notes">Additional Observations</Label>
              <Textarea
                id="notes"
                value={observationData.notes}
                onChange={(e) => setObservationData({...observationData, notes: e.target.value})}
                placeholder="Any additional context, follow-up actions, or notes..."
                className="mt-1 min-h-[120px]"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Previous Student
          </Button>
          <Button variant="outline" size="sm">
            Next Student
          </Button>
        </div>
        <div className="flex gap-3">
          <Button variant="outline">
            Save & Next
          </Button>
          <Button className="bg-orange-600 hover:bg-orange-700">
            <FileText className="w-4 h-4 mr-2" />
            Save Daily Log
          </Button>
        </div>
      </div>
    </div>
  );
}