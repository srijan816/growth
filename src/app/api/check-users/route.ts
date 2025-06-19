import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    // Get all users
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, created_at')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to fetch users', 
        details: error.message 
      }, { status: 500 })
    }

    // Check specifically for instructor@example.com
    const { data: instructor, error: instructorError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'instructor@example.com')

    return NextResponse.json({
      totalUsers: users?.length || 0,
      users: users || [],
      instructorCheck: {
        found: instructor && instructor.length > 0,
        count: instructor?.length || 0,
        data: instructor?.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          hashPrefix: u.password_hash?.substring(0, 20) + '...'
        }))
      }
    })

  } catch (error) {
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}