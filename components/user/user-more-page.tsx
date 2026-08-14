'use client'

import { PendingLink } from '@/components/ui/nav-pending'
import { withWalletPassId } from '@/lib/utils/with-wallet-pass'

interface MoreHubItem {
  id: string
  title: string
  description: string
  href: string
  icon: React.ReactNode
  badge?: number
}

interface UserMorePageProps {
  walletPassId?: string | null
  cityDisplayName: string
  userName?: string
  notifBadge?: number
}

function getNavUrl(href: string, walletPassId?: string | null) {
  return withWalletPassId(href, walletPassId)
}

export function UserMorePage({
  walletPassId,
  cityDisplayName,
  userName,
  notifBadge = 0,
}: UserMorePageProps) {
  const items: MoreHubItem[] = [
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Updates and alerts',
      href: '/user/notifications',
      badge: notifBadge,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      ),
    },
    {
      id: 'discover',
      title: 'Discover',
      description: 'Browse places in town',
      href: '/user/discover',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
    },
    {
      id: 'events',
      title: 'Events',
      description: "What's on nearby",
      href: '/user/events',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'secret-menu',
      title: 'Secret Menu',
      description: 'Unlock hidden items',
      href: '/user/secret-menu',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
    {
      id: 'badges',
      title: 'Achievements',
      description: 'Badges and progress',
      href: '/user/badges',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
    },
    {
      id: 'settings',
      title: 'Settings',
      description: 'Profile and preferences',
      href: '/user/settings',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'how-it-works',
      title: 'How it works',
      description: 'Quick guide to Qwikker',
      href: '/user/how-it-works',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ]

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">More</h1>
        <p className="text-sm text-zinc-500 mt-1">
          {userName ? `${userName} · ` : ''}
          {cityDisplayName}
        </p>
      </div>

      <ul className="rounded-2xl border border-zinc-800/80 bg-zinc-950/80 overflow-hidden divide-y divide-zinc-800/80">
        {items.map((item) => (
          <li key={item.id}>
            <PendingLink
              href={getNavUrl(item.href, walletPassId)}
              pendingLabel={item.title}
              className="flex items-center gap-3 px-4 py-3.5 active:bg-zinc-900/80 transition-colors touch-manipulation min-h-[56px]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-[#00d083] border border-zinc-800">
                {item.icon}
              </span>
              <span className="flex-1 min-w-0 text-left">
                <span className="block text-sm font-semibold text-zinc-100">{item.title}</span>
                <span className="block text-xs text-zinc-500 truncate">{item.description}</span>
              </span>
              {item.badge && item.badge > 0 ? (
                <span className="min-w-[22px] h-5 px-1.5 rounded-full bg-[#00d083] text-[11px] font-bold text-black flex items-center justify-center">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              ) : (
                <svg className="w-4 h-4 text-zinc-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </PendingLink>
          </li>
        ))}
      </ul>
    </div>
  )
}
