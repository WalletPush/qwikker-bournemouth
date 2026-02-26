'use client'

import { motion } from 'framer-motion'
import {
  Bean, Stamp, Scissors, Flame, Hamburger, Wine,
  Pizza, Star, Heart, CakeSlice, Dumbbell, PawPrint,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const ICON_MAP: Record<string, LucideIcon> = {
  Stamp, Bean, Scissors, Flame, Hamburger, Wine,
  Pizza, Star, Heart, CakeSlice, Dumbbell, PawPrint,
}

interface StampGridProps {
  stampIcon: string
  filled: number
  threshold: number
  /** Index of the stamp that was just earned (triggers animation) */
  animateIndex?: number | null
  /** Icon size in px */
  size?: number
  className?: string
}

/**
 * Visual stamp grid with filled/unfilled icons.
 * Filled stamps use Qwikker green with a subtle glow.
 * The `animateIndex` stamp gets a pop-in animation.
 */
export function StampGrid({
  stampIcon,
  filled,
  threshold,
  animateIndex = null,
  size = 28,
  className = '',
}: StampGridProps) {
  const IconComponent = ICON_MAP[stampIcon] || ICON_MAP.Stamp || Stamp

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {Array.from({ length: threshold }, (_, i) => {
        const isFilled = i < filled
        const isAnimating = animateIndex !== null && i === animateIndex

        return (
          <motion.div
            key={i}
            initial={isAnimating ? { scale: 0, rotate: -30 } : false}
            animate={isAnimating ? { scale: 1, rotate: 0 } : undefined}
            transition={isAnimating ? { type: 'spring', stiffness: 400, damping: 15, delay: 0.15 } : undefined}
            className="relative"
          >
            <IconComponent
              size={size}
              className={
                isFilled
                  ? 'text-emerald-400 drop-shadow-[0_0_6px_rgba(0,208,131,0.4)]'
                  : 'text-zinc-700'
              }
              strokeWidth={isFilled ? 2.2 : 1.5}
              fill={isFilled ? 'currentColor' : 'none'}
            />
          </motion.div>
        )
      })}
    </div>
  )
}
