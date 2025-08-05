import dynamic from 'next/dynamic'

export const DynamicFeedbackRecordingWorkflow = dynamic(
  () => import('./recording/FeedbackRecordingWorkflow').then(mod => mod.FeedbackRecordingWorkflow),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading recording interface...</p>
        </div>
      </div>
    )
  }
)

export const DynamicWeeklyCalendarView = dynamic(
  () => import('./recording/WeeklyCalendarView').then(mod => mod.WeeklyCalendarView),
  { ssr: false }
)

export const DynamicDailyCalendarView = dynamic(
  () => import('./recording/DailyCalendarView').then(mod => mod.DailyCalendarView),
  { ssr: false }
)

export const DynamicDebateTeamSetup = dynamic(
  () => import('./recording/DebateTeamSetup').then(mod => mod.DebateTeamSetup),
  { ssr: false }
)

export const DynamicStudentRecordingSession = dynamic(
  () => import('./recording/StudentRecordingSession').then(mod => mod.StudentRecordingSession),
  { ssr: false }
)