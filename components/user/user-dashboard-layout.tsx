'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { getClientCityFallback, getCityDisplayName as getClientCityDisplayName } from '@/lib/utils/client-city-detection'
import { NavPendingProvider, PendingLink } from '@/components/ui/nav-pending'
import {
  UserBottomNav,
  USER_BOTTOM_NAV_HEIGHT_CLASS,
} from '@/components/user/user-bottom-nav'
import { withWalletPassId } from '@/lib/utils/with-wallet-pass'

interface UserDashboardLayoutProps {
  children: React.ReactNode
  currentSection: string
  currentUser?: any
  walletPassId?: string
  currentCity?: string
  cityDisplayName?: string
}

/** Kept for discover mobile overlays — always false on phone (no drawer). */
const SidebarContext = createContext<{ sidebarOpen: boolean }>({ sidebarOpen: false })

export const useSidebar = () => useContext(SidebarContext)

interface NavItem {
  id: string
  title: string
  icon: React.ReactNode
  href: string
}

/** Desktop sidebar — full IA. Mobile uses bottom tabs + More hub. */
const navItems: NavItem[] = [
  {
    id: 'dashboard',
    title: 'Nearby',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    href: '/user/dashboard',
  },
  {
    id: 'chat',
    title: 'Ask',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    href: '/user/chat',
  },
  {
    id: 'offers',
    title: 'Offers',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
    href: '/user/offers',
  },
  {
    id: 'rewards',
    title: 'Loyalty',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    href: '/user/rewards',
  },
  {
    id: 'more',
    title: 'More',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    href: '/user/more',
  },
  {
    id: 'notifications',
    title: 'Notifications',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    href: '/user/notifications',
  },
  {
    id: 'discover',
    title: 'Discover',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    href: '/user/discover',
  },
  {
    id: 'events',
    title: 'Events',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    href: '/user/events',
  },
  {
    id: 'secret-menu',
    title: 'Secret Menu Club',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    href: '/user/secret-menu',
  },
  {
    id: 'badges',
    title: 'Achievements',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    href: '/user/badges',
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    href: '/user/settings',
  },
]

function sectionTitle(section: string): string {
  if (section === 'dashboard') return 'Nearby'
  if (section === 'chat') return 'Ask'
  if (section === 'rewards') return 'Loyalty'
  if (section === 'secret-menu') return 'Secret Menu'
  if (section === 'badges') return 'Achievements'
  if (section === 'more') return 'More'
  if (section === 'how-it-works') return 'How it works'
  return section.replace(/-/g, ' ')
}

export function UserDashboardLayout({
  children,
  currentSection,
  currentUser,
  walletPassId,
  currentCity: currentCityProp,
  cityDisplayName: cityDisplayNameProp,
}: UserDashboardLayoutProps) {
  const currentCity = currentCityProp || getClientCityFallback()
  const cityDisplayName = cityDisplayNameProp || getClientCityDisplayName(currentCity)
  const [notifBadge, setNotifBadge] = useState(0)
  const [resolvedPassId, setResolvedPassId] = useState<string | null>(walletPassId || null)

  useEffect(() => {
    let id = walletPassId || null
    if (!id) {
      const urlParams = new URLSearchParams(window.location.search)
      id = urlParams.get('wallet_pass_id')
    }
    if (!id) {
      try {
        id = localStorage.getItem('qwikker-wallet-pass-id')
      } catch {
        /* ignore */
      }
    }
    if (id) {
      setResolvedPassId(id)
      try {
        localStorage.setItem('qwikker-wallet-pass-id', id)
      } catch {
        /* ignore */
      }
    }
  }, [walletPassId])

  const fetchUnreadCount = useCallback(async () => {
    if (!resolvedPassId) return
    try {
      const res = await fetch(
        `/api/user/notifications?countOnly=true&wallet_pass_id=${resolvedPassId}`
      )
      if (res.ok) {
        const data = await res.json()
        setNotifBadge(data.unreadCount || 0)
      }
    } catch {
      /* badge non-critical */
    }
  }, [resolvedPassId])

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 60_000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  const getNavUrl = (href: string) => withWalletPassId(href, resolvedPassId)

  return (
    <NavPendingProvider>
      <SidebarContext.Provider value={{ sidebarOpen: false }}>
        <div className="min-h-screen bg-black text-zinc-100">
          {/* Desktop sidebar only — no mobile drawer / hamburger */}
          <div
            className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:flex lg:w-80 lg:flex-col bg-zinc-950 border-r border-zinc-800"
            style={{
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            <div className="flex-shrink-0 p-6 border-b border-zinc-800">
              <div className="text-center space-y-2">
                <img
                  src="/qwikker-logo-web.svg"
                  alt="Qwikker"
                  className="qwikker-logo mx-auto"
                  style={{ maxHeight: '32px' }}
                />
                <p className="text-sm text-zinc-500 font-medium">Discover Local Businesses</p>
              </div>
            </div>

            <nav
              className="flex-1 overflow-y-scroll overflow-x-hidden scrollbar-hidden p-4 space-y-1"
              style={{ touchAction: 'pan-y', overscrollBehavior: 'contain' }}
            >
              {navItems.map((item) => (
                <PendingLink
                  key={item.id}
                  href={getNavUrl(item.href)}
                  pendingLabel={item.title}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors touch-manipulation min-h-[48px] ${
                    currentSection === item.id
                      ? 'bg-[#00d083]/10 border border-[#00d083]/30 text-[#00d083]'
                      : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                  }`}
                >
                  <div className={currentSection === item.id ? 'text-[#00d083]' : 'text-zinc-500'}>
                    {item.icon}
                  </div>
                  <span className="flex-1">{item.title}</span>
                  {item.id === 'notifications' && notifBadge > 0 && (
                    <span className="ml-auto px-2 py-0.5 text-xs font-bold bg-[#00d083] text-black rounded-full min-w-[20px] text-center">
                      {notifBadge > 99 ? '99+' : notifBadge}
                    </span>
                  )}
                </PendingLink>
              ))}
            </nav>

            <div className="flex-shrink-0 p-4 border-t border-zinc-800">
              <div className="flex items-center gap-3 p-3 bg-zinc-900/80 rounded-lg">
                <div className="w-10 h-10 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-full flex items-center justify-center font-semibold text-black">
                  {currentUser?.name?.charAt(0).toUpperCase() || 'Q'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-100 truncate">
                    {currentUser?.name || 'Qwikker User'}
                  </p>
                  <p className="text-sm text-zinc-500 truncate">
                    {currentUser?.tier
                      ? `${currentUser.tier.charAt(0).toUpperCase() + currentUser.tier.slice(1)} · Level ${currentUser.level || 1}`
                      : 'Explorer · Level 1'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main column */}
          <div className="lg:ml-80 min-h-screen flex flex-col">
            <header
              className="sticky top-0 z-40 bg-black/90 backdrop-blur-xl border-b border-zinc-900 px-4 sm:px-6 py-3"
              style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center min-w-0">
                  {currentSection === 'chat' ? (
                    <div className="flex items-center gap-1.5 min-w-0">
                      <img
                        src="/qwikker-logo-web.svg"
                        alt="Qwikker"
                        width={100}
                        height={24}
                        className="h-5 w-auto flex-shrink-0"
                      />
                      <span className="text-sm text-zinc-500 font-medium">Ask</span>
                    </div>
                  ) : (
                    <>
                      <img
                        src="/qwikker-logo-web.svg"
                        alt="Qwikker"
                        width={88}
                        height={22}
                        className="h-5 w-auto flex-shrink-0 lg:hidden"
                      />
                      <h1 className="hidden lg:block text-lg font-semibold text-zinc-100 capitalize">
                        {sectionTitle(currentSection)}
                      </h1>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2.5 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="font-semibold text-zinc-100 text-sm truncate max-w-[140px]">
                      {cityDisplayName}
                    </p>
                    <p className="text-xs text-zinc-500">Current city</p>
                  </div>
                  <div className="w-9 h-9 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center font-semibold text-zinc-100 text-sm">
                    {cityDisplayName.charAt(0).toUpperCase()}
                  </div>
                </div>
              </div>
            </header>

            <main
              className={`flex-1 p-4 sm:p-6 ${USER_BOTTOM_NAV_HEIGHT_CLASS} lg:pb-6`}
            >
              {children}
            </main>
          </div>

          <UserBottomNav
            currentSection={currentSection}
            getNavUrl={getNavUrl}
            notifBadge={notifBadge}
          />
        </div>
      </SidebarContext.Provider>
    </NavPendingProvider>
  )
}
