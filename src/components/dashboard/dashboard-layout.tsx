'use client'

import { ReactNode } from 'react'
import Navbar from './navbar'
import Sidebar from './sidebar'

interface DashboardLayoutProps {
  children: ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="h-screen flex overflow-hidden bg-slate-50">
      <Sidebar />
      
      <div className="flex-1 overflow-hidden flex flex-col md:ml-64">
        <Navbar />
        
        <main className="flex-1 overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}