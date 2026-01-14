'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Clock, Mail, CheckCircle2, Sparkles } from 'lucide-react'

interface PendingApprovalProps {
  businessName: string
  email: string
  franchiseCity: string // e.g. "Bournemouth", "Calgary"
  supportEmail: string  // e.g. "bournemouth@qwikker.com"
}

export function PendingApproval({ 
  businessName, 
  email, 
  franchiseCity,
  supportEmail 
}: PendingApprovalProps) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Success Icon */}
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Claim Submitted!</h1>
          <p className="text-muted-foreground">
            We're reviewing your claim for <strong>{businessName}</strong>
          </p>
        </div>

        {/* Main Card */}
        <Card>
          <CardContent className="p-8">
            <div className="space-y-6">
              {/* Title */}
              <div>
                <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  What Happens Next
                </h2>
                <p className="text-sm text-muted-foreground">
                  Your claim is under review by the {franchiseCity} team
                </p>
              </div>

              {/* Steps */}
              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
                    1
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="font-medium mb-1">Review (24-48 hours)</h3>
                    <p className="text-sm text-muted-foreground">
                      The {franchiseCity} team will verify ownership of {businessName} by checking your email, website, and business details.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-400">
                    2
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="font-medium mb-1">Approval Notification</h3>
                    <p className="text-sm text-muted-foreground">
                      You'll receive an email at <strong>{email}</strong> when your claim is approved.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-600 dark:text-gray-400">
                    3
                  </div>
                  <div className="flex-1 pt-1">
                    <h3 className="font-medium mb-1">Dashboard Access</h3>
                    <p className="text-sm text-muted-foreground">
                      Once approved, you can log in to update your profile, manage your listing, and access analytics.
                    </p>
                  </div>
                </div>
              </div>

              {/* Email Confirmation */}
              <div className="border-t pt-6">
                <div className="flex items-start gap-3 text-sm">
                  <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-muted-foreground mb-1">
                      Confirmation email sent to:
                    </p>
                    <p className="font-medium">{email}</p>
                  </div>
                </div>
              </div>

              {/* Support Contact */}
              <div className="border-t pt-6 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Questions about your claim?
                </p>
                <Button variant="outline" asChild>
                  <a href={`mailto:${supportEmail}?subject=Claim Question - ${businessName}`}>
                    Email {franchiseCity} Team
                  </a>
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  {supportEmail}
                </p>
              </div>

              {/* Return Home */}
              <div className="border-t pt-6 text-center">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <a href="/">
                    Return to QWIKKER Home
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Most claims are reviewed within 24 hours during business hours 
            (Monday-Friday, 9am-5pm {franchiseCity} time)
          </p>
        </div>
      </div>
    </div>
  )
}

