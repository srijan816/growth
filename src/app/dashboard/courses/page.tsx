import { Metadata } from 'next'
import AllCourses from '@/components/dashboard/AllCourses'

export const metadata: Metadata = {
  title: 'All Courses | Growth Compass',
  description: 'View and manage all your courses',
}

export default function CoursesPage() {
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">All Courses</h1>
        <p className="text-muted-foreground mt-2">
          Manage your courses, customize their appearance, and track assignments
        </p>
      </div>
      
      <AllCourses />
    </div>
  )
}