import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const instructorId = '550e8400-e29b-41d4-a716-446655440000'
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })

  // Test query without auth
  const { data: courses, error } = await supabaseAdmin
    .from('courses')
    .select(`
      id,
      code,
      name,
      program_type,
      grade_range,
      day_of_week,
      start_time,
      enrollments(
        id,
        student_id,
        status
      )
    `)
    .eq('instructor_id', instructorId)
    .eq('status', 'active')
    .eq('day_of_week', today)
    .order('start_time', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message })
  }

  return NextResponse.json({
    today,
    instructorId,
    coursesFound: courses?.length || 0,
    courses: courses || []
  })
}