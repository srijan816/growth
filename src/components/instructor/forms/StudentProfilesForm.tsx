'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Users, Search, Plus, Save, User, Target, TrendingUp } from 'lucide-react';

export function StudentProfilesForm() {
  const [selectedStudent, setSelectedStudent] = useState('');
  const [studentData, setStudentData] = useState({
    goals: '',
    motivations: '',
    strengths: '',
    weaknesses: '',
    initialAssessment: ''
  });

  const mockStudents = [
    { id: '1', name: 'Sarah Chen', course: 'PSD-301' },
    { id: '2', name: 'Michael Rodriguez', course: 'PSD-301' },
    { id: '3', name: 'Emma Thompson', course: 'PSD-301' },
    { id: '4', name: 'David Park', course: 'PSD-301' }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-500 rounded-lg">
          <Users className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Student Profiles</h2>
          <p className="text-slate-600">Establish baseline data and initial assessments</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student Selection */}
        <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5 text-blue-600" />
              Select Student
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="student-select">Choose Student</Label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {mockStudents.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{student.name}</span>
                        <Badge variant="outline" className="ml-2">
                          {student.course}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium text-slate-900 mb-3">Recent Students</h4>
              <div className="space-y-2">
                {mockStudents.slice(0, 3).map((student) => (
                  <button
                    key={student.id}
                    onClick={() => setSelectedStudent(student.id)}
                    className="w-full p-3 text-left rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <div className="font-medium text-slate-900">{student.name}</div>
                    <div className="text-sm text-slate-500">{student.course}</div>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Student Goals & Motivations */}
        <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              Goals & Motivations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="student-goals">Student's Stated Goals</Label>
              <Textarea
                id="student-goals"
                value={studentData.goals}
                onChange={(e) => setStudentData({...studentData, goals: e.target.value})}
                placeholder="e.g., Wants to increase SAT score by 150 points, improve public speaking confidence..."
                className="mt-1 min-h-[100px]"
              />
            </div>
            <div>
              <Label htmlFor="student-motivations">Motivations & Context</Label>
              <Textarea
                id="student-motivations"
                value={studentData.motivations}
                onChange={(e) => setStudentData({...studentData, motivations: e.target.value})}
                placeholder="e.g., Parents encouraged enrollment, personal interest in debate, college prep..."
                className="mt-1 min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Baseline Assessment */}
        <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              Baseline Assessment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="strengths">Current Strengths</Label>
              <Textarea
                id="strengths"
                value={studentData.strengths}
                onChange={(e) => setStudentData({...studentData, strengths: e.target.value})}
                placeholder="e.g., Strong vocabulary, creative ideas, good research skills..."
                className="mt-1 min-h-[80px]"
              />
            </div>
            <div>
              <Label htmlFor="weaknesses">Areas for Growth</Label>
              <Textarea
                id="weaknesses"
                value={studentData.weaknesses}
                onChange={(e) => setStudentData({...studentData, weaknesses: e.target.value})}
                placeholder="e.g., Essay structure needs work, struggles with time management..."
                className="mt-1 min-h-[80px]"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Initial Assessment */}
      <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
        <CardHeader>
          <CardTitle>Detailed Initial Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="initial-assessment">Professional Initial Judgment</Label>
            <Textarea
              id="initial-assessment"
              value={studentData.initialAssessment}
              onChange={(e) => setStudentData({...studentData, initialAssessment: e.target.value})}
              placeholder="Comprehensive initial assessment of the student's starting point, learning style, and specific needs..."
              className="mt-1 min-h-[150px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline">
          Clear Form
        </Button>
        <Button className="bg-green-600 hover:bg-green-700">
          <Save className="w-4 h-4 mr-2" />
          Save Student Profile
        </Button>
      </div>
    </div>
  );
}