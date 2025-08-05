'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Upload, CheckCircle, XCircle, FileSpreadsheet, Users, BookOpen } from 'lucide-react'
import { toast } from 'sonner'

export default function CapstoneImportPage() {
  const [firstFile, setFirstFile] = useState<File | null>(null)
  const [secondFile, setSecondFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResults, setImportResults] = useState<any>(null)

  const handleImport = async () => {
    if (!firstFile || !secondFile) {
      toast.error('Please select both Excel files')
      return
    }

    setIsImporting(true)
    setImportResults(null)

    try {
      const formData = new FormData()
      formData.append('firstFile', firstFile)
      formData.append('secondFile', secondFile)

      const response = await fetch('/api/import/capstone-data', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Import failed')
      }

      setImportResults(data)
      toast.success('Import completed successfully!')
    } catch (error) {
      console.error('Import error:', error)
      toast.error(error instanceof Error ? error.message : 'Import failed')
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Import Capstone Data</h1>
        <p className="text-muted-foreground mt-2">
          Import courses and students from your Capstone Excel files
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Step 1: Upload Files</CardTitle>
            <CardDescription>
              Select your instructor course list and student details files
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="first-file">
                <FileSpreadsheet className="inline-block w-4 h-4 mr-2" />
                Instructor Courses (first.xlsx)
              </Label>
              <Input
                id="first-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setFirstFile(e.target.files?.[0] || null)}
                className="mt-2"
              />
              {firstFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  Selected: {firstFile.name}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="second-file">
                <Users className="inline-block w-4 h-4 mr-2" />
                Student Details (second.xlsx)
              </Label>
              <Input
                id="second-file"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setSecondFile(e.target.files?.[0] || null)}
                className="mt-2"
              />
              {secondFile && (
                <p className="text-sm text-muted-foreground mt-1">
                  Selected: {secondFile.name}
                </p>
              )}
            </div>

            <Button
              onClick={handleImport}
              disabled={!firstFile || !secondFile || isImporting}
              className="w-full"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Import Data
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Import Instructions</CardTitle>
            <CardDescription>How to prepare your files</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-medium mb-1">First Excel File (Courses)</h4>
              <p className="text-sm text-muted-foreground">
                Should contain a "Courses" sheet with columns: Status, Course Code, 
                Course Name, Course Level, Course Type, Student Count
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Second Excel File (Students)</h4>
              <p className="text-sm text-muted-foreground">
                Should have sheets named by course codes, each containing: Student ID, 
                Student Name, Grade, School, Start/End Lesson, Status
              </p>
            </div>
            <Alert>
              <AlertDescription>
                Students will be created with default password "changeme123". 
                Please inform them to change it on first login.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>

      {importResults && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Import Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Courses</p>
                  <p className="text-2xl font-bold">
                    {importResults.results.coursesCreated + importResults.results.coursesUpdated}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {importResults.results.coursesCreated} new, {importResults.results.coursesUpdated} updated
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Students</p>
                  <p className="text-2xl font-bold">
                    {importResults.results.studentsCreated + importResults.results.studentsUpdated}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {importResults.results.studentsCreated} new, {importResults.results.studentsUpdated} updated
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Enrollments</p>
                  <p className="text-2xl font-bold">{importResults.results.enrollmentsCreated}</p>
                  <p className="text-xs text-muted-foreground">Created</p>
                </div>
              </div>
            </div>

            {importResults.results.errors.length > 0 && (
              <Alert variant="destructive" className="mt-4">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  <p className="font-medium mb-2">Import completed with {importResults.results.errors.length} errors:</p>
                  <ul className="list-disc list-inside text-sm">
                    {importResults.results.errors.slice(0, 5).map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                    {importResults.results.errors.length > 5 && (
                      <li>...and {importResults.results.errors.length - 5} more errors</li>
                    )}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {importResults.results.errors.length === 0 && (
              <Alert className="mt-4 border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  All data imported successfully without errors!
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}