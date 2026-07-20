'use client'

import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export type FieldSource = 'website' | 'google' | 'ai_inferred'
export type ReviewStatus = 'pending' | 'accepted' | 'declined'

export interface SourcedText {
  value: string
  source: FieldSource
}
export interface FeaturedItem {
  name: string
  description: string
  source: FieldSource
}
export interface GeneratedOffer {
  offer_name: string
  offer_type: string
  offer_value: string
  offer_claim_amount: 'single' | 'multiple'
  offer_terms: string
  rationale: string
}

export interface AcquisitionResult {
  business: {
    id: string
    name: string
    category: string
    town: string | null
    city: string | null
    rating: number | null
    reviewCount: number | null
    websiteUrl: string | null
    claimed: boolean
  }
  signals: {
    usedWebsite: boolean
    websiteChars: number
    usedReviews: boolean
    reviewsUsed: number
    menuItems: string[]
    currency: string
  }
  insight: { summary: string; signature_items: string[]; strengths: string[] }
  listing: {
    business_description: SourcedText
    business_tagline: SourcedText
    featured_items: FeaturedItem[]
  }
  offers: GeneratedOffer[]
  meta: { model: string; costEstimateUsd: number }
}

const OFFER_TYPE_LABELS: Record<string, string> = {
  discount: 'Discount',
  two_for_one: '2 for 1',
  freebie: 'Freebie',
  buy_x_get_y: 'Buy X get Y',
  percentage_off: '% off',
  fixed_amount_off: 'Amount off',
  other: 'Offer',
}

function SourceBadge({ source }: { source: FieldSource }) {
  const map: Record<FieldSource, { label: string; cls: string }> = {
    website: { label: 'From website', cls: 'border-emerald-800 text-emerald-400' },
    google: { label: 'From Google', cls: 'border-blue-800 text-blue-400' },
    ai_inferred: { label: 'AI inferred', cls: 'border-amber-800 text-amber-400' },
  }
  const { label, cls } = map[source]
  return (
    <Badge variant="outline" className={cls}>
      {label}
    </Badge>
  )
}

function StatusControls({
  status,
  onAccept,
  onDecline,
  onEdit,
  editable,
}: {
  status: ReviewStatus
  onAccept: () => void
  onDecline: () => void
  onEdit?: () => void
  editable?: boolean
}) {
  return (
    <div className="flex items-center gap-1.5">
      {editable && onEdit && (
        <button
          onClick={onEdit}
          className="text-xs px-2 py-1 rounded border border-slate-700 text-slate-300 hover:bg-slate-800"
        >
          Edit
        </button>
      )}
      <button
        onClick={onAccept}
        className={`text-xs px-2 py-1 rounded border ${
          status === 'accepted'
            ? 'border-emerald-600 bg-emerald-950 text-emerald-300'
            : 'border-slate-700 text-slate-300 hover:bg-slate-800'
        }`}
      >
        Accept
      </button>
      <button
        onClick={onDecline}
        className={`text-xs px-2 py-1 rounded border ${
          status === 'declined'
            ? 'border-red-700 bg-red-950 text-red-300'
            : 'border-slate-700 text-slate-300 hover:bg-slate-800'
        }`}
      >
        Decline
      </button>
    </div>
  )
}

function statusRing(status: ReviewStatus): string {
  if (status === 'accepted') return 'border-emerald-800'
  if (status === 'declined') return 'border-red-900 opacity-60'
  return 'border-slate-800'
}

function SignalPill({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`px-2 py-1 rounded-full border ${
        on
          ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
          : 'border-slate-700 bg-slate-800/40 text-slate-500'
      }`}
    >
      {label}
    </span>
  )
}

/**
 * Presentational review of a single Acquisition draft (listing + offers) with
 * per-field Accept/Edit/Decline. Manages its own review + edit state; notifies
 * the parent via onDecisionsChange so it can be persisted.
 */
export function AcquisitionDraftReview({
  result,
  initialDecisions,
  onDecisionsChange,
  initialEdits,
  onEditsChange,
  footerNote,
  section = 'all',
}: {
  result: AcquisitionResult
  initialDecisions?: Record<string, ReviewStatus>
  onDecisionsChange?: (decisions: Record<string, ReviewStatus>) => void
  initialEdits?: Record<string, string>
  onEditsChange?: (edits: Record<string, string>) => void
  footerNote?: string
  section?: 'all' | 'listing' | 'offers'
}) {
  const showListing = section === 'all' || section === 'listing'
  const showOffers = section === 'all' || section === 'offers'
  const [statuses, setStatuses] = useState<Record<string, ReviewStatus>>(initialDecisions || {})
  const [editing, setEditing] = useState<Record<string, boolean>>({})
  const [edits, setEdits] = useState<Record<string, string>>({
    tagline: initialEdits?.tagline ?? result.listing.business_tagline.value,
    description: initialEdits?.description ?? result.listing.business_description.value,
  })

  // Reseed when a different draft is passed in.
  useEffect(() => {
    setStatuses(initialDecisions || {})
    setEditing({})
    setEdits({
      tagline: initialEdits?.tagline ?? result.listing.business_tagline.value,
      description: initialEdits?.description ?? result.listing.business_description.value,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result.business.id])

  const changeEdit = (key: string, value: string) => {
    setEdits((p) => {
      const next = { ...p, [key]: value }
      onEditsChange?.(next)
      return next
    })
  }

  const st = (key: string): ReviewStatus => statuses[key] || 'pending'
  const setSt = (key: string, s: ReviewStatus) => {
    setStatuses((prev) => {
      const next = { ...prev, [key]: s }
      onDecisionsChange?.(next)
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Grounding signals */}
      {showListing && (
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-base text-slate-200">Grounded in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs">
            <SignalPill
              on={result.signals.usedWebsite}
              label={result.signals.usedWebsite ? `Website (${result.signals.websiteChars} chars)` : 'No website'}
            />
            <SignalPill
              on={result.signals.usedReviews}
              label={
                result.signals.usedReviews
                  ? result.business.reviewCount
                    ? `${result.signals.reviewsUsed} of ${result.business.reviewCount.toLocaleString()} reviews analysed`
                    : `${result.signals.reviewsUsed} reviews analysed`
                  : 'No live reviews'
              }
            />
            <SignalPill
              on={result.signals.menuItems.length > 0}
              label={result.signals.menuItems.length > 0 ? `${result.signals.menuItems.length} menu items` : 'No menu'}
            />
            <SignalPill on={!!result.business.rating} label={result.business.rating ? `★ ${result.business.rating} (${result.business.reviewCount ?? 0})` : 'No rating'} />
            <SignalPill on={result.business.claimed} label={result.business.claimed ? 'Claimed' : 'Unclaimed'} />
          </div>
          {result.business.websiteUrl && (
            <a href={result.business.websiteUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline break-all">
              {result.business.websiteUrl}
            </a>
          )}
          {result.insight.summary && <p className="text-sm text-slate-300">{result.insight.summary}</p>}
        </CardContent>
      </Card>
      )}

      {/* Listing */}
      {showListing && (
      <div>
        <h3 className="text-lg font-semibold mb-3">Listing draft</h3>
        <div className="space-y-4">
          {/* Tagline */}
          <Card className={`bg-slate-900 ${statusRing(st('tagline'))}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm text-slate-400 font-medium">Tagline</CardTitle>
                  <SourceBadge source={result.listing.business_tagline.source} />
                </div>
                <StatusControls
                  status={st('tagline')}
                  editable
                  onEdit={() => setEditing((p) => ({ ...p, tagline: !p.tagline }))}
                  onAccept={() => setSt('tagline', 'accepted')}
                  onDecline={() => setSt('tagline', 'declined')}
                />
              </div>
            </CardHeader>
            <CardContent>
              {editing.tagline ? (
                <Input
                  value={edits.tagline ?? ''}
                  onChange={(e) => changeEdit('tagline', e.target.value)}
                  className="bg-slate-950 border-slate-700 text-slate-100"
                />
              ) : (
                <p className="text-slate-100">{edits.tagline ?? result.listing.business_tagline.value}</p>
              )}
            </CardContent>
          </Card>

          {/* Description */}
          <Card className={`bg-slate-900 ${statusRing(st('description'))}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm text-slate-400 font-medium">Description</CardTitle>
                  <SourceBadge source={result.listing.business_description.source} />
                </div>
                <StatusControls
                  status={st('description')}
                  editable
                  onEdit={() => setEditing((p) => ({ ...p, description: !p.description }))}
                  onAccept={() => setSt('description', 'accepted')}
                  onDecline={() => setSt('description', 'declined')}
                />
              </div>
            </CardHeader>
            <CardContent>
              {editing.description ? (
                <Textarea
                  value={edits.description ?? ''}
                  onChange={(e) => changeEdit('description', e.target.value)}
                  rows={5}
                  className="bg-slate-950 border-slate-700 text-slate-100"
                />
              ) : (
                <p className="text-sm text-slate-300 whitespace-pre-line">
                  {edits.description ?? result.listing.business_description.value}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                {(edits.description ?? result.listing.business_description.value).length}/500
              </p>
            </CardContent>
          </Card>

          {/* Featured items */}
          {result.listing.featured_items.length === 0 && (
            <Card className="bg-slate-900 border-slate-800 border-dashed">
              <CardContent className="py-3">
                <p className="text-sm text-slate-400">
                  <span className="text-slate-300 font-medium">No featured items.</span> We couldn&apos;t find a
                  readable menu or service/price list on their website, so nothing was invented. You can add real items
                  by hand at claim, or once the owner claims their listing.
                </p>
              </CardContent>
            </Card>
          )}
          {result.listing.featured_items.length > 0 && (
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-slate-400 font-medium">Featured items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.listing.featured_items.map((item, i) => {
                  const key = `feat-${i}`
                  return (
                    <div key={key} className={`flex items-start justify-between gap-3 rounded border px-3 py-2 ${statusRing(st(key))}`}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-100">{item.name}</span>
                          <SourceBadge source={item.source} />
                        </div>
                        {item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
                      </div>
                      <StatusControls
                        status={st(key)}
                        onAccept={() => setSt(key, 'accepted')}
                        onDecline={() => setSt(key, 'declined')}
                      />
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      )}

      {/* Offers */}
      {showOffers && (
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Suggested offers</h3>
          <span className="text-xs text-slate-500">
            {result.meta.model} · ~${result.meta.costEstimateUsd.toFixed(3)}
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {result.offers.map((offer, i) => {
            const key = `offer-${i}`
            return (
              <Card key={key} className={`bg-slate-900 flex flex-col ${statusRing(st(key))}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="border-emerald-800 text-emerald-400">
                      {OFFER_TYPE_LABELS[offer.offer_type] || offer.offer_type}
                    </Badge>
                    <Badge variant="secondary">
                      {offer.offer_claim_amount === 'single' ? 'Once per customer' : 'Repeatable'}
                    </Badge>
                  </div>
                  <CardTitle className="text-base text-slate-100 mt-2">{offer.offer_name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 flex-1 flex flex-col">
                  <div className="text-emerald-400 font-semibold">{offer.offer_value}</div>
                  <div className="text-xs text-slate-400">
                    <span className="text-slate-500">Terms: </span>
                    {offer.offer_terms}
                  </div>
                  <div className="text-xs text-slate-400 mt-auto pt-3 border-t border-slate-800">
                    <span className="text-slate-500">Why it works: </span>
                    {offer.rationale}
                  </div>
                  <StatusControls
                    status={st(key)}
                    onAccept={() => setSt(key, 'accepted')}
                    onDecline={() => setSt(key, 'declined')}
                  />
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
      )}

      {section === 'all' && footerNote && (
        <p className="text-xs text-slate-500 border-t border-slate-800 pt-4">{footerNote}</p>
      )}
    </div>
  )
}
