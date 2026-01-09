'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Mail, Check } from 'lucide-react'

interface EmailVerificationProps {
  email: string
  onVerified: (code: string) => void
  onResend: () => void
  onBack: () => void
}

export function EmailVerification({ email, onVerified, onResend, onBack }: EmailVerificationProps) {
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState('')
  const [resendCountdown, setResendCountdown] = useState(60)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Countdown for resend button
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [resendCountdown])

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return

    const newCode = [...code]
    newCode[index] = value
    setCode(newCode)
    setError('')

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Auto-submit when all filled
    if (newCode.every(digit => digit !== '') && newCode[5] !== '') {
      handleVerify(newCode.join(''))
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').slice(0, 6)
    if (!/^\d+$/.test(pastedData)) return

    const newCode = pastedData.split('').concat(Array(6 - pastedData.length).fill(''))
    setCode(newCode)

    // Focus on next empty field or last field
    const nextEmptyIndex = newCode.findIndex(digit => !digit)
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex
    inputRefs.current[focusIndex]?.focus()

    // Auto-verify if complete
    if (pastedData.length === 6) {
      handleVerify(pastedData)
    }
  }

  const handleVerify = async (verificationCode: string) => {
    setIsVerifying(true)
    setError('')

    try {
      const response = await fetch('/api/claim/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.toLowerCase(), 
          code: verificationCode 
        })
      })

      const data = await response.json()

      if (data.success) {
        onVerified(verificationCode)
      } else {
        setError(data.error || 'Invalid verification code. Please try again.')
        setCode(['', '', '', '', '', ''])
        inputRefs.current[0]?.focus()
      }
    } catch (error) {
      console.error('Verification error:', error)
      setError('Failed to verify code. Please try again.')
      setCode(['', '', '', '', '', ''])
      inputRefs.current[0]?.focus()
    }

    setIsVerifying(false)
  }

  const handleResend = async () => {
    setResendCountdown(60)
    setError('')
    await onResend()
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        ← Back
      </Button>

      <Card>
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          <CardTitle>📧 Check Your Email</CardTitle>
          <CardDescription>
            We sent a 6-digit verification code to:
            <br />
            <strong className="text-foreground">{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Code Input */}
          <div className="space-y-4">
            <label className="text-sm font-medium block text-center">
              Enter Verification Code
            </label>
            <div 
              className="flex gap-2 justify-center"
              onPaste={handlePaste}
            >
              {code.map((digit, index) => (
                <Input
                  key={index}
                  ref={(el) => { inputRefs.current[index] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-bold"
                  disabled={isVerifying}
                  autoFocus={index === 0}
                />
              ))}
            </div>

            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}

            {isVerifying && (
              <p className="text-sm text-muted-foreground text-center flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span>
                Verifying...
              </p>
            )}
          </div>

          {/* Resend Button */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Didn't receive the code?
            </p>
            {resendCountdown > 0 ? (
              <p className="text-sm text-muted-foreground">
                Resend available in {resendCountdown}s
              </p>
            ) : (
              <Button 
                variant="link" 
                onClick={handleResend}
                className="p-0 h-auto"
              >
                Resend Code
              </Button>
            )}
          </div>

          {/* Helpful Tips */}
          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2 text-sm">
            <p className="font-medium">💡 Tips:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Check your spam/junk folder</li>
              <li>• Make sure you entered the correct email</li>
              <li>• The code expires after 15 minutes</li>
            </ul>
          </div>

          {/* For Demo/Testing */}
          <div className="border-t pt-4">
            <p className="text-xs text-center text-muted-foreground">
              🧪 <strong>Demo Mode:</strong> Use code <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">123456</code> to test
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

