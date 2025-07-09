'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Users, Calendar, Database, TrendingUp } from 'lucide-react'
import Link from 'next/link'

interface Program {
  id: number
  title: string
  code: string
  color: string
  description: string
}

interface Level {
  id: string
  name: string
  description: string
  students: number
  sessions: number
  courses: { id: number; title: string; code: string }[]
}

const programs: Record<string, Program> = {
  'psd': {
    id: 1,
    title: "Public Speaking & Debating",
    code: "PSD",
    color: "from-purple-500 to-purple-700",
    description: "Develop confident public speaking and structured debating skills"
  },
  'writing': {
    id: 2,
    title: "Academic Writing",
    code: "WRITING",
    color: "from-red-500 to-red-700",
    description: "Master academic writing techniques and essay composition"
  },
  'raps': {
    id: 3,
    title: "Research Analysis",
    code: "RAPS",
    color: "from-teal-500 to-teal-700",
    description: "Learn research methods and analytical thinking skills"
  },
  'critical': {
    id: 4,
    title: "Critical Thinking",
    code: "CRITICAL",
    color: "from-green-500 to-green-700",
    description: "Develop logical reasoning and problem-solving abilities"
  }
}

const programLevels: Record<number, Level[]> = {
  1: [ // PSD
    {
      id: "psd-primary",
      name: "Primary",
      description: "Foundation level public speaking and basic debate skills",
      students: 12,
      sessions: 4,
      courses: [
        { id: 101, title: "Introduction to Public Speaking", code: "PSD-P1" },
        { id: 102, title: "Basic Debate Fundamentals", code: "PSD-P2" }
      ]
    },
    {
      id: "psd-secondary",
      name: "Secondary",
      description: "Advanced debating techniques and competitive speech",
      students: 12,
      sessions: 4,
      courses: [
        { id: 201, title: "Advanced Debate Strategies", code: "PSD-S1" },
        { id: 202, title: "Competitive Speech Formats", code: "PSD-S2" }
      ]
    }
  ],
  2: [ // Academic Writing
    {
      id: "writing-primary",
      name: "Primary",
      description: "Basic writing skills and essay structure",
      students: 9,
      sessions: 3,
      courses: [
        { id: 301, title: "Essay Writing Fundamentals", code: "WRIT-P1" },
        { id: 302, title: "Creative Writing Basics", code: "WRIT-P2" }
      ]
    },
    {
      id: "writing-secondary",
      name: "Secondary",
      description: "Advanced academic writing and research papers",
      students: 9,
      sessions: 3,
      courses: [
        { id: 401, title: "Advanced Academic Writing", code: "WRIT-S1" },
        { id: 402, title: "Research Paper Composition", code: "WRIT-S2" }
      ]
    }
  ],
  3: [ // RAPS
    {
      id: "raps-primary",
      name: "Primary",
      description: "Basic research methods and data analysis",
      students: 11,
      sessions: 4,
      courses: [
        { id: 501, title: "Research Methods Introduction", code: "RAPS-P1" },
        { id: 502, title: "Basic Data Analysis", code: "RAPS-P2" }
      ]
    },
    {
      id: "raps-secondary",
      name: "Secondary",
      description: "Advanced research techniques and statistical analysis",
      students: 11,
      sessions: 3,
      courses: [
        { id: 601, title: "Advanced Research Design", code: "RAPS-S1" },
        { id: 602, title: "Statistical Analysis Methods", code: "RAPS-S2" }
      ]
    }
  ],
  4: [ // Critical Thinking
    {
      id: "critical-primary",
      name: "Primary",
      description: "Foundation logical reasoning and problem-solving",
      students: 8,
      sessions: 3,
      courses: [
        { id: 701, title: "Logic and Reasoning", code: "CRIT-P1" },
        { id: 702, title: "Problem-Solving Techniques", code: "CRIT-P2" }
      ]
    },
    {
      id: "critical-secondary",
      name: "Secondary",
      description: "Advanced critical analysis and philosophical thinking",
      students: 8,
      sessions: 2,
      courses: [
        { id: 801, title: "Advanced Critical Analysis", code: "CRIT-S1" },
        { id: 802, title: "Philosophical Reasoning", code: "CRIT-S2" }
      ]
    }
  ]
}

export default function ProgramPage() {
  const params = useParams()
  const router = useRouter()
  const programKey = params.id as string
  const [program, setProgram] = useState<Program | null>(null)
  const [levels, setLevels] = useState<Level[]>([])

  useEffect(() => {
    const foundProgram = programs[programKey]
    if (foundProgram) {
      setProgram(foundProgram)
      setLevels(programLevels[foundProgram.id] || [])
    }
  }, [programKey])

  if (!program) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Program Not Found</h2>
            <p className="text-muted-foreground">The requested program could not be found.</p>
            <Button onClick={() => router.back()} className="mt-4">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="p-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">{program.title}</h1>
            <p className="text-muted-foreground">{program.description}</p>
          </div>
        </div>
      </div>

      {/* Program Banner */}
      <Card className="overflow-hidden">
        <div className={`p-8 text-white bg-gradient-to-r ${program.color}`}>
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold mb-3">{program.title}</h2>
            <p className="text-white/90 text-lg">{program.description}</p>
            <div className="mt-6 flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>{levels.reduce((sum, level) => sum + level.students, 0)} Students</span>
              </div>
              <div className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>{levels.reduce((sum, level) => sum + level.sessions, 0)} Sessions</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Level Selection */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Select Level</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {levels.map((level) => (
            <Card key={level.id} className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold text-foreground">{level.name}</h4>
                    <p className="text-muted-foreground text-sm mt-1">{level.description}</p>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{level.students} students</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{level.sessions} sessions</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-sm font-medium text-foreground">Courses:</h5>
                    <div className="space-y-1">
                      {level.courses.map((course) => (
                        <Link
                          key={course.id}
                          href={`/dashboard/course/${course.id}`}
                          className="block p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{course.title}</span>
                            <span className="text-xs text-muted-foreground">{course.code}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}