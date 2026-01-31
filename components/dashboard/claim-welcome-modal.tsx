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
}

export function ClaimWelcomeModal({ businessName, businessId, isOpen, onClose }: ClaimWelcomeModalProps) {
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
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-slate-300">Visible in Discover section</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-slate-300">Basic AI chat visibility</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-slate-300">Up to 5 menu items</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-slate-300">1 offer per month</span>
              </div>
            </div>
          </div>

          {/* Upgrade to Start Getting Recommended */}
          <div className="bg-gradient-to-br from-[#00d083]/10 to-emerald-500/5 border border-[#00d083]/30 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-2">
              🚀 Upgrade to Start Getting Recommended
            </h3>
            <p className="text-slate-300 text-sm mb-6 leading-relaxed">
              Free listings are visible. <span className="text-white font-medium">Upgraded listings are actively suggested by AI</span> and shown more prominently to customers looking right now.
            </p>

            <div className="space-y-5">
              {/* Get Recommended by AI */}
              <div>
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <span className="text-lg">🧠</span>
                  Get Recommended by AI
                </h4>
                <p className="text-slate-400 text-sm mb-2">
                  When users ask "Best food near me" or "Where should we eat tonight?" — <span className="text-slate-200">your business and specific dishes can be suggested directly.</span>
                </p>
                <div className="space-y-1 text-xs text-slate-400 ml-6">
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Full menu indexing (AI can recommend your dishes)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Priority visibility in AI results</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Dish-level discovery</span>
                  </div>
                </div>
              </div>

              {/* Show Up When People Search Nearby */}
              <div>
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <span className="text-lg">📍</span>
                  Show Up When People Search Nearby
                </h4>
                <p className="text-slate-400 text-sm mb-2">
                  Qwikker is used in-the-moment.
                </p>
                <div className="space-y-1 text-xs text-slate-400 ml-6">
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Featured placement in discovery</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Visibility inside Atlas (interactive AI map)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Higher exposure for "near me" searches</span>
                  </div>
                </div>
              </div>

              {/* Turn Offers Into Traffic */}
              <div>
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <span className="text-lg">🎯</span>
                  Turn Offers Into Traffic
                </h4>
                <p className="text-slate-400 text-sm mb-2">
                  Users often ask for deals.
                </p>
                <div className="space-y-1 text-xs text-slate-400 ml-6">
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Time-based offers</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Offers surfaced inside AI chat</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-3 h-3 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Featured in "Current Deals" flows</span>
                  </div>
                </div>
              </div>

              {/* Stand Out + Secret Menu */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-white font-semibold mb-2 flex items-center gap-2 text-sm">
                    <span>🌟</span>
                    Stand Out Visually
                  </h4>
                  <div className="space-y-1 text-xs text-slate-400 ml-5">
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Premium carousel cards</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Priority positioning</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-2 flex items-center gap-2 text-sm">
                    <span>🔐</span>
                    Secret Menu Club
                  </h4>
                  <div className="space-y-1 text-xs text-slate-400 ml-5">
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Exclusive hidden items</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-3 h-3 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Build loyal customers</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-700/50 text-center">
              <p className="text-slate-200 font-medium text-sm mb-4">
                Qwikker helps customers <span className="text-[#00d083]">choose you</span> — not just scroll past you.
              </p>
              <Button asChild size="sm" className="bg-[#00d083] hover:bg-[#00b86f] text-black font-semibold">
                <Link href="/dashboard/settings#pricing">
                  View Plans
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
