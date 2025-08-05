import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { db } from '@/lib/postgres'
import { categorizeFeedback } from '@/lib/grade-advancement'

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: studentId } = await context.params

    // Get all feedback for the student
    const feedbackQuery = `
      SELECT 
        f.*,
        u.name as instructor_name
      FROM parsed_student_feedback f
      LEFT JOIN users u ON f.instructor_id = u.id
      WHERE f.student_id = $1
      ORDER BY f.created_at DESC
    `
    
    const result = await db.query(feedbackQuery, [studentId])
    
    // Categorize feedback based on grade at time
    const { primary, secondary } = await categorizeFeedback(studentId, result.rows)
    
    return NextResponse.json({ 
      primary,
      secondary,
      total: result.rows.length 
    })
  } catch (error) {
    console.error('Error categorizing feedback:', error)
    return NextResponse.json(
      { error: 'Failed to categorize feedback' },
      { status: 500 }
    )
  }
}