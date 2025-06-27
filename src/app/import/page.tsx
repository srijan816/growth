'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/dashboard/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Upload, 
  FileSpreadsheet, 
  AlertCircle, 
  CheckCircle, 
  Users, 
  BookOpen,
  Loader2,
  Download
} from 'lucide-react'

interface ImportResult {
  success: boolean
  preview?: boolean
  import?: boolean
  data?: any
  results?: any
  duplicateStudents?: Array<{ name: string; courses: string[] }>
  error?: string
  details?: string[]
}

export default function ImportPage() {
  const { data: session, status } = useSession()
  const [file, setFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>
  }

  if (!session || session.user.role !== 'instructor') {
    redirect('/auth/signin')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setImportResult(null)
    }
  }

  const handlePreview = async () => {
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('preview', 'true')

    try {
      const response = await fetch('/api/import/excel', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      setImportResult(result)
    } catch (error) {
      setImportResult({
        success: false,
        error: 'Failed to process file',
        details: ['Network error or server unavailable']
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleImport = async () => {
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/import/excel', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()
      setImportResult(result)
    } catch (error) {
      setImportResult({
        success: false,
        error: 'Import failed',
        details: ['Network error or server unavailable']
      })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Import Student Data</h1>
          <p className="text-slate-600 mt-2">
            Upload your Excel file with student rosters and course information
          </p>
        </div>

        {/* Upload Section */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Upload Excel File</span>
            </CardTitle>
            <CardDescription>
              Select your student_name.xlsx file or similar roster file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
              <div className="flex flex-col items-center space-y-4">
                <FileSpreadsheet className="h-12 w-12 text-slate-400" />
                <div>
                  <p className="text-lg font-medium text-slate-900">
                    Drop your Excel file here, or click to browse
                  </p>
                  <p className="text-sm text-slate-500">
                    Supports .xlsx files up to 10MB
                  </p>
                </div>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" className="cursor-pointer">
                    Choose File
                  </Button>
                </label>
              </div>
            </div>

            {file && (
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileSpreadsheet className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="font-medium text-slate-900">{file.name}</p>
                    <p className="text-sm text-slate-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handlePreview}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Preview
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleImport}
                    disabled={isUploading || !importResult?.success}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isUploading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Import
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results Section */}
        {importResult && (
          <div className="space-y-4">
            {/* Status Alert */}
            <Alert className={importResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
              <div className="flex items-center space-x-2">
                {importResult.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-600" />
                )}
                <AlertDescription className={importResult.success ? "text-green-800" : "text-red-800"}>
                  {importResult.success 
                    ? (importResult.preview ? 'File processed successfully! Review the data below.' : 'Import completed successfully!')
                    : `${importResult.error || 'Import failed'}`
                  }
                </AlertDescription>
              </div>
            </Alert>

            {/* Error Details */}
            {!importResult.success && importResult.details && (
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="text-red-700 flex items-center space-x-2">
                    <AlertCircle className="h-5 w-5" />
                    <span>Error Details</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1">
                    {importResult.details.map((detail, index) => (
                      <li key={index} className="text-sm text-red-600">• {detail}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Success Results */}
            {importResult.success && importResult.results && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <BookOpen className="h-8 w-8 text-green-600" />
                      <div>
                        <p className="text-2xl font-bold text-green-900">
                          {importResult.results.coursesCreated}
                        </p>
                        <p className="text-sm text-green-700">Courses Created</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Users className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="text-2xl font-bold text-blue-900">
                          {importResult.results.studentsCreated}
                        </p>
                        <p className="text-sm text-blue-700">Students Created</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-purple-200 bg-purple-50">
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-8 w-8 text-purple-600" />
                      <div>
                        <p className="text-2xl font-bold text-purple-900">
                          {importResult.results.enrollmentsCreated}
                        </p>
                        <p className="text-sm text-purple-700">Enrollments</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Preview Data */}
            {importResult.success && importResult.preview && importResult.data && (
              <Card>
                <CardHeader>
                  <CardTitle>Import Preview</CardTitle>
                  <CardDescription>
                    Review the data that will be imported
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Courses */}
                  <div>
                    <h3 className="font-semibold text-lg mb-3">
                      Courses ({importResult.data.courses.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {importResult.data.courses.map((course: any, index: number) => (
                        <Card key={index} className="border-slate-200">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="outline">{course.code}</Badge>
                              <span className="text-sm text-slate-500">
                                {course.students.length} students
                              </span>
                            </div>
                            <p className="font-medium">{course.program_type} - {course.grade_range}</p>
                            <p className="text-sm text-slate-600">
                              {course.day} at {course.time}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>

                  {/* Duplicate Students */}
                  {importResult.data.duplicateStudents.length > 0 && (
                    <div>
                      <h3 className="font-semibold text-lg mb-3 text-orange-700">
                        Multi-Course Students ({importResult.data.duplicateStudents.length})
                      </h3>
                      <Alert className="border-orange-200 bg-orange-50">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        <AlertDescription className="text-orange-800">
                          These students are enrolled in multiple courses. They will have unified profiles.
                        </AlertDescription>
                      </Alert>
                      <div className="mt-3 space-y-2">
                        {importResult.data.duplicateStudents.map((student: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                            <span className="font-medium">{student.name}</span>
                            <div className="flex space-x-2">
                              {student.courses.map((course: string, courseIndex: number) => (
                                <Badge key={courseIndex} variant="secondary" className="text-xs">
                                  {course}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Instructions */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>File Format Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Excel Structure</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• Each sheet represents one course</li>
                  <li>• Sheet name = Course code (e.g., 02IPDEC2401)</li>
                  <li>• Row 1: Day and time information</li>
                  <li>• Row 2: Headers (can be "Name")</li>
                  <li>• Row 3+: Student names</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Supported Formats</h4>
                <ul className="text-sm text-slate-600 space-y-1">
                  <li>• .xlsx files (Excel 2007+)</li>
                  <li>• Maximum file size: 10MB</li>
                  <li>• UTF-8 encoded text</li>
                  <li>• Multiple sheets supported</li>
                </ul>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg">
              <Download className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-blue-900">Need a template?</p>
                <p className="text-sm text-blue-700">
                  Download our sample Excel template to get started
                </p>
              </div>
              <Button variant="outline" size="sm" className="ml-auto">
                Download Template
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}