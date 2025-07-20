import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Clock,
  Trophy,
  Plus,
  Edit,
  Trash2,
  ChevronRight,
  CheckCircle,
  BookOpen
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface MakeupHistoryTabProps {
  student: any
}

interface Achievement {
  id: string
  title: string
  competition?: string
  date: string
  place?: string
  score?: number
  description?: string
}

export default function MakeupHistoryTab({ student }: MakeupHistoryTabProps) {
  const [isAddingAchievement, setIsAddingAchievement] = useState(false)
  const [editingAchievement, setEditingAchievement] = useState<string | null>(null)

  // Mock makeup history
  const makeupHistory = Array(3).fill(null).map((_, index) => ({
    id: `makeup-${index}`,
    date: new Date(Date.now() - index * 14 * 24 * 60 * 60 * 1000).toISOString(),
    originalClass: student.courses?.[0]?.code || '[Original Class]',
    makeupClass: 'PST 1.5.6',
    instructor: '[Instructor Placeholder]',
    reason: index === 0 ? 'Student was sick' : index === 1 ? 'Family emergency' : 'School event conflict',
    notes: '[Makeup session notes placeholder - Student participated well in the makeup class]'
  }))

  // Mock cross-class history
  const crossClassHistory = {
    previousCourses: [
      {
        code: 'PST 1.4.5',
        period: 'Spring 2023',
        avgRating: 3.8,
        improvement: '+0.5'
      },
      {
        code: 'PST 1.3.4',
        period: 'Fall 2022',
        avgRating: 3.3,
        improvement: '+0.3'
      }
    ],
    overallProgress: {
      startRating: 3.0,
      currentRating: 3.8,
      totalImprovement: 0.8,
      timeSpan: '2 years'
    }
  }

  // Use existing achievements or create mock ones
  const [achievements, setAchievements] = useState<Achievement[]>(
    student.achievements && student.achievements.length > 0
      ? student.achievements
      : [
          {
            id: '1',
            title: '[Achievement Placeholder]',
            competition: '[Competition Placeholder]',
            date: '[Date Placeholder]',
            place: '[Place Placeholder]',
            score: 85,
            description: 'WSTC Score: 85'
          }
        ]
  )

  const formatDate = (date: string) => {
    if (date === '[Date Placeholder]') return date
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const handleAddAchievement = () => {
    const newAchievement: Achievement = {
      id: Date.now().toString(),
      title: 'New Achievement',
      date: new Date().toISOString(),
      competition: '',
      place: '',
      description: ''
    }
    setAchievements([newAchievement, ...achievements])
    setEditingAchievement(newAchievement.id)
    setIsAddingAchievement(false)
  }

  const handleUpdateAchievement = (id: string, updates: Partial<Achievement>) => {
    setAchievements(achievements.map(a => 
      a.id === id ? { ...a, ...updates } : a
    ))
  }

  const handleDeleteAchievement = (id: string) => {
    setAchievements(achievements.filter(a => a.id !== id))
  }

  const getPlaceBadgeColor = (place: string | undefined) => {
    if (!place) return 'bg-gray-100 text-gray-700'
    if (place.includes('1st') || place.includes('First')) return 'bg-yellow-100 text-yellow-700'
    if (place.includes('2nd') || place.includes('Second')) return 'bg-gray-100 text-gray-700'
    if (place.includes('3rd') || place.includes('Third')) return 'bg-orange-100 text-orange-700'
    return 'bg-blue-100 text-blue-700'
  }

  return (
    <div className="space-y-6">
      {/* Makeup Classes Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Makeup Class History</CardTitle>
          <CardDescription>
            {student.attendance?.makeup || 0} makeup classes attended
          </CardDescription>
        </CardHeader>
        <CardContent>
          {makeupHistory.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <p className="text-muted-foreground">No makeup classes needed - excellent attendance!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {makeupHistory.map((makeup, index) => (
                <div 
                  key={makeup.id} 
                  className={cn(
                    "relative pl-8 pb-4",
                    index !== makeupHistory.length - 1 && "border-l-2 border-gray-200 ml-3"
                  )}
                >
                  <div className="absolute left-0 top-0 -translate-x-1/2 bg-white">
                    <Clock className="h-6 w-6 text-blue-600" />
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">
                          Makeup for {makeup.originalClass}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Attended {makeup.makeupClass} with {makeup.instructor}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {formatDate(makeup.date)}
                      </Badge>
                    </div>
                    
                    <div className="text-sm">
                      <span className="text-muted-foreground">Reason: </span>
                      <span>{makeup.reason}</span>
                    </div>
                    
                    {makeup.notes && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Notes: </span>
                        <span>{makeup.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cross-Class Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Cross-Class History</CardTitle>
          <CardDescription>
            Progress across different courses and levels
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Overall Progress */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium">Overall Growth</p>
              <Badge className="bg-green-100 text-green-700">
                +{crossClassHistory.overallProgress.totalImprovement} stars
              </Badge>
            </div>
            <Progress 
              value={(crossClassHistory.overallProgress.currentRating / 5) * 100} 
              className="h-3 mb-2"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Started: {crossClassHistory.overallProgress.startRating}/5</span>
              <span>Current: {crossClassHistory.overallProgress.currentRating}/5</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Over {crossClassHistory.overallProgress.timeSpan}
            </p>
          </div>

          {/* Previous Courses */}
          <div>
            <p className="text-sm font-medium mb-2">Course Progression</p>
            <div className="space-y-2">
              {crossClassHistory.previousCourses.map((course, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{course.code}</p>
                      <p className="text-xs text-muted-foreground">{course.period}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p className="text-sm font-medium">{course.avgRating}/5</p>
                      <p className="text-xs text-green-600">{course.improvement}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transition Insights */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              <span className="font-medium">Transition Insight:</span> [Transition Placeholder] - 
              Student has shown consistent improvement across levels with overall star average 
              increasing by {crossClassHistory.overallProgress.totalImprovement} stars.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Competition Achievements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Competition Achievements</CardTitle>
              <CardDescription>
                {achievements.length} recorded achievements
              </CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAddingAchievement(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Achievement
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Add Achievement Form */}
          {isAddingAchievement && (
            <div className="mb-4 p-4 border rounded-lg space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Achievement Title</Label>
                  <Input placeholder="e.g., Best Speaker Award" />
                </div>
                <div>
                  <Label>Competition</Label>
                  <Input placeholder="e.g., Regional Debate Championship" />
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" />
                </div>
                <div>
                  <Label>Place/Result</Label>
                  <Input placeholder="e.g., 1st Place" />
                </div>
              </div>
              <div>
                <Label>WSTC Score (if applicable)</Label>
                <Input type="number" placeholder="e.g., 85" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea placeholder="Additional details about the achievement..." rows={2} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setIsAddingAchievement(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleAddAchievement}>
                  Save Achievement
                </Button>
              </div>
            </div>
          )}

          {/* Achievements List */}
          <div className="space-y-3">
            {achievements.map((achievement) => (
              <div key={achievement.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                {editingAchievement === achievement.id ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input
                        value={achievement.title}
                        onChange={(e) => handleUpdateAchievement(achievement.id, { title: e.target.value })}
                        placeholder="Achievement title"
                      />
                      <Input
                        value={achievement.competition}
                        onChange={(e) => handleUpdateAchievement(achievement.id, { competition: e.target.value })}
                        placeholder="Competition name"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setEditingAchievement(null)}>
                        Save
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setEditingAchievement(null)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Display Mode
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <Trophy className="h-5 w-5 text-yellow-600 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">{achievement.title}</p>
                          {achievement.place && (
                            <Badge className={getPlaceBadgeColor(achievement.place)}>
                              {achievement.place}
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">
                            {achievement.competition} • {formatDate(achievement.date)}
                          </p>
                          {achievement.score && (
                            <p className="text-sm">
                              WSTC Score: <span className="font-medium">{achievement.score}</span>
                            </p>
                          )}
                          {achievement.description && (
                            <p className="text-sm text-muted-foreground">{achievement.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setEditingAchievement(achievement.id)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDeleteAchievement(achievement.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {achievements.length === 0 && !isAddingAchievement && (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No achievements recorded yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setIsAddingAchievement(true)}
                >
                  Add First Achievement
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}