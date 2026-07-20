'use client'

import { Button } from '@/components/ui/button'
import type { PipelineRow } from './types'
import type { JourneyStep } from './journey-steps'

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

      <div className="flex items-center gap-2 mt-2 flex-wrap text-[11px]">
        {row.rating != null && <span className="text-amber-400">★ {row.rating}</span>}
        <span className={row.hasWebsite ? 'text-emerald-400' : 'text-slate-600'}>
          {row.hasWebsite ? '🌐 Website' : 'No website'}
        </span>
        <span className={row.email ? 'text-emerald-400' : 'text-slate-600'}>
          {row.email ? '✉ Email' : 'No email'}
        </span>
        {enrichedReady && mode !== 'enrich' && (
          <span className="text-slate-400">📋 {row.enrichment?.offersCount ?? 0} offers</span>
        )}
        {row.sentAt && <span className="text-sky-400">Invited ✓</span>}
      </div>

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
          </div>
        </>
      )}
    </div>
  )
}
