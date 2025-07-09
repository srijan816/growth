import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAPI, queryKeys } from '@/lib/react-query'

// Dashboard summary hook
export function useDashboardSummary(filters?: {
  dateFrom?: string
  dateTo?: string
}) {
  return useQuery({
    queryKey: queryKeys.dashboard.summary(filters),
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters?.dateTo) params.set('dateTo', filters.dateTo)
      
      return fetchAPI(`/dashboard/summary?${params.toString()}`)
    },
    staleTime: 2 * 60 * 1000, // 2 minutes for dashboard data
  })
}

// Dashboard metrics hook
export function useDashboardMetrics(
  type: 'overview' | 'program' | 'course' | 'student' | 'growth' | 'legacy',
  filters?: {
    programType?: string
    courseId?: string
    studentId?: string
    timeframe?: '1month' | '3months' | '6months' | '1year'
  }
) {
  return useQuery({
    queryKey: queryKeys.dashboard.metrics(type, filters),
    queryFn: () => {
      const params = new URLSearchParams({ type })
      if (filters?.programType) params.set('program', filters.programType)
      if (filters?.courseId) params.set('courseId', filters.courseId)
      if (filters?.studentId) params.set('studentId', filters.studentId)
      if (filters?.timeframe) params.set('timeframe', filters.timeframe)
      
      return fetchAPI(`/dashboard/metrics?${params.toString()}`)
    },
    enabled: !!type,
  })
}

// Student data hooks
export function useStudentDetail(studentId: string) {
  return useQuery({
    queryKey: queryKeys.students.detail(studentId),
    queryFn: () => fetchAPI(`/students/${studentId}`),
    enabled: !!studentId,
  })
}

export function useStudentGrowth(studentId: string, filters?: {
  programType?: string
  timeframe?: string
}) {
  return useQuery({
    queryKey: queryKeys.students.growth(studentId, filters),
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters?.programType) params.set('program', filters.programType)
      if (filters?.timeframe) params.set('timeframe', filters.timeframe)
      
      return fetchAPI(`/students/${studentId}/growth?${params.toString()}`)
    },
    enabled: !!studentId,
  })
}

export function useStudentAttendance(studentId: string, filters?: {
  courseId?: string
  dateFrom?: string
  dateTo?: string
}) {
  return useQuery({
    queryKey: queryKeys.students.attendance(studentId, filters),
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters?.courseId) params.set('courseId', filters.courseId)
      if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters?.dateTo) params.set('dateTo', filters.dateTo)
      
      return fetchAPI(`/students/${studentId}/attendance?${params.toString()}`)
    },
    enabled: !!studentId,
  })
}

// Course data hooks
export function useCourseDetail(courseId: string) {
  return useQuery({
    queryKey: queryKeys.courses.detail(courseId),
    queryFn: () => fetchAPI(`/courses/${courseId}`),
    enabled: !!courseId,
  })
}

export function useCourseHierarchy(courseId: string) {
  return useQuery({
    queryKey: queryKeys.courses.hierarchy(courseId),
    queryFn: () => fetchAPI(`/courses/${courseId}/hierarchy`),
    enabled: !!courseId,
  })
}

export function useCourseEnrollments(courseId: string) {
  return useQuery({
    queryKey: queryKeys.courses.enrollments(courseId),
    queryFn: () => fetchAPI(`/courses/${courseId}/enrollments`),
    enabled: !!courseId,
  })
}

// Feedback hooks
export function useFeedbackSummary(filters?: {
  instructorId?: string
  dateFrom?: string
  dateTo?: string
}) {
  return useQuery({
    queryKey: queryKeys.feedback.summary(filters),
    queryFn: () => {
      const params = new URLSearchParams()
      if (filters?.instructorId) params.set('instructorId', filters.instructorId)
      if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom)
      if (filters?.dateTo) params.set('dateTo', filters.dateTo)
      
      return fetchAPI(`/feedback/summary?${params.toString()}`)
    },
  })
}

export function useStudentFeedback(studentId: string) {
  return useQuery({
    queryKey: queryKeys.feedback.byStudent(studentId),
    queryFn: () => fetchAPI(`/feedback/student/${studentId}`),
    enabled: !!studentId,
  })
}

// Attendance hooks
export function useSessionAttendance(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.attendance.bySession(sessionId),
    queryFn: () => fetchAPI(`/attendance/session/${sessionId}`),
    enabled: !!sessionId,
  })
}

export function useAttendanceHeatmap(
  courseId: string,
  dateRange: { from: Date; to: Date }
) {
  return useQuery({
    queryKey: queryKeys.attendance.heatmap(courseId, dateRange),
    queryFn: () => {
      const params = new URLSearchParams({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      })
      return fetchAPI(`/attendance/heatmap/${courseId}?${params.toString()}`)
    },
    enabled: !!courseId,
  })
}

// Analytics hooks
export function useProgramAnalytics(programType: string) {
  return useQuery({
    queryKey: queryKeys.analytics.program(programType),
    queryFn: () => fetchAPI(`/analytics/program/${programType}`),
    enabled: !!programType,
  })
}

export function useInstructorAnalytics(instructorId: string) {
  return useQuery({
    queryKey: queryKeys.analytics.instructor(instructorId),
    queryFn: () => fetchAPI(`/analytics/instructor/${instructorId}`),
    enabled: !!instructorId,
  })
}

export function useCrossProgramAnalytics(studentId: string) {
  return useQuery({
    queryKey: queryKeys.analytics.crossProgram(studentId),
    queryFn: () => fetchAPI(`/analytics/cross-program/${studentId}`),
    enabled: !!studentId,
  })
}

// Mutations for data updates
export function useRecordAttendance() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: {
      sessionId: string
      attendances: Array<{
        studentId: string
        status: 'present' | 'absent' | 'makeup'
        attitudeRating?: number
        questionsRating?: number
        skillsRating?: number
        feedbackRating?: number
        notes?: string
      }>
    }) => fetchAPI('/attendance/record', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.attendance.bySession(variables.sessionId) 
      })
      queryClient.invalidateQueries({ 
        queryKey: ['dashboard'] 
      })
    },
  })
}

export function useUploadFeedback() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (formData: FormData) => 
      fetch('/api/feedback/upload', {
        method: 'POST',
        body: formData,
      }).then(res => {
        if (!res.ok) throw new Error('Upload failed')
        return res.json()
      }),
    onSuccess: () => {
      // Invalidate feedback queries
      queryClient.invalidateQueries({ queryKey: ['feedback'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}