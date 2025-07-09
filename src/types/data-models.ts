// Comprehensive data models for the Growth Compass platform

export interface Student {
  studentId: string // Unique identifier
  name: string
  email?: string
  school?: string
  gradeLevel?: string
  enrollments: Enrollment[]
  achievements: Achievement[]
  uncategorizedData: UncategorizedData[]
  totalFeedbacks: number
  overallProgress: ProgressMetrics
}

export interface Instructor {
  instructorId: string
  name: string
  email: string
  specializations: ProgramType[]
  classes: Class[]
  permissions: InstructorPermissions
}

export interface Class {
  classId: string
  classCode: string // Unique identifier like "01IPDED2405"
  className: string
  programType: ProgramType
  level: ClassLevel
  classType: ClassType
  instructor: Instructor
  students: Student[]
  schedule: ClassSchedule
  currentUnit: number
  currentLesson: number // 1.1, 1.2, 1.3, 1.4, 2.1, etc.
  totalUnits: number
  lessonsPerUnit: 4 | 5
  startDate: Date
  endDate: Date
  location: string
  metrics: ClassMetrics
}

export interface Enrollment {
  enrollmentId: string
  studentId: string
  classId: string
  enrollmentDate: Date
  status: 'active' | 'completed' | 'withdrawn'
  attendanceRate: number
  participationScore: number
  progressMetrics: ProgressMetrics
}

export interface ClassSchedule {
  dayOfWeek: number // 0 = Sunday, 1 = Monday, etc.
  startTime: string // "14:30"
  endTime: string // "16:00"
  duration: number // minutes
  timezone: string
}

export interface ClassMetrics {
  totalStudents: number
  activeStudents: number
  averageAttendance: number
  averageParticipation: number
  completionRate: number
  growthTrend: 'improving' | 'stable' | 'declining'
  lastUpdated: Date
}

export interface ProgressMetrics {
  skillAreas: SkillProgress[]
  overallScore: number
  trend: 'improving' | 'stable' | 'declining'
  lastAssessment: Date
  targetAreas: string[]
  strengths: string[]
}

export interface SkillProgress {
  skillName: string
  currentLevel: number // 1-10 scale
  targetLevel: number
  progress: number // percentage
  lastUpdated: Date
}

export interface Achievement {
  achievementId: string
  studentId: string
  title: string
  description: string
  achievementType: 'academic' | 'participation' | 'improvement' | 'leadership'
  dateEarned: Date
  evidence?: {
    type: 'text' | 'image' | 'link' | 'document'
    content: string
    url?: string
  }
  relatedClassId?: string
}

export interface UncategorizedData {
  dataId: string
  studentId: string
  title: string
  description?: string
  dataType: 'image' | 'text' | 'document' | 'link' | 'video'
  content: string
  url?: string
  uploadDate: Date
  tags: string[]
}

export interface Feedback {
  feedbackId: string
  studentId: string
  classId: string
  instructorId: string
  sessionDate: Date
  feedbackType: 'written' | 'verbal' | 'assessment'
  content: string
  skillAreas: SkillAssessment[]
  actionItems: string[]
  strengths: string[]
  improvementAreas: string[]
  nextSteps: string[]
}

export interface SkillAssessment {
  skillName: string
  score: number // 1-10
  notes: string
  improvement: 'significant' | 'moderate' | 'minimal' | 'none'
}

// Enums and Types
export type ProgramType = 'PSD' | 'WRITING' | 'RAPS' | 'CRITICAL'
export type ClassLevel = 'PRIMARY' | 'SECONDARY'
export type ClassType = 'REGULAR' | 'INTENSIVE' | 'EXTERNAL'

export interface InstructorPermissions {
  canViewAllStudents: boolean
  canEditStudentData: boolean
  canManageClasses: boolean
  canViewAnalytics: boolean
  canExportData: boolean
}

// Dashboard specific interfaces
export interface ProgramMetrics {
  programType: ProgramType
  programName: string
  totalStudents: number
  totalClasses: number
  averageAttendance: number
  averageGrowth: number
  recentFeedbackCount: number
  topPerformers: number
  needsAttention: number
  completionRate: number
  trendDirection: 'up' | 'down' | 'stable'
  levels: LevelMetrics[]
}

export interface LevelMetrics {
  level: ClassLevel
  studentCount: number
  classCount: number
  averageProgress: number
  classes: ClassSummary[]
}

export interface ClassSummary {
  classId: string
  classCode: string
  className: string
  studentCount: number
  instructor: string
  nextSession?: Date
  currentProgress: number
  averageAttendance: number
}

export interface DashboardData {
  programs: ProgramMetrics[]
  todaysClasses: TodaysClassData[]
  overallMetrics: OverallMetrics
  recentActivity: ActivityItem[]
  lastUpdated: Date
}

export interface TodaysClassData {
  classId: string
  classCode: string
  className: string
  programType: ProgramType
  instructor: string
  schedule: ClassSchedule
  studentCount: number
  attendanceExpected: number
  status: 'upcoming' | 'ongoing' | 'completed'
  location: string
}

export interface OverallMetrics {
  totalStudents: number
  totalActiveClasses: number
  totalInstructors: number
  averageAttendanceRate: number
  averageGrowthRate: number
  totalFeedbackDocuments: number
}

export interface ActivityItem {
  id: string
  type: 'feedback' | 'achievement' | 'enrollment' | 'class_completion'
  studentName?: string
  className?: string
  description: string
  timestamp: Date
}

// Search and Filter types
export interface StudentSearchFilters {
  programType?: ProgramType
  level?: ClassLevel
  instructor?: string
  performanceLevel?: 'high' | 'medium' | 'low'
  attendanceThreshold?: number
}

export interface ClassSearchFilters {
  programType?: ProgramType
  level?: ClassLevel
  classType?: ClassType
  instructor?: string
  dayOfWeek?: number
  status?: 'active' | 'completed' | 'upcoming'
}