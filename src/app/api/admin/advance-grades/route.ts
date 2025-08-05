import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { advanceStudentGrades } from '@/lib/grade-advancement'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Optional: Add admin role check here
    // if (session.user.role !== 'admin') {
    //   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    // }
    
    const result = await advanceStudentGrades()
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in advance grades API:', error)
    return NextResponse.json(
      { error: 'Failed to advance grades' },
      { status: 500 }
    )
  }
}