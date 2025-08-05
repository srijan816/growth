'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  Calendar,
  Clock,
  Users,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Mic,
  BookOpen
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
// Removed dropdown menu imports - using direct links instead

interface ClassSession {
  id: string
  code: string
  name: string
  startTime: string
  endTime: string
  studentCount: number
  location?: string
  status: 'upcoming' | 'ongoing' | 'completed'
  programType: 'PSD' | 'WRITING' | 'RAPS' | 'CRITICAL'
  instructor?: string
}

interface CalendarViewProps {
  sessions: ClassSession[]
  selectedDate: Date
  onDateChange: (date: Date) => void
  onRecordFeedback?: (session: ClassSession) => void
  hideNavigation?: boolean
}

export function CalendarView({ sessions, selectedDate, onDateChange, onRecordFeedback, hideNavigation = false }: CalendarViewProps) {
  const [hoveredSession, setHoveredSession] = useState<string | null>(null)
  const hours = Array.from({ length: 10 }, (_, i) => i + 9) // 9 AM to 6 PM
  
  const getProgramColor = (type: string) => {
    const colors = {
      'PSD': 'bg-purple-100 border-purple-300 text-purple-900',
      'WRITING': 'bg-red-100 border-red-300 text-red-900',
      'RAPS': 'bg-teal-100 border-teal-300 text-teal-900',
      'CRITICAL': 'bg-green-100 border-green-300 text-green-900'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 border-gray-300 text-gray-900'
  }

  const getSessionPosition = (session: ClassSession) => {
    const [startHour, startMin] = session.startTime.split(':').map(Number)
    const [endHour, endMin] = session.endTime.split(':').map(Number)
    
    const startMinutes = (startHour - 9) * 60 + startMin
    const endMinutes = (endHour - 9) * 60 + endMin
    const duration = endMinutes - startMinutes
    
    return {
      top: `${(startMinutes / 60) * 60}px`,
      height: `${(duration / 60) * 60}px`
    }
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const goToToday = () => {
    onDateChange(new Date())
  }

  const goToPrevDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() - 1)
    onDateChange(newDate)
  }

  const goToNextDay = () => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + 1)
    onDateChange(newDate)
  }

  const isToday = selectedDate.toDateString() === new Date().toDateString()

  return (
    <div className="w-full">
      {/* Header */}
      {!hideNavigation && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-semibold">{formatDate(selectedDate)}</h2>
            {!isToday && (
              <Button variant="outline" size="sm" onClick={goToToday}>
                Today
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={goToPrevDay}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={goToNextDay}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <Card className="overflow-hidden">
        <div className="flex">
          {/* Time column */}
          <div className="w-20 border-r bg-muted/20">
            <div className="h-12 border-b" /> {/* Header spacer */}
            {hours.map(hour => (
              <div key={hour} className="h-16 border-b px-2 py-1">
                <span className="text-xs text-muted-foreground">
                  {hour === 12 ? '12 PM' : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
                </span>
              </div>
            ))}
          </div>

          {/* Sessions column */}
          <div className="flex-1 relative">
            {/* Current time indicator */}
            {isToday && (
              <CurrentTimeIndicator />
            )}

            {/* Hour grid lines */}
            <div className="absolute inset-0">
              <div className="h-12 border-b" /> {/* Header */}
              {hours.map(hour => (
                <div key={hour} className="h-16 border-b border-dashed" />
              ))}
            </div>

            {/* Sessions */}
            <div className="relative" style={{ marginTop: '48px' }}>
              {sessions.map(session => {
                const position = getSessionPosition(session)
                return (
                  <Link 
                    key={session.id} 
                    href={`/dashboard/course/${session.code}`}
                    className="block"
                  >
                    <div
                      className={cn(
                        "absolute left-2 right-2 rounded-lg border-2 p-2 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]",
                        getProgramColor(session.programType),
                        session.status === 'completed' && 'opacity-60',
                        hoveredSession === session.id && 'shadow-lg scale-[1.02]'
                      )}
                      style={position}
                      onMouseEnter={() => setHoveredSession(session.id)}
                      onMouseLeave={() => setHoveredSession(null)}
                    >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{session.code}</p>
                        <p className="text-xs opacity-90 truncate">{session.name}</p>
                      </div>
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {session.status}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{session.startTime} - {session.endTime}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{session.studentCount}</span>
                      </div>
                      {session.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{session.location}</span>
                        </div>
                      )}
                    </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4">
        <span className="text-sm text-muted-foreground">Programs:</span>
        {['PSD', 'WRITING', 'RAPS', 'CRITICAL'].map(type => (
          <div key={type} className="flex items-center gap-2">
            <div className={cn("w-3 h-3 rounded", getProgramColor(type).split(' ')[0])} />
            <span className="text-sm text-muted-foreground">{type}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CurrentTimeIndicator() {
  const [position, setPosition] = React.useState(0)

  React.useEffect(() => {
    const updatePosition = () => {
      // Get current time in Hong Kong timezone
      const now = new Date()
      const hkTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Hong_Kong"}))
      const hours = hkTime.getHours()
      const minutes = hkTime.getMinutes()
      
      // Position the line based on HK time
      if (hours >= 9 && hours <= 18) {
        const totalMinutes = (hours - 9) * 60 + minutes
        setPosition((totalMinutes / 60) * 60)
      } else if (hours > 18) {
        // After 6 PM, keep line at bottom
        setPosition(9 * 60)
      } else {
        // Before 9 AM, keep line at top
        setPosition(0)
      }
    }

    updatePosition()
    // Update immediately and then every 10 seconds for accuracy
    const interval = setInterval(updatePosition, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <div 
      className="absolute left-0 right-0 z-10 pointer-events-none"
      style={{ top: `${position + 48}px` }}
    >
      <div className="flex items-center">
        <div className="w-2 h-2 bg-red-500 rounded-full" />
        <div className="flex-1 h-0.5 bg-red-500" />
      </div>
    </div>
  )
}