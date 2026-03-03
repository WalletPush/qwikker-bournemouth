'use client'

import { useState, useEffect, useCallback } from 'react'
import { storeKnowledgeWithEmbedding } from '@/lib/ai/embeddings'
import { createEventKnowledge } from '@/lib/actions/knowledge-base-actions'
import {
  Search, Plus, Trash2, FileText, Calendar, Type as TypeIcon,
  ChevronDown, ChevronUp, RefreshCw, AlertTriangle, Info, Loader2, Filter,
  Sparkles, Check, X, CheckCheck, Pencil,
} from 'lucide-react'

interface KBBusiness {
  id: string
  business_name: string
  display_category?: string
  business_category?: string
  business_tier?: string
}

interface KBEntry {
  id: string
  city: string
  business_id: string | null
  knowledge_type: string
  title: string
  content: string
  source_url: string | null
  metadata: Record<string, unknown> | null
  tags: string[] | null
  status: string
  created_at: string
  updated_at: string
}

interface KnowledgeBaseTabProps {
  city: string
  cityDisplayName: string
  adminId?: string
}

type AddMode = 'text' | 'pdf' | 'event'

const EVENT_CATEGORIES = [
  'Music', 'Food & Drink', 'Sports', 'Market', 'Community',
  'Arts', 'Nightlife', 'Festival', 'Other',
]

const TYPE_LABELS: Record<string, string> = {
  custom_knowledge: 'Custom',
  pdf_document: 'PDF',
  event: 'Event',
  web_scrape: 'Web',
  news_article: 'News',
}

const TYPE_COLORS: Record<string, string> = {
  custom_knowledge: 'bg-amber-500/20 text-amber-400',
  pdf_document: 'bg-red-500/20 text-red-400',
  event: 'bg-purple-500/20 text-purple-400',
  web_scrape: 'bg-blue-500/20 text-blue-400',
  news_article: 'bg-green-500/20 text-green-400',
}

const CITY_AREA_MAPPING: Record<string, string> = {
  bournemouth: 'Bournemouth, Christchurch, Poole',
  calgary: 'Calgary',
  london: 'London',
}

function isStale(dateStr: string): boolean {
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  return new Date(dateStr) < sixMonthsAgo
}

export function KnowledgeBaseTab({ city, cityDisplayName, adminId }: KnowledgeBaseTabProps) {
  // Target selector state
  const [selectedTarget, setSelectedTarget] = useState('general')
  const [eligibleBusinesses, setEligibleBusinesses] = useState<KBBusiness[]>([])
  const [loadingEligible, setLoadingEligible] = useState(true)

  // Entries state
  const [entries, setEntries] = useState<KBEntry[]>([])
  const [typeCounts, setTypeCounts] = useState<Record<string, number>>({})
  const [totalEntries, setTotalEntries] = useState(0)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null)

  // Add knowledge state
  const [addMode, setAddMode] = useState<AddMode>('text')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')

  // Text form
  const [textTitle, setTextTitle] = useState('')
  const [textContent, setTextContent] = useState('')

  // Event form
  const [eventName, setEventName] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventTime, setEventTime] = useState('')
  const [eventLocation, setEventLocation] = useState('')
  const [eventCategory, setEventCategory] = useState('Other')
  const [eventDescription, setEventDescription] = useState('')
  const [eventPrice, setEventPrice] = useState('')
  const [eventIsFree, setEventIsFree] = useState(false)

  // City knowledge generation state
  const [coverageAreas, setCoverageAreas] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [editingDraft, setEditingDraft] = useState<string | null>(null)
  const [editDraftContent, setEditDraftContent] = useState('')

  // Set default coverage areas from mapping
  useEffect(() => {
    setCoverageAreas(CITY_AREA_MAPPING[city.toLowerCase()] || cityDisplayName)
  }, [city, cityDisplayName])

  // Fetch eligible businesses
  useEffect(() => {
    async function fetchEligible() {
      setLoadingEligible(true)
      try {
        const res = await fetch(`/api/admin/kb-eligible?city=${city}`)
        const data = await res.json()
        if (data.success) {
          setEligibleBusinesses(data.businesses || [])
        }
      } catch (err) {
        console.error('Failed to fetch KB eligible:', err)
      } finally {
        setLoadingEligible(false)
      }
    }
    fetchEligible()
  }, [city])

  // Fetch entries when target or filters change
  const fetchEntries = useCallback(async () => {
    setLoadingEntries(true)
    try {
      const params = new URLSearchParams({ city })
      if (selectedTarget !== 'general') {
        params.set('business_id', selectedTarget)
      } else {
        params.set('business_id', 'general')
      }
      if (typeFilter !== 'all') params.set('type', typeFilter)
      if (searchQuery.trim()) params.set('search', searchQuery.trim())

      const res = await fetch(`/api/admin/knowledge/entries?${params}`)
      const data = await res.json()

      if (data.success) {
        setEntries(data.entries || [])
        setTypeCounts(data.typeCounts || {})
        setTotalEntries(data.total || 0)
      }
    } catch (err) {
      console.error('Failed to fetch KB entries:', err)
    } finally {
      setLoadingEntries(false)
    }
  }, [city, selectedTarget, typeFilter, searchQuery])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  // Refresh KB entries for the selected business: deletes auto-generated entries then re-creates from current data
  const handleRefresh = async () => {
    if (selectedTarget === 'general') return
    const name = selectedBusinessName || 'this business'
    if (!confirm(`Refresh knowledge for ${name}? This will replace auto-generated entries with current business data.`)) return

    setIsSubmitting(true)
    setStatusMessage(`Refreshing knowledge for ${name}...`)
    try {
      const res = await fetch('/api/admin/knowledge/auto-populate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, business_id: selectedTarget }),
      })
      const data = await res.json()
      if (data.success) {
        const stats = data.stats || {}
        setStatusMessage(
          `Refreshed — ${stats.oldEntriesReplaced || 0} old entries replaced, ${stats.knowledgeEntriesCreated || 0} new entries created`
        )
      } else {
        setStatusMessage(`Error: ${data.error}`)
      }
      fetchEntries()
    } catch {
      setStatusMessage('Failed to refresh knowledge')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete entry handler
  const handleDelete = async (id: string) => {
    if (!confirm('Remove this entry from the knowledge base?')) return
    try {
      const res = await fetch('/api/admin/knowledge/entries', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (data.success) {
        setEntries((prev) => prev.filter((e) => e.id !== id))
        setTotalEntries((prev) => prev - 1)
      }
    } catch (err) {
      console.error('Failed to delete entry:', err)
    }
  }

  // Submit text knowledge
  const handleSubmitText = async () => {
    if (!textTitle.trim() || !textContent.trim()) return
    setIsSubmitting(true)
    setStatusMessage('Storing knowledge with embedding...')
    try {
      const result = await storeKnowledgeWithEmbedding({
        city,
        businessId: selectedTarget === 'general' ? null : selectedTarget,
        knowledgeType: 'custom_knowledge',
        title: textTitle.trim(),
        content: textContent.trim(),
        tags: ['custom', 'manual'],
      })
      if (result.success) {
        setStatusMessage('Knowledge added successfully')
        setTextTitle('')
        setTextContent('')
        fetchEntries()
      } else {
        setStatusMessage(`Error: ${result.error}`)
      }
    } catch {
      setStatusMessage('Failed to store knowledge')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit PDF upload
  const handlePDFUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsSubmitting(true)
    setStatusMessage(`Uploading ${file.name}...`)
    try {
      const formData = new FormData()
      formData.append('pdf', file)
      formData.append('targetId', selectedTarget === 'general' ? city : selectedTarget)
      formData.append('targetType', selectedTarget === 'general' ? 'city' : 'business')

      const res = await fetch('/api/admin/knowledge/upload-pdf', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      setStatusMessage(data.success ? `PDF processed — ${data.data?.chunks || 0} chunks stored` : `Error: ${data.error}`)
      if (data.success) {
        fetchEntries()
        e.target.value = ''
      }
    } catch {
      setStatusMessage('Failed to upload PDF')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Submit event
  const handleSubmitEvent = async () => {
    if (!eventName.trim()) return
    setIsSubmitting(true)
    setStatusMessage('Creating event...')
    try {
      const result = await createEventKnowledge(
        selectedTarget === 'general' ? null : selectedTarget,
        city,
        {
          name: eventName.trim(),
          date: eventDate,
          time: eventTime,
          location: eventLocation.trim(),
          type: eventCategory,
          description: eventDescription.trim(),
          price: eventIsFree ? 'Free' : eventPrice.trim(),
          ticketRequired: !eventIsFree && !!eventPrice.trim(),
        },
        adminId || 'admin'
      )
      if (result.success) {
        setStatusMessage('Event added to knowledge base')
        setEventName('')
        setEventDate('')
        setEventTime('')
        setEventLocation('')
        setEventCategory('Other')
        setEventDescription('')
        setEventPrice('')
        setEventIsFree(false)
        fetchEntries()
      } else {
        setStatusMessage(`Error: ${result.error}`)
      }
    } catch {
      setStatusMessage('Failed to create event')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Generate city knowledge drafts
  const handleGenerateCityKnowledge = async () => {
    if (!coverageAreas.trim()) return
    setIsGenerating(true)
    setStatusMessage('Generating city knowledge drafts... This may take 30-60 seconds.')
    try {
      const res = await fetch('/api/admin/knowledge/seed-city', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, areas: coverageAreas.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setStatusMessage(`Generated ${data.results?.filter((r: { success: boolean }) => r.success).length || 0} draft entries. Review and approve below.`)
        fetchEntries()
      } else {
        setStatusMessage(`Error: ${data.error}`)
      }
    } catch {
      setStatusMessage('Failed to generate city knowledge')
    } finally {
      setIsGenerating(false)
    }
  }

  // Approve a single draft entry
  const handleApproveDraft = async (id: string, editedContent?: string) => {
    try {
      const body: Record<string, unknown> = { id, status: 'active', reviewed_by: adminId }
      if (editedContent !== undefined) body.content = editedContent
      const res = await fetch('/api/admin/knowledge/entries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        setEntries((prev) => prev.map((e) => e.id === id ? { ...e, status: 'active', ...(editedContent ? { content: editedContent } : {}) } : e))
        setEditingDraft(null)
        setEditDraftContent('')
      }
    } catch (err) {
      console.error('Failed to approve draft:', err)
    }
  }

  // Approve all draft entries at once
  const handleApproveAll = async () => {
    const drafts = entries.filter((e) => e.status === 'draft')
    if (drafts.length === 0) return
    if (!confirm(`Approve all ${drafts.length} draft entries? They will become visible to the AI.`)) return

    setIsSubmitting(true)
    setStatusMessage(`Approving ${drafts.length} drafts...`)
    let approved = 0
    for (const draft of drafts) {
      try {
        const res = await fetch('/api/admin/knowledge/entries', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: draft.id, status: 'active', reviewed_by: adminId }),
        })
        const data = await res.json()
        if (data.success) approved++
      } catch { /* continue */ }
    }
    setStatusMessage(`Approved ${approved}/${drafts.length} entries`)
    setIsSubmitting(false)
    fetchEntries()
  }

  const draftCount = entries.filter((e) => e.status === 'draft').length
  const hasCityKnowledge = entries.some((e) => e.tags?.includes('city_knowledge'))

  const selectedBusinessName = eligibleBusinesses.find((b) => b.id === selectedTarget)?.business_name

  return (
    <div className="space-y-6">

      {/* Info callout */}
      <div className="bg-[#00d083]/5 border border-[#00d083]/20 rounded-xl p-5">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-[#00d083] shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="text-white font-medium mb-1">
              Menus, business hours, offers, and basic business info are automatically added when you approve them.
            </p>
            <p className="text-slate-400">
              Use this tab to add extra context the AI doesn&apos;t get from approvals — local events, city guides, PDFs, or custom facts.
            </p>
          </div>
        </div>
      </div>

      {/* Top bar: target selector + auto-populate */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
          <div className="flex-1 min-w-0">
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Target
            </label>
            <select
              value={selectedTarget}
              onChange={(e) => setSelectedTarget(e.target.value)}
              disabled={loadingEligible}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-white text-sm focus:border-[#00d083] focus:ring-1 focus:ring-[#00d083] transition-colors"
            >
              <option value="general">General {cityDisplayName} Knowledge</option>
              <optgroup label="Eligible Businesses">
                {eligibleBusinesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.business_name}{b.display_category || b.business_category ? ` — ${b.display_category || b.business_category}` : ''}
                    {b.business_tier === 'free_tier' ? ' (claimed)' : ''}
                  </option>
                ))}
                {!loadingEligible && eligibleBusinesses.length === 0 && (
                  <option disabled>No eligible businesses</option>
                )}
              </optgroup>
            </select>
          </div>
          {selectedTarget !== 'general' && (
            <button
              onClick={handleRefresh}
              disabled={isSubmitting}
              className="flex items-center gap-2 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
              title="Delete auto-generated entries and re-create with current business data"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Refresh Knowledge
            </button>
          )}
        </div>
      </div>

      {/* Generate City Knowledge section -- only when on general target */}
      {selectedTarget === 'general' && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-[#00d083]" />
            <h3 className="text-base font-semibold text-white">
              {hasCityKnowledge ? 'City Knowledge' : 'Generate City Knowledge'}
            </h3>
            {draftCount > 0 && (
              <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-0.5 rounded-full font-medium">
                {draftCount} drafts to review
              </span>
            )}
          </div>

          {!hasCityKnowledge && (
            <>
              <p className="text-sm text-slate-400 mb-4">
                Generate AI-drafted knowledge about {cityDisplayName} covering transport, parking, neighbourhoods, and more.
                Everything starts as a draft — you review and approve before the AI can use it.
              </p>
              <div className="mb-4">
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Coverage areas (edit to match your franchise territory)
                </label>
                <input
                  type="text"
                  value={coverageAreas}
                  onChange={(e) => setCoverageAreas(e.target.value)}
                  placeholder="e.g. Bournemouth, Christchurch, Poole"
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#00d083] focus:ring-1 focus:ring-[#00d083]"
                />
              </div>
              <button
                onClick={handleGenerateCityKnowledge}
                disabled={isGenerating || !coverageAreas.trim()}
                className="flex items-center gap-2 bg-[#00d083] hover:bg-[#00b86f] disabled:opacity-50 text-black px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {isGenerating ? 'Generating...' : 'Generate City Knowledge'}
              </button>
            </>
          )}

          {draftCount > 0 && (
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={handleApproveAll}
                disabled={isSubmitting}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Approve All ({draftCount})
              </button>
              <p className="text-xs text-slate-500">
                Review each section below before approving, or approve all at once.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Entry count summary */}
      {totalEntries > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-slate-700/50 text-slate-300 px-3 py-1.5 rounded-full font-medium">
            {totalEntries} entries
          </span>
          {Object.entries(typeCounts).map(([type, count]) => (
            <span key={type} className={`px-3 py-1.5 rounded-full font-medium ${TYPE_COLORS[type] || 'bg-slate-700/50 text-slate-400'}`}>
              {count} {TYPE_LABELS[type] || type}
            </span>
          ))}
        </div>
      )}

      {/* Entries list */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search entries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-[#00d083] focus:ring-1 focus:ring-[#00d083]"
            />
          </div>
          {/* Type filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white focus:border-[#00d083]"
            >
              <option value="all">All types</option>
              <option value="custom_knowledge">Custom</option>
              <option value="pdf_document">PDF</option>
              <option value="event">Event</option>
              <option value="web_scrape">Web</option>
            </select>
          </div>
        </div>

        {/* Entry rows */}
        <div className="divide-y divide-slate-700/50 max-h-[500px] overflow-y-auto">
          {loadingEntries ? (
            <div className="flex items-center justify-center py-12 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading entries...
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              {searchQuery || typeFilter !== 'all'
                ? 'No entries match your filters.'
                : selectedTarget === 'general'
                  ? `No general knowledge entries for ${cityDisplayName} yet.`
                  : 'No entries for this business yet.'
              }
            </div>
          ) : (
            entries.map((entry) => {
              const isDraft = entry.status === 'draft'
              const hasWarning = entry.metadata && (entry.metadata as Record<string, unknown>).warning === 'possible_business_mention'
              const isEditing = editingDraft === entry.id

              return (
                <div key={entry.id} className={`group ${isDraft ? 'border-l-2 border-amber-500/50' : ''}`}>
                  <div
                    className="flex items-center gap-3 px-4 py-3 hover:bg-slate-700/30 cursor-pointer transition-colors"
                    onClick={() => setExpandedEntry(expandedEntry === entry.id ? null : entry.id)}
                  >
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide shrink-0 ${TYPE_COLORS[entry.knowledge_type] || 'bg-slate-600 text-slate-300'}`}>
                      {TYPE_LABELS[entry.knowledge_type] || entry.knowledge_type}
                    </span>
                    {isDraft && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide shrink-0 bg-amber-500/20 text-amber-400">
                        Draft
                      </span>
                    )}
                    {hasWarning && (
                      <span className="flex items-center text-[10px] text-orange-400 shrink-0" title="May contain business name references">
                        <AlertTriangle className="w-3 h-3" />
                      </span>
                    )}
                    <span className="text-sm text-white truncate flex-1 min-w-0">{entry.title}</span>
                    {!isDraft && isStale(entry.updated_at || entry.created_at) && (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400/80 shrink-0" title="Entry older than 6 months">
                        <AlertTriangle className="w-3 h-3" /> Stale
                      </span>
                    )}
                    <span className="text-xs text-slate-500 shrink-0">
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                    {expandedEntry === entry.id ? (
                      <ChevronUp className="w-4 h-4 text-slate-500 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-500 shrink-0" />
                    )}
                  </div>

                  {expandedEntry === entry.id && (
                    <div className="px-4 pb-4 bg-slate-800/30">
                      {isDraft && isEditing ? (
                        <textarea
                          value={editDraftContent}
                          onChange={(e) => setEditDraftContent(e.target.value)}
                          rows={10}
                          className="w-full bg-slate-900/50 border border-slate-600 rounded-lg p-3 mb-3 text-xs text-slate-300 font-mono leading-relaxed resize-none focus:border-[#00d083] focus:ring-1 focus:ring-[#00d083]"
                        />
                      ) : (
                        <pre className={`text-xs text-slate-400 whitespace-pre-wrap overflow-y-auto bg-slate-900/50 rounded-lg p-3 mb-3 font-mono leading-relaxed ${isDraft ? 'max-h-[500px]' : 'max-h-60'}`}>
                          {entry.content}
                        </pre>
                      )}
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {entry.tags.map((tag) => (
                            <span key={tag} className="text-[10px] bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {isDraft ? (
                        <div className="flex items-center gap-2">
                          {isEditing ? (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleApproveDraft(entry.id, editDraftContent) }}
                                className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" /> Save & Approve
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingDraft(null); setEditDraftContent('') }}
                                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 px-3 py-1.5 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" /> Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleApproveDraft(entry.id) }}
                                className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" /> Approve
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingDraft(entry.id); setEditDraftContent(entry.content) }}
                                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 px-3 py-1.5 transition-colors"
                              >
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(entry.id) }}
                                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-3 py-1.5 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" /> Discard
                              </button>
                            </>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(entry.id) }}
                          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Remove entry
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Add knowledge section */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Plus className="w-5 h-5 text-[#00d083]" />
            Add Knowledge
            {selectedTarget !== 'general' && selectedBusinessName && (
              <span className="text-sm font-normal text-slate-400">
                for {selectedBusinessName}
              </span>
            )}
          </h3>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 bg-slate-900/50 rounded-lg p-1 mb-5">
          {([
            { id: 'text' as AddMode, label: 'Text', icon: TypeIcon },
            { id: 'pdf' as AddMode, label: 'PDF Upload', icon: FileText },
            { id: 'event' as AddMode, label: 'Event', icon: Calendar },
          ]).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setAddMode(id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                addMode === id
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {/* Text mode */}
        {addMode === 'text' && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Title (e.g. 'Bournemouth Christmas Market 2026')"
              value={textTitle}
              onChange={(e) => setTextTitle(e.target.value)}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#00d083] focus:ring-1 focus:ring-[#00d083]"
            />
            <textarea
              placeholder="Enter knowledge content... The AI will use this to answer questions about this business or city."
              value={textContent}
              onChange={(e) => setTextContent(e.target.value)}
              rows={5}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-[#00d083] focus:ring-1 focus:ring-[#00d083] resize-none"
            />
            <button
              onClick={handleSubmitText}
              disabled={isSubmitting || !textTitle.trim() || !textContent.trim()}
              className="flex items-center gap-2 bg-[#00d083] hover:bg-[#00b86f] disabled:opacity-50 text-black px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add to Knowledge Base
            </button>
          </div>
        )}

        {/* PDF mode */}
        {addMode === 'pdf' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-400">
              Upload a PDF document. It will be parsed, chunked, and stored with embeddings for AI retrieval.
            </p>
            <input
              type="file"
              accept=".pdf"
              onChange={handlePDFUpload}
              disabled={isSubmitting}
              className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white file:bg-[#00d083]/20 file:border-0 file:text-[#00d083] file:px-3 file:py-1 file:rounded file:text-sm file:mr-3 file:font-medium disabled:opacity-50"
            />
            <p className="text-xs text-slate-500">
              {selectedTarget === 'general'
                ? `PDF will be stored as general ${cityDisplayName} knowledge`
                : `PDF will be linked to ${selectedBusinessName || 'selected business'}`}
            </p>
          </div>
        )}

        {/* Event mode */}
        {addMode === 'event' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Event Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Bournemouth Food Festival"
                  value={eventName}
                  onChange={(e) => setEventName(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Category</label>
                <select
                  value={eventCategory}
                  onChange={(e) => setEventCategory(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:border-purple-400"
                >
                  {EVENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Time</label>
                <input
                  type="time"
                  value={eventTime}
                  onChange={(e) => setEventTime(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Location / Venue</label>
                <input
                  type="text"
                  placeholder="e.g. Bournemouth Gardens"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-purple-400 focus:ring-1 focus:ring-purple-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Price</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="e.g. £15"
                    value={eventIsFree ? '' : eventPrice}
                    onChange={(e) => setEventPrice(e.target.value)}
                    disabled={eventIsFree}
                    className="flex-1 bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-purple-400 disabled:opacity-50"
                  />
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 whitespace-nowrap cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eventIsFree}
                      onChange={(e) => setEventIsFree(e.target.checked)}
                      className="rounded border-slate-600 bg-slate-700"
                    />
                    Free
                  </label>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Description</label>
              <textarea
                placeholder="Brief description of the event..."
                value={eventDescription}
                onChange={(e) => setEventDescription(e.target.value)}
                rows={3}
                className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 resize-none"
              />
            </div>
            <button
              onClick={handleSubmitEvent}
              disabled={isSubmitting || !eventName.trim()}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
              Add Event
            </button>
          </div>
        )}
      </div>

      {/* Status message */}
      {statusMessage && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3">
          <p className="text-sm text-slate-300 font-mono">{statusMessage}</p>
        </div>
      )}
    </div>
  )
}
