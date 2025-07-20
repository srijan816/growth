'use client'

import React from 'react'
import Sidebar from '@/components/dashboard/sidebar'
import AllCourses from '@/components/dashboard/AllCourses'

export default function CoursesDemo() {
  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="md:pl-64">
        <main className="py-6 px-4 md:px-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold tracking-tight">Course Dashboard</h1>
              <p className="text-muted-foreground mt-2">
                A Canvas-inspired course management interface with customizable cards, drag-and-drop reordering, and quick access to course information.
              </p>
            </div>
            
            <div className="bg-muted/10 rounded-lg p-4 mb-6">
              <h2 className="font-semibold mb-2">✨ Features:</h2>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Colorful course cards with customizable colors</li>
                <li>• Drag-and-drop to reorder courses</li>
                <li>• Pin favorite courses to the top</li>
                <li>• Grid and list view options</li>
                <li>• Filter by level (Primary/Secondary) and subject</li>
                <li>• Search functionality</li>
                <li>• Quick access to announcements and assignments</li>
                <li>• Mobile-responsive design</li>
                <li>• Expandable "All Courses" section in sidebar</li>
              </ul>
            </div>
            
            <AllCourses />
          </div>
        </main>
      </div>
    </div>
  )
}