'use client'

/**
 * The Acquisition Engine as a plain-language journey. Each step maps to one
 * real job so the admin always knows what to do next:
 *   1. Enrich  – generate AI content for imported businesses
 *   2. Confirm – review the drafts and publish them live
 *   3. Invite  – send a claim email to businesses whose listing is live
 *   4. Sent    – who we emailed, and whether they clicked Claim / Present Mode
 */
export type JourneyStep = 'enrich' | 'confirm' | 'invite' | 'sent'

const STEPS: Array<{ key: JourneyStep; n: number; label: string; sub: string }> = [
  { key: 'enrich', n: 1, label: 'Enrich', sub: 'Generate AI content' },
  { key: 'confirm', n: 2, label: 'Confirm & publish', sub: 'Review drafts, go live' },
  { key: 'invite', n: 3, label: 'Invite', sub: 'Send claim emails' },
  { key: 'sent', n: 4, label: 'Sent', sub: 'Who we emailed' },
]

export function JourneySteps({
  step,
  counts,
  onSelect,
}: {
  step: JourneyStep
  counts: { enrich: number; confirm: number; invite: number; sent: number }
  onSelect: (s: JourneyStep) => void
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {STEPS.map((s) => {
        const active = step === s.key
        const count = counts[s.key]
        return (
          <button
            key={s.key}
            onClick={() => onSelect(s.key)}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${
              active
                ? 'border-[#00d083]/60 bg-[#00d083]/[0.08]'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
            }`}
          >
            <span
              className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold border ${
                active ? 'border-[#00d083] bg-[#00d083] text-slate-900' : 'border-slate-700 text-slate-300'
              }`}
            >
              {s.n}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${active ? 'text-slate-100' : 'text-slate-200'}`}>{s.label}</span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full tabular-nums ${
                    count > 0 ? 'bg-slate-800 text-slate-200' : 'bg-slate-900 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </div>
              <div className="text-xs text-slate-500 truncate">{s.sub}</div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
