import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Clock, CheckCircle, AlertCircle, Mail, Phone } from 'lucide-react'

export default async function PendingApprovalPage() {
  const cookieStore = await cookies()
  const supabase = await createClient()

  // Get the current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    // Not logged in - redirect to login
    redirect('/login')
  }

  // Check if user has a pending claim
  const { data: claim, error: claimError } = await supabase
    .from('claim_requests')
    .select(`
      *,
      business:business_id (
        id,
        business_name,
        business_address,
        business_category,
        status
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (claimError || !claim) {
    // No claim found - redirect to claim page
    redirect('/claim')
  }

  // If claim is approved, check business status
  if (claim.status === 'approved' && claim.business?.status === 'claimed_free') {
    // Claim approved - redirect to full dashboard
    redirect('/dashboard')
  }

  // If claim is denied, show denial message
  if (claim.status === 'denied') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-center text-2xl">Claim Not Approved</CardTitle>
            <CardDescription className="text-center text-lg">
              Unfortunately, your claim for <strong>{claim.business?.business_name}</strong> was not approved
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">
                If you believe this was a mistake, please contact our support team at{' '}
                <a href="mailto:support@qwikker.com" className="text-blue-600 hover:underline">
                  support@qwikker.com
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Claim is pending - show waiting screen
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Clock className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-center text-2xl">Claim Submitted Successfully!</CardTitle>
          <CardDescription className="text-center text-lg">
            Your claim for <strong>{claim.business?.business_name}</strong> is being reviewed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status */}
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-6 text-center">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              ⏳ Awaiting Admin Approval
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Our team typically reviews claims within 24-48 hours
            </p>
          </div>

          {/* What You Submitted */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Your Submission</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Business Verified</p>
                  <p className="text-muted-foreground">
                    {claim.edited_business_name || claim.business?.business_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {claim.edited_address || claim.business?.business_address}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <Mail className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Email Verified</p>
                  <p className="text-muted-foreground">{user.email}</p>
                </div>
              </div>

              {claim.edited_phone && (
                <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <Phone className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">Phone Number</p>
                    <p className="text-muted-foreground">{claim.edited_phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Account Created</p>
                  <p className="text-muted-foreground">
                    {claim.first_name} {claim.last_name}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* What Happens Next */}
          <div className="space-y-4 border-t pt-6">
            <h3 className="font-semibold">What Happens Next?</h3>
            <ol className="space-y-3 text-sm">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <div>
                  <p className="font-medium">Admin Review</p>
                  <p className="text-muted-foreground">
                    Our Bournemouth team will verify your business ownership
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <div>
                  <p className="font-medium">Approval Notification</p>
                  <p className="text-muted-foreground">
                    You'll receive an email when your claim is approved
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <div>
                  <p className="font-medium">Dashboard Access</p>
                  <p className="text-muted-foreground">
                    Once approved, you can log in to manage your business listing
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 flex items-center justify-center text-xs font-bold">
                  4
                </span>
                <div>
                  <p className="font-medium">Upgrade Options</p>
                  <p className="text-muted-foreground">
                    Explore premium features like Offers, Events, and Secret Menu
                  </p>
                </div>
              </li>
            </ol>
          </div>

          {/* Need Help */}
          <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 text-center">
            <p className="text-sm font-medium mb-2">Need help?</p>
            <p className="text-xs text-muted-foreground">
              Contact us at{' '}
              <a href="mailto:support@qwikker.com" className="text-blue-600 hover:underline">
                support@qwikker.com
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

