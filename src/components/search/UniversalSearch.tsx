'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Fuse from 'fuse.js'
import { cn } from '@/lib/utils'
import { 
  Search, 
  X, 
  User, 
  Users,
  BookOpen, 
  Sparkles, 
  Calendar,
  ChevronRight,
  Clock,
  Star,
  AlertCircle,
  FileText,
  Upload,
  Eye,
  Settings,
  Trophy,
  Command
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

// Types
interface SearchResult {
  id: string
  type: 'student' | 'feature' | 'course' | 'other'
  title: string
  subtitle?: string
  description?: string
  icon?: React.ReactNode
  tags?: string[]
  actions?: SearchAction[]
  metadata?: any
  priority?: number
}

interface SearchAction {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  primary?: boolean
}

interface UniversalSearchProps {
  className?: string
  onClose?: () => void
}

// Sample data
const sampleStudents = [
  {
    id: 'student-1',
    type: 'student' as const,
    title: 'Amelia Chen',
    subtitle: 'PST 1.5.6 • Your Student',
    description: 'Grade 5 • Excellent progress',
    tags: ['ID: 123', 'Primary'],
    metadata: {
      studentId: '123',
      courses: ['PST 1.5.6'],
      recentRating: 4.5,
      isOwnStudent: true,
      lastClass: '2 days ago'
    }
  },
  {
    id: 'student-2',
    type: 'student' as const,
    title: 'John Smith',
    subtitle: 'G7-9 PSD I • Makeup Student',
    description: 'From Instructor Jami\'s class',
    tags: ['ID: 456', 'Makeup', 'Secondary'],
    metadata: {
      studentId: '456',
      courses: ['G7-9 PSD I'],
      recentRating: 3.8,
      isMakeup: true,
      originalInstructor: 'Jami',
      makeupReason: 'Absent last week'
    }
  },
  {
    id: 'student-3',
    type: 'student' as const,
    title: 'Sarah Johnson',
    subtitle: 'AW 4 • Your Student',
    description: 'Grade 4 • Needs attention',
    tags: ['ID: 789', 'Primary', 'Focus'],
    metadata: {
      studentId: '789',
      courses: ['AW 4'],
      recentRating: 3.2,
      isOwnStudent: true,
      needsAttention: true
    }
  },
  {
    id: 'student-4',
    type: 'student' as const,
    title: 'Michael Lee',
    subtitle: 'G5-6 RAPS • Your Student',
    description: 'Grade 6 • Consistent performer',
    tags: ['ID: 321', 'Primary'],
    metadata: {
      studentId: '321',
      courses: ['G5-6 RAPS'],
      recentRating: 4.0,
      isOwnStudent: true
    }
  },
  {
    id: 'student-5',
    type: 'student' as const,
    title: 'Emma Wilson',
    subtitle: 'College Writing • Your Student',
    description: 'Grade 11 • Top performer',
    tags: ['ID: 654', 'Secondary', 'Star'],
    metadata: {
      studentId: '654',
      courses: ['College Writing'],
      recentRating: 4.8,
      isOwnStudent: true,
      isTopPerformer: true
    }
  }
]

const sampleFeatures = [
  {
    id: 'feature-1',
    type: 'feature' as const,
    title: 'Add Course Description',
    subtitle: 'Update lesson plan details',
    description: 'Add engaging course descriptions to lesson plans',
    icon: <FileText className="h-4 w-4" />,
    tags: ['Lesson Plans', 'Quick Action']
  },
  {
    id: 'feature-2',
    type: 'feature' as const,
    title: 'Add Feedback',
    subtitle: 'Record student feedback',
    description: 'Quick feedback entry for any class',
    icon: <Sparkles className="h-4 w-4" />,
    tags: ['Recording', 'Feedback']
  },
  {
    id: 'feature-3',
    type: 'feature' as const,
    title: 'Progress Reports',
    subtitle: 'View and generate reports',
    description: 'Access student progress reports and analytics',
    icon: <FileText className="h-4 w-4" />,
    tags: ['Reports', 'Analytics']
  },
  {
    id: 'feature-4',
    type: 'feature' as const,
    title: 'Hide Student',
    subtitle: 'Manage student visibility',
    description: 'Hide departed or inactive students',
    icon: <Eye className="h-4 w-4" />,
    tags: ['Student Management']
  },
  {
    id: 'feature-5',
    type: 'feature' as const,
    title: 'Upload Rubrics',
    subtitle: 'Import assessment criteria',
    description: 'Upload and manage course rubrics',
    icon: <Upload className="h-4 w-4" />,
    tags: ['Assessment', 'Upload']
  }
]

const sampleCourses = [
  {
    id: 'course-1',
    type: 'course' as const,
    title: 'PST 1.5.6',
    subtitle: 'Debate Fundamentals',
    description: 'Spring 2025 • 12 students',
    icon: <BookOpen className="h-4 w-4" />,
    tags: ['Primary', 'Debate']
  },
  {
    id: 'course-2',
    type: 'course' as const,
    title: 'G7-9 PSD I',
    subtitle: 'Secondary Debate',
    description: 'Spring 2025 • 15 students',
    icon: <BookOpen className="h-4 w-4" />,
    tags: ['Secondary', 'Debate']
  },
  {
    id: 'course-3',
    type: 'course' as const,
    title: 'AW 4',
    subtitle: 'Aspiring Writers 4',
    description: 'Spring 2025 • 8 students',
    icon: <BookOpen className="h-4 w-4" />,
    tags: ['Primary', 'Writing']
  },
  {
    id: 'course-4',
    type: 'course' as const,
    title: 'College Writing',
    subtitle: 'Advanced Academic Writing',
    description: 'Spring 2025 • 10 students',
    icon: <BookOpen className="h-4 w-4" />,
    tags: ['Secondary', 'Writing']
  }
]

const sampleOther = [
  {
    id: 'other-1',
    type: 'other' as const,
    title: 'Missing Attendance',
    subtitle: '3 pending entries',
    description: 'Classes with missing attendance records',
    icon: <AlertCircle className="h-4 w-4" />,
    tags: ['Task', 'Urgent']
  },
  {
    id: 'other-2',
    type: 'other' as const,
    title: 'Christmas Intensive',
    subtitle: 'Plan holiday program',
    description: 'Set up intensive course schedule',
    icon: <Calendar className="h-4 w-4" />,
    tags: ['Planning', 'Intensive']
  },
  {
    id: 'other-3',
    type: 'other' as const,
    title: 'Log Achievement',
    subtitle: 'Record competition results',
    description: 'Add student competition achievements',
    icon: <Trophy className="h-4 w-4" />,
    tags: ['Competition', 'Achievement']
  }
]

// Combine all sample data
const allSearchData: SearchResult[] = [
  ...sampleStudents,
  ...sampleFeatures,
  ...sampleCourses,
  ...sampleOther
]

export default function UniversalSearch({ className, onClose }: UniversalSearchProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const searchButtonRef = useRef<HTMLButtonElement>(null)

  // Initialize Fuse.js
  const fuse = new Fuse(allSearchData, {
    keys: [
      { name: 'title', weight: 0.4 },
      { name: 'subtitle', weight: 0.3 },
      { name: 'description', weight: 0.2 },
      { name: 'tags', weight: 0.1 }
    ],
    threshold: 0.3,
    includeScore: true,
    sortFn: (a, b) => {
      // Custom sorting: prioritize by type
      const typePriority = { student: 0, feature: 1, course: 2, other: 3 }
      const typeA = typePriority[a.item.type as keyof typeof typePriority]
      const typeB = typePriority[b.item.type as keyof typeof typePriority]
      
      if (typeA !== typeB) return typeA - typeB
      return a.score - b.score
    }
  })

  // Search handler with debounce
  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    
    try {
      // Fetch real student data
      const studentResponse = await fetch(`/api/search/students?q=${encodeURIComponent(searchQuery)}`)
      
      let students = []
      if (studentResponse.ok) {
        students = await studentResponse.json()
      } else {
        console.error('Student search API error:', studentResponse.status)
      }
      
      // Use Fuse for other data (features, courses, etc.)
      const fuseResults = fuse.search(searchQuery)
      const otherResults = fuseResults
        .filter(result => result.item.type !== 'student')
        .slice(0, 10)
        .map(result => ({
          ...result.item,
          score: result.score
        }))
      
      // Combine real students with other results
      const combinedResults = [...students, ...otherResults].slice(0, 15)
      
      setResults(combinedResults)
      setIsLoading(false)
      setSelectedIndex(0)
    } catch (error) {
      console.error('Search error:', error)
      // Fallback to fuse search
      const fuseResults = fuse.search(searchQuery)
      const searchResults = fuseResults.slice(0, 15).map(result => ({
        ...result.item,
        score: result.score
      }))
      
      setResults(searchResults)
      setIsLoading(false)
      setSelectedIndex(0)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query)
    }, 200)

    return () => clearTimeout(timer)
  }, [query, performSearch])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open search with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(true)
      }

      // Close with Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        setQuery('')
        setResults([])
      }

      // Navigate with arrows
      if (isOpen && results.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedIndex(prev => (prev + 1) % results.length)
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedIndex(prev => (prev - 1 + results.length) % results.length)
        } else if (e.key === 'Enter') {
          e.preventDefault()
          handleResultClick(results[selectedIndex])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, results, selectedIndex])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  // Generate actions for results
  const generateActions = (result: SearchResult): SearchAction[] => {
    switch (result.type) {
      case 'student':
        return [
          {
            label: 'View Profile',
            icon: <User className="h-3 w-3" />,
            onClick: () => router.push(`/dashboard/students/${result.metadata?.studentIdExternal || result.metadata?.studentId}`),
            primary: true
          },
          {
            label: 'Mark Attendance',
            icon: <Clock className="h-3 w-3" />,
            onClick: () => router.push(`/dashboard/attendance?student=${result.metadata?.studentIdExternal || result.metadata?.studentId}`)
          },
          {
            label: 'Add Feedback',
            icon: <Sparkles className="h-3 w-3" />,
            onClick: () => router.push(`/dashboard/recording?student=${result.metadata?.studentIdExternal || result.metadata?.studentId}`)
          }
        ]
      case 'feature':
        switch (result.id) {
          case 'feature-1':
            return [{
              label: 'Open Lesson Plans',
              icon: <ChevronRight className="h-3 w-3" />,
              onClick: () => router.push('/dashboard/lessons?action=add-description'),
              primary: true
            }]
          case 'feature-2':
            return [{
              label: 'Record Feedback',
              icon: <ChevronRight className="h-3 w-3" />,
              onClick: () => router.push('/dashboard/recording'),
              primary: true
            }]
          case 'feature-3':
            return [{
              label: 'View Reports',
              icon: <ChevronRight className="h-3 w-3" />,
              onClick: () => router.push('/dashboard/reports'),
              primary: true
            }]
          default:
            return [{
              label: 'Open',
              icon: <ChevronRight className="h-3 w-3" />,
              onClick: () => console.log('Feature:', result.title),
              primary: true
            }]
        }
      case 'course':
        return [
          {
            label: 'View Roster',
            icon: <Users className="h-3 w-3" />,
            onClick: () => router.push(`/dashboard/courses/${result.id}`),
            primary: true
          },
          {
            label: 'Take Attendance',
            icon: <Clock className="h-3 w-3" />,
            onClick: () => router.push(`/dashboard/attendance?course=${result.title}`)
          },
          {
            label: 'Edit Lesson Plan',
            icon: <FileText className="h-3 w-3" />,
            onClick: () => router.push(`/dashboard/lessons?course=${result.title}`)
          }
        ]
      case 'other':
        return [{
          label: 'Open',
          icon: <ChevronRight className="h-3 w-3" />,
          onClick: () => console.log('Other action:', result.title),
          primary: true
        }]
      default:
        return []
    }
  }

  const handleResultClick = (result: SearchResult) => {
    const actions = generateActions(result)
    if (actions.length > 0 && actions[0].onClick) {
      actions[0].onClick()
      setIsOpen(false)
      setQuery('')
      setResults([])
    }
  }

  const getResultIcon = (result: SearchResult) => {
    if (result.icon) return result.icon
    
    switch (result.type) {
      case 'student':
        return <User className="h-4 w-4" />
      case 'feature':
        return <Sparkles className="h-4 w-4" />
      case 'course':
        return <BookOpen className="h-4 w-4" />
      case 'other':
        return <Settings className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'student':
        return 'text-blue-600 bg-blue-50'
      case 'feature':
        return 'text-purple-600 bg-purple-50'
      case 'course':
        return 'text-green-600 bg-green-50'
      case 'other':
        return 'text-gray-600 bg-gray-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <>
      {/* Search Trigger Button */}
      <button
        ref={searchButtonRef}
        onClick={() => setIsOpen(true)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground",
          "bg-background/60 border rounded-lg hover:bg-accent/50 transition-colors",
          "w-full max-w-md",
          className
        )}
        aria-label="Search students, courses, and features"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Search students, courses, features...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
          <Command className="h-3 w-3" />K
        </kbd>
      </button>

      {/* Search Modal/Overlay */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
            onClick={() => {
              setIsOpen(false)
              setQuery('')
              setResults([])
            }}
          />

          {/* Search Panel positioned absolute to parent */}
          <div className="absolute top-full left-0 right-0 mt-2 w-full max-w-2xl bg-background rounded-lg shadow-2xl border z-50">
              {/* Search Input */}
              <div className="flex items-center gap-3 p-4 border-b">
                <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search students, courses, features..."
                  className="flex-1 bg-transparent outline-none text-base placeholder:text-muted-foreground"
                  aria-label="Search input"
                  autoComplete="off"
                />
                {query && (
                  <button
                    onClick={() => {
                      setQuery('')
                      setResults([])
                      inputRef.current?.focus()
                    }}
                    className="p-1 hover:bg-accent rounded"
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <kbd className="text-xs text-muted-foreground">ESC</kbd>
              </div>

            {/* Results */}
            <div 
              ref={resultsRef}
              className="max-h-[60vh] overflow-y-auto"
              role="listbox"
              aria-label="Search results"
            >
              {isLoading && (
                <div className="p-8 text-center text-muted-foreground">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2" />
                  Searching...
                </div>
              )}

              {!isLoading && query && results.length === 0 && (
                <div className="p-8 text-center">
                  <p className="text-muted-foreground mb-2">No results found for "{query}"</p>
                  <p className="text-sm text-muted-foreground">
                    Try searching for a student name, ID, or actions like "Add Feedback"
                  </p>
                </div>
              )}

              {!isLoading && results.length > 0 && (
                <div className="py-2">
                  {results.map((result, index) => {
                    const actions = generateActions(result)
                    const isSelected = index === selectedIndex

                    return (
                      <div
                        key={result.id}
                        className={cn(
                          "px-4 py-3 cursor-pointer transition-colors",
                          isSelected && "bg-accent",
                          "hover:bg-accent"
                        )}
                        onClick={() => handleResultClick(result)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className={cn(
                            "p-2 rounded-md flex-shrink-0",
                            getTypeColor(result.type)
                          )}>
                            {getResultIcon(result)}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-sm">{result.title}</h4>
                              {result.metadata?.isOwnStudent && (
                                <Badge variant="secondary" className="text-xs">Your Student</Badge>
                              )}
                              {result.metadata?.isMakeup && (
                                <Badge variant="outline" className="text-xs">Makeup</Badge>
                              )}
                              {result.metadata?.needsAttention && (
                                <Badge variant="destructive" className="text-xs">Needs Focus</Badge>
                              )}
                              {result.metadata?.isTopPerformer && (
                                <Badge className="text-xs bg-blue-500">Top Performer</Badge>
                              )}
                            </div>
                            
                            {result.subtitle && (
                              <p className="text-sm text-muted-foreground">{result.subtitle}</p>
                            )}
                            
                            {result.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{result.description}</p>
                            )}

                            {/* Student metadata preview */}
                            {result.type === 'student' && result.metadata && (
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                {result.metadata.recentRating && (
                                  <span className="flex items-center gap-1">
                                    <Star className="h-3 w-3" />
                                    {result.metadata.recentRating}
                                  </span>
                                )}
                                {result.metadata.lastClass && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {result.metadata.lastClass}
                                  </span>
                                )}
                                {result.metadata.makeupReason && (
                                  <span className="flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" />
                                    {result.metadata.makeupReason}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Tags */}
                            {result.tags && result.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {result.tags.map((tag, i) => (
                                  <span 
                                    key={i}
                                    className="text-xs px-1.5 py-0.5 bg-muted rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          {actions.length > 0 && (
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {actions.slice(0, 2).map((action, i) => (
                                <button
                                  key={i}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    action.onClick()
                                    setIsOpen(false)
                                    setQuery('')
                                    setResults([])
                                  }}
                                  className={cn(
                                    "text-xs px-2 py-1 rounded transition-colors",
                                    action.primary
                                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                                  )}
                                >
                                  {action.icon}
                                  <span className="ml-1">{action.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {!query && (
                <div className="p-4 space-y-4">
                  <div>
                    <h3 className="text-xs font-medium text-muted-foreground mb-2">QUICK ACTIONS</h3>
                    <div className="space-y-1">
                      <button 
                        onClick={() => setQuery('Add Feedback')}
                        className="w-full text-left px-3 py-2 rounded hover:bg-accent text-sm"
                      >
                        <Sparkles className="h-4 w-4 inline mr-2" />
                        Add Feedback
                      </button>
                      <button 
                        onClick={() => setQuery('Missing Attendance')}
                        className="w-full text-left px-3 py-2 rounded hover:bg-accent text-sm"
                      >
                        <AlertCircle className="h-4 w-4 inline mr-2" />
                        Check Missing Attendance
                      </button>
                      <button 
                        onClick={() => setQuery('Progress Reports')}
                        className="w-full text-left px-3 py-2 rounded hover:bg-accent text-sm"
                      >
                        <FileText className="h-4 w-4 inline mr-2" />
                        View Progress Reports
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t text-xs text-muted-foreground flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-muted rounded">↓</kbd>
                  Navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded">↵</kbd>
                  Select
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-muted rounded">ESC</kbd>
                  Close
                </span>
              </div>
              {results.length > 15 && (
                <span>Showing 15 of {results.length} results</span>
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}