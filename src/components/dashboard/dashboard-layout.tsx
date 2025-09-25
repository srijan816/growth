'use client'

import { ReactNode, useState, useEffect } from 'react'
import Navbar from './navbar'
import Sidebar from './sidebar'
import { cn } from '@/lib/utils'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Sync with sidebar collapsed state
  useEffect(() => {
    const checkSidebarState = () => {
      const savedState = localStorage.getItem('sidebarCollapsed')
      setIsCollapsed(savedState === 'true')
    }

    // Check initial state
    checkSidebarState()

    // Listen for storage changes
    window.addEventListener('storage', checkSidebarState)
    
    // Also listen for custom event for same-tab updates
    const handleSidebarToggle = () => checkSidebarState()
    window.addEventListener('sidebarToggle', handleSidebarToggle)

    return () => {
      window.removeEventListener('storage', checkSidebarState)
      window.removeEventListener('sidebarToggle', handleSidebarToggle)
    }
  }, [])

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      <Sidebar />
      
      <div className={cn(
        "flex-1 overflow-hidden flex flex-col transition-all duration-300",
        isCollapsed ? "md:ml-16" : "md:ml-64"
      )}>
        <Navbar />
        
        <main className="flex-1 overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  )
}