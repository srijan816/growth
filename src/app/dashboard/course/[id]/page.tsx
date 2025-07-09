import { Suspense } from 'react'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import CourseDetailClient from './course-detail-client'

interface CoursePageProps {
  params: Promise<{ id: string }>
}

export default async function CoursePage({ params }: CoursePageProps) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/auth/signin')
  }

  const resolvedParams = await params
  const courseId = parseInt(resolvedParams.id)

  return (
    <Suspense fallback={<div>Loading course details...</div>}>
      <CourseDetailClient courseId={courseId} session={session} />
    </Suspense>
  )
}