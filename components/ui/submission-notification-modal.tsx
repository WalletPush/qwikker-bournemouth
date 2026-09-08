'use client'

import { useEffect, useState } from 'react'

interface SubmissionNotificationModalProps {
  isOpen: boolean
  onClose: () => void
  type: 'image' | 'logo' | 'menu' | 'offer' | 'profile'
  count?: number
  businessStatus?: 'incomplete' | 'pending_review' | 'approved' | string
}

/**
 * Quiet upload / submission confirmation — bottom toast, not a full-screen modal.
 */
export function SubmissionNotificationModal({
  isOpen,
  onClose,
  type,
  count = 1,
  businessStatus = 'approved',
}: SubmissionNotificationModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const needsReview = businessStatus === 'approved'

  useEffect(() => {
    if (!isOpen) {
      setIsVisible(false)
      return
    }
    setIsVisible(true)
    const timer = setTimeout(() => handleClose(), 4200)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const handleClose = () => {
    setIsVisible(false)
    window.setTimeout(() => onClose(), 200)
  }

  if (!isOpen) return null

  const n = Math.max(1, count)
  const copy = (() => {
    switch (type) {
      case 'logo':
        return needsReview
          ? {
              label: 'In review',
              title: 'Logo submitted',
              body: 'We’ll publish it once it’s been checked.',
            }
          : {
              label: 'Live',
              title: 'Logo updated',
              body: 'Your logo is on your profile now.',
            }
      case 'image':
        return needsReview
          ? {
              label: 'In review',
              title: n > 1 ? `${n} photos submitted` : 'Photo submitted',
              body: 'They’ll show on your listing after approval.',
            }
          : {
              label: 'Live',
              title: n > 1 ? `${n} photos added` : 'Photo added',
              body: 'Visible on your profile now.',
            }
      case 'menu':
        return {
          label: 'In review',
          title: 'Menu submitted',
          body: 'We’ll add it to your listing after a quick check.',
        }
      case 'offer':
        return {
          label: 'In review',
          title: 'Offer submitted',
          body: 'Customers will see it once it’s approved.',
        }
      case 'profile':
        return {
          label: 'In review',
          title: 'Changes submitted',
          body: 'Updates go live after review.',
        }
      default:
        return {
          label: 'Done',
          title: 'Submitted',
          body: 'We’ve received your update.',
        }
    }
  })()

  const accent = needsReview || type === 'menu' || type === 'offer' || type === 'profile'
    ? 'bg-amber-400'
    : 'bg-[#00d083]'

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-[80] flex justify-center px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] transition-all duration-200 ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-950/95 px-4 py-3.5 shadow-xl shadow-black/40 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${accent}`} aria-hidden />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-zinc-100">{copy.title}</p>
              <span className="rounded-full border border-zinc-700 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-400">
                {copy.label}
              </span>
            </div>
            <p className="mt-0.5 text-sm leading-snug text-zinc-400">{copy.body}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="shrink-0 rounded-md px-1.5 py-0.5 text-xs text-zinc-500 transition-colors hover:text-zinc-200"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
