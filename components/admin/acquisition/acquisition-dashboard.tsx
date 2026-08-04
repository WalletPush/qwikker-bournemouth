'use client'

/**
 * Two clearly separated pieces so the top of the page doesn't feel cramped:
 *  - CampaignOverview: read-only KPIs for the whole campaign (the "campaign" panel).
 *  - StageTabs: a compact pill filter used to focus the grid on one pipeline stage.
 */
export interface DashboardCounts {
  total: number
  enriched: number
  imported: number
  enriching: number
  needsReview: number
  readyToSend: number
  sent: number
  claimed: number
  emailsSent: number
  claimRate: number
}

export function CampaignOverview({
  counts,
  cityDisplayName,
  onEmailsSentClick,
}: {
  counts: DashboardCounts
  cityDisplayName: string
  /** Jump to the Sent journey step when Emails Sent is clicked. */
  onEmailsSentClick?: () => void
}) {
  const kpis: Array<{
    label: string
    value: string | number
    accent: string
    onClick?: () => void
  }> = [
    { label: 'Businesses', value: counts.total, accent: 'text-slate-100' },
    { label: 'Enriched', value: counts.enriched, accent: 'text-emerald-300' },
    {
      label: 'Emails Sent',
      value: counts.emailsSent,
      accent: 'text-sky-300',
      onClick: onEmailsSentClick,
    },
    { label: 'Claimed', value: counts.claimed, accent: 'text-[#00d083]' },
    { label: 'Claim Rate', value: `${counts.claimRate}%`, accent: 'text-[#00d083]' },
  ]

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-slate-200">Campaign overview</h2>
        <span className="text-xs text-slate-500">{cityDisplayName}</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpis.map((k) =>
          k.onClick ? (
            <button
              key={k.label}
              type="button"
              onClick={k.onClick}
              className="text-left rounded-lg -m-1 p-1 hover:bg-slate-800/60 transition-colors"
              title="View Sent list"
            >
              <div className={`text-2xl font-bold tabular-nums ${k.accent}`}>{k.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {k.label}
                <span className="text-slate-600"> →</span>
              </div>
            </button>
          ) : (
            <div key={k.label}>
              <div className={`text-2xl font-bold tabular-nums ${k.accent}`}>{k.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{k.label}</div>
            </div>
          )
        )}
      </div>
    </div>
  )
}

/** key maps to a board-column key (or 'all'); countKey maps into DashboardCounts. */
const STAGES: Array<{ key: string; label: string; countKey: keyof DashboardCounts; active: string; dot: string }> = [
  { key: 'all', label: 'All', countKey: 'total', active: 'border-slate-500 bg-slate-800 text-slate-100', dot: 'bg-slate-400' },
  { key: 'imported', label: 'Imported', countKey: 'imported', active: 'border-slate-500 bg-slate-800 text-slate-100', dot: 'bg-slate-400' },
  { key: 'enriching', label: 'Enriching', countKey: 'enriching', active: 'border-amber-500 bg-amber-950/60 text-amber-200', dot: 'bg-amber-400' },
  { key: 'needs_review', label: 'Needs Review', countKey: 'needsReview', active: 'border-orange-500 bg-orange-950/60 text-orange-200', dot: 'bg-orange-400' },
  { key: 'ready_to_send', label: 'Ready to Send', countKey: 'readyToSend', active: 'border-emerald-500 bg-emerald-950/60 text-emerald-200', dot: 'bg-emerald-400' },
  { key: 'sent', label: 'Sent', countKey: 'sent', active: 'border-sky-500 bg-sky-950/60 text-sky-200', dot: 'bg-sky-400' },
  { key: 'claimed', label: 'Claimed', countKey: 'claimed', active: 'border-[#00d083]/70 bg-[#00d083]/[0.12] text-[#00d083]', dot: 'bg-[#00d083]' },
]

export function StageTabs({
  counts,
  activeStage,
  onSelectStage,
}: {
  counts: DashboardCounts
  activeStage: string
  onSelectStage: (key: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {STAGES.map((s) => {
        const isActive = activeStage === s.key
        return (
          <button
            key={s.key}
            onClick={() => onSelectStage(s.key)}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors ${
              isActive ? s.active : 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
            {s.label}
            <span className="text-xs tabular-nums opacity-70">{counts[s.countKey]}</span>
          </button>
        )
      })}
    </div>
  )
}
