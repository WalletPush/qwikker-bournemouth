'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const logout = async () => {
    setLoading(true)
    
    try {
      // CRITICAL: Call server-side logout to clear httpOnly cookies
      // Client-side signOut() alone does NOT clear httpOnly cookies
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include', // Include httpOnly cookies in request
      })
      
      if (!response.ok) {
        console.error('Logout request failed:', response.status)
      }
      
      // Redirect to login page
      router.push('/auth/login')
      
      // Force a hard refresh to clear any cached state
      router.refresh()
      
    } catch (error) {
      console.error('❌ Logout failed:', error)
      
      // Even if logout fails, redirect to login (fail-safe)
      router.push('/auth/login')
      router.refresh()
    } finally {
      setLoading(false)
    }
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
