'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, MessageCircle } from 'lucide-react'

interface AtlasHudBubbleProps {
  visible: boolean
  summary: string
  primaryBusinessName?: string
  onDismiss: () => void
  onMoreDetails: () => void
}

const bubbleVariants = {
  hidden: { 
    opacity: 0, 
    y: 10, 
    scale: 0.98, 
    filter: 'blur(6px)' 
  },
  visible: {
    opacity: 1, 
    y: 0, 
    scale: 1, 
    filter: 'blur(0px)',
    transition: { 
      duration: 0.26, 
      ease: [0.16, 1, 0.3, 1],
      delay: 0.12 // 120ms delay after map begins moving
    }
  },
  exit: {
    opacity: 0, 
    y: -6, 
    scale: 0.985, 
    filter: 'blur(6px)',
    transition: { 
      duration: 0.32, 
      ease: 'easeInOut' 
    }
  }
}

export function AtlasHudBubble({ 
  visible, 
  summary, 
  primaryBusinessName,
  onDismiss, 
  onMoreDetails 
}: AtlasHudBubbleProps) {
  return (
    <AnimatePresence mode="wait">
      {visible && (
        <motion.div
          variants={bubbleVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed top-20 left-1/2 -translate-x-1/2 z-50 max-w-md w-[90%] pointer-events-auto"
        >
          {/* Glassmorphism bubble */}
          <div className="relative bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Subtle glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-[#00d083]/10 via-transparent to-transparent pointer-events-none" />
            
            {/* Content */}
            <div className="relative p-4 pr-12">
              {/* Primary business label (optional) */}
              {primaryBusinessName && (
                <div className="text-[#00d083] text-xs font-medium mb-1 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00d083] animate-pulse" />
                  {primaryBusinessName}
                </div>
              )}
              
              {/* Summary text */}
              <p className="text-white text-sm leading-relaxed">
                {summary}
              </p>
            </div>

            {/* Close button */}
            <button
              onClick={onDismiss}
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4 text-white/60" />
            </button>

            {/* More details CTA */}
            <div className="border-t border-white/10">
              <button
                onClick={onMoreDetails}
                className="w-full px-4 py-2.5 flex items-center justify-center gap-2 text-sm text-[#00d083] hover:bg-[#00d083]/10 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>More details</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
