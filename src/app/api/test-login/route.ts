import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function GET() {
  try {
    // Test credentials
    const email = 'instructor@example.com'
    const password = 'changeme123'
    
    // Fetch user from database using admin client
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (fetchError) {
      return NextResponse.json({ 
        error: 'User not found', 
        details: fetchError.message,
        code: fetchError.code
      }, { status: 404 })
    }

    if (!user) {
      return NextResponse.json({ 
        error: 'No user data returned' 
      }, { status: 404 })
    }

    // Test password
    const isValid = await bcrypt.compare(password, user.password_hash)

    return NextResponse.json({
      userFound: true,
      email: user.email,
      name: user.name,
      role: user.role,
      passwordValid: isValid,
      hashLength: user.password_hash.length,
      hashPrefix: user.password_hash.substring(0, 10),
      testPassword: password
    })

  } catch (error) {
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
}