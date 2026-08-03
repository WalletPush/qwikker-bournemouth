'use client'

export function PartnersMobileStickyCta({ onReserve }: { onReserve: () => void }) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:hidden border-t border-[var(--p-border)] bg-[#050505]/95 backdrop-blur-xl">
      <button
        type="button"
        onClick={onReserve}
        className="w-full rounded-lg bg-[var(--p-accent)] py-3 text-sm font-semibold text-[#050505] active:scale-[0.98] transition-transform"
      >
        Reserve Your Territory
      </button>
    </div>
  )
}
