import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';

// Wrapper for dynamic imports with retry logic
function createDynamicImport<T = any>(
  importFunction: () => Promise<T>,
  options: Parameters<typeof dynamic>[1] = {}
) {
  return dynamic(
    async () => {
      let lastError: any;
      
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          return await importFunction();
        } catch (error: any) {
          lastError = error;
          console.warn(`Dynamic import attempt ${attempt} failed:`, error.message);
          
          if (attempt < 3) {
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          }
        }
      }
      
      // If all attempts failed, throw the last error
      throw lastError;
    },
    {
      ...options,
      loading: options.loading || (() => <Skeleton className="h-64 w-full" />),
    }
  );
}

// Loading components
const LoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
  </div>
);

const LoadingCard = () => (
  <div className="space-y-3 p-6">
    <Skeleton className="h-4 w-[250px]" />
    <Skeleton className="h-4 w-[200px]" />
    <Skeleton className="h-4 w-[180px]" />
  </div>
);

// Dynamic imports for heavy components
export const DynamicDebateTeamSetup = createDynamicImport(
  () => import('@/components/recording/DebateTeamSetup').then(mod => mod.DebateTeamSetup),
  {
    loading: () => <LoadingCard />,
  }
);

export const DynamicStudentRecordingSession = createDynamicImport(
  () => import('@/components/recording/StudentRecordingSession').then(mod => mod.StudentRecordingSession),
  {
    loading: () => <LoadingCard />,
  }
);

export const DynamicFeedbackRecordingWorkflow = createDynamicImport(
  () => import('@/components/recording/FeedbackRecordingWorkflow').then(mod => mod.FeedbackRecordingWorkflow),
  {
    loading: () => <LoadingSpinner />,
  }
);

export const DynamicStudentAnalysisAnimation = createDynamicImport(
  () => import('@/components/animations/StudentAnalysisAnimation').then(mod => mod.StudentAnalysisAnimation),
  {
    loading: () => <LoadingSpinner />,
  }
);

export const DynamicQuickEntry = dynamic(
  () => import('@/components/quick-entry/QuickEntry').then(mod => mod.QuickEntry),
  {
    loading: () => <LoadingCard />,
  }
);

export const DynamicMakeupWorkflow = dynamic(
  () => import('@/components/makeup/MakeupWorkflow').then(mod => mod.MakeupWorkflow),
  {
    loading: () => <LoadingCard />,
  }
);

// Growth visualization will be added later
// export const DynamicGrowthVisualization = dynamic(
//   () => import('@/components/growth/growth-visualization').then(mod => mod.GrowthVisualization),
//   {
//     loading: () => <LoadingCard />,
//   }
// );

export const DynamicWeeklyCalendarView = dynamic(
  () => import('@/components/recording/WeeklyCalendarView').then(mod => mod.WeeklyCalendarView),
  {
    loading: () => <LoadingCard />,
  }
);

export const DynamicDailyCalendarView = dynamic(
  () => import('@/components/recording/DailyCalendarView').then(mod => mod.DailyCalendarView),
  {
    loading: () => <LoadingCard />,
  }
);