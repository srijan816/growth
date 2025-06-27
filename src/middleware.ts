import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Fix for URL constructor error - ensure request.url is valid
  try {
    const url = request.nextUrl.clone()
    
    // For auth/session requests, ensure proper handling
    if (url.pathname === '/api/auth/session') {
      // Add any necessary headers or modifications
      const response = NextResponse.next()
      response.headers.set('x-middleware-cache', 'no-cache')
      return response
    }
    
    return NextResponse.next()
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/api/auth/:path*', '/dashboard/:path*']
}