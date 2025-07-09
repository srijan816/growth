import { Metadata } from 'next';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';

export const metadata: Metadata = {
  title: 'Data Onboarding | Growth Compass',
  description: 'Upload and configure your course data, student enrollments, and lesson materials'
};

export default function OnboardingPage() {
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Data Onboarding
        </h1>
        <p className="text-gray-600">
          Set up your courses, enroll students, and upload lesson materials in three simple steps.
          Each step builds on the previous one, so please complete them in order.
        </p>
      </div>

      <OnboardingWizard />
    </div>
  );
}