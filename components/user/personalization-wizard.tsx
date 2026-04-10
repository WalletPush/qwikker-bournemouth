'use client'

import { useState, useEffect, useCallback } from 'react'
import { CATEGORY_OPTIONS, DIETARY_OPTIONS } from '@/lib/constants/user-preferences'

interface PersonalizationWizardProps {
  walletPassId: string
  userName?: string
  onComplete: () => void
}

// Scoped to walletPassId so a new pass gets a fresh wizard experience
const getStorageKey = (passId: string, suffix: string) => `qwikker-personalization-${suffix}-${passId}`
const SESSION_KEY_SHOWN = 'qwikker-wizard-shown-this-session'

export function PersonalizationWizard({ walletPassId, userName, onComplete }: PersonalizationWizardProps) {
  const firstName = userName && userName !== 'Guest' ? userName.split(' ')[0] : null
  const [step, setStep] = useState<1 | 2>(1)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedDietary, setSelectedDietary] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    document.body.classList.add('overflow-hidden')
    sessionStorage.setItem(SESSION_KEY_SHOWN, 'true')
    return () => {
      document.body.classList.remove('overflow-hidden')
    }
  }, [])

  const toggleCategory = useCallback((cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    )
  }, [])

  const toggleDietary = useCallback((d: string) => {
    setSelectedDietary(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    )
  }, [])

  const saveCategories = async () => {
    if (selectedCategories.length === 0) return
    setSaving(true)
    try {
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletPassId,
          preferred_categories: selectedCategories,
        }),
      })
    } catch {
      // Non-fatal — categories can be set in settings later
    }
    setSaving(false)
    setStep(2)
  }

  const saveDietaryAndFinish = async () => {
    setSaving(true)
    try {
      await fetch('/api/user/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletPassId,
          dietary_restrictions: selectedDietary,
        }),
      })
    } catch {
      // Non-fatal
    }
    setSaving(false)
    localStorage.setItem(getStorageKey(walletPassId, 'completed'), 'true')
    onComplete()
  }

  const handleSkip = () => {
    localStorage.setItem(getStorageKey(walletPassId, 'skipped'), Date.now().toString())
    onComplete()
  }

  const handleNoneOfThese = () => {
    localStorage.setItem(getStorageKey(walletPassId, 'completed'), 'true')
    onComplete()
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 px-6 py-8">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          <div className={`w-2 h-2 rounded-full transition-colors ${step === 1 ? 'bg-[#00d083]' : 'bg-white/30'}`} />
          <div className={`w-2 h-2 rounded-full transition-colors ${step === 2 ? 'bg-[#00d083]' : 'bg-white/30'}`} />
        </div>

        {step === 1 ? (
          <>
            {firstName && (
              <p className="text-sm text-[#00d083] font-medium text-center mb-4">
                Hey {firstName}, welcome to Qwikker
              </p>
            )}
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              What are you into?
            </h2>
            <p className="text-neutral-400 text-center mb-8">
              Tap everything that sounds good — we&apos;ll personalize your experience
            </p>

            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = selectedCategories.includes(cat)
                return (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all border ${
                      isSelected
                        ? 'bg-[#00d083]/20 border-[#00d083] text-[#00d083]'
                        : 'bg-white/5 border-white/10 text-neutral-300 hover:border-white/30'
                    }`}
                  >
                    {cat}
                  </button>
                )
              })}
            </div>

            <div className="flex flex-col items-center gap-3">
              <button
                onClick={saveCategories}
                disabled={selectedCategories.length === 0 || saving}
                className="w-full max-w-xs py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-[#00d083] text-slate-900 hover:bg-[#00d083]/90"
              >
                {saving ? 'Saving...' : 'Next'}
              </button>
              <button
                onClick={handleSkip}
                className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Skip for now
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              Any dietary needs?
            </h2>
            <p className="text-neutral-400 text-center mb-8">
              We&apos;ll keep this in mind when recommending
            </p>

            <div className="flex flex-wrap justify-center gap-3 mb-10">
              {DIETARY_OPTIONS.map((d) => {
                const isSelected = selectedDietary.includes(d)
                return (
                  <button
                    key={d}
                    onClick={() => toggleDietary(d)}
                    className={`px-4 py-2.5 rounded-full text-sm font-medium transition-all border ${
                      isSelected
                        ? 'bg-[#00d083]/20 border-[#00d083] text-[#00d083]'
                        : 'bg-white/5 border-white/10 text-neutral-300 hover:border-white/30'
                    }`}
                  >
                    {d}
                  </button>
                )
              })}
            </div>

            <div className="flex flex-col items-center gap-3">
              <button
                onClick={saveDietaryAndFinish}
                disabled={saving}
                className="w-full max-w-xs py-3 rounded-xl font-semibold text-sm transition-all bg-[#00d083] text-slate-900 hover:bg-[#00d083]/90"
              >
                {saving ? 'Saving...' : 'Done'}
              </button>
              <button
                onClick={handleNoneOfThese}
                className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                None of these
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * Checks whether the wizard should be shown for this user.
 * Call from the parent component with the relevant data.
 */
export function shouldShowWizard(opts: {
  walletPassId: string | null
  preferredCategories: string[]
  dietaryRestrictions: string[]
  hasEngagement: boolean
}): boolean {
  if (!opts.walletPassId) return false
  if (opts.preferredCategories.length > 0 || opts.dietaryRestrictions.length > 0) return false
  if (opts.hasEngagement) return false

  if (typeof window === 'undefined') return false

  if (localStorage.getItem(getStorageKey(opts.walletPassId, 'completed'))) return false

  const skippedAt = localStorage.getItem(getStorageKey(opts.walletPassId, 'skipped'))
  if (skippedAt && Date.now() - parseInt(skippedAt, 10) < 24 * 60 * 60 * 1000) return false

  if (sessionStorage.getItem(SESSION_KEY_SHOWN)) return false

  return true
}
