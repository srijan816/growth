'use client'

import React from 'react'
import TodaysClassesCalendar from '@/components/dashboard/TodaysClassesCalendar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar, Plus, Users, BarChart3 } from 'lucide-react'
import Link from 'next/link'

export default function ClassesPage() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center">
            <Calendar className="mr-3 h-8 w-8 text-blue-600" />
            Today's Classes
          </h1>
          <p className="text-gray-600">View your class schedule and access student management</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <span>{new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Classes Calendar */}
        <TodaysClassesCalendar />
        
        {/* Quick Actions Card */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks and navigation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Link href="/dashboard/quick-entry">
              <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700">
                <Plus className="mr-2 h-4 w-4" />
                Quick Attendance Entry
              </Button>
            </Link>
            <Link href="/dashboard/students" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                All Student Profiles
              </Button>
            </Link>
            <Link href="/dashboard/today" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="mr-2 h-4 w-4" />
                View All Today's Students
              </Button>
            </Link>
            <Link href="/dashboard/analytics" className="block">
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="mr-2 h-4 w-4" />
                Analytics Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}