'use client'

import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { queryKeys, fetchAPI } from '@/lib/react-query'
import { TodaysClassesCalendarPresentation } from './TodaysClassesCalendar.presentation'

interface TodaysClass {
  code: string
  name: string
  time: string
  duration: string
  studentCount: number
  location?: string
  status: 'upcoming' | 'ongoing' | 'completed'
  priority: 'high' | 'medium' | 'low'
}

interface TodaysClassesCalendarProps {
  className?: string
}

// Container component that handles data fetching and business logic
export function TodaysClassesCalendarContainer({ className }: TodaysClassesCalendarProps) {
  const {
    data: rawClasses,
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: queryKeys.dashboard.todaysClasses(),
    queryFn: () => fetchAPI('/dashboard/todays-classes'),
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider data stale after 2 minutes
  })

  // Transform and process the data
  const classes = React.useMemo(() => {
    if (!rawClasses?.classes) return []

    const now = new Date()
    const todayWeekday = now.getDay()

    return rawClasses.classes
      .filter((classItem: any) => isClassScheduledToday(classItem.code, classItem.name, todayWeekday))
      .map((classItem: any) => transformClassData(classItem, now))
      .sort((a: TodaysClass, b: TodaysClass) => {
        // Sort by status priority (ongoing > upcoming > completed)
        const statusPriority = { 'ongoing': 3, 'upcoming': 2, 'completed': 1 }
        const aPriority = statusPriority[a.status] || 0
        const bPriority = statusPriority[b.status] || 0
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority
        }
        
        // Then sort by time
        return a.time.localeCompare(b.time)
      })
  }, [rawClasses])

  const handleRefresh = React.useCallback(() => {
    refetch()
  }, [refetch])

  const errorMessage = error instanceof Error ? error.message : 'Failed to load classes'

  return (
    <TodaysClassesCalendarPresentation
      classes={classes}
      loading={isLoading}
      error={error ? errorMessage : null}
      onRefresh={handleRefresh}
      className={className}
    />
  )
}

// Business logic functions
function isClassScheduledToday(classCode: string, className: string, todayWeekday: number): boolean {
  const classNameLower = className.toLowerCase()
  
  const dayNames = {
    0: ['sunday', 'sun'],
    1: ['monday', 'mon'],
    2: ['tuesday', 'tue', 'tues'],
    3: ['wednesday', 'wed'],
    4: ['thursday', 'thu', 'thurs'],
    5: ['friday', 'fri'],
    6: ['saturday', 'sat']
  }

  const todayNames = dayNames[todayWeekday as keyof typeof dayNames] || []
  
  // Check if any of today's day names appear in the class name
  return todayNames.some(day => classNameLower.includes(day))
}

function transformClassData(classItem: any, now: Date): TodaysClass {
  const startTime = parseTimeString(classItem.start_time)
  const endTime = parseTimeString(classItem.end_time)
  const currentTime = now.getHours() * 60 + now.getMinutes()

  // Determine status based on time
  let status: TodaysClass['status'] = 'upcoming'
  if (currentTime >= startTime && currentTime <= endTime) {
    status = 'ongoing'
  } else if (currentTime > endTime) {
    status = 'completed'
  }

  // Determine priority based on various factors
  let priority: TodaysClass['priority'] = 'medium'
  if (classItem.student_count > 10) {
    priority = 'high'
  } else if (classItem.student_count < 5) {
    priority = 'low'
  }

  return {
    code: classItem.code,
    name: classItem.name,
    time: formatTime(classItem.start_time, classItem.end_time),
    duration: calculateDuration(classItem.start_time, classItem.end_time),
    studentCount: classItem.student_count || 0,
    location: classItem.location,
    status,
    priority
  }
}

function parseTimeString(timeStr: string): number {
  if (!timeStr) return 0
  
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours * 60 + (minutes || 0)
}

function formatTime(startTime: string, endTime: string): string {
  if (!startTime) return 'TBD'
  
  const formatSingleTime = (time: string) => {
    if (!time) return ''
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const min = minutes || '00'
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${min} ${ampm}`
  }

  const start = formatSingleTime(startTime)
  const end = endTime ? formatSingleTime(endTime) : ''
  
  return end ? `${start} - ${end}` : start
}

function calculateDuration(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return ''
  
  const start = parseTimeString(startTime)
  const end = parseTimeString(endTime)
  const duration = end - start
  
  if (duration <= 0) return ''
  
  const hours = Math.floor(duration / 60)
  const minutes = duration % 60
  
  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }
  
  return `${minutes}m`
}

// Export as default for backward compatibility
export default TodaysClassesCalendarContainer