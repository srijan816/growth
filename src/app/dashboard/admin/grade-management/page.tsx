import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import GradeManagementClient from './grade-management-client'

export const metadata: Metadata = {
  title: 'Grade Management | Growth Compass'
}

export default async function GradeManagementPage() {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    redirect('/login')
  }

  return <GradeManagementClient session={session} />
}