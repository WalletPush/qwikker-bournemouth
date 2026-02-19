'use client'

import { useState, useCallback } from 'react'

interface VibePreferences {
  mood: string
  transport: string
  priority: string
}

interface AtlasVibeSetupProps {
  city: string
  onComplete: (preferences: VibePreferences) => void
  onSkip: () => void
}

const MOOD_OPTIONS = [
  { id: 'bars', label: 'Bars', icon: '🍸' },
  { id: 'food', label: 'Food', icon: '🍽' },
  { id: 'coffee', label: 'Coffee', icon: '☕' },
  { id: 'things_to_do', label: 'Things to do', icon: '🎭' },
  { id: 'family', label: 'Family', icon: '👨‍👩‍👧' },
  { id: 'surprise', label: 'Surprise me', icon: '✨' },
]

const TRANSPORT_OPTIONS = [
  { id: 'walking', label: 'Walking', icon: '🚶' },
  { id: 'driving', label: 'Driving', icon: '🚗' },
  { id: 'either', label: 'Either', icon: '🤷' },
]

const PRIORITY_OPTIONS = [
  { id: 'open_now', label: 'Open now', icon: '🕒' },
  { id: 'closest', label: 'Closest', icon: '📍' },
  { id: 'top_rated', label: 'Top rated', icon: '⭐' },
  { id: 'qwikker_picks', label: 'Qwikker Picks', icon: '🏷' },
]

const STEPS = ['mood', 'transport', 'priority'] as const

export function AtlasVibeSetup({ city, onComplete, onSkip }: AtlasVibeSetupProps) {
  const [step, setStep] = useState(0)
  const [selections, setSelections] = useState<Partial<VibePreferences>>({})

  const handleSelect = useCallback((key: string, value: string) => {
    const updated = { ...selections, [key]: value }
    setSelections(updated)

    if (step < STEPS.length - 1) {
      setTimeout(() => setStep(s => s + 1), 250)
    } else {
      const prefs: VibePreferences = {
        mood: updated.mood || 'surprise',
        transport: updated.transport || 'either',
        priority: updated.priority || 'qwikker_picks',
      }
      onComplete(prefs)
    }
  }, [step, selections, onComplete])

  const handleSkipStep = useCallback(() => {
    const defaults: Record<string, string> = {
      mood: 'surprise',
      transport: 'either',
      priority: 'qwikker_picks',
    }
    const key = STEPS[step]
    handleSelect(key, defaults[key])
  }, [step, handleSelect])

  const currentStep = STEPS[step]

  const options = currentStep === 'mood'
    ? MOOD_OPTIONS
    : currentStep === 'transport'
      ? TRANSPORT_OPTIONS
      : PRIORITY_OPTIONS

  const titles: Record<string, string> = {
    mood: "What's the vibe?",
    transport: 'How are you getting around?',
    priority: "What matters most?",
  }

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center">
      {/* Glass backdrop -- map is visible behind */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-md mx-6">
        <div className="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  i === step ? 'bg-[#00d083]' : i < step ? 'bg-[#00d083]/50' : 'bg-white/20'
                }`}
              />
            ))}
          </div>

          <h2 className="text-2xl font-bold text-white text-center mb-2">
            {titles[currentStep]}
          </h2>
          <p className="text-sm text-white/50 text-center mb-8">
            Tap to choose · {step + 1} of {STEPS.length}
          </p>

          <div className="grid grid-cols-2 gap-3">
            {options.map((opt) => {
              const isSelected = selections[currentStep] === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => handleSelect(currentStep, opt.id)}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border transition-all duration-200 text-left ${
                    isSelected
                      ? 'bg-[#00d083]/20 border-[#00d083]/50 text-[#00d083]'
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:border-white/20'
                  }`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <span className="font-medium text-sm">{opt.label}</span>
                </button>
              )
            })}
          </div>

          <button
            onClick={handleSkipStep}
            className="w-full mt-6 text-white/40 hover:text-white/60 text-sm transition-colors text-center"
          >
            Skip
          </button>

          {step === 0 && (
            <button
              onClick={onSkip}
              className="w-full mt-2 text-white/30 hover:text-white/50 text-xs transition-colors text-center"
            >
              Skip setup entirely
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
