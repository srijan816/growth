'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from 'lucide-react'

interface SessionsHistoryTabProps {
  courseId: string
  recentSessions: any[]
}

export default function SessionsHistoryTab({ courseId, recentSessions }: SessionsHistoryTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Sessions History
        </CardTitle>
        <CardDescription>
          View past sessions and attendance records
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentSessions.map((session) => (
            <div key={session.id} className="p-4 border rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium">Session #{session.sessionNumber}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(session.date).toLocaleDateString()} - {session.topic || 'General Session'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">{session.attendanceCount} attended</p>
                  <p className="text-xs text-muted-foreground">Avg rating: {session.avgRating.toFixed(1)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}