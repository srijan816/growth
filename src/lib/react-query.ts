import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false
        }
        // Retry up to 3 times for other errors
        return failureCount < 3
      },
    },
    mutations: {
      retry: 1,
    },
  },
})

// API base URL
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api'

// Utility function for API calls
export async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  return response.json()
}

// Query keys factory
export const queryKeys = {
  dashboard: {
    summary: (filters?: Record<string, any>) => ['dashboard', 'summary', filters],
    metrics: (type: string, filters?: Record<string, any>) => ['dashboard', 'metrics', type, filters],
    todaysClasses: (date?: string) => ['dashboard', 'todays-classes', date || new Date().toISOString().split('T')[0]],
  },
  students: {
    all: (filters?: Record<string, any>) => ['students', filters],
    detail: (id: string) => ['students', id],
    growth: (id: string, filters?: Record<string, any>) => ['students', id, 'growth', filters],
    attendance: (id: string, filters?: Record<string, any>) => ['students', id, 'attendance', filters],
  },
  courses: {
    all: (filters?: Record<string, any>) => ['courses', filters],
    detail: (id: string) => ['courses', id],
    hierarchy: (id: string) => ['courses', id, 'hierarchy'],
    enrollments: (id: string) => ['courses', id, 'enrollments'],
  },
  feedback: {
    all: (filters?: Record<string, any>) => ['feedback', filters],
    summary: (filters?: Record<string, any>) => ['feedback', 'summary', filters],
    byStudent: (studentId: string) => ['feedback', 'student', studentId],
    byCourse: (courseId: string) => ['feedback', 'course', courseId],
  },
  attendance: {
    bySession: (sessionId: string) => ['attendance', 'session', sessionId],
    byStudent: (studentId: string, filters?: Record<string, any>) => ['attendance', 'student', studentId, filters],
    heatmap: (courseId: string, dateRange: { from: Date; to: Date }) => ['attendance', 'heatmap', courseId, dateRange],
  },
  analytics: {
    program: (programType: string) => ['analytics', 'program', programType],
    instructor: (instructorId: string) => ['analytics', 'instructor', instructorId],
    crossProgram: (studentId: string) => ['analytics', 'cross-program', studentId],
    growth: (studentId: string, programType: string, months: number) => ['analytics', 'growth', studentId, programType, months],
  },
  onboarding: {
    session: () => ['onboarding', 'session'],
    templates: (type: string) => ['onboarding', 'templates', type],
  },
  queues: {
    stats: () => ['admin', 'queues', 'stats'],
    jobs: (queueName: string) => ['admin', 'queues', 'jobs', queueName],
  },
}