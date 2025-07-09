'use client'

import { ReactNode } from 'react'
import Navbar from './navbar'
import Sidebar from './sidebar'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 overflow-hidden flex flex-col md:ml-64">
        <Navbar />
        
        <main className="flex-1 overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  )
}