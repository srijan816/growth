'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Filter, 
  FileText, 
  Calendar,
  User,
  School,
  Star,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface FeedbackEntry {
  id: string
  student_name: string
  instructor: string
  class_date: string
  class_code: string
  class_name: string
  unit_number: string
  lesson_number?: string
  topic?: string
  motion?: string
  feedback_type: 'primary' | 'secondary'
  content: string
  rubric_scores: Record<string, number>
  strengths?: string
  improvement_areas?: string
  teacher_comments?: string
  file_path: string
  parsed_at: string
  unique_id?: string
}

export default function FeedbackViewerPage() {
  const [feedbackData, setFeedbackData] = useState<FeedbackEntry[]>([])
  const [filteredData, setFilteredData] = useState<FeedbackEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedInstructor, setSelectedInstructor] = useState('all')
  const [selectedClass, setSelectedClass] = useState('all')
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null)
  const [loadingStudent, setLoadingStudent] = useState(false)

  useEffect(() => {
    fetchFeedbackData()
  }, [])

  useEffect(() => {
    filterData()
  }, [searchTerm, selectedInstructor, selectedClass, feedbackData])

  const fetchAllStudentFeedback = async (studentName: string) => {
    setLoadingStudent(true)
    try {
      const response = await fetch(`/api/feedback?student=${encodeURIComponent(studentName)}`)
      
      if (!response.ok) {
        console.error('API response not ok:', response.status, response.statusText)
        return
      }
      
      const data = await response.json()
      console.log(`Fetched all feedback for ${studentName}:`, data)
      
      const feedbacks = data.feedbacks || []
      setFeedbackData(feedbacks)
      setFilteredData(feedbacks)
      setSelectedStudent(studentName)
      setSearchTerm(studentName)
    } catch (error) {
      console.error('Error fetching student feedback:', error)
    } finally {
      setLoadingStudent(false)
    }
  }

  const fetchFeedbackData = async () => {
    try {
      const response = await fetch('/api/feedback')
      
      if (!response.ok) {
        console.error('API response not ok:', response.status, response.statusText)
        const errorData = await response.json()
        console.error('Error data:', errorData)
        return
      }
      
      const data = await response.json()
      console.log('Fetched feedback data:', data)
      
      const feedbacks = data.feedbacks || []
      setFeedbackData(feedbacks)
      setFilteredData(feedbacks)
      setSelectedStudent(null)
    } catch (error) {
      console.error('Error fetching feedback:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterData = () => {
    let filtered = feedbackData

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(entry =>
        entry.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (entry.strengths && entry.strengths.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (entry.improvement_areas && entry.improvement_areas.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (entry.teacher_comments && entry.teacher_comments.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Instructor filter
    if (selectedInstructor !== 'all') {
      filtered = filtered.filter(entry => entry.instructor === selectedInstructor)
    }

    // Class filter
    if (selectedClass !== 'all') {
      filtered = filtered.filter(entry => entry.class_code === selectedClass)
    }

    setFilteredData(filtered)
  }

  const toggleCard = (id: string) => {
    const newExpanded = new Set(expandedCards)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedCards(newExpanded)
  }

  const cleanFeedbackContent = (content: string) => {
    // Remove the RUBRIC EVALUATION section from the content
    const rubricPattern = /RUBRIC EVALUATION:[\s\S]*?(?=\n\n|$)/i
    let cleanedContent = content.replace(rubricPattern, '')
    
    // Also remove individual rubric lines if they appear separately
    const rubricLines = [
      /^\d+\.\s*Student spoke for the duration.*$/gim,
      /^\d+\.\s*Student offered and\/or accepted.*$/gim,
      /^\d+\.\s*Student spoke in a stylistic.*$/gim,
      /^\d+\.\s*Student argument was complete.*$/gim,
      /^\d+\.\s*Student argument reflects application.*$/gim,
      /^\d+\.\s*Student successfully rebut.*$/gim,
      /^\d+\.\s*Student ably supported teammate.*$/gim,
      /^\d+\.\s*Student applied feedback.*$/gim
    ]
    
    rubricLines.forEach(pattern => {
      cleanedContent = cleanedContent.replace(pattern, '')
    })
    
    // Clean up extra newlines
    cleanedContent = cleanedContent.replace(/\n{3,}/g, '\n\n').trim()
    
    return cleanedContent
  }

  const uniqueInstructors = Array.from(new Set(feedbackData.map(f => f.instructor))).filter(Boolean)
  const uniqueClasses = Array.from(new Set(feedbackData.map(f => f.class_code))).filter(Boolean)

  const rubricCategories = [
    { key: 'rubric_1', label: 'Duration Management' },
    { key: 'rubric_2', label: 'Point of Information' },
    { key: 'rubric_3', label: 'Style/Persuasion' },
    { key: 'rubric_4', label: 'Argument Completeness' },
    { key: 'rubric_5', label: 'Theory Application' },
    { key: 'rubric_6', label: 'Rebuttal Effectiveness' },
    { key: 'rubric_7', label: 'Teammate Support' },
    { key: 'rubric_8', label: 'Feedback Application' }
  ]

  const getRubricColor = (score: number) => {
    if (score >= 4) return 'text-green-600 bg-green-50'
    if (score >= 3) return 'text-yellow-600 bg-yellow-50'
    if (score >= 2) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Feedback Data Viewer</h1>
        <p className="text-muted-foreground">
          {selectedStudent 
            ? `Viewing all ${feedbackData.length} feedback entries for ${selectedStudent}`
            : 'Browse and search through all parsed feedback from /data/Overall'
          }
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search student names, feedback content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={selectedInstructor} onValueChange={setSelectedInstructor}>
              <SelectTrigger>
                <User className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select instructor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Instructors</SelectItem>
                {uniqueInstructors.map(instructor => instructor && (
                  <SelectItem key={instructor} value={instructor}>
                    {instructor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <School className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Select class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {uniqueClasses.map(classCode => classCode && (
                  <SelectItem key={classCode} value={classCode}>
                    {classCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredData.length} of {feedbackData.length} feedback entries
            </p>
            {selectedStudent && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Viewing all feedback for: {selectedStudent}</Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedStudent(null)
                    setSearchTerm('')
                    fetchFeedbackData()
                  }}
                >
                  Clear Filter
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Feedback Cards */}
      <div className="space-y-4">
        {filteredData.map((entry) => {
          const isExpanded = expandedCards.has(entry.id)
          
          return (
            <Card key={entry.id} className="overflow-hidden">
              <CardHeader 
                className="cursor-pointer"
                onClick={() => toggleCard(entry.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">{entry.student_name}</h3>
                      {(!selectedStudent || selectedStudent !== entry.student_name) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={(e) => {
                            e.stopPropagation()
                            fetchAllStudentFeedback(entry.student_name)
                          }}
                          disabled={loadingStudent}
                        >
                          View All Feedback
                        </Button>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {entry.instructor}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(entry.parsed_at).toLocaleDateString()}
                      </span>
                      <Badge variant="outline">{entry.class_code}</Badge>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    {isExpanded ? <ChevronUp /> : <ChevronDown />}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className={isExpanded ? '' : 'hidden'}>
                {/* Rubric Scores */}
                <div className="mb-6">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    Rubric Scores
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {rubricCategories.map(category => {
                      const score = entry.rubric_scores?.[category.key] || 0
                      return (
                        <div key={category.key} className="text-center">
                          <p className="text-xs text-muted-foreground mb-1">{category.label}</p>
                          <Badge className={getRubricColor(score)}>
                            {score === 0 ? 'N/A' : `${score}/5`}
                          </Badge>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Full Content */}
                <div className="mb-4">
                  <h4 className="font-semibold mb-2 text-blue-700">Feedback Content</h4>
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{cleanFeedbackContent(entry.content)}</p>
                  </div>
                </div>

                {/* Structured Fields (if available) */}
                {entry.strengths && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2 text-green-700">Strengths</h4>
                    <div className="bg-green-50 p-3 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{entry.strengths}</p>
                    </div>
                  </div>
                )}

                {entry.improvement_areas && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2 text-orange-700">Areas for Improvement</h4>
                    <div className="bg-orange-50 p-3 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{entry.improvement_areas}</p>
                    </div>
                  </div>
                )}

                {entry.teacher_comments && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2 text-purple-700">Teacher Comments</h4>
                    <div className="bg-purple-50 p-3 rounded-lg">
                      <p className="text-sm whitespace-pre-wrap">{entry.teacher_comments}</p>
                    </div>
                  </div>
                )}

                {/* File Source */}
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Source: {entry.file_path}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredData.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">No feedback entries found matching your criteria.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}