import { useState, useEffect, useCallback } from 'react'
import Fuse from 'fuse.js'

export interface SearchResult {
  id: string
  type: 'student' | 'feature' | 'course' | 'other'
  title: string
  subtitle?: string
  description?: string
  icon?: React.ReactNode
  tags?: string[]
  metadata?: any
  priority?: number
}

interface UseUniversalSearchProps {
  includeStudents?: boolean
  includeFeatures?: boolean
  includeCourses?: boolean
  includeOther?: boolean
  maxResults?: number
}

export function useUniversalSearch({
  includeStudents = true,
  includeFeatures = true,
  includeCourses = true,
  includeOther = true,
  maxResults = 15
}: UseUniversalSearchProps = {}) {
  const [searchData, setSearchData] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch search data from API
  const fetchSearchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const data: SearchResult[] = []

      // Fetch courses
      if (includeCourses) {
        try {
          const response = await fetch('/api/courses')
          const result = await response.json()
          
          if (result.courses) {
            const courseResults: SearchResult[] = result.courses.map((course: any) => ({
              id: `course-${course.id}`,
              type: 'course' as const,
              title: course.code,
              subtitle: course.name,
              description: `${course.term} ${course.year} • ${course.studentCount || 0} students`,
              tags: [course.level, course.subject],
              metadata: {
                courseId: course.id,
                studentCount: course.studentCount || 0,
                schedule: course.schedule
              }
            }))
            data.push(...courseResults)
          }
        } catch (err) {
          console.error('Error fetching courses:', err)
        }
      }

      // Add static features
      if (includeFeatures) {
        const features: SearchResult[] = [
          {
            id: 'feature-add-feedback',
            type: 'feature',
            title: 'Add Feedback',
            subtitle: 'Record student feedback',
            description: 'Quick feedback entry for any class',
            tags: ['Recording', 'Feedback']
          },
          {
            id: 'feature-progress-reports',
            type: 'feature',
            title: 'Progress Reports',
            subtitle: 'View and generate reports',
            description: 'Access student progress reports and analytics',
            tags: ['Reports', 'Analytics']
          },
          {
            id: 'feature-attendance',
            type: 'feature',
            title: 'Take Attendance',
            subtitle: 'Mark student attendance',
            description: 'Quick attendance marking for current class',
            tags: ['Attendance', 'Quick Action']
          },
          {
            id: 'feature-lesson-plans',
            type: 'feature',
            title: 'Lesson Plans',
            subtitle: 'Manage course content',
            description: 'Add descriptions and manage lesson plans',
            tags: ['Lesson Plans', 'Content']
          }
        ]
        data.push(...features)
      }

      // Add other items
      if (includeOther) {
        const other: SearchResult[] = [
          {
            id: 'other-missing-attendance',
            type: 'other',
            title: 'Missing Attendance',
            subtitle: 'Pending entries',
            description: 'Classes with missing attendance records',
            tags: ['Task', 'Urgent']
          }
        ]
        data.push(...other)
      }

      // Set static data for features and other items
      setSearchData(data)
    } catch (err) {
      setError('Failed to load search data')
      console.error('Search data error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [includeStudents, includeFeatures, includeCourses, includeOther])

  // Load data on mount
  useEffect(() => {
    fetchSearchData()
  }, [fetchSearchData])

  // Perform search with API call for students
  const search = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!query.trim()) return []

    const results: SearchResult[] = []

    // Search students via API
    if (includeStudents && query.length > 0) {
      try {
        const response = await fetch(`/api/search/students?q=${encodeURIComponent(query)}`)
        if (response.ok) {
          const students = await response.json()
          results.push(...students)
        }
      } catch (err) {
        console.error('Error searching students:', err)
      }
    }

    // Search static data (features, courses, other)
    const staticData = searchData.filter(item => item.type !== 'student')
    if (staticData.length > 0) {
      const fuse = new Fuse(staticData, {
        keys: [
          { name: 'title', weight: 0.4 },
          { name: 'subtitle', weight: 0.3 },
          { name: 'description', weight: 0.2 },
          { name: 'tags', weight: 0.1 }
        ],
        threshold: 0.3,
        includeScore: true
      })

      const staticResults = fuse.search(query)
      results.push(...staticResults.map(r => r.item))
    }

    // Sort results with student priority
    results.sort((a, b) => {
      const typePriority = { student: 0, feature: 1, course: 2, other: 3 }
      const typeA = typePriority[a.type as keyof typeof typePriority]
      const typeB = typePriority[b.type as keyof typeof typePriority]
      return typeA - typeB
    })

    return results.slice(0, maxResults)
  }, [searchData, maxResults, includeStudents])

  return {
    search,
    searchData,
    isLoading,
    error,
    refetch: fetchSearchData
  }
}