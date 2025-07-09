// Export all stores from a central location
export { useUIStore } from './ui-store';
export { useAppStore } from './app-store';

// Re-export types for easier imports
export type {
  UIState,
  AppState,
} from './ui-store';

// Store initialization helper
export function initializeStores() {
  // Any store initialization logic goes here
  // For example, setting up store subscriptions or middleware
}

// Reset all stores helper (useful for testing or logout)
export function resetAllStores() {
  // Reset all stores to initial state
  const { getState: getUIState } = useUIStore;
  const { getState: getAppState } = useAppStore;
  
  // Clear persisted state
  if (typeof window !== 'undefined') {
    localStorage.removeItem('growth-compass-ui');
  }
  
  // Reset to initial states
  useUIStore.setState({
    sidebarCollapsed: false,
    theme: 'system',
    modals: {
      feedbackUpload: false,
      studentForm: false,
      courseForm: false,
      bulkActions: false,
    },
    globalLoading: {
      feedbackProcessing: false,
      dataExport: false,
      bulkOperations: false,
    },
    notifications: [],
    viewPreferences: {
      dashboardLayout: 'detailed',
      studentListView: 'table',
      feedbackDisplayMode: 'summary',
      dateRange: {
        start: null,
        end: null,
      },
    },
    searchState: {
      query: '',
      filters: {},
    },
  });
  
  useAppStore.setState({
    user: null,
    selectedStudent: null,
    selectedCourse: null,
    quickActions: {
      lastUsedCourse: null,
      recentStudents: [],
      favoriteActions: [],
    },
    syncStatus: {
      lastSyncTime: null,
      pendingUploads: 0,
      syncInProgress: false,
      offlineMode: false,
    },
    recordingSession: {
      isActive: false,
      studentId: null,
      sessionId: null,
      startTime: null,
      duration: 0,
      status: 'idle',
    },
    feedbackProcessing: {
      activeJobs: [],
      history: [],
    },
    cache: {
      dashboardData: null,
      studentMetrics: {},
    },
    bulkOperations: {
      selectedItems: new Set(),
      operationType: null,
      isProcessing: false,
      progress: 0,
    },
    errors: [],
  });
}

// Store selectors for common patterns
export const selectUser = (state: any) => state.user;
export const selectSelectedStudent = (state: any) => state.selectedStudent;
export const selectTheme = (state: any) => state.theme;
export const selectSidebarCollapsed = (state: any) => state.sidebarCollapsed;
export const selectNotifications = (state: any) => state.notifications;
export const selectGlobalLoading = (state: any) => state.globalLoading;
export const selectRecordingSession = (state: any) => state.recordingSession;
export const selectBulkOperations = (state: any) => state.bulkOperations;