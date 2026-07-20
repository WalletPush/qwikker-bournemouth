'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, Tag, Lock, Check } from 'lucide-react'

export interface DraftOffer {
  offer_name: string
  offer_type: string
  offer_value: string
  offer_claim_amount: string
  offer_terms: string
  rationale?: string
}

const OFFER_TYPE_LABELS: Record<string, string> = {
  discount: 'Discount',
  two_for_one: '2-for-1',
  freebie: 'Freebie',
  buy_x_get_y: 'Buy X get Y',
  percentage_off: '% off',
  fixed_amount_off: 'Amount off',
  other: 'Offer',
}

interface OfferState {
  enabled: boolean
  offer_name: string
  offer_value: string
  offer_terms: string
}

/**
 * Claim-wizard step: the owner reviews the AI-drafted offers Qwikker prepared for
 * their business and chooses which to publish (accept), tweaks the wording, or
 * skips them. Accepted offers go live (as approved) when the claim is approved.
 *
 * Plan gating: the number of offers the owner can publish is capped by their
 * chosen plan (`maxOffers`). Free listings allow 1 — the extra drafts are shown
 * "locked" with an upsell to a free trial / Spotlight.
 */
export function ReviewAiOffers({
  businessName,
  offers,
  maxOffers,
  planLabel,
  trialAllowsMore,
  trialDays,
  trialTierLabel,
  onContinue,
  onBack,
}: {
  businessName: string
  offers: DraftOffer[]
  maxOffers: number
  planLabel: string
  trialAllowsMore: boolean
  trialDays: number
  trialTierLabel: string
  onContinue: (accepted: DraftOffer[]) => void
  onBack: () => void
}) {
  const capped = maxOffers < offers.length

  const [states, setStates] = useState<OfferState[]>(
    offers.map((o, i) => ({
      // Default-select up to the plan's cap (first N) so there's always a valid pick.
      enabled: i < maxOffers,
      offer_name: o.offer_name,
      offer_value: o.offer_value,
      offer_terms: o.offer_terms,
    }))
  )

  const enabledCount = states.filter((s) => s.enabled).length
  const atCap = enabledCount >= maxOffers

  const update = (i: number, patch: Partial<OfferState>) =>
    setStates((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)))

  const choose = (i: number) =>
    setStates((prev) => {
      if (maxOffers === 1) {
        // Radio behaviour: selecting one deselects the rest.
        return prev.map((s, idx) => ({ ...s, enabled: idx === i }))
      }
      const count = prev.filter((s) => s.enabled).length
      if (count >= maxOffers) return prev
      return prev.map((s, idx) => (idx === i ? { ...s, enabled: true } : s))
    })

  const remove = (i: number) => update(i, { enabled: false })

  const handleContinue = () => {
    const accepted: DraftOffer[] = states
      .map((s, i) => ({ s, base: offers[i] }))
      .filter((x) => x.s.enabled && x.s.offer_name.trim() && x.s.offer_value.trim())
      .slice(0, maxOffers)
      .map((x) => ({
        offer_name: x.s.offer_name.trim().slice(0, 120),
        offer_type: x.base.offer_type || 'other',
        offer_value: x.s.offer_value.trim().slice(0, 120),
        offer_claim_amount: x.base.offer_claim_amount === 'single' ? 'single' : 'multiple',
        offer_terms: x.s.offer_terms.trim().slice(0, 500),
      }))
    onContinue(accepted)
  }

  const upgradeLine = trialAllowsMore
    ? `Want all of them live? Start your ${trialDays}-day free ${trialTierLabel} trial, or upgrade to Spotlight for unlimited offers.`
    : `Want more than one? Upgrade to Spotlight for unlimited offers.`

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-2 text-neutral-400 hover:text-white hover:bg-white/[0.05]"
      >
        ← Back
      </Button>

      <div className="relative">
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-b from-[#00d083]/20 via-white/[0.06] to-transparent" />
        <Card className="relative bg-[#111315]/80 backdrop-blur-xl border-0 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
          <CardHeader className="px-8 pt-8">
            <CardTitle className="flex items-center gap-3 text-xl text-white">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#00d083]/10 border border-[#00d083]/20">
                <Sparkles className="w-5 h-5 text-[#00d083]" />
              </div>
              We&apos;ve drafted some offers for you
            </CardTitle>
            <CardDescription className="text-neutral-500 ml-[52px]">
              Based on {businessName}&apos;s menu &amp; reviews. Keep the ones you like, tweak the wording, or
              skip any — you can change these anytime later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-8 pb-8">
            {capped && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4">
                <p className="text-sm text-amber-200 font-medium">
                  Your {planLabel} includes {maxOffers} active offer{maxOffers === 1 ? '' : 's'}.
                </p>
                <p className="text-sm text-amber-200/80 mt-1">
                  Pick the {maxOffers === 1 ? 'one' : maxOffers} you want to go live now. {upgradeLine}
                </p>
              </div>
            )}

            {states.map((s, i) => {
              const base = offers[i]
              const selected = s.enabled
              const lockedByCap = !selected && atCap && maxOffers > 1

              // Locked / not-selected card (capped plans): dimmed with an upsell + a way to pick it.
              if (!selected && capped) {
                return (
                  <div
                    key={i}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 opacity-70"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Lock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                          <span className="text-sm font-medium text-neutral-300 truncate">{base.offer_name}</span>
                        </div>
                        <p className="text-sm text-[#00d083]/70 font-semibold">{base.offer_value}</p>
                        <p className="text-xs text-neutral-500 mt-1">{upgradeLine}</p>
                      </div>
                      <button
                        onClick={() => choose(i)}
                        disabled={lockedByCap}
                        className={`shrink-0 h-9 px-3 rounded-lg text-sm font-medium transition-all ${
                          lockedByCap
                            ? 'bg-white/[0.04] text-neutral-600 cursor-not-allowed'
                            : 'border border-[#00d083]/30 text-[#00d083] hover:bg-[#00d083]/10'
                        }`}
                      >
                        {maxOffers === 1 ? 'Choose this' : 'Add'}
                      </button>
                    </div>
                  </div>
                )
              }

              // Editable / selected card
              return (
                <div
                  key={i}
                  className={`rounded-xl border p-4 transition-all ${
                    selected ? 'border-[#00d083]/30 bg-[#00d083]/[0.04]' : 'border-white/[0.06] bg-white/[0.02] opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-white/[0.06] text-neutral-300 border border-white/[0.08]">
                        <Tag className="w-3 h-3" />
                        {OFFER_TYPE_LABELS[base.offer_type] || 'Offer'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-xs text-neutral-400 border border-white/[0.08]">
                        {base.offer_claim_amount === 'single' ? 'Once per customer' : 'Repeatable'}
                      </span>
                    </div>
                    {selected ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="inline-flex items-center gap-1 text-xs text-[#00d083] font-medium">
                          <Check className="w-3.5 h-3.5" /> Publishing
                        </span>
                        <button
                          onClick={() => remove(i)}
                          className="text-xs text-neutral-500 hover:text-neutral-300 underline"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => choose(i)}
                        className="shrink-0 text-xs text-[#00d083] hover:underline"
                      >
                        Add back
                      </button>
                    )}
                  </div>

                  {selected && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-neutral-500 mb-1">Offer name</label>
                        <input
                          value={s.offer_name}
                          onChange={(e) => update(i, { offer_name: e.target.value })}
                          maxLength={120}
                          className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:border-[#00d083]/40 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-500 mb-1">Offer</label>
                        <input
                          value={s.offer_value}
                          onChange={(e) => update(i, { offer_value: e.target.value })}
                          maxLength={120}
                          className="w-full h-10 px-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[#00d083] font-semibold text-sm focus:border-[#00d083]/40 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-neutral-500 mb-1">Terms</label>
                        <textarea
                          value={s.offer_terms}
                          onChange={(e) => update(i, { offer_terms: e.target.value })}
                          rows={2}
                          maxLength={500}
                          className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-neutral-300 text-sm focus:border-[#00d083]/40 focus:outline-none resize-none"
                        />
                      </div>
                      {base.rationale && (
                        <p className="text-xs text-neutral-500">
                          <span className="text-neutral-400">Why it works:</span> {base.rationale}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            <div className="pt-2">
              <button
                onClick={handleContinue}
                className="w-full h-12 bg-[#00d083] hover:bg-[#00b86f] text-[#0a0a0a] rounded-xl font-semibold transition-all hover:shadow-[0_0_20px_rgba(0,208,131,0.3)] active:scale-[0.98]"
              >
                {enabledCount > 0
                  ? `Publish ${enabledCount} offer${enabledCount > 1 ? 's' : ''} & continue`
                  : 'Continue without offers'}
              </button>
            </div>
            <p className="text-xs text-neutral-600 text-center">
              Offers go live once your claim is approved. You can edit or add more anytime from your dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
