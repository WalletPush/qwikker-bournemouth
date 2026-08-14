'use client'

import { BOTTOM_TABS, USER_BOTTOM_NAV_HEIGHT_CLASS } from '@/components/user/user-bottom-nav'

export type BottomTabId = (typeof BOTTOM_TABS)[number]['id']

interface UserPageSkeletonProps {
  /** Which bottom tab should appear selected while this route loads */
  activeTabId: BottomTabId
  /** Accessible label for the loading region */
  label: string
  variant?: 'feed' | 'list' | 'chat' | 'hub'
}

/**
 * Full-viewport loading shell for /user/* bottom-nav routes.
 * Keeps a fake bottom bar visible so the selected tab doesn't flash away mid-nav.
 */
export function UserPageSkeleton({
  activeTabId,
  label,
  variant = 'feed',
}: UserPageSkeletonProps) {
  return (
    <div
      className={`min-h-[100dvh] bg-black ${USER_BOTTOM_NAV_HEIGHT_CLASS}`}
      aria-busy="true"
      aria-label={label}
    >
      <div className="mx-auto max-w-lg px-4 pt-6 space-y-5 animate-pulse">
        <div className="space-y-2">
          <div className="h-7 w-40 rounded-lg bg-zinc-800" />
          <div className="h-3.5 w-56 max-w-full rounded bg-zinc-800/80" />
        </div>

        {variant === 'chat' ? (
          <div className="space-y-4 pt-4">
            <div className="ml-auto h-12 w-3/4 rounded-2xl bg-zinc-800" />
            <div className="h-20 w-4/5 rounded-2xl bg-zinc-900 border border-zinc-800" />
            <div className="ml-auto h-10 w-2/3 rounded-2xl bg-zinc-800" />
            <div className="h-16 w-3/4 rounded-2xl bg-zinc-900 border border-zinc-800" />
            <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] inset-x-0 px-4 lg:hidden">
              <div className="mx-auto max-w-lg h-12 rounded-full bg-zinc-900 border border-zinc-800" />
            </div>
          </div>
        ) : variant === 'hub' ? (
          <div className="grid grid-cols-2 gap-3 pt-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-xl bg-zinc-900 border border-zinc-800"
              />
            ))}
          </div>
        ) : variant === 'list' ? (
          <div className="space-y-3 pt-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex gap-3 rounded-xl border border-zinc-800 bg-zinc-900 p-3"
              >
                <div className="h-16 w-16 shrink-0 rounded-lg bg-zinc-800" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 w-3/4 rounded bg-zinc-800" />
                  <div className="h-3 w-1/2 rounded bg-zinc-800/80" />
                  <div className="h-3 w-1/3 rounded bg-zinc-800/70" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="flex gap-2 overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 w-20 shrink-0 rounded-full bg-zinc-800 border border-zinc-700/40"
                />
              ))}
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900"
                >
                  <div className="aspect-[16/9] bg-zinc-800" />
                  <div className="space-y-2 p-3">
                    <div className="h-4 w-2/3 rounded bg-zinc-800" />
                    <div className="h-3 w-1/2 rounded bg-zinc-800/80" />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Static bottom bar chrome — mirrors real nav so selection feels continuous */}
      <div
        className="lg:hidden fixed bottom-0 inset-x-0 z-[90] border-t border-zinc-700/80 bg-black"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-hidden
      >
        <div className="flex items-stretch justify-between px-1 pt-2 pb-1.5 max-w-lg mx-auto">
          {BOTTOM_TABS.map((tab) => {
            const isActive = tab.id === activeTabId
            return (
              <div
                key={tab.id}
                className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-1.5 min-h-[52px] ${
                  isActive ? 'text-[#00d083]' : 'text-zinc-500'
                }`}
              >
                <span className="relative">
                  {tab.icon}
                  {isActive && (
                    <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-[#00d083]" />
                  )}
                </span>
                <span className="text-[11px] leading-none font-semibold">{tab.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
