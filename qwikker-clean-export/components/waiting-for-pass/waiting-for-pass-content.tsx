'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface WaitingForPassContentProps {
  searchParams: {
    email?: string
    name?: string
  }
}

export function WaitingForPassContent({ searchParams }: WaitingForPassContentProps) {
  const router = useRouter()
  const [isChecking, setIsChecking] = useState(false)
  const [attempts, setAttempts] = useState(0)
  const [maxAttempts] = useState(30) // 5 minutes of checking
  const [passReady, setPassReady] = useState(false)

  const { email, name } = searchParams

  // Auto-check for wallet pass creation every 10 seconds
  useEffect(() => {
    const checkForPass = async () => {
      if (!email || attempts >= maxAttempts || passReady) return

      setIsChecking(true)
      
      try {
        // Check if a user with wallet pass has been created
        const response = await fetch('/api/check-pass-ready', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        })

        const result = await response.json()

        if (result.success && result.passReady) {
          setPassReady(true)
          // Redirect to verification page
          setTimeout(() => {
            router.push(`/verify-pass?wallet_pass_id=${result.wallet_pass_id}&name=${encodeURIComponent(result.name)}&email=${encodeURIComponent(email)}`)
          }, 2000)
        } else {
          setAttempts(prev => prev + 1)
        }
      } catch (error) {
        console.error('Error checking for pass:', error)
        setAttempts(prev => prev + 1)
      } finally {
        setIsChecking(false)
      }
    }

    // Start checking after 5 seconds, then every 10 seconds
    const initialDelay = setTimeout(() => {
      checkForPass()
      const interval = setInterval(checkForPass, 10000)
      
      return () => clearInterval(interval)
    }, 5000)

    return () => clearTimeout(initialDelay)
  }, [email, attempts, maxAttempts, passReady, router])

  const handleManualCheck = () => {
    setAttempts(0)
    // Trigger a check
    if (email) {
      const checkForPass = async () => {
        setIsChecking(true)
        try {
          const response = await fetch('/api/check-pass-ready', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          })

          const result = await response.json()

          if (result.success && result.passReady) {
            setPassReady(true)
            router.push(`/verify-pass?wallet_pass_id=${result.wallet_pass_id}&name=${encodeURIComponent(result.name)}&email=${encodeURIComponent(email)}`)
          }
        } catch (error) {
          console.error('Error checking for pass:', error)
        } finally {
          setIsChecking(false)
        }
      }
      checkForPass()
    }
  }

  const timeRemaining = Math.max(0, maxAttempts - attempts)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#00d083] to-green-400 rounded-full flex items-center justify-center">
                {passReady ? (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </div>
            </div>
            
            <CardTitle className="text-2xl font-bold text-white mb-2">
              {passReady ? 'Your Wallet Pass is Ready!' : 'Creating Your Wallet Pass'}
            </CardTitle>
            
            {name && (
              <p className="text-slate-300 text-lg">Welcome, {name}!</p>
            )}
          </CardHeader>
          
          <CardContent className="space-y-6">
            {!passReady ? (
              <div className="text-center space-y-4">
                <p className="text-slate-300">
                  We're creating your personalized Qwikker wallet pass. This usually takes 30-60 seconds.
                </p>
                
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-blue-400 font-medium mb-2">What's happening:</p>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>✅ Your signup was received</li>
                    <li className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#00d083] border-t-transparent rounded-full animate-spin"></div>
                      Creating your wallet pass
                    </li>
                    <li className="text-slate-500">⏳ Setting up your dashboard</li>
                  </ul>
                </div>
                
                {attempts > 10 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
                    <p className="text-yellow-400 font-medium mb-2">Taking longer than expected?</p>
                    <p className="text-slate-300 text-sm mb-3">
                      Sometimes our system needs extra time, especially with slower internet connections.
                    </p>
                    <Button 
                      onClick={handleManualCheck}
                      disabled={isChecking}
                      className="bg-yellow-500 hover:bg-yellow-600 text-black text-sm"
                    >
                      {isChecking ? 'Checking...' : 'Check Again'}
                    </Button>
                  </div>
                )}
                
                {attempts >= maxAttempts && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <p className="text-red-400 font-medium mb-2">Still waiting?</p>
                    <p className="text-slate-300 text-sm mb-3">
                      If your pass is taking longer than expected, please check your email or contact support.
                    </p>
                    <div className="flex gap-3">
                      <Button 
                        onClick={handleManualCheck}
                        disabled={isChecking}
                        className="flex-1 bg-[#00d083] hover:bg-[#00b86f] text-white"
                      >
                        Try Again
                      </Button>
                      <Button 
                        onClick={() => router.push('/user/dashboard')}
                        variant="outline"
                        className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                      >
                        Continue Without Pass
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-[#00d083] rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-[#00d083] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-[#00d083] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <p className="text-green-400 text-lg font-medium">
                  ✅ Perfect! Your wallet pass is ready.
                </p>
                <p className="text-slate-300">
                  Redirecting you to complete setup...
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
