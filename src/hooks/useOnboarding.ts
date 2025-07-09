import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchAPI } from '@/lib/react-query';

export interface OnboardingUploadResult {
  success: boolean;
  results: {
    total: number;
    succeeded: number;
    failed: number;
    errors: Array<{
      row: number;
      errors: Array<{
        field: string;
        message: string;
      }>;
    }>;
  };
}

export interface OnboardingSession {
  id: string;
  instructor_id: string;
  status: string;
  completed_steps: string[];
  metadata: Record<string, any>;
  started_at: Date;
  completed_at?: Date;
}

export function useOnboarding() {
  // Upload courses
  const uploadCourses = useMutation({
    mutationFn: async (file: File): Promise<OnboardingUploadResult> => {
      const formData = new FormData();
      formData.append('file', file);
      
      return fetchAPI('/api/onboarding/courses', {
        method: 'POST',
        body: formData,
      });
    }
  });

  // Upload enrollments
  const uploadEnrollments = useMutation({
    mutationFn: async (file: File): Promise<OnboardingUploadResult> => {
      const formData = new FormData();
      formData.append('file', file);
      
      return fetchAPI('/api/onboarding/enrollments', {
        method: 'POST',
        body: formData,
      });
    }
  });

  // Upload lesson materials
  const uploadLessons = useMutation({
    mutationFn: async (file: File): Promise<OnboardingUploadResult> => {
      const formData = new FormData();
      formData.append('file', file);
      
      return fetchAPI('/api/onboarding/lessons', {
        method: 'POST',
        body: formData,
      });
    }
  });

  // Download template
  const downloadTemplate = useMutation({
    mutationFn: async (type: 'courses' | 'enrollments' | 'lessons'): Promise<Blob> => {
      const response = await fetch(`/api/onboarding/template?type=${type}`);
      if (!response.ok) {
        throw new Error('Failed to download template');
      }
      return response.blob();
    },
    onSuccess: (blob, type) => {
      // Auto-download the file
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_template.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }
  });

  // Get onboarding session (if we implement session tracking)
  const getSession = useQuery({
    queryKey: ['onboarding', 'session'],
    queryFn: (): Promise<OnboardingSession> => 
      fetchAPI('/api/onboarding/session'),
    enabled: false // Only fetch when needed
  });

  // Generic upload function that routes to the correct endpoint
  const uploadFile = async (step: string, file: File): Promise<OnboardingUploadResult> => {
    switch (step) {
      case 'courses':
        return uploadCourses.mutateAsync(file);
      case 'enrollments':
        return uploadEnrollments.mutateAsync(file);
      case 'lessons':
        return uploadLessons.mutateAsync(file);
      default:
        throw new Error(`Unknown step: ${step}`);
    }
  };

  return {
    uploadCourses,
    uploadEnrollments,
    uploadLessons,
    uploadFile,
    downloadTemplate,
    getSession,
    session: getSession.data,
    isLoading: getSession.isLoading,
    isUploading: uploadCourses.isPending || uploadEnrollments.isPending || uploadLessons.isPending
  };
}