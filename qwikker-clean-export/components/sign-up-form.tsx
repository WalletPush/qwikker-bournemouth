'use client'

import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { logSupabaseEnvironment, logSupabaseError, testSupabaseConnection } from '@/lib/debug-supabase'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [repeatPassword, setRepeatPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    // Log environment and configuration details
    logSupabaseEnvironment()

    // Log the signup attempt with sanitized data (no password)
    console.log('🔐 Starting signup process', {
      email,
      timestamp: new Date().toISOString(),
      origin: window.location.origin,
    })

    // Test database connection first
    const connectionOk = await testSupabaseConnection(supabase)
    if (!connectionOk) {
      console.warn('⚠️  Database connection test failed, but continuing with signup...')
    }

    if (password !== repeatPassword) {
      const passwordError = 'Passwords do not match'
      console.error('❌ Signup validation failed:', passwordError)
      setError(passwordError)
      setIsLoading(false)
      return
    }

    try {
      console.log('📡 Calling supabase.auth.signUp...')
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/protected`,
        },
      })

      // Log the full response for debugging
      console.log('📋 Supabase signup response:', {
        data: data ? {
          user: data.user ? {
            id: data.user.id,
            email: data.user.email,
            email_confirmed_at: data.user.email_confirmed_at,
            created_at: data.user.created_at,
          } : null,
          session: data.session ? 'Session created' : 'No session',
        } : null,
        error: error ? {
          message: error.message,
          status: error.status,
          name: error.name,
          // Log the full error object for debugging
          fullError: error,
        } : null,
      })

      if (error) {
        // Use the enhanced error logging utility
        logSupabaseError(error, 'Auth SignUp')
        
        // Provide more specific error messages based on error type
        let userFriendlyMessage = error.message
        
        if (error.status === 500) {
          userFriendlyMessage = `Server error (500): ${error.message}. This might be a database trigger issue. Check console for details.`
        } else if (error.status === 422) {
          userFriendlyMessage = `Invalid data: ${error.message}`
        } else if (error.status === 429) {
          userFriendlyMessage = 'Too many signup attempts. Please try again later.'
        } else if (error.message.includes('email')) {
          userFriendlyMessage = `Email error: ${error.message}`
        } else if (error.message.includes('trigger') || error.message.includes('profiles')) {
          userFriendlyMessage = `Database setup error: ${error.message}. This might be related to the profiles table setup.`
        }
        
        throw new Error(userFriendlyMessage)
      }

      console.log('✅ Signup successful, redirecting to success page')
      router.push('/auth/sign-up-success')
      
    } catch (error: unknown) {
      // Use the enhanced error logging utility
      logSupabaseError(error, 'Signup Process')
      
      setError(error instanceof Error ? error.message : 'An unexpected error occurred. Check console for details.')
    } finally {
      setIsLoading(false)
      console.log('🏁 Signup process completed')
    }
  }

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Sign up</CardTitle>
          <CardDescription>Create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password">Repeat Password</Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                />
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating an account...' : 'Sign up'}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{' '}
              <Link href="/auth/login" className="underline underline-offset-4">
                Login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
