'use client'

import { PendingLink } from '@/components/ui/nav-pending'

export interface BottomTabItem {
  id: string
  label: string
  href: string
  /** Section ids that highlight this tab */
  matchSections: string[]
  icon: React.ReactNode
}

const iconClass = 'w-6 h-6'

export const BOTTOM_TABS: BottomTabItem[] = [
  {
    id: 'nearby',
    label: 'Nearby',
    href: '/user/dashboard',
    matchSections: ['dashboard'],
    icon: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 'offers',
    label: 'Offers',
    href: '/user/offers',
    matchSections: ['offers'],
    icon: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    id: 'loyalty',
    label: 'Loyalty',
    href: '/user/rewards',
    matchSections: ['rewards'],
    icon: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
  },
  {
    id: 'ask',
    label: 'Ask',
    href: '/user/chat',
    matchSections: ['chat'],
    icon: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    id: 'more',
    label: 'More',
    href: '/user/more',
    matchSections: ['more', 'settings', 'notifications', 'events', 'secret-menu', 'badges', 'how-it-works', 'discover'],
    icon: (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
]

/** Height reserved above the home indicator for layout padding (matches bar). */
export const USER_BOTTOM_NAV_HEIGHT_CLASS =
  'pb-[calc(4.75rem+env(safe-area-inset-bottom,0px))]'

interface UserBottomNavProps {
  currentSection: string
  getNavUrl: (href: string) => string
  notifBadge?: number
}

export function UserBottomNav({
  currentSection,
  getNavUrl,
  notifBadge = 0,
}: UserBottomNavProps) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-[90] border-t border-zinc-700/80 bg-black backdrop-blur-xl"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Main"
    >
      <div className="flex items-stretch justify-between px-1 pt-2 pb-1.5 max-w-lg mx-auto">
        {BOTTOM_TABS.map((tab) => {
          const isActive = tab.matchSections.includes(currentSection)
          const showBadge = tab.id === 'more' && notifBadge > 0
          return (
            <PendingLink
              key={tab.id}
              href={getNavUrl(tab.href)}
              pendingLabel={tab.label}
              className={`relative flex flex-1 flex-col items-center justify-center gap-1 py-1.5 min-h-[52px] touch-manipulation transition-colors ${
                isActive ? 'text-[#00d083]' : 'text-zinc-400 active:text-zinc-200'
              }`}
            >
              <span className="relative">
                {tab.icon}
                {isActive && (
                  <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-0.5 w-4 rounded-full bg-[#00d083]" />
                )}
                {showBadge && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-[#00d083] text-[10px] font-bold text-black flex items-center justify-center">
                    {notifBadge > 99 ? '99+' : notifBadge}
                  </span>
                )}
              </span>
              <span
                className={`text-[11px] leading-none font-semibold ${
                  isActive ? 'text-[#00d083]' : 'text-zinc-400'
                }`}
              >
                {tab.label}
              </span>
            </PendingLink>
          )
        })}
      </div>
    </nav>
  )
}
