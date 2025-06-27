'use client';

import { DynamicFeedbackRecordingWorkflow } from '@/components/dynamic';

export function RecordingPageClient() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Today's Feedback Recording</h1>
          <p className="text-muted-foreground">
            Select a class, organize debate teams, and record student speeches with AI-powered feedback
          </p>
        </div>
      </div>

      <DynamicFeedbackRecordingWorkflow />
    </div>
  );
}