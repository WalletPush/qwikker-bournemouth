'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface ClaimWelcomeModalProps {
  businessName: string
  businessId: string
  isOpen: boolean
  onClose: () => void
  trialTier?: string
  trialDays?: number
}

export function ClaimWelcomeModal({ businessName, businessId, isOpen, onClose, trialTier, trialDays }: ClaimWelcomeModalProps) {
  const tierName = trialTier ? trialTier.charAt(0).toUpperCase() + trialTier.slice(1) : null
  const [isClosing, setIsClosing] = useState(false)

  const handleClose = async () => {
    setIsClosing(true)
    
    try {
      // Mark modal as shown in the database
      const response = await fetch('/api/dashboard/welcome-modal-shown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
        }),
      })

      if (!response.ok) {
        console.error('Failed to mark welcome modal as shown')
      }
    } catch (error) {
      console.error('Error marking welcome modal as shown:', error)
    } finally {
      setIsClosing(false)
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center border-2 border-emerald-500/30">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold text-center text-white">
            Welcome to QWIKKER!
          </DialogTitle>
          <p className="text-slate-300 text-center mt-2">
            Your claim for <span className="text-emerald-400 font-semibold">{businessName}</span> has been approved.
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-6">
          {/* Your Free Listing Includes */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">
              Your Free Listing Includes
            </h3>
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm py-2">
              {['Visible in Discover section', 'Basic AI chat visibility', 'Up to 5 menu items', '1 offer per month'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-slate-300">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trial / Upgrade CTA */}
          <div className="bg-gradient-to-br from-[#00d083]/10 to-emerald-500/5 border border-[#00d083]/30 rounded-xl p-6">
            {tierName && trialDays ? (
              <>
                <h3 className="text-xl font-bold text-white mb-2">
                  Start your {trialDays}-day free {tierName} trial
                </h3>
                <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                  Unlock priority AI recommendations, unlimited offers, secret menus, and analytics — free for {trialDays} days. No commitment.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-white mb-2">
                  Upgrade to Start Getting Recommended
                </h3>
                <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                  Free listings are visible. <span className="text-white font-medium">Upgraded listings are actively suggested by AI</span> and shown more prominently to customers looking right now.
                </p>
              </>
            )}

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  'Priority AI recommendations',
                  'Full menu indexing',
                  'Unlimited offers and events',
                  'Secret Menu Club access',
                  'Premium placement in discovery',
                  'Business analytics',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2 text-slate-300">
                    <svg className="w-3.5 h-3.5 text-[#00d083] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-700/50 text-center">
              <Button asChild size="sm" className="bg-[#00d083] hover:bg-[#00b86f] text-black font-semibold">
                <Link href="/dashboard/settings#pricing">
                  {tierName && trialDays ? `Start ${trialDays}-Day Free Trial` : 'View Plans'}
                </Link>
              </Button>
            </div>
          </div>

          {/* Get Started Button */}
          <Button
            onClick={handleClose}
            disabled={isClosing}
            size="lg"
            className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold"
          >
            {isClosing ? 'Loading...' : 'Get Started'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
