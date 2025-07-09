import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UIState {
  // Sidebar state
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Theme preferences
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  
  // Modal states
  modals: {
    feedbackUpload: boolean;
    studentForm: boolean;
    courseForm: boolean;
    bulkActions: boolean;
  };
  openModal: (modal: keyof UIState['modals']) => void;
  closeModal: (modal: keyof UIState['modals']) => void;
  closeAllModals: () => void;
  
  // Loading states for global operations
  globalLoading: {
    feedbackProcessing: boolean;
    dataExport: boolean;
    bulkOperations: boolean;
  };
  setGlobalLoading: (key: keyof UIState['globalLoading'], loading: boolean) => void;
  
  // Notifications/Toast queue
  notifications: Array<{
    id: string;
    type: 'success' | 'error' | 'warning' | 'info';
    title: string;
    message?: string;
    timestamp: Date;
    autoHide: boolean;
    duration?: number;
  }>;
  addNotification: (notification: Omit<UIState['notifications'][0], 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // View preferences
  viewPreferences: {
    dashboardLayout: 'compact' | 'detailed';
    studentListView: 'grid' | 'table';
    feedbackDisplayMode: 'summary' | 'detailed';
    dateRange: {
      start: Date | null;
      end: Date | null;
    };
  };
  setViewPreference: <K extends keyof UIState['viewPreferences']>(
    key: K,
    value: UIState['viewPreferences'][K]
  ) => void;
  
  // Search and filters
  searchState: {
    query: string;
    filters: {
      programType?: string;
      instructor?: string;
      status?: string;
      dateRange?: {
        start: Date;
        end: Date;
      };
    };
  };
  setSearchQuery: (query: string) => void;
  setSearchFilters: (filters: Partial<UIState['searchState']['filters']>) => void;
  clearSearch: () => void;
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set, get) => ({
        // Sidebar state
        sidebarCollapsed: false,
        setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
        
        // Theme preferences
        theme: 'system',
        setTheme: (theme) => set({ theme }),
        
        // Modal states
        modals: {
          feedbackUpload: false,
          studentForm: false,
          courseForm: false,
          bulkActions: false,
        },
        openModal: (modal) => set((state) => ({
          modals: { ...state.modals, [modal]: true }
        })),
        closeModal: (modal) => set((state) => ({
          modals: { ...state.modals, [modal]: false }
        })),
        closeAllModals: () => set({
          modals: {
            feedbackUpload: false,
            studentForm: false,
            courseForm: false,
            bulkActions: false,
          }
        }),
        
        // Loading states
        globalLoading: {
          feedbackProcessing: false,
          dataExport: false,
          bulkOperations: false,
        },
        setGlobalLoading: (key, loading) => set((state) => ({
          globalLoading: { ...state.globalLoading, [key]: loading }
        })),
        
        // Notifications
        notifications: [],
        addNotification: (notification) => {
          const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
          const newNotification = {
            ...notification,
            id,
            timestamp: new Date(),
          };
          
          set((state) => ({
            notifications: [...state.notifications, newNotification]
          }));
          
          // Auto-remove notification if autoHide is true
          if (notification.autoHide) {
            setTimeout(() => {
              get().removeNotification(id);
            }, notification.duration || 5000);
          }
        },
        removeNotification: (id) => set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id)
        })),
        clearNotifications: () => set({ notifications: [] }),
        
        // View preferences
        viewPreferences: {
          dashboardLayout: 'detailed',
          studentListView: 'table',
          feedbackDisplayMode: 'summary',
          dateRange: {
            start: null,
            end: null,
          },
        },
        setViewPreference: (key, value) => set((state) => ({
          viewPreferences: { ...state.viewPreferences, [key]: value }
        })),
        
        // Search and filters
        searchState: {
          query: '',
          filters: {},
        },
        setSearchQuery: (query) => set((state) => ({
          searchState: { ...state.searchState, query }
        })),
        setSearchFilters: (filters) => set((state) => ({
          searchState: {
            ...state.searchState,
            filters: { ...state.searchState.filters, ...filters }
          }
        })),
        clearSearch: () => set({
          searchState: { query: '', filters: {} }
        }),
      }),
      {
        name: 'growth-compass-ui',
        partialize: (state) => ({
          // Only persist certain parts of the state
          sidebarCollapsed: state.sidebarCollapsed,
          theme: state.theme,
          viewPreferences: state.viewPreferences,
        }),
      }
    ),
    {
      name: 'UI Store',
    }
  )
);