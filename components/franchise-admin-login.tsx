'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { FranchiseCity } from '@/lib/utils/client-city-detection'

interface FranchiseAdminLoginProps {
  city: FranchiseCity
  cityDisplayName: string
}

export default function FranchiseAdminLogin({ city, cityDisplayName }: FranchiseAdminLoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    console.log('🔥 FRANCHISE ADMIN LOGIN SUBMITTED')
    console.log('Form data:', { city, username, passwordLength: password.length })
    
    setError('')
    setIsLoading(true)

    if (!username || !password) {
      setError('Please enter both username and password')
      setIsLoading(false)
      return
    }

    try {
      console.log('🚀 Making fetch request to /api/admin/login')
      
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

      console.log('📡 Response received:', response.status, response.statusText)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Response error:', errorText)
        setError(`Server error: ${response.status}`)
        return
      }

      const data = await response.json()
      console.log('✅ Response data:', data)

      if (data.success) {
        console.log('Login successful, redirecting to /admin')
        router.push('/admin')
        router.refresh()
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (error) {
      console.error('💥 Network error:', error)
      setError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoading(false)
    }
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
              src="/qwikker-logo-web.svg" 
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
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="admin-username" className="block text-slate-200 font-medium">
                Username
              </label>
              <input
                id="admin-username"
                type="text"
                placeholder="Enter admin username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                autoComplete="username"
                className="w-full h-12 px-3 bg-slate-900/50 border border-slate-600 text-white placeholder:text-slate-400 focus:border-red-500 focus:ring-red-500/20 rounded-md focus:outline-none focus:ring-2"
                required
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="admin-password" className="block text-slate-200 font-medium">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                placeholder="Enter admin password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                autoComplete="current-password"
                className="w-full h-12 px-3 bg-slate-900/50 border border-slate-600 text-white placeholder:text-slate-400 focus:border-red-500 focus:ring-red-500/20 rounded-md focus:outline-none focus:ring-2"
                required
              />
            </div>

            {error && (
              <div className="p-3 text-sm text-red-300 bg-red-900/30 border border-red-800 rounded-md">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-medium transition-colors rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Authenticating...
                </div>
              ) : (
                'Access Admin Dashboard'
              )}
            </button>
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
