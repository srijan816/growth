'use client'

import React from 'react'
import UniversalSearch from '@/components/search/UniversalSearch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarView } from '@/components/dashboard/CalendarView'
import { 
  Calendar,
  Clock,
  Users,
  TrendingUp,
  User,
  Bell,
  ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function SearchDemo() {
  const [selectedDate, setSelectedDate] = React.useState(new Date())

  // Mock session data
  const mockSession = {
    instructor: 'S',
    name: 'Srijan'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600">
              <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                <path d="M2 17L12 22L22 17" />
                <path d="M2 12L12 17L22 12" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold">Growth Compass</h1>
              <p className="text-xs text-muted-foreground">Capstone Evolve</p>
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Universal Search - Main Feature */}
            <UniversalSearch />

            {/* Coming Up Dropdown */}
            <Button variant="ghost" size="sm" className="hidden md:flex items-center gap-1">
              Coming Up
              <ChevronDown className="h-4 w-4" />
            </Button>

            {/* View Calendar */}
            <Button variant="outline" size="sm" className="hidden md:flex">
              View Calendar
            </Button>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                2
              </span>
            </Button>

            {/* User Avatar */}
            <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-medium">
              {mockSession.instructor}
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 border-r bg-card/50 min-h-[calc(100vh-57px)] hidden md:block">
          <nav className="p-4 space-y-1">
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary text-primary-foreground">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M3 9L12 2L21 9V20C21 21.1 20.1 22 19 22H5C3.9 22 3 21.1 3 20V9Z" />
                <path d="M9 22V12H15V22" />
              </svg>
              Dashboard
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Today's Schedule
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
              </svg>
              All Courses
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <circle cx="12" cy="8" r="7" />
                <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
              </svg>
              Record Feedback
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground">
              <Users className="h-5 w-5" />
              Students
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              Feedback History
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20.84 4.61C20.3 4.07 19.54 3.85 18.78 4.05C17.42 4.4 16.12 4.95 14.93 5.68C13.3 4.65 11.29 4 9.13 4C6.46 4 3.93 5.12 2.25 7.04C1.66 7.66 1.66 8.66 2.25 9.29L7.04 14.08C7.36 14.4 7.79 14.56 8.22 14.56C8.65 14.56 9.08 14.4 9.4 14.08C11.08 12.4 12.01 10.11 12.01 7.61C12.01 6.42 11.66 5.31 11.02 4.36C11.7 3.99 12.42 3.7 13.17 3.5C14.17 3.24 15.24 3.56 15.94 4.35L19.66 8.62C20.24 9.29 20.24 10.29 19.66 10.96L14.08 17.33C13.46 18.03 12.44 18.03 11.82 17.33L10.29 15.59C9.71 14.91 8.71 14.91 8.13 15.59C7.55 16.27 7.55 17.38 8.13 18.06L9.66 19.8C10.61 20.85 11.92 21.42 13.32 21.42C14.72 21.42 16.03 20.85 16.98 19.8L22.57 13.17C23.81 11.77 23.81 9.52 22.57 8.12L20.84 4.61Z" />
              </svg>
              Parent Portal
            </a>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {/* Welcome Section */}
          <div className="mb-6">
            <h1 className="text-2xl font-semibold mb-2">Welcome back, {mockSession.name}</h1>
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 max-w-2xl">
              <div className="flex items-start gap-2">
                <svg className="h-5 w-5 text-blue-600 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 11L12 14L22 4" />
                  <path d="M21 12V19C21 20.1 20.1 21 19 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H16" />
                </svg>
                <p className="text-sm text-blue-800">
                  3 students in PSD-101 showed 15% improvement in speech hooks this week—review feedback?
                </p>
              </div>
            </div>
          </div>

          {/* Feature Showcase */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Universal Search Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium mb-2">🔍 Quick Access</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Cmd+K</kbd> or click the search bar to access universal search
                </p>
              </div>

              <div>
                <h3 className="font-medium mb-2">📚 Search Categories</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Badge className="mb-1">Students</Badge>
                    <p className="text-muted-foreground">Search by name, ID, or course. Shows own students first, then makeup students.</p>
                  </div>
                  <div>
                    <Badge variant="secondary" className="mb-1">Features</Badge>
                    <p className="text-muted-foreground">Quick actions like "Add Feedback", "Progress Reports", etc.</p>
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-1">Courses</Badge>
                    <p className="text-muted-foreground">Find courses by code or name with quick actions.</p>
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-1">Other</Badge>
                    <p className="text-muted-foreground">Notifications, intensives, competitions, and more.</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-2">⚡ Smart Features</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Fuzzy matching for typo-tolerant search</li>
                  <li>• Real-time results as you type (under 200ms)</li>
                  <li>• Keyboard navigation (arrows + enter)</li>
                  <li>• Quick actions for each result</li>
                  <li>• Student previews with ratings and notes</li>
                  <li>• Mobile-responsive design</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Classes Today</p>
                    <p className="text-2xl font-bold">2</p>
                  </div>
                  <Calendar className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Students</p>
                    <p className="text-2xl font-bold">18</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Class Progress</p>
                    <p className="text-2xl font-bold">78%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Next Class</p>
                    <p className="text-2xl font-bold">2:00 PM</p>
                  </div>
                  <Clock className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Next Class Card */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Next: 011PDED2406</CardTitle>
                  <p className="text-sm text-muted-foreground">G7-9 Public Speaking and Debate - Introductory</p>
                </div>
                <Badge>In 30 mins</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Focus Areas</p>
                  <p className="font-medium">Rebuttal Skills</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Students</p>
                  <p className="font-medium">12 attending</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Improving</p>
                  <p className="font-medium text-green-600">8 students</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Need Focus</p>
                  <p className="font-medium text-red-600">2 students</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Calendar/Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Today's Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <CalendarView 
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                sessions={[
                  {
                    id: '1',
                    code: 'PST-101',
                    name: 'Public Speaking Fundamentals',
                    startTime: '09:00',
                    endTime: '10:30',
                    studentCount: 12,
                    location: 'Room A',
                    status: 'completed' as const,
                    programType: 'PSD' as const
                  },
                  {
                    id: '2',
                    code: '011PDED2406',
                    name: 'G7-9 Public Speaking and Debate',
                    startTime: '14:00',
                    endTime: '15:30',
                    studentCount: 12,
                    location: 'Room B',
                    status: 'upcoming' as const,
                    programType: 'PSD' as const
                  }
                ]}
              />
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  )
}