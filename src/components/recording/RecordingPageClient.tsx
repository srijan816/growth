'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { DynamicFeedbackRecordingWorkflow } from '@/components/dynamic';

export function RecordingPageClient() {
  const searchParams = useSearchParams();
  const classCode = searchParams.get('class');
  const [classSession, setClassSession] = useState(null);
  const [loading, setLoading] = useState(!!classCode);

  useEffect(() => {
    if (classCode) {
      // Fetch class details to create a preSelectedClass object
      fetch(`/api/courses/${classCode}`)
        .then(res => res.json())
        .then(data => {
          if (data.course) {
            // Create a class session object that matches the expected format
            const today = new Date().toISOString();
            setClassSession({
              id: data.course.id,
              courseId: data.course.id,
              courseCode: data.course.courseCode,
              courseName: data.course.courseName,
              sessionDate: today,
              startTime: data.course.startTime || '09:00',
              endTime: data.course.endTime || '10:30',
              topic: '',
              unitNumber: '',
              lessonNumber: '',
              status: 'scheduled',
              enrolledStudents: data.course.enrolledCount || 0
            });
          }
          setLoading(false);
        })
        .catch(err => {
          console.error('Failed to fetch class details:', err);
          setLoading(false);
        });
    }
  }, [classCode]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading class details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Today's Feedback Recording</h1>
          <p className="text-muted-foreground">
            {classCode ? `Recording feedback for ${classCode}` : 'Select a class, organize debate teams, and record student speeches with AI-powered feedback'}
          </p>
        </div>
      </div>

      <DynamicFeedbackRecordingWorkflow preSelectedClass={classSession} />
    </div>
  );
}