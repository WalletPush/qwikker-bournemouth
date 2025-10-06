'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface VerifyPassContentProps {
  searchParams: {
    wallet_pass_id?: string
    name?: string
    email?: string
  }
}

export function VerifyPassContent({ searchParams }: VerifyPassContentProps) {
  const router = useRouter()
  const [isVerifying, setIsVerifying] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<'waiting' | 'success' | 'error'>('waiting')
  const [errorMessage, setErrorMessage] = useState('')

  const { wallet_pass_id, name, email } = searchParams

  // Auto-verify if we have a wallet pass ID
  useEffect(() => {
    if (wallet_pass_id && !isVerifying && verificationStatus === 'waiting') {
      verifyPassInstallation()
    }
  }, [wallet_pass_id])

  const verifyPassInstallation = async () => {
    if (!wallet_pass_id) {
      setErrorMessage('No wallet pass ID provided')
      setVerificationStatus('error')
      return
    }

    setIsVerifying(true)
    
    try {
      // Check if user exists in database (meaning pass was created successfully)
      const response = await fetch('/api/verify-wallet-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_pass_id })
      })

      const result = await response.json()

      if (result.success && result.userExists) {
        setVerificationStatus('success')
        // Redirect to dashboard after short delay
        setTimeout(() => {
          router.push(`/user/dashboard?wallet_pass_id=${wallet_pass_id}`)
        }, 2000)
      } else {
        setVerificationStatus('error')
        setErrorMessage(result.message || 'Wallet pass verification failed')
      }
    } catch (error) {
      setVerificationStatus('error')
      setErrorMessage('Failed to verify wallet pass. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleManualVerify = () => {
    verifyPassInstallation()
  }

  const handleSkipForNow = () => {
    // Allow access but with limited functionality
    router.push('/user/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto">
        <Card className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-[#00d083] to-green-400 rounded-full flex items-center justify-center">
                {verificationStatus === 'waiting' && (
                  <svg className="w-8 h-8 text-white animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                {verificationStatus === 'success' && (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {verificationStatus === 'error' && (
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
            </div>
            
            <CardTitle className="text-2xl font-bold text-white mb-2">
              {verificationStatus === 'waiting' && 'Verifying Your Wallet Pass'}
              {verificationStatus === 'success' && 'Wallet Pass Verified!'}
              {verificationStatus === 'error' && 'Verification Issue'}
            </CardTitle>
            
            {name && (
              <p className="text-slate-300 text-lg">Welcome, {name}!</p>
            )}
          </CardHeader>
          
          <CardContent className="space-y-6">
            {verificationStatus === 'waiting' && (
              <div className="text-center space-y-4">
                <p className="text-slate-300">
                  We're checking that your wallet pass was created successfully...
                </p>
                {isVerifying && (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-[#00d083] rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-[#00d083] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-[#00d083] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                )}
              </div>
            )}

            {verificationStatus === 'success' && (
              <div className="text-center space-y-4">
                <p className="text-green-400 text-lg font-medium">
                  ✅ Your wallet pass is ready!
                </p>
                <p className="text-slate-300">
                  Redirecting you to your dashboard...
                </p>
              </div>
            )}

            {verificationStatus === 'error' && (
              <div className="space-y-4">
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                  <p className="text-red-400 font-medium mb-2">Verification Failed</p>
                  <p className="text-slate-300 text-sm">{errorMessage}</p>
                </div>
                
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <p className="text-blue-400 font-medium mb-2">What to do:</p>
                  <ul className="text-slate-300 text-sm space-y-1">
                    <li>1. Check your email for the wallet pass</li>
                    <li>2. Add the pass to your phone's wallet</li>
                    <li>3. Try verification again</li>
                  </ul>
                </div>
                
                <div className="flex gap-3">
                  <Button 
                    onClick={handleManualVerify}
                    disabled={isVerifying}
                    className="flex-1 bg-[#00d083] hover:bg-[#00b86f] text-white"
                  >
                    {isVerifying ? 'Checking...' : 'Try Again'}
                  </Button>
                  <Button 
                    onClick={handleSkipForNow}
                    variant="outline"
                    className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                  >
                    Skip for Now
                  </Button>
                </div>
              </div>
            )}

            {!wallet_pass_id && (
              <div className="text-center space-y-4">
                <p className="text-slate-300">
                  No wallet pass information found. Please complete the signup process first.
                </p>
                <Button 
                  onClick={() => router.push('/')}
                  className="bg-[#00d083] hover:bg-[#00b86f] text-white"
                >
                  Back to Home
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
