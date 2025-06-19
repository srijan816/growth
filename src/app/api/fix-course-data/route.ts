import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    // Course code to correct day/time mapping based on the Excel data
    const courseCorrections = [
      { code: '02IPDEC2401', day: 'Thursday', time: '18:00:00' },
      { code: '02IPDEC2402', day: 'Friday', time: '18:00:00' },
      { code: '02IPDDC2402', day: 'Saturday', time: '09:00:00' },
      { code: '02IPDEC2403', day: 'Saturday', time: '11:00:00' },
      { code: '02IPDEC2404', day: 'Saturday', time: '13:30:00' },
      { code: '01IPDED2404', day: 'Saturday', time: '15:00:00' },
      { code: '01IPDED2405', day: 'Saturday', time: '16:45:00' },
      { code: '02IPDEB2401', day: 'Tuesday', time: '16:30:00' },
      { code: '02OPDEC2401', day: 'Wednesday', time: '16:30:00' },
      { code: '01IPDED2401', day: 'Wednesday', time: '18:00:00' },
      { code: 'PRI001', day: 'Monday', time: '15:00:00' }
    ]

    const results = {
      updated: [],
      errors: []
    }

    for (const correction of courseCorrections) {
      const { data, error } = await supabaseAdmin
        .from('courses')
        .update({ 
          day_of_week: correction.day,
          start_time: correction.time,
          name: `${correction.day} ${correction.time.substring(0, 5)} - ${correction.code}`
        })
        .eq('code', correction.code)
        .select()

      if (error) {
        results.errors.push(`Failed to update ${correction.code}: ${error.message}`)
      } else if (data && data.length > 0) {
        results.updated.push({
          code: correction.code,
          day: correction.day,
          time: correction.time
        })
      }
    }

    return NextResponse.json({
      success: true,
      results
    })

  } catch (error) {
    return NextResponse.json({ 
      error: 'Fix failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}