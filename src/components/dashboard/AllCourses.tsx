'use client'

import React, { useState, useEffect } from 'react'
import CourseCard, { Course } from './CourseCard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Grid3X3, List, Search, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AllCoursesProps {
  initialCourses?: Course[]
}

const sampleCourses: Course[] = [
  // Primary - Writing (Aspiring Writers)
  {
    id: '1',
    code: 'AW 2',
    name: 'Aspiring Writers 2',
    term: 'Spring',
    year: 2025,
    description: 'Foundation writing skills for young writers',
    color: '#0e7490',
    isPinned: false,
    level: 'primary',
    subject: 'writing',
    announcements: 1,
    assignments: 3,
  },
  {
    id: '2',
    code: 'AW 3',
    name: 'Aspiring Writers 3',
    term: 'Spring',
    year: 2025,
    description: 'Developing creative writing abilities',
    color: '#0e7490',
    isPinned: false,
    level: 'primary',
    subject: 'writing',
    announcements: 0,
    assignments: 4,
  },
  {
    id: '3',
    code: 'AW 4',
    name: 'Aspiring Writers 4',
    term: 'Spring',
    year: 2025,
    description: 'Intermediate creative and academic writing',
    color: '#0e7490',
    isPinned: true,
    level: 'primary',
    subject: 'writing',
    announcements: 2,
    assignments: 5,
  },
  {
    id: '4',
    code: 'AW 5',
    name: 'Aspiring Writers 5',
    term: 'Spring',
    year: 2025,
    description: 'Advanced writing techniques and storytelling',
    color: '#0e7490',
    isPinned: false,
    level: 'primary',
    subject: 'writing',
    announcements: 1,
    assignments: 3,
  },
  {
    id: '5',
    code: 'AW 6',
    name: 'Aspiring Writers 6',
    term: 'Spring',
    year: 2025,
    description: 'Mastering various writing genres',
    color: '#0e7490',
    isPinned: false,
    level: 'primary',
    subject: 'writing',
    announcements: 0,
    assignments: 6,
  },
  // Primary - Public Speaking & Debating
  {
    id: '6',
    code: 'G2 PSD Jr',
    name: 'Grade 2 PSD Junior',
    term: 'Spring',
    year: 2025,
    description: 'Introduction to public speaking for young learners',
    color: '#b91c1c',
    isPinned: false,
    level: 'primary',
    subject: 'debate',
    announcements: 1,
    assignments: 2,
  },
  {
    id: '7',
    code: 'G3-4 PSD I',
    name: 'Grade 3-4 PSD I',
    term: 'Spring',
    year: 2025,
    description: 'Beginning public speaking and debate skills',
    color: '#b91c1c',
    isPinned: true,
    level: 'primary',
    subject: 'debate',
    announcements: 3,
    assignments: 4,
  },
  {
    id: '8',
    code: 'G3-4 PSD II',
    name: 'Grade 3-4 PSD II',
    term: 'Spring',
    year: 2025,
    description: 'Intermediate debate techniques for primary students',
    color: '#b91c1c',
    isPinned: false,
    level: 'primary',
    subject: 'debate',
    announcements: 0,
    assignments: 3,
  },
  {
    id: '9',
    code: 'G5-6 PSD I',
    name: 'Grade 5-6 PSD I',
    term: 'Spring',
    year: 2025,
    description: 'Advanced primary debate and argumentation',
    color: '#b91c1c',
    isPinned: false,
    level: 'primary',
    subject: 'debate',
    announcements: 2,
    assignments: 5,
  },
  {
    id: '10',
    code: 'G5-6 PSD II',
    name: 'Grade 5-6 PSD II',
    term: 'Spring',
    year: 2025,
    description: 'Competitive debate preparation for upper primary',
    color: '#b91c1c',
    isPinned: false,
    level: 'primary',
    subject: 'debate',
    announcements: 1,
    assignments: 4,
  },
  // Primary - RAPS
  {
    id: '11',
    code: 'G3-4 RAPS',
    name: 'Grade 3-4 RAPS',
    term: 'Spring',
    year: 2025,
    description: 'Research and problem solving fundamentals',
    color: '#15803d',
    isPinned: false,
    level: 'primary',
    subject: 'raps',
    announcements: 1,
    assignments: 3,
  },
  {
    id: '12',
    code: 'G5-6 RAPS',
    name: 'Grade 5-6 RAPS',
    term: 'Spring',
    year: 2025,
    description: 'Advanced research methodology for primary students',
    color: '#15803d',
    isPinned: false,
    level: 'primary',
    subject: 'raps',
    announcements: 2,
    assignments: 4,
  },
  // Secondary - Academic Writing
  {
    id: '13',
    code: 'AW I/II',
    name: 'Academic Writing I/II',
    term: 'Spring',
    year: 2025,
    description: 'Foundation academic essay writing',
    color: '#a16207',
    isPinned: true,
    level: 'secondary',
    subject: 'writing',
    announcements: 3,
    assignments: 6,
  },
  {
    id: '14',
    code: 'AW III',
    name: 'Academic Writing III',
    term: 'Spring',
    year: 2025,
    description: 'Advanced essay and research paper writing',
    color: '#a16207',
    isPinned: false,
    level: 'secondary',
    subject: 'writing',
    announcements: 1,
    assignments: 5,
  },
  {
    id: '15',
    code: 'College Writing',
    name: 'College Writing',
    term: 'Spring',
    year: 2025,
    description: 'College-level academic writing preparation',
    color: '#a16207',
    isPinned: false,
    level: 'secondary',
    subject: 'writing',
    announcements: 2,
    assignments: 7,
  },
  // Secondary - Public Speaking & Debating
  {
    id: '16',
    code: 'G7-9 PSD I',
    name: 'Grade 7-9 PSD I',
    term: 'Spring',
    year: 2025,
    description: 'Secondary debate fundamentals',
    color: '#1d4ed8',
    isPinned: false,
    level: 'secondary',
    subject: 'debate',
    announcements: 1,
    assignments: 4,
  },
  {
    id: '17',
    code: 'G7-12 PSD II',
    name: 'Grade 7-12 PSD II',
    term: 'Spring',
    year: 2025,
    description: 'Intermediate competitive debate',
    color: '#1d4ed8',
    isPinned: true,
    level: 'secondary',
    subject: 'debate',
    announcements: 3,
    assignments: 5,
  },
  {
    id: '18',
    code: 'G7-12 PSD III',
    name: 'Grade 7-12 PSD III',
    term: 'Spring',
    year: 2025,
    description: 'Advanced debate and public speaking',
    color: '#1d4ed8',
    isPinned: false,
    level: 'secondary',
    subject: 'debate',
    announcements: 0,
    assignments: 6,
  },
  {
    id: '19',
    code: 'PSD OT',
    name: 'PSD Official Team',
    term: 'Spring',
    year: 2025,
    description: 'Elite debate team for competitions',
    color: '#1d4ed8',
    isPinned: true,
    level: 'secondary',
    subject: 'debate',
    announcements: 4,
    assignments: 8,
  },
  // Secondary - Critical Thinking
  {
    id: '20',
    code: 'Mentorship',
    name: 'Critical Thinking Mentorship',
    term: 'Spring',
    year: 2025,
    description: 'One-on-one critical thinking development',
    color: '#7c3aed',
    isPinned: false,
    level: 'secondary',
    subject: 'critical-thinking',
    announcements: 1,
    assignments: 3,
  },
  {
    id: '21',
    code: 'FAST/RAPS',
    name: 'FAST/RAPS',
    term: 'Spring',
    year: 2025,
    description: 'Fast-paced analytical thinking and research',
    color: '#7c3aed',
    isPinned: false,
    level: 'secondary',
    subject: 'critical-thinking',
    announcements: 2,
    assignments: 5,
  },
  {
    id: '22',
    code: 'WDT',
    name: 'WDT',
    term: 'Spring',
    year: 2025,
    description: 'World debate topics and global issues analysis',
    color: '#7c3aed',
    isPinned: false,
    level: 'secondary',
    subject: 'critical-thinking',
    announcements: 1,
    assignments: 4,
  },
]

export default function AllCourses({ initialCourses = sampleCourses }: AllCoursesProps) {
  const [courses, setCourses] = useState<Course[]>(initialCourses)
  const [isGridView, setIsGridView] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterLevel, setFilterLevel] = useState<string>('all')
  const [filterSubject, setFilterSubject] = useState<string>('all')
  const [draggedCourse, setDraggedCourse] = useState<string | null>(null)

  // Load saved preferences
  useEffect(() => {
    const savedCourses = localStorage.getItem('coursePreferences')
    if (savedCourses) {
      setCourses(JSON.parse(savedCourses))
    }
  }, [])

  // Save preferences
  useEffect(() => {
    localStorage.setItem('coursePreferences', JSON.stringify(courses))
  }, [courses])

  const handleDragStart = (e: React.DragEvent, courseId: string) => {
    setDraggedCourse(courseId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    if (!draggedCourse) return

    const draggedIndex = courses.findIndex(c => c.id === draggedCourse)
    if (draggedIndex === -1) return

    const newCourses = [...courses]
    const [removed] = newCourses.splice(draggedIndex, 1)
    newCourses.splice(targetIndex, 0, removed)

    setCourses(newCourses)
    setDraggedCourse(null)
  }

  const handlePin = (courseId: string) => {
    setCourses(prev =>
      prev.map(course =>
        course.id === courseId
          ? { ...course, isPinned: !course.isPinned }
          : course
      )
    )
  }

  const handleColorChange = (courseId: string, color: string) => {
    setCourses(prev =>
      prev.map(course =>
        course.id === courseId
          ? { ...course, color }
          : course
      )
    )
  }

  // Filter courses
  const filteredCourses = courses
    .filter(course => {
      const matchesSearch = course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          course.code.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesLevel = filterLevel === 'all' || course.level === filterLevel
      const matchesSubject = filterSubject === 'all' || course.subject === filterSubject
      return matchesSearch && matchesLevel && matchesSubject
    })
    .sort((a, b) => {
      // Pinned courses first
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return 0
    })

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterLevel} onValueChange={setFilterLevel}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="primary">Primary</SelectItem>
              <SelectItem value="secondary">Secondary</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              <SelectItem value="debate">Debate</SelectItem>
              <SelectItem value="writing">Writing</SelectItem>
              <SelectItem value="critical-thinking">Critical Thinking</SelectItem>
              <SelectItem value="raps">RAPS</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <Button
            variant={isGridView ? "default" : "outline"}
            size="icon"
            onClick={() => setIsGridView(true)}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={!isGridView ? "default" : "outline"}
            size="icon"
            onClick={() => setIsGridView(false)}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Course Grid/List */}
      <div
        className={cn(
          "transition-all duration-300",
          isGridView
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            : "space-y-3"
        )}
      >
        {filteredCourses.map((course, index) => (
          <div
            key={course.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, index)}
          >
            <CourseCard
              course={course}
              onPin={handlePin}
              onColorChange={handleColorChange}
              onDragStart={handleDragStart}
              onDragEnd={() => setDraggedCourse(null)}
              isDragging={draggedCourse === course.id}
              isGridView={isGridView}
            />
          </div>
        ))}
      </div>

      {filteredCourses.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No courses found matching your filters.</p>
        </div>
      )}
    </div>
  )
}