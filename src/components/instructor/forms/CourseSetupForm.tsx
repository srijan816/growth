'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Settings, Plus, X, Save, BookOpen, Target, Award } from 'lucide-react';

interface CourseSetupFormProps {
  onComplete?: () => void;
}

export function CourseSetupForm({ onComplete }: CourseSetupFormProps) {
  const [learningObjectives, setLearningObjectives] = useState(['']);
  const [successCriteria, setSuccessCriteria] = useState({ excellent: '', good: '', needsImprovement: '' });

  const addLearningObjective = () => {
    setLearningObjectives([...learningObjectives, '']);
  };

  const removeLearningObjective = (index: number) => {
    setLearningObjectives(learningObjectives.filter((_, i) => i !== index));
  };

  const updateLearningObjective = (index: number, value: string) => {
    const updated = [...learningObjectives];
    updated[index] = value;
    setLearningObjectives(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-500 rounded-lg">
          <Settings className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Course Setup</h2>
          <p className="text-slate-600">Define the foundational parameters for your course</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Course Info */}
        <Card className="bg-blue-50/30 border-blue-200 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              Basic Course Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="course-name">Course Name</Label>
              <Input
                id="course-name"
                placeholder="e.g., Advanced Public Speaking & Debate"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="course-code">Course Code</Label>
              <Input
                id="course-code"
                placeholder="e.g., PSD-301"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="course-modality">Course Modality</Label>
              <Select>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select modality" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="academic-enrichment">Academic Enrichment</SelectItem>
                  <SelectItem value="test-prep">Test Preparation</SelectItem>
                  <SelectItem value="admissions-consulting">Admissions Consulting</SelectItem>
                  <SelectItem value="mentorship">Mentorship</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="course-description">Course Description</Label>
              <Textarea
                id="course-description"
                placeholder="Brief description of the course purpose and goals..."
                className="mt-1 min-h-[100px]"
              />
            </div>
          </CardContent>
        </Card>

        {/* Learning Objectives */}
        <Card className="bg-green-50/30 border-green-200 rounded-2xl shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-green-600" />
              Core Learning Objectives
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Define 3-5 key skills or concepts this course is designed to improve
            </p>
            {learningObjectives.map((objective, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={objective}
                  onChange={(e) => updateLearningObjective(index, e.target.value)}
                  placeholder={`Learning objective ${index + 1}`}
                  className="flex-1"
                />
                {learningObjectives.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeLearningObjective(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={addLearningObjective}
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Learning Objective
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Success Criteria */}
      <Card className="bg-purple-50/30 border-purple-200 rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-purple-600" />
            Success Criteria & Rubric
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Define what "excellent," "good," and "needs improvement" look like for your objectives
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="excellent">Excellent Performance</Label>
              <Textarea
                id="excellent"
                value={successCriteria.excellent}
                onChange={(e) => setSuccessCriteria({...successCriteria, excellent: e.target.value})}
                placeholder="What does excellent look like?"
                className="mt-1 min-h-[120px]"
              />
            </div>
            <div>
              <Label htmlFor="good">Good Performance</Label>
              <Textarea
                id="good"
                value={successCriteria.good}
                onChange={(e) => setSuccessCriteria({...successCriteria, good: e.target.value})}
                placeholder="What does good look like?"
                className="mt-1 min-h-[120px]"
              />
            </div>
            <div>
              <Label htmlFor="needs-improvement">Needs Improvement</Label>
              <Textarea
                id="needs-improvement"
                value={successCriteria.needsImprovement}
                onChange={(e) => setSuccessCriteria({...successCriteria, needsImprovement: e.target.value})}
                placeholder="What indicates areas for growth?"
                className="mt-1 min-h-[120px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button variant="outline">
          Cancel
        </Button>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={onComplete}
        >
          <Save className="w-4 h-4 mr-2" />
          Save Course Setup
        </Button>
      </div>
    </div>
  );
}