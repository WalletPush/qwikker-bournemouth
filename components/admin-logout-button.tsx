'use client'

import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export function AdminLogoutButton() {
  const router = useRouter()

  const logout = async () => {
    try {
      // Call admin logout API to clear the admin session cookie
      const response = await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include'
      })

      if (response.ok) {
        // Redirect to admin login page
        router.push('/admin/login')
        router.refresh()
      } else {
        console.error('Admin logout failed')
        // Still redirect to admin login even if logout API fails
        router.push('/admin/login')
      }
    } catch (error) {
      console.error('Admin logout error:', error)
      // Still redirect to admin login even if there's an error
      router.push('/admin/login')
    }
  }

  return (
    <Button 
      onClick={logout}
      className="w-full bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
    >
      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      Admin Logout
    </Button>
  )
}
