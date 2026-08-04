'use client'

import { Button } from '@/components/ui/button'
import type { PipelineRow } from './types'
import type { JourneyStep } from './journey-steps'
import { scoreContactability, type ContactMethod, type ContactType } from '@/lib/listing-engine/contact-methods'

/** One compact channel chip: emerald when present, amber "?" when unverified, grey when absent. */
function ChannelChip({ on, maybe, label }: { on: boolean; maybe?: boolean; label: string }) {
  if (maybe && !on) return <span className="text-amber-400/80" title="Number found — WhatsApp not confirmed">{label}?</span>
  return <span className={on ? 'text-emerald-400' : 'text-slate-600'}>{label}</span>
}

/** Contactability pill — a grounded "how reachable" score, not a response-rate promise. */
function ReachPill({ score, label }: { score: number; label: 'High' | 'Medium' | 'Low' }) {
  const cls =
    label === 'High'
      ? 'text-emerald-300 border-emerald-700 bg-emerald-950/40'
      : label === 'Medium'
        ? 'text-amber-300 border-amber-700 bg-amber-950/40'
        : 'text-slate-400 border-slate-700'
  return (
    <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded border ${cls}`} title={`Contactability: ${score}%`}>
      {score}% reach
    </span>
  )
}

/**
 * Plain-language confidence so non-technical admins aren't reading raw scores.
 * The exact number is still available on hover (title attribute).
 */
function confidencePlain(score: number | null): { label: string; cls: string } {
  if (score == null) return { label: '—', cls: 'text-slate-500 border-slate-700' }
  if (score >= 85) return { label: 'Looks great', cls: 'text-emerald-300 border-emerald-700 bg-emerald-950/40' }
  if (score >= 60) return { label: 'Worth a check', cls: 'text-amber-300 border-amber-700 bg-amber-950/40' }
  return { label: 'Needs a look', cls: 'text-red-300 border-red-800 bg-red-950/40' }
}

export function BusinessCard({
  row,
  mode,
  selected,
  onToggleSelect,
  onOpen,
  isEnriching,
  onEnrichOne,
  onConfirm,
  onReject,
  onInvite,
  confirming,
}: {
  row: PipelineRow
  mode: JourneyStep
  selected: boolean
  onToggleSelect: (id: string) => void
  onOpen: (row: PipelineRow) => void
  isEnriching: boolean
  onEnrichOne?: (id: string) => void
  onConfirm?: (id: string) => void
  onReject?: (id: string) => void
  onInvite?: (row: PipelineRow) => void
  confirming?: boolean
}) {
  const conf = confidencePlain(row.confidence)
  const enrichedReady = row.enrichment?.status === 'ready'

  // Outreach channels. Prefer the unified contact_methods (populated on enrich);
  // before enrich, fall back to the row's email/whatsapp/phone so cards still read.
  const cm = row.contactMethods || []
  const hasType = (t: ContactType) => cm.some((m) => m.type === t)
  const verifiedType = (t: ContactType) => cm.some((m) => m.type === t && m.verified)
  // WhatsApp is only ever an explicit link (verified) or a site mobile (maybe) —
  // a landline/Google phone never counts as WhatsApp.
  const chan = {
    email: hasType('email') || !!row.email,
    whatsapp: verifiedType('whatsapp') || (!!row.whatsapp && !!row.whatsappVerified),
    whatsappMaybe:
      (hasType('whatsapp') && !verifiedType('whatsapp')) || (!!row.whatsapp && !row.whatsappVerified),
    instagram: hasType('instagram'),
    facebook: hasType('facebook'),
  }
  const scoringMethods: ContactMethod[] = cm.length
    ? cm
    : ([
        ...(row.email ? [{ type: 'email', value: '', verified: true }] : []),
        ...(row.whatsapp ? [{ type: 'whatsapp', value: '', verified: !!row.whatsappVerified }] : []),
        ...(row.phone ? [{ type: 'phone', value: '', verified: true }] : []),
      ] as ContactMethod[])
  const reach = scoreContactability(scoringMethods)

  return (
    <div
      className={`rounded-xl border p-3 transition-all ${
        selected ? 'border-[#00d083]/50 bg-[#00d083]/[0.04]' : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'
      }`}
    >
      <div className="flex items-start gap-2">
        {mode === 'enrich' && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(row.id)}
            aria-label={`Select ${row.name}`}
            className="mt-1 accent-[#00d083]"
          />
        )}
        <button onClick={() => onOpen(row)} className="text-left min-w-0 flex-1">
          <div className="font-semibold text-slate-100 text-sm truncate">{row.name}</div>
          <div className="text-xs text-slate-500 truncate">
            {[row.category, row.town].filter(Boolean).join(' · ') || '—'}
          </div>
        </button>
        {mode === 'confirm' && enrichedReady && (
          <span
            title={row.confidence != null ? `Confidence: ${row.confidence}%` : undefined}
            className={`shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded border ${conf.cls}`}
          >
            {conf.label}
          </span>
        )}
        {mode === 'invite' && row.enrichment?.published && <span className="shrink-0 text-xs text-sky-400">Live</span>}
      </div>

      {/* Channels: which ways we can reach this business + a contactability score */}
      <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px]">
        {row.rating != null && <span className="text-amber-400">★ {row.rating}</span>}
        <ChannelChip on={row.hasWebsite} label="Web" />
        <ChannelChip on={chan.email} label="Email" />
        <ChannelChip on={chan.whatsapp} maybe={chan.whatsappMaybe} label="WhatsApp" />
        <ChannelChip on={chan.instagram} label="IG" />
        <ChannelChip on={chan.facebook} label="FB" />
        <ReachPill score={reach.score} label={reach.label} />
      </div>

      {(enrichedReady && mode !== 'enrich' && mode !== 'sent') || row.sentAt ? (
        <div className="flex items-center gap-2 mt-1.5 flex-wrap text-[11px]">
          {enrichedReady && mode !== 'enrich' && mode !== 'sent' && (
            <span className="text-slate-400">📋 {row.enrichment?.offersCount ?? 0} offers</span>
          )}
          {row.sentAt && mode !== 'sent' && <span className="text-sky-400">Invited ✓</span>}
        </div>
      ) : null}

      {mode === 'sent' && row.sentAt && (
        <div className="mt-2 space-y-1 text-[11px]">
          <div className="text-slate-300 truncate" title={row.sentToEmail || row.email || undefined}>
            To: {row.sentToEmail || row.email || '—'}
          </div>
          <div className="text-slate-500">
            Sent{' '}
            {new Date(row.sentAt).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={
                (row.claimLinkClickCount || 0) > 0 ? 'text-emerald-400' : 'text-slate-500'
              }
            >
              Claim {(row.claimLinkClickCount || 0) > 0 ? `(${row.claimLinkClickCount})` : '—'}
            </span>
            <span className="text-slate-700">·</span>
            <span
              className={(row.demoLinkClickCount || 0) > 0 ? 'text-sky-400' : 'text-slate-500'}
            >
              Demo {(row.demoLinkClickCount || 0) > 0 ? `(${row.demoLinkClickCount})` : '—'}
            </span>
            {row.claimed && <span className="text-[#00d083]">Claimed</span>}
          </div>
        </div>
      )}

      {isEnriching ? (
        <div className="mt-2 text-xs text-amber-400 animate-pulse">Generating content…</div>
      ) : (
        <>
          {mode === 'confirm' && enrichedReady && row.flags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {row.flags.slice(0, 3).map((f) => (
                <span
                  key={f}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700"
                >
                  ⚠ {f}
                </span>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center gap-2">
            {/* Enrich step */}
            {mode === 'enrich' && (
              <>
                <Button variant="secondary" onClick={() => onOpen(row)} className="h-7 px-2 text-xs flex-1">
                  Open
                </Button>
                {onEnrichOne && (
                  <button
                    onClick={() => onEnrichOne(row.id)}
                    className="h-7 px-2 text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Generate
                  </button>
                )}
              </>
            )}

            {/* Confirm step */}
            {mode === 'confirm' && (
              <>
                <Button variant="secondary" onClick={() => onOpen(row)} className="h-7 px-2 text-xs flex-1">
                  Review
                </Button>
                {onConfirm && !row.enrichment?.published && (
                  <button
                    onClick={() => onConfirm(row.id)}
                    disabled={confirming}
                    title="Publishes the listing live AND makes the business + its featured menu items discoverable by the Qwikker AI."
                    className="h-7 px-2 text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60"
                  >
                    {confirming ? '…' : 'Confirm'}
                  </button>
                )}
                {onReject && (
                  <button
                    onClick={() => onReject(row.id)}
                    className="h-7 px-2 text-xs rounded border border-slate-700 text-slate-400 hover:bg-slate-800"
                    title="Hide this one — not a fit"
                  >
                    Not for us
                  </button>
                )}
              </>
            )}

            {/* Invite step */}
            {mode === 'invite' && (
              <>
                <Button variant="secondary" onClick={() => onOpen(row)} className="h-7 px-2 text-xs flex-1">
                  Open
                </Button>
                {onInvite && !row.sentAt && (
                  <button
                    onClick={() => onInvite(row)}
                    className="h-7 px-2 text-xs rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Send invite
                  </button>
                )}
              </>
            )}

            {/* Sent step — open for follow-up / resend from drawer */}
            {mode === 'sent' && (
              <Button variant="secondary" onClick={() => onOpen(row)} className="h-7 px-2 text-xs flex-1">
                Open
              </Button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
