'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

const ATLAS_INTRO_SEEN_KEY = 'qwikker_atlas_intro_seen'

interface AtlasIntroOverlayProps {
  onDismiss?: () => void
}

/**
 * Atlas First-Visit Intro Overlay
 * 
 * Shows a one-time welcome message on first Atlas visit.
 * Uses localStorage to track dismissal (per user device).
 */
export function AtlasIntroOverlay({ onDismiss }: AtlasIntroOverlayProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    // Check if user has already seen the intro
    const hasSeenIntro = localStorage.getItem(ATLAS_INTRO_SEEN_KEY)
    
    if (!hasSeenIntro) {
      // Small delay for smooth entrance animation
      setTimeout(() => {
        setIsVisible(true)
        setIsAnimating(true)
      }, 500)
    }
  }, [])

  const handleDismiss = () => {
    // Mark as seen
    localStorage.setItem(ATLAS_INTRO_SEEN_KEY, 'true')
    
    // Animate out
    setIsAnimating(false)
    setTimeout(() => {
      setIsVisible(false)
      onDismiss?.()
    }, 300)
  }

  if (!isVisible) return null

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isAnimating ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/0'
      }`}
      onClick={handleDismiss}
    >
      <div 
        className={`relative max-w-md w-full bg-gradient-to-br from-slate-900 via-blue-900/20 to-slate-900 border border-blue-500/30 rounded-2xl p-8 shadow-2xl shadow-blue-500/20 transition-all duration-300 ${
          isAnimating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-800/50"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon */}
        <div className="relative inline-block mb-6">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 rounded-2xl blur-xl opacity-40"></div>
          <div className="relative p-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl border-2 border-blue-400/40 backdrop-blur-sm inline-block">
            <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-3xl font-bold text-white mb-4">
          Welcome to Atlas
        </h2>

        {/* Body */}
        <p className="text-slate-300 text-base leading-relaxed mb-6">
          A live AI-guided map that shows you where to go — not just what to search.
        </p>

        {/* CTA */}
        <button
          onClick={handleDismiss}
          className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-200"
        >
          Got it
        </button>

        {/* Subtle hint */}
        <p className="text-xs text-slate-500 text-center mt-4">
          This message won't show again
        </p>
      </div>
    </div>
  )
}
