import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    // Generate proper password hash for "changeme123"
    const passwordHash = await bcrypt.hash('changeme123', 12)
    
    // Check if demo user exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id, email, password_hash')
      .eq('email', 'instructor@example.com')
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json({ 
        error: 'Database error', 
        details: checkError.message 
      }, { status: 500 })
    }

    if (existingUser) {
      // Update existing user's password
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ password_hash: passwordHash })
        .eq('email', 'instructor@example.com')

      if (updateError) {
        return NextResponse.json({ 
          error: 'Failed to update password', 
          details: updateError.message 
        }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Demo user password updated successfully',
        email: 'instructor@example.com',
        existingHash: existingUser.password_hash.substring(0, 20) + '...',
        newHash: passwordHash.substring(0, 20) + '...'
      })
    } else {
      // Create new demo user
      const { error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          id: '550e8400-e29b-41d4-a716-446655440000',
          email: 'instructor@example.com',
          name: 'Test Instructor',
          role: 'instructor',
          password_hash: passwordHash
        })

      if (insertError) {
        return NextResponse.json({ 
          error: 'Failed to create demo user', 
          details: insertError.message 
        }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Demo user created successfully',
        email: 'instructor@example.com'
      })
    }
  } catch (error) {
    return NextResponse.json({ 
      error: 'Server error', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}