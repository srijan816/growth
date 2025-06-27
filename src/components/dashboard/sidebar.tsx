'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Users,
  Upload,
  BarChart3,
  Settings,
  Home,
  BookOpen,
  TrendingUp,
  Menu,
  X,
  Zap,
  RefreshCw,
  Database,
  Mic
} from 'lucide-react'

interface SidebarProps {
  className?: string
}

const navigation = [
  { name: 'Growth Overview', href: '/dashboard', icon: TrendingUp },
  { name: 'Today\'s Classes', href: '/dashboard/classes', icon: Calendar },
  { name: 'Today\'s Students', href: '/dashboard/today', icon: Users },
  { name: 'Quick Entry', href: '/dashboard/quick-entry', icon: Zap, featured: true },
  { name: 'Today\'s Feedback Recording', href: '/dashboard/recording', icon: Mic, featured: true },
  { name: 'Student Profiles', href: '/dashboard/students', icon: Users },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
]

export default function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <>
      {/* Mobile menu button */}
      <Button 
        variant="ghost" 
        size="sm"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        className
      )}>
        <div className="flex flex-col h-full pt-20 md:pt-6">
          {/* Logo area for mobile */}
          <div className="px-6 pb-6 md:hidden">
            <div className="flex items-center justify-center">
              <img src="/capstone-evolve-logo.png" alt="Capstone Evolve" className="h-40 w-auto" />
            </div>
          </div>

          {/* Growth Stats */}
          <div className="px-6 pb-6">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Students Growing</p>
                  <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">28</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
              <div className="mt-2 flex items-center space-x-2">
                <Badge variant="secondary" className="text-xs">↑ 12% this month</Badge>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-gradient-to-r from-blue-50 to-purple-50 text-purple-700 border-l-3 border-purple-600"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <item.icon className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive ? "text-purple-600" : "text-slate-400 group-hover:text-slate-500"
                  )} />
                  {item.name}
                  {item.name === 'Quick Entry' && (
                    <Badge variant="default" className="ml-auto text-xs bg-purple-600">Phase 1</Badge>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Bottom section */}
          <div className="px-6 py-4 border-t border-slate-200">
            <div className="text-xs text-slate-500">
              <p>Phase 0 - Foundation</p>
              <p className="font-medium text-slate-700">v1.0.0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-30 bg-slate-600 bg-opacity-50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}