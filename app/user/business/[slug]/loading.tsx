/**
 * Instant UI while a business profile server-fetches.
 * Risk-free: Next.js Suspense fallback only — no data/logic changes.
 */
export default function BusinessProfileLoading() {
  return (
    <div
      className="min-h-[100dvh] bg-black px-4 py-6 sm:px-6 animate-pulse"
      aria-busy="true"
      aria-label="Loading business"
    >
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Back button */}
        <div className="h-10 w-40 rounded-lg border border-zinc-700/60 bg-zinc-900" />

        {/* Hero image */}
        <div className="overflow-hidden rounded-xl border border-zinc-700/60 bg-zinc-900">
          <div className="h-48 md:h-72 bg-zinc-800" />
          <div className="space-y-3 p-4 md:p-6">
            <div className="h-7 w-2/3 max-w-md rounded bg-zinc-800" />
            <div className="h-4 w-1/3 rounded bg-zinc-800/80" />
            <div className="flex gap-2">
              <div className="h-6 w-20 rounded-full bg-zinc-800" />
              <div className="h-6 w-16 rounded-full bg-zinc-800" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-hidden border-b border-zinc-800 pb-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-24 shrink-0 rounded-lg bg-zinc-800" />
          ))}
        </div>

        {/* Body blocks */}
        <div className="space-y-4">
          <div className="h-4 w-full rounded bg-zinc-800" />
          <div className="h-4 w-11/12 rounded bg-zinc-800" />
          <div className="h-4 w-4/5 rounded bg-zinc-800" />
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="h-24 rounded-xl bg-zinc-900 border border-zinc-800" />
            <div className="h-24 rounded-xl bg-zinc-900 border border-zinc-800" />
          </div>
        </div>
      </div>
    </div>
  )
}
