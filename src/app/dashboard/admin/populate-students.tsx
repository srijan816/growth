'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Users, AlertCircle, CheckCircle2 } from 'lucide-react'

export default function PopulateStudents() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const handlePopulate = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/populate-students', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
      } else {
        setError(data.error || 'Failed to populate students')
      }
    } catch (err) {
      setError('An error occurred while populating students')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="p-6 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold mb-2">Populate Students Table</h3>
        <p className="text-sm text-gray-600 mb-4">
          This will create student records from the parsed feedback data. Students who already exist will be skipped.
        </p>
        
        <Button 
          onClick={handlePopulate} 
          disabled={loading}
          className="w-full"
        >
          <Users className="mr-2 h-4 w-4" />
          {loading ? 'Populating...' : 'Populate Students Table'}
        </Button>
      </div>

      {error && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {result && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription>
            <div className="text-green-800">
              <p className="font-semibold mb-2">{result.message}</p>
              <ul className="text-sm space-y-1">
                <li>Total students in feedback: {result.totalStudentsInFeedback}</li>
                <li>New students added: {result.addedToStudentsTable}</li>
                <li>Students already existed: {result.alreadyExisted}</li>
              </ul>
              {result.errors && result.errors.length > 0 && (
                <div className="mt-2 text-red-600">
                  <p>Errors encountered: {result.errors.length}</p>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}