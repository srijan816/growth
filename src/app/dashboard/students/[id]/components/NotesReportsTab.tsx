import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  FileText,
  Download,
  Eye,
  Calendar,
  TrendingUp,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  Edit,
  BarChart,
  PieChart,
  LineChart
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NotesReportsTabProps {
  student: any
}

export default function NotesReportsTab({ student }: NotesReportsTabProps) {
  const [notes, setNotes] = useState(student.notes || '')
  const [isEditingNotes, setIsEditingNotes] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Mock reports data
  const reports = [
    {
      id: '1',
      title: '[Monthly Report Placeholder]',
      type: 'monthly',
      period: 'December 2024',
      generatedDate: '2024-12-15',
      status: 'ready',
      preview: {
        avgRating: 3.8,
        attendance: 85,
        improvement: '+0.3',
        highlights: ['Improved public speaking', 'Strong critical thinking']
      }
    },
    {
      id: '2',
      title: '[Mid-term Report Placeholder]',
      type: 'midterm',
      period: 'Fall 2024',
      generatedDate: '2024-11-30',
      status: 'ready',
      preview: {
        avgRating: 3.5,
        attendance: 90,
        improvement: '+0.5',
        highlights: ['Consistent participation', 'Good teamwork']
      }
    }
  ]

  // Mock homework tracking data
  const homeworkData = student.homework?.recent || Array(10).fill(null).map((_, index) => ({
    date: new Date(Date.now() - index * 7 * 24 * 60 * 60 * 1000).toISOString(),
    course: student.courses?.[0]?.code || '[Course]',
    submitted: index % 3 !== 0
  }))

  const submittedCount = homeworkData.filter(h => h.submitted).length
  const submissionRate = (submittedCount / homeworkData.length) * 100

  const handleSaveNotes = () => {
    // Save notes API call would go here
    setIsEditingNotes(false)
    setHasUnsavedChanges(false)
  }

  const handleNotesChange = (value: string) => {
    setNotes(value)
    setHasUnsavedChanges(true)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="space-y-6">
      {/* Instructor Notes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Instructor Notes</CardTitle>
              <CardDescription>
                Private notes about student progress and observations
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <Badge variant="outline" className="text-orange-600">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Unsaved changes
                </Badge>
              )}
              {isEditingNotes ? (
                <>
                  <Button variant="outline" size="sm" onClick={() => {
                    setIsEditingNotes(false)
                    setNotes(student.notes || '')
                    setHasUnsavedChanges(false)
                  }}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveNotes}>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setIsEditingNotes(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isEditingNotes ? (
            <Textarea
              value={notes}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Add notes about student progress, behavior, areas of concern, parent communication, etc..."
              rows={8}
              className="font-mono text-sm"
            />
          ) : (
            <div className="min-h-[200px] p-4 bg-gray-50 rounded-lg">
              <p className="text-sm whitespace-pre-wrap">
                {notes || '[Notes Placeholder - Click Edit to add instructor notes]'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Reports</CardTitle>
          <CardDescription>
            Generated reports for parents and administration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {reports.map((report) => (
            <div key={report.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    {report.title}
                    <Badge variant="outline" className="text-xs">
                      {report.type === 'monthly' ? 'Monthly' : 'Mid-term'}
                    </Badge>
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {report.period} • Generated {formatDate(report.generatedDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>

              {/* Report Preview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <BarChart className="h-8 w-8 mx-auto mb-1 text-blue-600" />
                  <p className="text-xs text-muted-foreground">Avg Rating</p>
                  <p className="text-lg font-semibold">{report.preview.avgRating}/5</p>
                </div>
                <div className="text-center">
                  <PieChart className="h-8 w-8 mx-auto mb-1 text-green-600" />
                  <p className="text-xs text-muted-foreground">Attendance</p>
                  <p className="text-lg font-semibold">{report.preview.attendance}%</p>
                </div>
                <div className="text-center">
                  <LineChart className="h-8 w-8 mx-auto mb-1 text-purple-600" />
                  <p className="text-xs text-muted-foreground">Growth</p>
                  <p className="text-lg font-semibold text-green-600">{report.preview.improvement}</p>
                </div>
                <div className="text-center">
                  <TrendingUp className="h-8 w-8 mx-auto mb-1 text-orange-600" />
                  <p className="text-xs text-muted-foreground">Trend</p>
                  <p className="text-lg font-semibold">Improving</p>
                </div>
              </div>

              {/* Key Highlights */}
              <div className="text-sm">
                <p className="font-medium mb-1">Key Highlights:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-0.5">
                  {report.preview.highlights.map((highlight, index) => (
                    <li key={index}>{highlight}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}

          {/* Generate New Report */}
          <div className="pt-4 border-t">
            <Button className="w-full">
              <FileText className="h-4 w-4 mr-2" />
              Generate New Report
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Homework Tracking */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Homework Tracking</CardTitle>
              <CardDescription>
                Submission history and completion rate
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{submissionRate.toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground">Submission Rate</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Submission Progress */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>Overall Submission Rate</span>
              <span>{submittedCount}/{homeworkData.length} submitted</span>
            </div>
            <Progress value={submissionRate} className="h-3" />
          </div>

          {/* Homework History Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Date</th>
                  <th className="text-left p-2">Class</th>
                  <th className="text-left p-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {homeworkData.map((homework, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-2">{formatDate(homework.date)}</td>
                    <td className="p-2">{homework.course}</td>
                    <td className="p-2">
                      {homework.submitted ? (
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>Submitted</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-4 w-4" />
                          <span>Missing</span>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{submittedCount}</p>
              <p className="text-xs text-muted-foreground">Submitted</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{homeworkData.length - submittedCount}</p>
              <p className="text-xs text-muted-foreground">Missing</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{submissionRate >= 80 ? '👍' : '⚠️'}</p>
              <p className="text-xs text-muted-foreground">
                {submissionRate >= 80 ? 'Good' : 'Needs Improvement'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button variant="outline" className="justify-start">
              <Calendar className="h-4 w-4 mr-2" />
              Schedule Parent Meeting
            </Button>
            <Button variant="outline" className="justify-start">
              <FileText className="h-4 w-4 mr-2" />
              Create Custom Report
            </Button>
            <Button variant="outline" className="justify-start">
              <AlertCircle className="h-4 w-4 mr-2" />
              Flag for Review
            </Button>
            <Button variant="outline" className="justify-start">
              <Download className="h-4 w-4 mr-2" />
              Export All Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}