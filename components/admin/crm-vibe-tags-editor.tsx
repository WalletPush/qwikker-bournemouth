'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getVibeTagCategoriesForBusiness,
  getVibeTagLabel,
  isVibeGroup,
  MAX_CUSTOM_TAG_LENGTH,
  MAX_CUSTOM_TAGS,
  suggestVibeGroup,
  VIBE_GROUP_OPTIONS,
  type VibeGroup,
  type VibeTagsData,
} from '@/lib/constants/vibe-tags'

interface CrmVibeTagsEditorProps {
  businessId: string
  systemCategory?: string | null
  businessType?: string | null
  businessCategory?: string | null
  vibeTags?: VibeTagsData | null
  onSaved?: (next: VibeTagsData) => void
}

function normalizeVibeTags(raw: VibeTagsData | null | undefined): VibeTagsData {
  return {
    selected: Array.isArray(raw?.selected) ? [...raw!.selected] : [],
    custom: Array.isArray(raw?.custom) ? [...raw!.custom] : [],
    tag_set: raw?.tag_set && isVibeGroup(raw.tag_set) ? raw.tag_set : null,
  }
}

export function CrmVibeTagsEditor({
  businessId,
  systemCategory,
  businessType,
  businessCategory,
  vibeTags,
  onSaved,
}: CrmVibeTagsEditorProps) {
  const suggested = useMemo(
    () =>
      suggestVibeGroup({
        systemCategory,
        businessType,
        categoryText: businessCategory,
      }),
    [systemCategory, businessType, businessCategory]
  )

  const initial = useMemo(() => normalizeVibeTags(vibeTags), [vibeTags])
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState<string[]>(initial.selected)
  const [custom, setCustom] = useState<string[]>(initial.custom)
  const [tagSet, setTagSet] = useState<VibeGroup | null>(initial.tag_set ?? null)
  const [customDraft, setCustomDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const activeSet = tagSet || suggested
  const categories = useMemo(
    () =>
      getVibeTagCategoriesForBusiness({
        systemCategory,
        businessType,
        categoryText: businessCategory,
        tagSetOverride: tagSet,
      }),
    [systemCategory, businessType, businessCategory, tagSet]
  )

  const shownSlugs = useMemo(
    () => new Set(categories.flatMap((c) => c.tags.map((t) => t.slug))),
    [categories]
  )
  const hiddenSelected = selected.filter((s) => !shownSlugs.has(s))
  const displayTags = [...selected, ...custom]

  const startEdit = () => {
    const next = normalizeVibeTags(vibeTags)
    setSelected(next.selected)
    setCustom(next.custom)
    setTagSet(next.tag_set ?? null)
    setCustomDraft('')
    setError(null)
    setMessage(null)
    setEditing(true)
  }

  const cancelEdit = () => {
    const next = normalizeVibeTags(vibeTags)
    setSelected(next.selected)
    setCustom(next.custom)
    setTagSet(next.tag_set ?? null)
    setEditing(false)
    setError(null)
  }

  const toggleSlug = (slug: string) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    )
  }

  const addCustom = () => {
    const value = customDraft.trim()
    if (!value) return
    if (custom.length >= MAX_CUSTOM_TAGS) {
      setError(`Max ${MAX_CUSTOM_TAGS} custom tags`)
      return
    }
    if (value.length > MAX_CUSTOM_TAG_LENGTH) {
      setError(`Custom tags max ${MAX_CUSTOM_TAG_LENGTH} characters`)
      return
    }
    if (custom.includes(value)) {
      setCustomDraft('')
      return
    }
    setCustom([...custom, value])
    setCustomDraft('')
    setError(null)
  }

  const save = async () => {
    setSaving(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/update-vibe-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          selected,
          custom,
          tag_set: tagSet,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.success) {
        throw new Error(body.error || 'Failed to save vibe tags')
      }
      const next = normalizeVibeTags(body.vibe_tags)
      setSelected(next.selected)
      setCustom(next.custom)
      setTagSet(next.tag_set ?? null)
      setEditing(false)
      setMessage('Vibe tags saved')
      onSaved?.(next)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save vibe tags')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-medium text-slate-300">Vibe Tags</h4>
          {!editing ? (
            <Button
              size="sm"
              variant="outline"
              className="border-slate-500 text-slate-200 text-xs"
              onClick={startEdit}
            >
              {displayTags.length > 0 ? 'Edit' : 'Add'}
            </Button>
          ) : null}
        </div>

        {!editing ? (
          displayTags.length > 0 ? (
            <div className="space-y-2">
              {tagSet ? (
                <p className="text-[11px] text-slate-500">
                  Tag set:{' '}
                  {VIBE_GROUP_OPTIONS.find((o) => o.value === tagSet)?.label || tagSet}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-1.5">
                {displayTags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700/50 border border-slate-600 text-slate-300"
                  >
                    {getVibeTagLabel(tag)}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No vibe tags yet.</p>
          )
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Tag set</label>
              <select
                value={activeSet}
                onChange={(e) => {
                  const next = e.target.value as VibeGroup
                  setTagSet(next === suggested ? null : next)
                }}
                className="w-full rounded-lg border border-slate-600 bg-slate-900/50 px-3 py-2 text-sm text-white focus:border-[#00d083] focus:outline-none"
              >
                {VIBE_GROUP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                    {opt.value === suggested ? ' (suggested)' : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500">
                Swap if suggested tags don&apos;t fit — does not change business category.
              </p>
            </div>

            {categories.map((category) => (
              <div key={category.id}>
                <h5 className="text-xs font-semibold text-slate-400 mb-2">{category.label}</h5>
                <div className="flex flex-wrap gap-1.5">
                  {category.tags.map((tag) => {
                    const isOn = selected.includes(tag.slug)
                    return (
                      <button
                        key={tag.slug}
                        type="button"
                        onClick={() => toggleSlug(tag.slug)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                          isOn
                            ? 'bg-[#00d083]/20 text-[#00d083] border-[#00d083]/50'
                            : 'bg-slate-700/40 text-slate-300 border-slate-600 hover:border-slate-500'
                        }`}
                      >
                        {tag.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {hiddenSelected.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-amber-400/90 mb-2">
                  Also selected (other set)
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {hiddenSelected.map((slug) => (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => toggleSlug(slug)}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-200 border border-amber-500/40"
                    >
                      {getVibeTagLabel(slug)} ×
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <h5 className="text-xs font-semibold text-slate-400">
                Custom ({custom.length}/{MAX_CUSTOM_TAGS})
              </h5>
              {custom.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {custom.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setCustom(custom.filter((t) => t !== tag))}
                      className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-700/50 text-slate-200 border border-slate-600"
                    >
                      {tag} ×
                    </button>
                  ))}
                </div>
              )}
              {custom.length < MAX_CUSTOM_TAGS && (
                <div className="flex gap-2">
                  <Input
                    value={customDraft}
                    onChange={(e) => setCustomDraft(e.target.value)}
                    placeholder="Add custom tag"
                    maxLength={MAX_CUSTOM_TAG_LENGTH}
                    className="bg-slate-900/50 border-slate-600 text-white text-sm h-9"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addCustom()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="border-slate-600 text-slate-300"
                    onClick={addCustom}
                  >
                    Add
                  </Button>
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-[#00d083] text-black hover:bg-[#00b872]"
                disabled={saving}
                onClick={() => void save()}
              >
                {saving ? 'Saving…' : 'Save vibe tags'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-slate-600 text-slate-300"
                disabled={saving}
                onClick={cancelEdit}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {message && !editing && <p className="text-xs text-green-400">{message}</p>}
      </CardContent>
    </Card>
  )
}
