'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, XCircle, Loader2, Users } from 'lucide-react'

interface InstructorResult {
  name: string
  email: string
  status: string
  id?: string
  error?: string
}

export default function SetupInstructorsPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<InstructorResult[]>([])
  const [error, setError] = useState<string | null>(null)

  const createInstructors = async () => {
    setLoading(true)
    setError(null)
    setResults([])

    try {
      const response = await fetch('/api/auth/create-instructors', {
        method: 'POST'
      })

      const data = await response.json()

      if (data.success) {
        setResults(data.results)
      } else {
        setError(data.error || 'Failed to create instructors')
      }
    } catch (err) {
      setError('Failed to connect to the server')
      console.error('Error creating instructors:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            Setup Instructor Accounts
          </CardTitle>
          <CardDescription>
            Create instructor accounts for Saurav, Srijan, Jami, Mai, Tamkeen, and Naveen.
            Each instructor will have their own login with email format: name@instructor.com
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Instructor Accounts to Create:</h3>
            <ul className="space-y-1 text-sm">
              <li>• <strong>Saurav</strong> - saurav@instructor.com (password: password)</li>
              <li>• <strong>Srijan</strong> - srijan@instructor.com (password: password)</li>
              <li>• <strong>Jami</strong> - jami@instructor.com (password: password)</li>
              <li>• <strong>Mai</strong> - mai@instructor.com (password: password)</li>
              <li>• <strong>Tamkeen</strong> - tamkeen@instructor.com (password: password)</li>
              <li>• <strong>Naveen</strong> - naveen@instructor.com (password: password)</li>
            </ul>
          </div>

          <Button 
            onClick={createInstructors} 
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Instructor Accounts...
              </>
            ) : (
              'Create All Instructor Accounts'
            )}
          </Button>

          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Results:</h3>
              {results.map((result, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg border flex items-center justify-between ${
                    result.status === 'created' ? 'bg-green-50 border-green-200' :
                    result.status === 'already exists' ? 'bg-blue-50 border-blue-200' :
                    'bg-red-50 border-red-200'
                  }`}
                >
                  <div>
                    <div className="font-medium">{result.name}</div>
                    <div className="text-sm text-gray-600">{result.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {result.status === 'created' && (
                      <>
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <span className="text-sm text-green-600">Created</span>
                      </>
                    )}
                    {result.status === 'already exists' && (
                      <>
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                        <span className="text-sm text-blue-600">Already Exists</span>
                      </>
                    )}
                    {result.status === 'error' && (
                      <>
                        <XCircle className="h-5 w-5 text-red-600" />
                        <span className="text-sm text-red-600">Error: {result.error}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <Alert>
            <AlertDescription>
              <strong>Note:</strong> After creating the accounts, each instructor will only see feedback 
              from students in their respective folders (Primary/Secondary → Instructor Name → Student Files).
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}