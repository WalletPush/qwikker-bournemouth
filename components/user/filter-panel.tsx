'use client'

import type { ReactNode } from 'react'

interface FilterPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Number of non-default filters currently applied */
  activeCount?: number
  /** Optional short summary of active filters (shown on the button) */
  summary?: string
  /** Clear all filters */
  onClear?: () => void
  children: ReactNode
  className?: string
}

/**
 * Collapses chip rows behind a single Filter control.
 * Avoids sticky multi-row chip bars that glitch on mobile scroll.
 */
export function FilterPanel({
  open,
  onOpenChange,
  activeCount = 0,
  summary,
  onClear,
  children,
  className = '',
}: FilterPanelProps) {
  const hasActive = activeCount > 0

  return (
    <div className={className}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onOpenChange(!open)}
          aria-expanded={open}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors touch-manipulation ${
            open || hasActive
              ? 'bg-[#00d083] text-black border-[#00d083]'
              : 'bg-zinc-900 text-zinc-100 border-zinc-600'
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M6 12h12M10 20h4" />
          </svg>
          Filter
          {hasActive && (
            <span className="tabular-nums opacity-90">· {activeCount}</span>
          )}
          <svg
            className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {!open && summary && hasActive && (
          <p className="text-xs text-zinc-400 truncate min-w-0 flex-1">{summary}</p>
        )}

        {hasActive && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto shrink-0 text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {open && (
        <div className="mt-3 rounded-2xl border border-zinc-700/80 bg-zinc-950 p-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  )
}

interface FilterChipGroupProps {
  label?: string
  children: ReactNode
}

export function FilterChipGroup({ label, children }: FilterChipGroupProps) {
  return (
    <div className="space-y-2">
      {label && (
        <p className="text-[10px] uppercase tracking-[0.14em] font-semibold text-zinc-500 px-0.5">
          {label}
        </p>
      )}
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
