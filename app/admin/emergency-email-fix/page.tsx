'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function EmergencyEmailFixContent() {
  const searchParams = useSearchParams()
  const [userId, setUserId] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [oldEmail, setOldEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  // Pre-fill from URL parameters
  useEffect(() => {
    const userIdParam = searchParams.get('userId')
    const newEmailParam = searchParams.get('newEmail')
    const oldEmailParam = searchParams.get('oldEmail')
    
    if (userIdParam) setUserId(userIdParam)
    if (newEmailParam) setNewEmail(newEmailParam)
    if (oldEmailParam) setOldEmail(oldEmailParam)
  }, [searchParams])

  const handleFix = async () => {
    if (!userId || !newEmail) {
      setResult({ success: false, message: 'Please provide both User ID and Email' })
      return
    }

    setIsLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/fix-user-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, newEmail, oldEmail })
      })

      const data = await response.json()

      if (data.success) {
        setResult({ 
          success: true, 
          message: `✅ ${data.message}\n\nAuth User: ${data.authUser.email}\nProfile: ${data.profile.business_name} (${data.profile.email})` 
        })
      } else {
        setResult({ success: false, message: `❌ ${data.error}` })
      }
    } catch (error) {
      setResult({ 
        success: false, 
        message: `❌ Request failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto space-y-6">

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Fix User Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="userId" className="text-white">User ID</Label>
              <Input
                id="userId"
                placeholder="Enter the user's UUID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
              <p className="text-xs text-slate-500 mt-1">
                Find this in the admin dashboard or Supabase
              </p>
            </div>

            <div>
              <Label htmlFor="oldEmail" className="text-white">Old Email (Optional)</Label>
              <Input
                id="oldEmail"
                type="email"
                placeholder="The email they can't log in with anymore"
                value={oldEmail}
                onChange={(e) => setOldEmail(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
              <p className="text-xs text-slate-500 mt-1">
                For logging purposes only
              </p>
            </div>

            <div>
              <Label htmlFor="newEmail" className="text-white">New Email (to restore or set)</Label>
              <Input
                id="newEmail"
                type="email"
                placeholder="The email they should be able to log in with"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
              <p className="text-xs text-slate-500 mt-1">
                This will become their login email
              </p>
            </div>

            <Button
              onClick={handleFix}
              disabled={isLoading || !userId || !newEmail}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? 'Fixing...' : 'Fix Email Now'}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <Card className={`border-2 ${result.success ? 'bg-green-950/50 border-green-500/50' : 'bg-red-950/50 border-red-500/50'}`}>
            <CardContent className="p-6">
              <pre className={`text-sm whitespace-pre-wrap ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                {result.message}
              </pre>
            </CardContent>
          </Card>
        )}

        <Card className="bg-blue-950/30 border-blue-500/30">
          <CardContent className="p-6 space-y-3">
            <h3 className="text-blue-400 font-semibold">📝 How to Find User ID:</h3>
            <ol className="list-decimal list-inside space-y-2 text-slate-300 text-sm">
              <li>Go to Admin Dashboard</li>
              <li>Find the business in the CRM</li>
              <li>Look for the user_id in the CRM data (or check the console logs)</li>
              <li>Alternatively, go to Supabase Dashboard → Authentication → Users</li>
            </ol>

            <h3 className="text-blue-400 font-semibold mt-4">🔧 What This Tool Does:</h3>
            <ul className="list-disc list-inside space-y-1 text-slate-300 text-sm">
              <li>Updates the auth.users table (login email)</li>
              <li>Updates the business_profiles table (profile email)</li>
              <li>Skips email verification</li>
              <li>User can immediately log in with the new email</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function EmergencyEmailFixPage() {
  return (
    <Suspense fallback={
      <div className="p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    }>
      <EmergencyEmailFixContent />
    </Suspense>
  )
}
