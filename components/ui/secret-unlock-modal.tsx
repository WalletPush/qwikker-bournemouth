'use client'

import { useState, useEffect } from 'react'

interface SecretUnlockModalProps {
  isOpen: boolean
  onClose: () => void
  item: {
    name: string
    description: string
    price?: string
    hint?: string
    ordering_instructions?: string
  }
  business: {
    name?: string
    address?: string
    phone?: string
    image?: string
  }
  /** Optional badge name earned as part of this unlock — shown in-sheet, not as a second toast */
  badgeEarned?: string | null
}

export function SecretUnlockModal({ isOpen, onClose, item, business, badgeEarned }: SecretUnlockModalProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setIsVisible(true), 50)
      document.body.style.overflow = 'hidden'
      return () => {
        clearTimeout(t)
        document.body.style.overflow = 'unset'
      }
    }
    setIsVisible(false)
    document.body.style.overflow = 'unset'
  }, [isOpen])

  if (!isOpen) return null

  const orderLine =
    item.ordering_instructions?.trim() ||
    `Ask your server for “${item.name}”, or show them this screen.`

  const handleDirections = () => {
    if (business.name && business.address) {
      window.open(
        `https://maps.google.com/search/${encodeURIComponent(`${business.name} ${business.address}`)}`,
        '_blank'
      )
    }
  }

  const handleCall = () => {
    if (business.phone) {
      window.open(`tel:${business.phone}`, '_blank')
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`w-full sm:max-w-md sm:mx-4 max-h-[88dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-[#00d083]/30 bg-zinc-950 shadow-2xl shadow-black/60 transition-transform duration-300 ${
          isVisible ? 'translate-y-0 scale-100' : 'translate-y-6 sm:translate-y-4 scale-[0.98]'
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="secret-unlock-title"
      >
        {/* Handle + header */}
        <div className="sticky top-0 z-10 bg-zinc-950/95 backdrop-blur border-b border-zinc-800/80 px-5 pt-3 pb-4">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-zinc-700 sm:hidden" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.16em] font-semibold text-[#00d083] mb-1">
                Secret unlocked
              </p>
              <h3 id="secret-unlock-title" className="text-lg font-semibold text-white leading-snug">
                Qwikker exclusive
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 w-9 h-9 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300 flex items-center justify-center active:bg-zinc-800"
              aria-label="Close"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Item */}
          <div className="rounded-2xl border border-zinc-700/80 bg-zinc-900/80 p-4">
            <div className="flex items-start justify-between gap-3">
              <h4 className="text-base sm:text-lg font-semibold text-white leading-snug flex-1 min-w-0">
                {item.name}
              </h4>
              {item.price && (
                <span className="shrink-0 text-base font-bold tabular-nums text-[#00d083]">
                  {item.price}
                </span>
              )}
            </div>
            {item.description && (
              <p className="text-sm text-zinc-300 mt-2.5 leading-relaxed">{item.description}</p>
            )}
          </div>

          {/* How to order — brand green, roomy */}
          <div className="rounded-2xl border border-[#00d083]/35 bg-[#00d083]/10 p-4 sm:p-5">
            <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[#00d083] mb-2">
              How to order
            </p>
            <p className="text-sm sm:text-[15px] text-zinc-100 leading-relaxed">{orderLine}</p>
          </div>

          {business.name && (
            <p className="text-center text-xs text-zinc-500">
              At <span className="text-zinc-200 font-medium">{business.name}</span>
            </p>
          )}

          {badgeEarned && (
            <div className="rounded-xl border border-[#00d083]/25 bg-[#00d083]/10 px-3 py-2.5 text-center">
              <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[#00d083]">
                Badge earned
              </p>
              <p className="text-sm text-zinc-100 font-medium mt-0.5">{badgeEarned}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2.5 pt-1 pb-2">
            <div className="flex gap-2.5">
              {business.address && (
                <button
                  type="button"
                  onClick={handleDirections}
                  className="flex-1 h-11 rounded-xl border border-zinc-600 bg-zinc-900 text-sm font-semibold text-zinc-100 active:bg-zinc-800"
                >
                  Directions
                </button>
              )}
              {business.phone && (
                <button
                  type="button"
                  onClick={handleCall}
                  className="flex-1 h-11 rounded-xl border border-zinc-600 bg-zinc-900 text-sm font-semibold text-zinc-100 active:bg-zinc-800"
                >
                  Call
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-full h-12 rounded-xl bg-[#00d083] text-black text-sm font-bold active:brightness-95"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
