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
  Settings,
  Home,
  BookOpen,
  TrendingUp,
  Menu,
  X,
  RefreshCw,
  Database,
  Mic,
  User,
  FileSpreadsheet,
  Heart,
  GraduationCap
} from 'lucide-react'

interface SidebarProps {
  className?: string
}

interface NavigationItem {
  name: string
  href: string
  icon: any
  subItems?: NavigationItem[]
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Today\'s Students', href: '/dashboard/today', icon: Calendar },
  { name: 'Feedback Recording', href: '/dashboard/recording', icon: Mic },
  { name: 'Feedback Viewer', href: '/dashboard/feedback-viewer', icon: FileSpreadsheet },
  { name: 'Students', href: '/dashboard/students', icon: User },
  { name: 'Instructor', href: '/instructor', icon: GraduationCap },
  { name: 'Parents', href: '/parents', icon: Heart },
  // { name: 'Data Onboarding', href: '/dashboard/onboarding', icon: FileSpreadsheet },
  { name: 'Admin', href: '/dashboard/admin', icon: Settings },
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
        "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r border-border transform transition-transform duration-300 ease-in-out md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        className
      )}>
        <div className="flex flex-col h-full pt-20 md:pt-6">
          {/* Logo area */}
          <div className="px-6 pb-6">
            <div className="flex items-center">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Growth</h2>
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
                    "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground"
                  )} />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Bottom section */}
          <div className="px-6 py-4 mt-auto">
            <div className="text-xs text-muted-foreground">
              <p className="font-medium">Growth Compass</p>
              <p>Student Progress Tracking</p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}