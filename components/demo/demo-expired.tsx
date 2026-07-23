/**
 * Friendly "this demo link has expired" state. Rendered when a Present Mode token
 * verifies structurally but is past its expiry — so we can show a branded message
 * (and a nudge to get in touch) rather than a bare 404.
 */
export function DemoExpired() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800">
          <svg className="h-7 w-7 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-white">This preview has expired</h1>
        <p className="mt-2 text-sm text-slate-400">
          Demo links are time-limited for security. Ask your Qwikker contact for a fresh link, or claim
          your listing directly to take control.
        </p>
        <p className="mt-8 text-xs text-slate-600">Powered by Qwikker</p>
      </div>
    </div>
  )
}
