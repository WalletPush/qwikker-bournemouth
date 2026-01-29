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
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-2xl max-h-[90vh] overflow-y-auto">
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
          {/* What's Included for Free */}
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Your Free Listing Includes
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="text-slate-200 font-medium">Visible in Discover Section</p>
                  <p className="text-slate-400 text-sm">Customers can find you when browsing locally</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="text-slate-200 font-medium">Basic AI Chat Visibility</p>
                  <p className="text-slate-400 text-sm">Text mentions when relevant to customer queries</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="text-slate-200 font-medium">Up to 5 Featured Menu Items</p>
                  <p className="text-slate-400 text-sm">Manually add your best dishes or drinks</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="text-slate-200 font-medium">Create Basic Offers</p>
                  <p className="text-slate-400 text-sm">Engage customers with deals and promotions</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Upgrade Section */}
          <div className="bg-gradient-to-r from-[#00d083]/10 to-emerald-500/5 border border-[#00d083]/30 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Upgrade to Unlock More
            </h3>
            <p className="text-slate-300 text-sm mb-4">
              Stand out with <span className="text-[#00d083] font-medium">premium carousel cards</span> and unlimited menu indexing
            </p>
            <ul className="space-y-3 mb-4">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-[#00d083] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="text-slate-200 font-medium">Premium Carousel Cards</p>
                  <p className="text-slate-400 text-sm">Rich photo cards in AI chat (not just text)</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-[#00d083] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="text-slate-200 font-medium">Full Menu Indexing (Unlimited + PDF)</p>
                  <p className="text-slate-400 text-sm">AI recommends your specific dishes and items</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-[#00d083] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="text-slate-200 font-medium">Advanced Analytics</p>
                  <p className="text-slate-400 text-sm">Track views, engagement, and customer insights</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-[#00d083] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <p className="text-slate-200 font-medium">Priority Support</p>
                  <p className="text-slate-400 text-sm">Get faster help when you need it</p>
                </div>
              </li>
            </ul>
            <div className="text-center bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <p className="text-slate-300 text-sm mb-3">Ready to upgrade?</p>
              <Button asChild size="sm" className="bg-[#00d083] hover:bg-[#00b86f] text-black font-semibold">
                <Link href="/dashboard/settings#pricing">
                  View Plans
                </Link>
              </Button>
            </div>
          </div>

          {/* CTA Button */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleClose}
              disabled={isClosing}
              size="lg"
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
            >
              {isClosing ? 'Loading...' : 'Get Started'}
            </Button>
            <p className="text-center text-slate-400 text-xs">
              Explore upgrade options anytime in your dashboard settings
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
