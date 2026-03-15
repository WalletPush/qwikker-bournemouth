'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function AdminForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      setStep('code')
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          code: code.trim(),
          newPassword,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Something went wrong')
        return
      }

      window.location.href = '/admin/login?message=password-reset'
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-6 md:p-10 relative overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)`,
          backgroundSize: '30px 30px'
        }}></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="/qwikker-logo-web.svg"
              alt="QWIKKER"
              className="qwikker-logo"
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Reset Password</h1>
          <p className="text-slate-400">
            {step === 'email'
              ? 'Enter the email address linked to your admin account'
              : 'Enter the 6-digit code sent to your email'}
          </p>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-xl border border-slate-700 rounded-xl p-6">
          {step === 'email' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-slate-200 font-medium">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
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
                {isLoading ? 'Sending...' : 'Send Reset Code'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="code" className="block text-slate-200 font-medium">
                  Verification Code
                </label>
                <input
                  id="code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={isLoading}
                  maxLength={6}
                  className="w-full h-12 px-3 bg-slate-900/50 border border-slate-600 text-white placeholder:text-slate-400 focus:border-red-500 focus:ring-red-500/20 rounded-md focus:outline-none focus:ring-2 text-center text-lg tracking-widest"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="new-password" className="block text-slate-200 font-medium">
                  New Password
                </label>
                <input
                  id="new-password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={isLoading}
                  minLength={8}
                  className="w-full h-12 px-3 bg-slate-900/50 border border-slate-600 text-white placeholder:text-slate-400 focus:border-red-500 focus:ring-red-500/20 rounded-md focus:outline-none focus:ring-2"
                  required
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="confirm-password" className="block text-slate-200 font-medium">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  minLength={8}
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
                {isLoading ? 'Resetting...' : 'Reset Password'}
              </button>

              <button
                type="button"
                onClick={() => { setStep('email'); setError(''); setCode('') }}
                className="w-full text-sm text-slate-400 hover:text-white transition-colors"
              >
                Didn't receive the code? Go back
              </button>
            </form>
          )}
        </div>

        <div className="text-center mt-6">
          <Link
            href="/admin/login"
            className="text-sm text-slate-400 hover:text-white transition-colors underline-offset-4 hover:underline"
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  )
}
