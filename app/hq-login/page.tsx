'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function HQAdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      
      // Sign in
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError || !data.user) {
        setError('Incorrect email or password')
        setLoading(false)
        return
      }

      // Check if user is HQ admin
      const { data: hqAdmin, error: hqError } = await supabase
        .from('hq_admins')
        .select('user_id, is_active')
        .eq('user_id', data.user.id)
        .maybeSingle()

      if (hqError || !hqAdmin || !hqAdmin.is_active) {
        await supabase.auth.signOut()
        setError('Access denied: Not an HQ admin')
        setLoading(false)
        return
      }

      // Success - redirect to HQ admin
      router.push('/hqadmin')
      router.refresh()

    } catch (err: unknown) {
      setError('Incorrect email or password')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">QWIKKER HQ</h1>
          <p className="text-slate-400">Platform Control Plane</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-8">
          <h2 className="text-xl font-semibold text-white mb-6">HQ Admin Login</h2>

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hq@qwikker.com"
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00D083]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00D083]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-[#00D083] hover:bg-[#00b86f] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-800">
            <p className="text-xs text-slate-500 text-center">
              HQ admin access only. For franchise admin login, use your city subdomain.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

