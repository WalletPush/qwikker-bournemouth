'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * HQ Admin Logout Button
 * 
 * Calls the server-side logout endpoint to clear all session cookies
 * (including httpOnly Supabase cookies), then redirects to HQ login.
 */
export function HQLogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()

  async function handleLogout() {
    setIsLoggingOut(true)
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST' })
      if (res.ok) {
        router.push('/hq-login')
        router.refresh()
      } else {
        // Fallback: force navigate even if API had issues
        window.location.href = '/hq-login'
      }
    } catch {
      // Network error fallback
      window.location.href = '/hq-login'
    }
  }

  return (
    <button
      onClick={handleLogout}
      disabled={isLoggingOut}
      className="flex w-full items-center gap-3 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-slate-800 transition-colors disabled:opacity-50 mt-2"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
      <span className="text-sm font-medium">
        {isLoggingOut ? 'Logging out...' : 'Logout'}
      </span>
    </button>
  )
}
