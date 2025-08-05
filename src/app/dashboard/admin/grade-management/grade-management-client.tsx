'use client'

import { useState } from 'react'
import { Session } from 'next-auth'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  GraduationCap, 
  Calendar, 
  AlertCircle, 
  CheckCircle2,
  ArrowUp,
  Clock
} from 'lucide-react'

interface GradeManagementClientProps {
  session: Session
}

export default function GradeManagementClient({ session }: GradeManagementClientProps) {
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [advanceResult, setAdvanceResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handleAdvanceGrades = async () => {
    setIsAdvancing(true)
    setError(null)
    setAdvanceResult(null)

    try {
      const response = await fetch('/api/admin/advance-grades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to advance grades')
      }

      setAdvanceResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsAdvancing(false)
    }
  }

  const today = new Date()
  const currentYear = today.getFullYear()
  const nextSeptember1 = new Date(currentYear, 8, 1) // September 1st
  if (nextSeptember1 < today) {
    nextSeptember1.setFullYear(currentYear + 1)
  }
  const daysUntilSeptember = Math.ceil((nextSeptember1.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold mb-2">Grade Management</h1>
        <p className="text-muted-foreground">
          Manage automatic grade advancement for students
        </p>
      </div>

      {/* Grade Advancement Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Automatic Grade Advancement
          </CardTitle>
          <CardDescription>
            Every September 1st, all students' grades automatically advance by one level
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Next Advancement Date</p>
                <p className="text-sm text-muted-foreground">
                  {nextSeptember1.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  In {daysUntilSeptember} days
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <ArrowUp className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">How It Works</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Grade 4 → Grade 5</li>
                  <li>• Grade 6 → Grade 7 (Primary → Secondary)</li>
                  <li>• Grade 11 → Grade 12</li>
                  <li>• Grade 12 students don't advance</li>
                </ul>
              </div>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Grade advancement is automatic and happens once per year. Historical grade data is preserved
              for accurate feedback categorization.
            </AlertDescription>
          </Alert>

          {/* Manual Advancement (for testing) */}
          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-3">
              For testing purposes, you can manually trigger grade advancement:
            </p>
            <Button 
              onClick={handleAdvanceGrades}
              disabled={isAdvancing}
              variant="outline"
            >
              {isAdvancing ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Advancing Grades...
                </>
              ) : (
                <>
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Manually Advance Grades
                </>
              )}
            </Button>
          </div>

          {/* Results */}
          {advanceResult && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {advanceResult.message || `Successfully advanced ${advanceResult.advancedCount} students to the next grade.`}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Primary/Secondary Transition Info */}
      <Card>
        <CardHeader>
          <CardTitle>Primary to Secondary Transition</CardTitle>
          <CardDescription>
            Understanding how feedback is categorized
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-2 text-blue-600">Primary Level</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Grades 2-6</li>
                <li>• Qualitative feedback format</li>
                <li>• "What was BEST" section</li>
                <li>• "Needs IMPROVEMENT" section</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2 text-purple-600">Secondary Level</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Grades 7-12</li>
                <li>• Rubric-based scoring (8 criteria)</li>
                <li>• Detailed performance metrics</li>
                <li>• Quantitative assessments</li>
              </ul>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              When a student transitions from Grade 6 to Grade 7, their historical primary feedback 
              is preserved and displayed separately from their secondary feedback in their profile.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}