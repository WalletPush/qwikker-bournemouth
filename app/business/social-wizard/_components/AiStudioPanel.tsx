/**
 * AI STUDIO PANEL (LEFT)
 * Goal, Tone, Hook Tags, Generate button
 */

'use client'

import { useSocialWizardStore } from '@/lib/social-wizard/store'
import { Sparkles, Loader2, AlertCircle, Plus } from 'lucide-react'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const GOALS = [
  { value: 'promote_offer', label: 'Promote Offer' },
  { value: 'hype_event', label: 'Hype Event' },
  { value: 'menu_spotlight', label: 'Menu Spotlight' },
  { value: 'general_update', label: 'General Update' }
] as const

const TONES = [
  { value: 'premium', label: 'Premium' },
  { value: 'bold', label: 'Bold' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'playful', label: 'Playful' }
] as const

const HOOK_TAGS = [
  'limited time',
  'new',
  'locals love',
  'weekend',
  'date night',
  'family friendly',
  'after the beach'
]

export function AiStudioPanel() {
  const {
    businessId,
    tier,
    goal,
    tone,
    hookTags,
    isGenerating,
    availableOffers,
    availableEvents,
    availableMenuItems,
    availableSecretMenuItems,
    selectedOfferId,
    selectedEventId,
    selectedMenuItemId,
    selectedSecretMenuItemId,
    includeSecretMenu,
    setGoal,
    setTone,
    toggleHookTag,
    setVariants,
    setIsGenerating,
    setAvailableSources,
    setSelectedOfferId,
    setSelectedEventId,
    setSelectedMenuItemId,
    setSelectedSecretMenuItemId,
    setIncludeSecretMenu
  } = useSocialWizardStore()

  const [error, setError] = useState<string | null>(null)
  const [loadingSources, setLoadingSources] = useState(true)

  // Fetch available sources on mount
  useEffect(() => {
    async function fetchSources() {
      try {
        const response = await fetch(`/api/social/sources?business_id=${businessId}`)
        const data = await response.json()
        
        if (data.success) {
          setAvailableSources(data.sources)
        }
      } catch (err) {
        console.error('Failed to fetch sources:', err)
      } finally {
        setLoadingSources(false)
      }
    }

    if (businessId) {
      fetchSources()
    }
  }, [businessId, setAvailableSources])

  async function handleGenerate() {
    setError(null)
    setIsGenerating(true)

    try {
      // Build source_override based on goal and selections
      let source_override = null
      if (goal === 'promote_offer' && selectedOfferId) {
        source_override = { type: 'offer', id: selectedOfferId }
      } else if (goal === 'hype_event' && selectedEventId) {
        source_override = { type: 'event', id: selectedEventId }
      } else if (goal === 'menu_spotlight' && selectedMenuItemId) {
        source_override = { type: 'menu', id: selectedMenuItemId }
      }

      const response = await fetch('/api/social/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          business_id: businessId,
          goal,
          tone,
          hook_tags: hookTags,
          source_override,
          include_secret_menu: includeSecretMenu && tier === 'spotlight' ? selectedSecretMenuItemId : null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Generation failed')
      }

      if (!data.variants || data.variants.length === 0) {
        throw new Error('AI returned no content variants')
      }

      setVariants(data.variants)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-orange-500" />
          AI Studio
        </h2>
      </div>

      {/* Goal Selector */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Goal
        </label>
        <div className="grid grid-cols-1 gap-2">
          {GOALS.map(g => (
            <button
              key={g.value}
              onClick={() => setGoal(g.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                goal === g.value
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                  : 'bg-neutral-800/50 text-neutral-300 hover:bg-neutral-700/50'
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Offer Selection (when goal = promote_offer) */}
      {goal === 'promote_offer' && !loadingSources && (
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Which Offer?
          </label>
          {availableOffers.length === 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-amber-200 mb-1">
                    No active offers
                  </div>
                  <div className="text-xs text-neutral-400 mb-3">
                    Create an offer first to promote it on social media
                  </div>
                  <Link
                    href="/business/offers/new"
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Offer
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <select
              value={selectedOfferId || ''}
              onChange={(e) => setSelectedOfferId(e.target.value || null)}
              className="w-full bg-neutral-800/50 border border-neutral-700 rounded-lg px-4 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select an offer...</option>
              {availableOffers.map(offer => (
                <option key={offer.id} value={offer.id}>
                  {offer.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Event Selection (when goal = hype_event) */}
      {goal === 'hype_event' && !loadingSources && (
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Which Event?
          </label>
          {availableEvents.length === 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-amber-200 mb-1">
                    No upcoming events
                  </div>
                  <div className="text-xs text-neutral-400 mb-3">
                    Create an event first to promote it on social media
                  </div>
                  <Link
                    href="/business/events/new"
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Create Event
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <select
              value={selectedEventId || ''}
              onChange={(e) => setSelectedEventId(e.target.value || null)}
              className="w-full bg-neutral-800/50 border border-neutral-700 rounded-lg px-4 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select an event...</option>
              {availableEvents.map(event => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Menu Item Selection (when goal = menu_spotlight) */}
      {goal === 'menu_spotlight' && !loadingSources && (
        <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">
            Which Menu Item?
          </label>
          {availableMenuItems.length === 0 ? (
            <div className="bg-amber-500/10 border border-amber-500/25 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-amber-200 mb-1">
                    No menu items found
                  </div>
                  <div className="text-xs text-neutral-400">
                    Add menu items to your knowledge base to spotlight them
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <select
              value={selectedMenuItemId || ''}
              onChange={(e) => setSelectedMenuItemId(e.target.value || null)}
              className="w-full bg-neutral-800/50 border border-neutral-700 rounded-lg px-4 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select a menu item...</option>
              {availableMenuItems.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Secret Menu Toggle (Spotlight tier only) */}
      {tier === 'spotlight' && availableSecretMenuItems.length > 0 && !loadingSources && (
        <div className="border-t border-neutral-800 pt-4">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={includeSecretMenu}
              onChange={(e) => setIncludeSecretMenu(e.target.checked)}
              className="w-4 h-4 rounded border-neutral-600 bg-neutral-800 text-emerald-600 focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0"
            />
            <span className="text-sm font-medium text-neutral-300 group-hover:text-neutral-100 transition-colors">
              Include Secret Menu Item ✨
            </span>
          </label>

          {includeSecretMenu && (
            <div className="mt-3">
              <select
                value={selectedSecretMenuItemId || ''}
                onChange={(e) => setSelectedSecretMenuItemId(e.target.value || null)}
                className="w-full bg-neutral-800/50 border border-neutral-700 rounded-lg px-4 py-2 text-sm text-neutral-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select secret item...</option>
                {availableSecretMenuItems.map(item => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* Tone Selector */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Tone
        </label>
        <div className="grid grid-cols-2 gap-2">
          {TONES.map(t => (
            <button
              key={t.value}
              onClick={() => setTone(t.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tone === t.value
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/20'
                  : 'bg-neutral-800/50 text-neutral-300 hover:bg-neutral-700/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Hook Tags */}
      <div>
        <label className="block text-sm font-medium text-neutral-300 mb-2">
          Hook Tags
        </label>
        <div className="flex flex-wrap gap-2">
          {HOOK_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => toggleHookTag(tag)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                hookTags.includes(tag)
                  ? 'bg-orange-500/15 text-orange-400 border border-orange-500/25'
                  : 'bg-neutral-800/50 text-neutral-400 border border-neutral-700 hover:bg-neutral-700/50'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-neutral-700 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate Post
          </>
        )}
      </button>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm">
          <div className="font-semibold text-red-400 mb-2">⚠️ Generation Failed</div>
          <div className="text-red-300 mb-2">{error}</div>
          {error.includes('Invalid input') && (
            <div className="mt-2 text-xs text-neutral-400">
              Check browser console for validation details
            </div>
          )}
          {error.includes('AI service not configured') && (
            <div className="mt-2 text-xs text-neutral-400">
              Add OpenAI API key in franchise_crm_configs
            </div>
          )}
          {error.includes('not available for Starter') && (
            <div className="mt-2 text-xs text-neutral-400">
              Upgrade to Featured or Spotlight tier
            </div>
          )}
        </div>
      )}
    </div>
  )
}
