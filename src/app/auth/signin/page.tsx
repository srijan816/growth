'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        // Check session and redirect
        const session = await getSession()
        if (session) {
          router.push('/dashboard')
        }
      }
    } catch (error) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      {/* Left Column: Branding and Logo */}
      <div className="relative hidden lg:flex items-center justify-center bg-gradient-to-br from-gray-900 to-black p-12">
        <div className="text-center text-white space-y-6">
          <img 
            src="/capstone-evolve-logo.png" 
            alt="Capstone Evolve" 
            className="mx-auto h-48 w-auto mb-8" 
          />
          <h1 className="text-4xl font-bold tracking-tight">Unlock Student Potential</h1>
          <p className="text-lg text-gray-300">
            Gain insights into student growth and provide targeted feedback.
          </p>
        </div>
        <div className="absolute bottom-8 text-xs text-gray-400">
          <p>Capstone Evolve v1.0.0 - Phase 0 Foundation</p>
        </div>
      </div>

      {/* Right Column: Sign-in Form */}
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-md w-full space-y-8">
          <div className="lg:hidden text-center">
            <img src="/capstone-evolve-logo.png" alt="Capstone Evolve" className="mx-auto h-32 w-auto mb-4" />
          </div>
          <Card className="border-0 shadow-none sm:shadow-lg sm:border-gray-200">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold">Instructor Login</CardTitle>
              <CardDescription>
                Welcome back! Please sign in to continue.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handleSubmit}>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="instructor@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12 text-base"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <a href="#" className="text-sm font-medium text-blue-600 hover:underline">
                        Forgot password?
                      </a>
                    </div>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 text-base"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-6">
                  <div className="flex items-center space-x-2">
                    <input type="checkbox" id="remember-me" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                    <Label htmlFor="remember-me" className="text-sm text-gray-600">Remember me</Label>
                  </div>
                </div>

                <Button type="submit" className="w-full mt-6 h-12 text-base font-semibold bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
              
              {/* Demo Credentials */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="text-sm font-medium text-gray-800 mb-2">Demo Credentials</h3>
                <p className="text-xs text-gray-600">
                  <strong>Email:</strong> instructor@example.com
                </p>
                <p className="text-xs text-gray-600">
                  <strong>Password:</strong> changeme123
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}