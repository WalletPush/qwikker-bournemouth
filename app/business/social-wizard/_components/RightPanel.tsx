/**
 * RIGHT PANEL
 * Suggestions + Draft Library
 */

'use client'

import { useSocialWizardStore } from '@/lib/social-wizard/store'
import { useEffect, useState } from 'react'
import { Lightbulb, FileText, Search, Sparkles, Loader2 } from 'lucide-react'
import type { Suggestion } from '@/app/api/social/suggestions/route'
import type { Draft } from '@/lib/social-wizard/store'

export function RightPanel() {
  const {
    businessId,
    tier,
    drafts,
    searchQuery,
    setDrafts,
    setSearchQuery,
    loadDraftIntoEditor
  } = useSocialWizardStore()

  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [loadingDrafts, setLoadingDrafts] = useState(false)

  // Load suggestions
  useEffect(() => {
    async function loadSuggestions() {
      if (!businessId) return
      setLoadingSuggestions(true)
      try {
        const response = await fetch(`/api/social/suggestions?business_id=${businessId}`)
        const data = await response.json()
        if (data.success) {
          setSuggestions(data.suggestions)
        }
      } catch (err) {
        console.error('Failed to load suggestions:', err)
      } finally {
        setLoadingSuggestions(false)
      }
    }
    loadSuggestions()
  }, [businessId])

  // Load drafts
  useEffect(() => {
    async function loadDrafts() {
      if (!businessId) return
      setLoadingDrafts(true)
      try {
        const url = searchQuery
          ? `/api/social/posts?business_id=${businessId}&search=${encodeURIComponent(searchQuery)}`
          : `/api/social/posts?business_id=${businessId}`
        const response = await fetch(url)
        const data = await response.json()
        if (data.success) {
          setDrafts(data.drafts)
        }
      } catch (err) {
        console.error('Failed to load drafts:', err)
      } finally {
        setLoadingDrafts(false)
      }
    }
    loadDrafts()
  }, [businessId, searchQuery, setDrafts])

  // Group drafts by campaign
  const campaignGroups = drafts.reduce((acc, draft) => {
    const key = draft.campaign_id || 'standalone'
    if (!acc[key]) acc[key] = []
    acc[key].push(draft)
    return acc
  }, {} as Record<string, Draft[]>)

  return (
    <div className="p-6 space-y-6">
      {/* Suggestions */}
      <div>
        <h3 className="text-sm font-bold text-neutral-300 mb-3 flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-orange-400" />
          Suggestions
        </h3>
        {loadingSuggestions ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
          </div>
        ) : suggestions.length > 0 ? (
          <div className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-3"
              >
                <div className="text-sm font-medium text-white mb-1">
                  {suggestion.title}
                </div>
                <div className="text-xs text-neutral-400 mb-2">
                  {suggestion.reason}
                </div>
                <button className="text-xs text-orange-400 hover:text-orange-300 font-medium">
                  {suggestion.cta}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-neutral-500 text-center py-4">
            No suggestions right now
          </div>
        )}
      </div>

      {/* Campaign Pack Button (Spotlight only) */}
      {tier === 'spotlight' && (
        <button className="w-full bg-orange-500/10 hover:bg-orange-500/15 border border-orange-500/25 text-orange-400 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" />
          Generate Campaign Pack
        </button>
      )}

      {/* Draft Library */}
      <div>
        <h3 className="text-sm font-bold text-neutral-300 mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-500" />
          Draft Library ({drafts.length})
        </h3>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search drafts..."
            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        {/* Draft List */}
        {loadingDrafts ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-neutral-500" />
          </div>
        ) : Object.keys(campaignGroups).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(campaignGroups).map(([key, groupDrafts]) => (
              <div key={key}>
                {key !== 'standalone' && (
                  <div className="text-xs font-medium text-orange-400 mb-2">
                    Campaign Pack ({groupDrafts.length} posts)
                  </div>
                )}
                <div className="space-y-2">
                  {groupDrafts.map((draft) => (
                    <button
                      key={draft.id}
                      onClick={() => loadDraftIntoEditor(draft)}
                      className="w-full bg-neutral-900/50 hover:bg-neutral-800/50 border border-neutral-800 rounded-lg p-3 text-left transition-colors"
                    >
                      <div className="text-sm text-white mb-1 line-clamp-2">
                        {draft.caption}
                      </div>
                      <div className="text-xs text-neutral-500">
                        {new Date(draft.created_at).toLocaleDateString()}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-neutral-500 text-center py-8">
            No drafts yet. Generate your first post!
          </div>
        )}
      </div>
    </div>
  )
}
