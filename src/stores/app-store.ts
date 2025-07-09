import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'instructor' | 'student' | 'parent';
}

interface SelectedStudent {
  id: string;
  name: string;
  email: string;
  enrollments: Array<{
    id: string;
    courseId: string;
    courseCode: string;
    courseName: string;
    status: string;
  }>;
}

interface AppState {
  // User session
  user: User | null;
  setUser: (user: User | null) => void;
  
  // Selected entities for context
  selectedStudent: SelectedStudent | null;
  setSelectedStudent: (student: SelectedStudent | null) => void;
  
  selectedCourse: {
    id: string;
    code: string;
    name: string;
    instructorId: string;
  } | null;
  setSelectedCourse: (course: AppState['selectedCourse']) => void;
  
  // Quick actions state
  quickActions: {
    lastUsedCourse: string | null;
    recentStudents: string[];
    favoriteActions: string[];
  };
  setLastUsedCourse: (courseId: string) => void;
  addRecentStudent: (studentId: string) => void;
  addFavoriteAction: (action: string) => void;
  removeFavoriteAction: (action: string) => void;
  
  // Data sync status
  syncStatus: {
    lastSyncTime: Date | null;
    pendingUploads: number;
    syncInProgress: boolean;
    offlineMode: boolean;
  };
  setSyncStatus: (status: Partial<AppState['syncStatus']>) => void;
  
  // Recording session state
  recordingSession: {
    isActive: boolean;
    studentId: string | null;
    sessionId: string | null;
    startTime: Date | null;
    duration: number;
    status: 'idle' | 'recording' | 'paused' | 'completed' | 'error';
  };
  startRecording: (studentId: string, sessionId: string) => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  setRecordingError: () => void;
  
  // Feedback processing state
  feedbackProcessing: {
    activeJobs: Array<{
      id: string;
      type: 'upload' | 'parse' | 'analyze';
      status: 'pending' | 'processing' | 'completed' | 'error';
      fileName?: string;
      progress: number;
      startTime: Date;
      endTime?: Date;
      error?: string;
    }>;
    history: Array<{
      id: string;
      type: string;
      fileName: string;
      completedAt: Date;
      recordsProcessed: number;
      success: boolean;
    }>;
  };
  addFeedbackJob: (job: Omit<AppState['feedbackProcessing']['activeJobs'][0], 'id' | 'startTime'>) => string;
  updateFeedbackJob: (id: string, updates: Partial<AppState['feedbackProcessing']['activeJobs'][0]>) => void;
  completeFeedbackJob: (id: string, recordsProcessed: number, success: boolean) => void;
  
  // Cache management
  cache: {
    dashboardData: {
      data: any;
      timestamp: Date;
    } | null;
    studentMetrics: Record<string, {
      data: any;
      timestamp: Date;
    }>;
  };
  setCacheData: (key: 'dashboardData', data: any) => void;
  setStudentCache: (studentId: string, data: any) => void;
  clearCache: () => void;
  isCacheValid: (key: 'dashboardData' | string, maxAge?: number) => boolean;
  
  // Bulk operations state
  bulkOperations: {
    selectedItems: Set<string>;
    operationType: 'attendance' | 'enrollment' | 'export' | null;
    isProcessing: boolean;
    progress: number;
  };
  setBulkSelection: (items: Set<string>) => void;
  addToBulkSelection: (itemId: string) => void;
  removeFromBulkSelection: (itemId: string) => void;
  clearBulkSelection: () => void;
  setBulkOperation: (type: AppState['bulkOperations']['operationType']) => void;
  setBulkProgress: (progress: number) => void;
  
  // Error handling
  errors: Array<{
    id: string;
    type: 'api' | 'validation' | 'permission' | 'network';
    message: string;
    details?: any;
    timestamp: Date;
    resolved: boolean;
  }>;
  addError: (error: Omit<AppState['errors'][0], 'id' | 'timestamp' | 'resolved'>) => void;
  resolveError: (id: string) => void;
  clearErrors: () => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // User session
      user: null,
      setUser: (user) => set({ user }),
      
      // Selected entities
      selectedStudent: null,
      setSelectedStudent: (student) => set({ selectedStudent: student }),
      
      selectedCourse: null,
      setSelectedCourse: (course) => set({ selectedCourse: course }),
      
      // Quick actions
      quickActions: {
        lastUsedCourse: null,
        recentStudents: [],
        favoriteActions: [],
      },
      setLastUsedCourse: (courseId) => set((state) => ({
        quickActions: { ...state.quickActions, lastUsedCourse: courseId }
      })),
      addRecentStudent: (studentId) => set((state) => {
        const recent = state.quickActions.recentStudents.filter(id => id !== studentId);
        return {
          quickActions: {
            ...state.quickActions,
            recentStudents: [studentId, ...recent].slice(0, 10) // Keep only 10 recent
          }
        };
      }),
      addFavoriteAction: (action) => set((state) => ({
        quickActions: {
          ...state.quickActions,
          favoriteActions: [...state.quickActions.favoriteActions, action]
        }
      })),
      removeFavoriteAction: (action) => set((state) => ({
        quickActions: {
          ...state.quickActions,
          favoriteActions: state.quickActions.favoriteActions.filter(a => a !== action)
        }
      })),
      
      // Data sync status
      syncStatus: {
        lastSyncTime: null,
        pendingUploads: 0,
        syncInProgress: false,
        offlineMode: false,
      },
      setSyncStatus: (status) => set((state) => ({
        syncStatus: { ...state.syncStatus, ...status }
      })),
      
      // Recording session
      recordingSession: {
        isActive: false,
        studentId: null,
        sessionId: null,
        startTime: null,
        duration: 0,
        status: 'idle',
      },
      startRecording: (studentId, sessionId) => set({
        recordingSession: {
          isActive: true,
          studentId,
          sessionId,
          startTime: new Date(),
          duration: 0,
          status: 'recording',
        }
      }),
      pauseRecording: () => set((state) => ({
        recordingSession: { ...state.recordingSession, status: 'paused' }
      })),
      resumeRecording: () => set((state) => ({
        recordingSession: { ...state.recordingSession, status: 'recording' }
      })),
      stopRecording: () => set((state) => {
        const duration = state.recordingSession.startTime 
          ? Date.now() - state.recordingSession.startTime.getTime()
          : 0;
        return {
          recordingSession: {
            ...state.recordingSession,
            isActive: false,
            status: 'completed',
            duration,
          }
        };
      }),
      setRecordingError: () => set((state) => ({
        recordingSession: { ...state.recordingSession, status: 'error' }
      })),
      
      // Feedback processing
      feedbackProcessing: {
        activeJobs: [],
        history: [],
      },
      addFeedbackJob: (job) => {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const newJob = {
          ...job,
          id,
          startTime: new Date(),
        };
        
        set((state) => ({
          feedbackProcessing: {
            ...state.feedbackProcessing,
            activeJobs: [...state.feedbackProcessing.activeJobs, newJob]
          }
        }));
        
        return id;
      },
      updateFeedbackJob: (id, updates) => set((state) => ({
        feedbackProcessing: {
          ...state.feedbackProcessing,
          activeJobs: state.feedbackProcessing.activeJobs.map(job =>
            job.id === id ? { ...job, ...updates } : job
          )
        }
      })),
      completeFeedbackJob: (id, recordsProcessed, success) => set((state) => {
        const job = state.feedbackProcessing.activeJobs.find(j => j.id === id);
        if (!job) return state;
        
        const historyEntry = {
          id,
          type: job.type,
          fileName: job.fileName || 'Unknown',
          completedAt: new Date(),
          recordsProcessed,
          success,
        };
        
        return {
          feedbackProcessing: {
            activeJobs: state.feedbackProcessing.activeJobs.filter(j => j.id !== id),
            history: [historyEntry, ...state.feedbackProcessing.history].slice(0, 50), // Keep last 50
          }
        };
      }),
      
      // Cache management
      cache: {
        dashboardData: null,
        studentMetrics: {},
      },
      setCacheData: (key, data) => set((state) => ({
        cache: {
          ...state.cache,
          [key]: { data, timestamp: new Date() }
        }
      })),
      setStudentCache: (studentId, data) => set((state) => ({
        cache: {
          ...state.cache,
          studentMetrics: {
            ...state.cache.studentMetrics,
            [studentId]: { data, timestamp: new Date() }
          }
        }
      })),
      clearCache: () => set({
        cache: {
          dashboardData: null,
          studentMetrics: {},
        }
      }),
      isCacheValid: (key, maxAge = 5 * 60 * 1000) => { // 5 minutes default
        const state = get();
        const cacheData = key === 'dashboardData' 
          ? state.cache.dashboardData
          : state.cache.studentMetrics[key];
        
        if (!cacheData) return false;
        
        const age = Date.now() - cacheData.timestamp.getTime();
        return age < maxAge;
      },
      
      // Bulk operations
      bulkOperations: {
        selectedItems: new Set(),
        operationType: null,
        isProcessing: false,
        progress: 0,
      },
      setBulkSelection: (items) => set((state) => ({
        bulkOperations: { ...state.bulkOperations, selectedItems: items }
      })),
      addToBulkSelection: (itemId) => set((state) => {
        const newSelection = new Set(state.bulkOperations.selectedItems);
        newSelection.add(itemId);
        return {
          bulkOperations: { ...state.bulkOperations, selectedItems: newSelection }
        };
      }),
      removeFromBulkSelection: (itemId) => set((state) => {
        const newSelection = new Set(state.bulkOperations.selectedItems);
        newSelection.delete(itemId);
        return {
          bulkOperations: { ...state.bulkOperations, selectedItems: newSelection }
        };
      }),
      clearBulkSelection: () => set((state) => ({
        bulkOperations: { ...state.bulkOperations, selectedItems: new Set() }
      })),
      setBulkOperation: (type) => set((state) => ({
        bulkOperations: { ...state.bulkOperations, operationType: type }
      })),
      setBulkProgress: (progress) => set((state) => ({
        bulkOperations: { ...state.bulkOperations, progress }
      })),
      
      // Error handling
      errors: [],
      addError: (error) => {
        const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
        const newError = {
          ...error,
          id,
          timestamp: new Date(),
          resolved: false,
        };
        
        set((state) => ({
          errors: [newError, ...state.errors].slice(0, 100) // Keep last 100 errors
        }));
      },
      resolveError: (id) => set((state) => ({
        errors: state.errors.map(error =>
          error.id === id ? { ...error, resolved: true } : error
        )
      })),
      clearErrors: () => set({ errors: [] }),
    }),
    {
      name: 'App Store',
    }
  )
);