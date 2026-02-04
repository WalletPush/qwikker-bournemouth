'use client'

import { useEffect, useRef, useState } from 'react'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  snapPoints?: number[] // Percentage heights: [0.3, 0.6, 0.9]
  initialSnap?: number // Index of snapPoints
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  snapPoints = [0.4, 0.7, 0.95],
  initialSnap = 0
}: BottomSheetProps) {
  const [currentSnap, setCurrentSnap] = useState(initialSnap)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const sheetRef = useRef<HTMLDivElement>(null)

  const snapHeight = snapPoints[currentSnap] * 100

  // Handle touch start
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setStartY(e.touches[0].clientY)
    setCurrentY(e.touches[0].clientY)
  }

  // Handle touch move
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    setCurrentY(e.touches[0].clientY)
  }

  // Handle touch end
  const handleTouchEnd = () => {
    if (!isDragging) return
    setIsDragging(false)

    const deltaY = currentY - startY
    const windowHeight = window.innerHeight

    // Swipe down threshold: close if swiped down significantly
    if (deltaY > windowHeight * 0.2) {
      onClose()
      return
    }

    // Swipe up/down: snap to nearest snap point
    if (Math.abs(deltaY) > 50) {
      if (deltaY < 0 && currentSnap < snapPoints.length - 1) {
        // Swiped up
        setCurrentSnap(currentSnap + 1)
      } else if (deltaY > 0 && currentSnap > 0) {
        // Swiped down
        setCurrentSnap(currentSnap - 1)
      }
    }
  }

  // Calculate transform during drag
  const dragTransform = isDragging
    ? Math.max(0, currentY - startY)
    : 0

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="fixed bottom-0 left-0 right-0 z-50 bg-black/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl transition-all duration-300 ease-out"
        style={{
          height: `${snapHeight}vh`,
          transform: `translateY(${dragTransform}px)`,
          touchAction: 'none'
        }}
      >
        {/* Drag Handle */}
        <div
          className="py-3 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto" />
        </div>

        {/* Content */}
        <div className="px-4 pb-safe overflow-y-auto h-[calc(100%-2rem)]">
          {children}
        </div>
      </div>
    </>
  )
}
