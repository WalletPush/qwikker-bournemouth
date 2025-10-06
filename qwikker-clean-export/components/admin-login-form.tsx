'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { FranchiseCity } from '@/lib/utils/city-detection'

interface AdminLoginFormProps {
  city: FranchiseCity
  cityDisplayName: string
}

export default function AdminLoginForm({ city, cityDisplayName }: AdminLoginFormProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log('🔐 Admin form submitted - preventing default')
    setError('')

    if (!username || !password) {
      setError('Please enter both username and password')
      return
    }

    console.log('🚀 Starting admin login process')
    startTransition(async () => {
      try {
        console.log('Attempting login with:', { city, username: username.trim() })
        
        const response = await fetch('/api/admin/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            city,
            username: username.trim(),
            password
          }),
        })

        console.log('Response status:', response.status)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Response error:', errorText)
          setError(`Server error: ${response.status}`)
          return
        }

        const data = await response.json()
        console.log('Response data:', data)

        if (data.success) {
          // Redirect to admin dashboard (cookie is set by API)
          router.push('/admin')
          router.refresh()
        } else {
          setError(data.error || 'Login failed')
        }
      } catch (error) {
        console.error('Login error:', error)
        setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-6 md:p-10 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: '30px 30px'
        }}></div>
      </div>
      
      <div className="relative w-full max-w-md">
        {/* Qwikker Logo Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img 
              src="/Qwikker Logo web.svg" 
              alt="QWIKKER" 
              className="qwikker-logo"
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Admin Access</h1>
          <p className="text-slate-400">{cityDisplayName} Franchise Dashboard</p>
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-900/50 text-red-300 border border-red-800">
            🔒 Admin Only - Authorized Personnel
          </div>
        </div>
        
        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-200 font-medium">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter admin username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isPending}
                autoComplete="username"
                className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-red-500 focus:ring-red-500/20 h-12"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-200 font-medium">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isPending}
                autoComplete="current-password"
                className="bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-400 focus:border-red-500 focus:ring-red-500/20 h-12"
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-red-300 bg-red-900/30 border border-red-800 rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-medium transition-colors"
              disabled={isPending}
            >
              {isPending ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Authenticating...
                </div>
              ) : (
                'Access Admin Dashboard'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700">
            <div className="text-center text-xs text-slate-400 space-y-1">
              <p className="font-medium text-slate-300">Testing Credentials:</p>
              <p><strong>Username:</strong> {city}</p>
              <p><strong>Password:</strong> Admin123</p>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="text-center mt-8 text-slate-500 text-sm">
          <p>⚠️ This is a restricted administrative interface</p>
          <p>Unauthorized access is prohibited</p>
        </div>
      </div>
    </div>
  )
}
