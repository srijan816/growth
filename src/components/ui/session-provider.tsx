'use client'

import { SessionProvider } from 'next-auth/react'
import { ReactNode } from 'react'

export default function AuthSessionProvider({ 
  children 
}: { 
  children: ReactNode 
}) {
  return (
    <SessionProvider 
      refetchInterval={5 * 60} // Refetch every 5 minutes instead of default
      refetchOnWindowFocus={false} // Disable refetch on window focus
    >
      {children}
    </SessionProvider>
  )
}