'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

/**
 * Logout button for the Business Dashboard
 * 
 * CRITICAL: Uses window.location.href (hard redirect) instead of Next.js router.
 * The Next.js soft navigation (router.replace + router.refresh) causes a redirect loop
 * because the in-memory Supabase client session persists even after server-side cookies
 * are cleared. A hard redirect ensures ALL client-side state is wiped.
 */
export function LogoutButton() {
  const [loading, setLoading] = useState(false)

  const logout = async () => {
    setLoading(true)
    
    try {
      // Clear httpOnly cookies via server-side logout endpoint
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout API error (proceeding with redirect):', error)
    }
    
    // ALWAYS hard redirect to clear all in-memory state (Supabase client session, RSC cache)
    // This prevents the soft-navigation redirect loop
    window.location.href = '/auth/login'
  }

  return (
    <Button 
      onClick={logout}
      disabled={loading}
      className="text-slate-400 hover:text-white"
    >
      {loading ? 'Logging out...' : 'Logout'}
    </Button>
  )
}
