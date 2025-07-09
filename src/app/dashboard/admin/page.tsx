import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Settings, 
  Upload, 
  Database, 
  Users, 
  FileText,
  Shield
} from 'lucide-react'
import FileUpload from '@/components/feedback/FileUpload'
import DatabaseViewer from '@/components/database/DatabaseViewer'
import { getInstructorPermissions } from '@/lib/instructor-permissions'

async function AdminPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  const permissions = getInstructorPermissions(session.user.name || session.user.email)
  
  if (!permissions.canAccessAllData) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-500" />
              Access Denied
            </CardTitle>
            <CardDescription>
              You don't have permission to access admin features.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Admin Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground mb-2">Admin</h1>
        <p className="text-muted-foreground">Manage system settings and data</p>
      </div>

      {/* File Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              File Upload
            </CardTitle>
            <CardDescription>
              Upload feedback documents for processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUpload 
              onUploadComplete={() => window.location.reload()}
              allowedInstructors={['Test Instructor', 'Srijan', 'Saurav', 'Jami', 'Mai', 'Tamkeen', 'Naveen', 'Gabi']}
              defaultInstructor={session.user.name}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              System Status
            </CardTitle>
            <CardDescription>
              Current system configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <span className="text-sm">Real-time processing active</span>
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <span className="text-sm">Database connected</span>
            </div>
            <div className="flex items-center gap-2 text-green-600">
              <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              <span className="text-sm">AI analysis enabled</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Database Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Database Management
          </CardTitle>
          <CardDescription>
            View and manage feedback data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Loading database viewer...</div>}>
            <DatabaseViewer onMigrationNeeded={() => window.location.reload()} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminPage