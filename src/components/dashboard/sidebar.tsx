'use client'

import { useState, useEffect } from 'react'
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
  Heart,
  Grid3X3,
  GraduationCap,
  Shield,
  CheckSquare,
  ChevronLeft,
  ChevronRight
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
  { name: 'Today\'s Schedule', href: '/dashboard/today', icon: Calendar },
  { name: 'Take Attendance', href: '/attendance', icon: CheckSquare },
  { name: 'Record Speech', href: '/dashboard/recording', icon: Mic },
  { name: 'Recordings', href: '/dashboard/recordings', icon: Database },
  { name: 'All Courses', href: '/dashboard/courses', icon: Grid3X3 },
  { name: 'Students', href: '/dashboard/students', icon: User },
  { name: 'Parent Portal', href: '/parents', icon: Heart },
]

const adminNavigation = [
  { name: 'Grade Management', href: '/dashboard/admin/grade-management', icon: Shield },
]

export default function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Load collapsed state from localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed')
    if (savedState === 'true') {
      setIsCollapsed(true)
    }
  }, [])

  // Save collapsed state to localStorage
  const toggleCollapse = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('sidebarCollapsed', newState.toString())
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new Event('sidebarToggle'))
  }

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

      {/* Desktop Collapse Toggle Button */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "hidden md:flex fixed top-4 z-50 transition-all duration-300 items-center justify-center w-8 h-8 rounded-full bg-background border shadow-sm hover:shadow-md",
          isCollapsed ? "left-14" : "left-[15rem]"
        )}
        onClick={toggleCollapse}
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </Button>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 bg-sidebar border-r border-border transform transition-all duration-300 ease-in-out",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        isCollapsed ? "md:w-16" : "md:w-64",
        "w-64",
        className
      )}>
        <div className="flex flex-col h-full pt-20 md:pt-6">
          {/* Logo area */}
          <div className={cn(
            "pb-6 transition-all duration-300",
            isCollapsed ? "px-2" : "px-6"
          )}>
            <div className={cn(
              "flex items-center",
              isCollapsed ? "justify-center" : "gap-3"
            )}>
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-blue-600 flex-shrink-0">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              {!isCollapsed && (
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Growth Compass</h2>
                  <p className="text-xs text-muted-foreground">Capstone Evolve</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className={cn(
            "flex-1 space-y-1 overflow-y-auto",
            isCollapsed ? "px-2" : "px-4"
          )}>
            {navigation.map((item) => {
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "group flex items-center py-2.5 text-sm font-medium rounded-lg transition-colors",
                    isCollapsed ? "justify-center px-2" : "px-3",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon className={cn(
                    "h-5 w-5 flex-shrink-0",
                    !isCollapsed && "mr-3",
                    isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground"
                  )} />
                  {!isCollapsed && item.name}
                </Link>
              )
            })}
            
            {/* Admin Section */}
            <div className="mt-4 pt-4 border-t border-border">
              {!isCollapsed && (
                <p className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase">Admin</p>
              )}
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "group flex items-center py-2.5 text-sm font-medium rounded-lg transition-colors",
                      isCollapsed ? "justify-center px-2" : "px-3",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                    title={isCollapsed ? item.name : undefined}
                  >
                    <item.icon className={cn(
                      "h-5 w-5 flex-shrink-0",
                      !isCollapsed && "mr-3",
                      isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground"
                    )} />
                    {!isCollapsed && item.name}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* Bottom section */}
          {!isCollapsed && (
            <div className="px-6 py-4 mt-auto">
              <div className="text-xs text-muted-foreground">
                <p className="font-medium">Growth Compass</p>
                <p>Student Progress Tracking</p>
              </div>
            </div>
          )}
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