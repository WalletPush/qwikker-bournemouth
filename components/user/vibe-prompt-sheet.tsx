'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface VibePromptSheetProps {
  businessId: string
  businessName: string
  vibeUserKey: string
  walletPassId: string
  onClose: () => void
  onVibeSubmitted?: (vibeRating: 'loved_it' | 'it_was_good' | 'not_for_me') => void
}

/**
 * 💚 Vibe Prompt Bottom Sheet
 * 
 * Appears after user engagement (Directions/Call/Offer save).
 * Premium design with 3 text-led choices (no tacky emojis).
 * 
 * @param businessId - UUID of the business
 * @param businessName - Name of the business (for display)
 * @param vibeUserKey - Stable user key (persists across reinstalls)
 * @param walletPassId - Wallet pass ID for validation
 * @param onClose - Callback when sheet is closed
 * @param onVibeSubmitted - Callback when vibe is submitted
 */
export function VibePromptSheet({
  businessId,
  businessName,
  vibeUserKey,
  walletPassId,
  onClose,
  onVibeSubmitted
}: VibePromptSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)

  // Fade in animation
  useEffect(() => {
    setTimeout(() => setIsVisible(true), 100)
  }, [])

  const handleVibeSubmit = async (vibeRating: 'loved_it' | 'it_was_good' | 'not_for_me') => {
    if (isSubmitting || hasSubmitted) return

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/vibes/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId,
          vibeRating,
          vibeUserKey,
          walletPassId
        })
      })

      const result = await response.json()

      if (result.success) {
        setHasSubmitted(true)
        onVibeSubmitted?.(vibeRating)
        
        // Show success state briefly, then close
        setTimeout(() => {
          handleClose()
        }, 1500)
      } else {
        console.error('Failed to submit vibe:', result.error)
        alert('Failed to submit your vibe. Please try again.')
        setIsSubmitting(false)
      }
    } catch (error) {
      console.error('Error submitting vibe:', error)
      alert('Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => onClose(), 300) // Wait for fade out animation
  }

  const vibeOptions = [
    {
      id: 'loved_it',
      label: 'Loved it',
      icon: '♥',
      description: 'This place exceeded my expectations',
      color: 'from-[#00d083] to-emerald-600',
      hoverColor: 'hover:from-[#00d083]/90 hover:to-emerald-600/90'
    },
    {
      id: 'it_was_good',
      label: 'It was good',
      icon: '✓',
      description: 'Solid experience, would consider returning',
      color: 'from-emerald-600 to-emerald-700',
      hoverColor: 'hover:from-emerald-600/90 hover:to-emerald-700/90'
    },
    {
      id: 'not_for_me',
      label: 'Not for me',
      icon: '—',
      description: 'Not what I was looking for',
      color: 'from-slate-600 to-slate-700',
      hoverColor: 'hover:from-slate-600/90 hover:to-slate-700/90'
    }
  ]

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] transition-opacity duration-300 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Bottom Sheet - Compact Version */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[9999] transition-transform duration-300 ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="max-w-md mx-auto">
          <Card className="bg-slate-900/95 backdrop-blur-xl border-t-2 border-[#00d083] rounded-t-2xl rounded-b-none shadow-2xl">
            <CardContent className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-100 mb-0.5">
                  {hasSubmitted ? '✅ Thanks!' : 'How was it?'}
                </h3>
                <p className="text-slate-400 text-xs">
                  {hasSubmitted ? 'Your vibe has been recorded' : businessName}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-slate-400 hover:text-slate-200 transition-colors"
                disabled={isSubmitting}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Vibe Options - Compact */}
            {!hasSubmitted && (
              <div className="space-y-2">
                {vibeOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => handleVibeSubmit(option.id as any)}
                    disabled={isSubmitting}
                    className={`
                      w-full p-3 rounded-lg border border-white/10
                      bg-gradient-to-r ${option.color} ${option.hoverColor}
                      transition-all duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed
                      active:scale-[0.98]
                      text-left
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <div className="text-lg text-white/90">
                        {option.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-white font-semibold text-sm">
                          {option.label}
                        </div>
                      </div>
                      {isSubmitting && (
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Success State - Compact */}
            {hasSubmitted && (
              <div className="py-4 text-center">
                <div className="w-12 h-12 mx-auto mb-2 bg-[#00d083]/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-slate-300 text-sm">
                  Your feedback helps others discover great places
                </p>
              </div>
            )}

            {/* Skip Button - Compact */}
            {!hasSubmitted && (
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                className="w-full py-1.5 text-slate-400 hover:text-slate-300 text-xs transition-colors disabled:opacity-50"
              >
                Maybe later
              </button>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    </>
  )
}
