'use client'

import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Check, Eye, EyeOff } from 'lucide-react'

interface CreateAccountProps {
  email: string
  businessName: string
  onSubmit: (data: { firstName: string; lastName: string; password: string }) => void
  onBack: () => void
}

export function CreateAccount({ email, businessName, onSubmit, onBack }: CreateAccountProps) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Password strength validation
  const getPasswordStrength = (pwd: string) => {
    let strength = 0
    if (pwd.length >= 8) strength++
    if (pwd.length >= 12) strength++
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++
    if (/\d/.test(pwd)) strength++
    if (/[^a-zA-Z\d]/.test(pwd)) strength++
    return strength
  }

  const passwordStrength = getPasswordStrength(password)
  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong']
  const strengthColors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500', 'bg-green-600']

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!firstName.trim()) newErrors.firstName = 'First name is required'
    if (!lastName.trim()) newErrors.lastName = 'Last name is required'
    
    if (!password) {
      newErrors.password = 'Password is required'
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    } else if (passwordStrength < 2) {
      newErrors.password = 'Password is too weak. Use uppercase, lowercase, and numbers.'
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    
    if (!validate()) return

    setIsSubmitting(true)

    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 1000))

    onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      password
    })

    setIsSubmitting(false)
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-4 text-neutral-400 hover:text-white hover:bg-white/[0.05]">
        ← Back
      </Button>

      <div className="relative">
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-[#00d083]/20 via-white/[0.06] to-transparent" />
        <Card className="relative bg-[#111315]/80 backdrop-blur-xl border-0 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <CardHeader className="px-8 pt-8">
            <div className="w-16 h-16 rounded-2xl bg-[#00d083]/10 border border-[#00d083]/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-[#00d083]" />
            </div>
            <CardTitle className="text-center text-xl text-white">Email Verified!</CardTitle>
            <CardDescription className="text-center text-neutral-500">
              Create your QWIKKER account to claim <strong className="text-white">{businessName}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">First Name *</label>
                <Input
                  type="text"
                  placeholder="Sarah"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value)
                    if (errors.firstName) setErrors({ ...errors, firstName: '' })
                  }}
                  className={`h-12 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-neutral-600 focus:border-[#00d083]/40 focus:ring-[#00d083]/20 rounded-xl ${errors.firstName ? 'border-red-500/50' : ''}`}
                />
                {errors.firstName && (
                  <p className="text-sm text-red-400">{errors.firstName}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">Last Name *</label>
                <Input
                  type="text"
                  placeholder="Williams"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value)
                    if (errors.lastName) setErrors({ ...errors, lastName: '' })
                  }}
                  className={`h-12 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-neutral-600 focus:border-[#00d083]/40 focus:ring-[#00d083]/20 rounded-xl ${errors.lastName ? 'border-red-500/50' : ''}`}
                />
                {errors.lastName && (
                  <p className="text-sm text-red-400">{errors.lastName}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">Email</label>
                <Input
                  type="email"
                  value={email}
                  disabled
                  className="h-12 bg-white/[0.02] border-white/[0.04] text-neutral-500 rounded-xl"
                />
                <p className="text-xs text-neutral-500 flex items-center gap-1">
                  <Check className="w-3 h-3 text-[#00d083]" />
                  Verified
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">Password *</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      if (errors.password) setErrors({ ...errors, password: '' })
                    }}
                    className={`h-12 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-neutral-600 focus:border-[#00d083]/40 focus:ring-[#00d083]/20 rounded-xl pr-12 ${errors.password ? 'border-red-500/50' : ''}`}
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 h-full px-3 text-neutral-500 hover:text-neutral-300 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {password && (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded ${
                            level <= passwordStrength ? strengthColors[passwordStrength] : 'bg-white/[0.06]'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-neutral-500">
                      Strength: {strengthLabels[passwordStrength]}
                    </p>
                  </div>
                )}

                {errors.password && (
                  <p className="text-sm text-red-400">{errors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">Confirm Password *</label>
                <div className="relative">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' })
                    }}
                    className={`h-12 bg-white/[0.04] border-white/[0.08] text-white placeholder:text-neutral-600 focus:border-[#00d083]/40 focus:ring-[#00d083]/20 rounded-xl pr-12 ${errors.confirmPassword ? 'border-red-500/50' : ''}`}
                  />
                  <button
                    type="button"
                    className="absolute right-0 top-0 h-full px-3 text-neutral-500 hover:text-neutral-300 transition-colors"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-400">{errors.confirmPassword}</p>
                )}
              </div>

              <button 
                type="submit" 
                className={`w-full h-12 rounded-xl font-semibold transition-all active:scale-[0.98] mt-2 ${
                  isSubmitting
                    ? 'bg-white/[0.06] text-neutral-600 cursor-not-allowed'
                    : 'bg-[#00d083] hover:bg-[#00b86f] text-[#0a0a0a] hover:shadow-[0_0_20px_rgba(0,208,131,0.3)]'
                }`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Creating Account...
                  </>
                ) : (
                  'Create Account & Submit Claim'
                )}
              </button>

              <p className="text-xs text-center text-neutral-600">
                By creating an account, you agree to QWIKKER&apos;s{' '}
                <a href="/terms-of-service" className="underline hover:text-neutral-400 transition-colors">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy-policy" className="underline hover:text-neutral-400 transition-colors">
                  Privacy Policy
                </a>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

