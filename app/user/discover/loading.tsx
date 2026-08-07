/**
 * Instant UI while Discover's heavy server fetch runs.
 * Risk-free: Next.js Suspense fallback only — no data/logic changes.
 * Full-page shell so nav doesn't flash to a blank/white frame.
 */
export default function DiscoverLoading() {
  return (
    <div
      className="min-h-[100dvh] bg-slate-900 px-4 py-6 sm:px-6 animate-pulse"
      aria-busy="true"
      aria-label="Loading Discover"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <div className="h-8 w-48 rounded-lg bg-slate-700/80" />
          <div className="h-4 w-72 max-w-full rounded bg-slate-800" />
        </div>

        <div className="h-11 w-full rounded-xl bg-slate-800/90" />

        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-9 w-24 shrink-0 rounded-full bg-slate-800" />
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="overflow-hidden rounded-xl border border-slate-700/60 bg-slate-800/40"
            >
              <div className="aspect-[16/10] bg-slate-700/50" />
              <div className="space-y-3 p-4">
                <div className="h-5 w-3/4 rounded bg-slate-700/80" />
                <div className="h-3 w-1/2 rounded bg-slate-800" />
                <div className="h-3 w-full rounded bg-slate-800" />
                <div className="h-3 w-2/3 rounded bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
