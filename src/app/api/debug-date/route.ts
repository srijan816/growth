import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  const now = new Date()
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' })
  
  // Get all courses to see what days we have
  const { data: courses } = await supabaseAdmin
    .from('courses')
    .select('code, name, day_of_week, start_time')
    .order('day_of_week')

  // Get Thursday courses specifically
  const { data: thursdayCourses } = await supabaseAdmin
    .from('courses')
    .select('*')
    .eq('day_of_week', 'Thursday')

  return NextResponse.json({
    debug: {
      currentDate: now.toISOString(),
      currentDayName: dayName,
      dateString: now.toDateString(),
      dayOfWeek: now.getDay(),
      expectedDay: 'Thursday',
      isThursday: dayName === 'Thursday'
    },
    allCourseDays: courses?.map(c => ({ 
      code: c.code, 
      day: c.day_of_week,
      time: c.start_time 
    })),
    thursdayCoursesCount: thursdayCourses?.length || 0,
    thursdayCourses: thursdayCourses
  })
}