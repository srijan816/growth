'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Star, Megaphone, FileText, Calendar, MoreVertical, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export interface Course {
  id: string
  code: string
  name: string
  term: string
  year: number
  description?: string
  color: string
  isPinned?: boolean
  level: 'primary' | 'secondary'
  subject: 'debate' | 'writing' | 'critical-thinking' | 'raps'
  announcements?: number
  assignments?: number
}

interface CourseCardProps {
  course: Course
  onPin?: (courseId: string) => void
  onColorChange?: (courseId: string, color: string) => void
  onDragStart?: (e: React.DragEvent, courseId: string) => void
  onDragEnd?: (e: React.DragEvent) => void
  isDragging?: boolean
  isGridView?: boolean
}

const colorOptions = [
  '#b91c1c', // Red 700
  '#0e7490', // Cyan 700
  '#1d4ed8', // Blue 700
  '#a16207', // Amber 700
  '#7c3aed', // Violet 600
  '#15803d', // Green 700
  '#c2410c', // Orange 700
  '#0f766e', // Teal 700
  '#be123c', // Rose 700
  '#7c2d12', // Brown 800
  '#1e3a8a', // Blue 900
  '#14532d', // Green 900
]

export default function CourseCard({
  course,
  onPin,
  onColorChange,
  onDragStart,
  onDragEnd,
  isDragging,
  isGridView = true,
}: CourseCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden transition-all duration-200 cursor-pointer",
        "hover:shadow-lg hover:scale-[1.02]",
        isDragging && "opacity-50",
        isGridView ? "h-48" : "h-24"
      )}
      draggable
      onDragStart={(e) => onDragStart?.(e, course.id)}
      onDragEnd={onDragEnd}
      style={{
        backgroundColor: course.color,
      }}
    >
      <div className="absolute top-2 right-2 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
          onClick={(e) => {
            e.stopPropagation()
            onPin?.(course.id)
          }}
        >
          <Star
            className={cn(
              "h-4 w-4",
              course.isPinned && "fill-current"
            )}
          />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white/80 hover:text-white hover:bg-white/20"
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>
              <div className="flex items-center gap-2">
                <span>Change Color</span>
              </div>
            </DropdownMenuItem>
            <div className="grid grid-cols-4 gap-1 p-2">
              {colorOptions.map((color) => (
                <button
                  key={color}
                  className="w-8 h-8 rounded-md hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => onColorChange?.(course.id, color)}
                />
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="absolute top-2 left-2 cursor-move">
        <GripVertical className="h-4 w-4 text-white/60" />
      </div>

      <div className={cn(
        "p-4 text-white",
        isGridView ? "pt-8" : "pt-4"
      )}>
        <div className={cn(
          "font-bold",
          isGridView ? "text-lg mb-1" : "text-base"
        )}>
          {course.code}
        </div>
        <div className={cn(
          "text-white/90",
          isGridView ? "text-sm mb-2" : "text-xs"
        )}>
          {course.name}
        </div>
        {isGridView && (
          <>
            <div className="text-xs text-white/70 mb-4">
              {course.term} {course.year}
            </div>
            {course.description && (
              <div className="text-xs text-white/80 line-clamp-2">
                {course.description}
              </div>
            )}
          </>
        )}
      </div>

      {/* Quick Action Icons */}
      <div className={cn(
        "absolute flex items-center gap-3",
        isGridView ? "bottom-3 right-3" : "bottom-2 right-3"
      )}>
        {course.announcements && course.announcements > 0 && (
          <div className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-1">
            <Megaphone className="h-3 w-3 text-white" />
            <span className="text-xs text-white">{course.announcements}</span>
          </div>
        )}
        {course.assignments && course.assignments > 0 && (
          <div className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-1">
            <FileText className="h-3 w-3 text-white" />
            <span className="text-xs text-white">{course.assignments}</span>
          </div>
        )}
        <Calendar className="h-4 w-4 text-white/80" />
      </div>

      {/* Level Badge */}
      <Badge
        variant="secondary"
        className={cn(
          "absolute bg-white/20 text-white border-0",
          isGridView ? "bottom-3 left-3" : "bottom-2 left-3"
        )}
      >
        {course.level}
      </Badge>
    </Card>
  )
}