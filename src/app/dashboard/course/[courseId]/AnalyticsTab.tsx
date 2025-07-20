'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3, TrendingUp, Users, Target } from 'lucide-react'

interface AnalyticsTabProps {
  courseId: string
  students: any[]
  metrics: any
}

export default function AnalyticsTab({ courseId, students, metrics }: AnalyticsTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Course Analytics
          </CardTitle>
          <CardDescription>
            Performance trends and insights
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Growth Trend Placeholder */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Class Growth Trend
              </h3>
              <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Chart visualization coming soon</p>
              </div>
            </div>

            {/* Skill Distribution Placeholder */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4" />
                Skill Distribution
              </h3>
              <div className="h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                <p className="text-muted-foreground">Radar chart coming soon</p>
              </div>
            </div>

            {/* Student Performance Summary */}
            <div className="col-span-2 space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4" />
                Performance Summary
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">Top Performers</p>
                  <p className="text-2xl font-bold text-green-800">
                    {students.filter(s => s.metrics.avgPerformance >= 4).length}
                  </p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <p className="text-sm text-yellow-700">Steady Progress</p>
                  <p className="text-2xl font-bold text-yellow-800">
                    {students.filter(s => s.metrics.avgPerformance >= 3 && s.metrics.avgPerformance < 4).length}
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-red-700">Need Support</p>
                  <p className="text-2xl font-bold text-red-800">
                    {students.filter(s => s.metrics.avgPerformance < 3).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}