'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import Link from 'next/link'

interface UserDashboardLayoutProps {
  children: React.ReactNode
  currentSection: string
  currentUser?: any
  walletPassId?: string
  currentCity?: string
  cityDisplayName?: string
}

// Context to share sidebar state with child components
const SidebarContext = createContext<{ sidebarOpen: boolean }>({ sidebarOpen: false })

export const useSidebar = () => useContext(SidebarContext)

interface NavItem {
  id: string
  title: string
  icon: React.ReactNode
  href: string
}

const navItems: NavItem[] = [
  { 
    id: 'dashboard', 
    title: 'Dashboard', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>, 
    href: '/user/dashboard' 
  },
  { 
    id: 'chat', 
    title: 'AI Companion', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>, 
    href: '/user/chat' 
  },
  { 
    id: 'notifications', 
    title: 'Notifications', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>, 
    href: '/user/notifications' 
  },
  { 
    id: 'discover', 
    title: 'Discover', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>, 
    href: '/user/discover' 
  },
  { 
    id: 'offers', 
    title: 'Offers', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>, 
    href: '/user/offers' 
  },
  {
    id: 'rewards',
    title: 'Rewards',
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
    href: '/user/rewards'
  },
  { 
    id: 'events', 
    title: 'Events', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>, 
    href: '/user/events' 
  },
  { 
    id: 'secret-menu', 
    title: 'Secret Menu Club', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>, 
    href: '/user/secret-menu' 
  },
  { 
    id: 'badges', 
    title: 'Achievements', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>, 
    href: '/user/badges' 
  },
  { 
    id: 'settings', 
    title: 'Settings', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, 
    href: '/user/settings' 
  },
]

export function UserDashboardLayout({ children, currentSection, currentUser, walletPassId, currentCity = 'bournemouth', cityDisplayName = 'Bournemouth' }: UserDashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifBadge, setNotifBadge] = useState(0)
  
  // Save wallet_pass_id to localStorage for persistence across navigation
  useEffect(() => {
    if (walletPassId && typeof window !== 'undefined') {
      try {
        localStorage.setItem('qwikker-wallet-pass-id', walletPassId)
      } catch (e) {
        // Ignore localStorage errors
      }
    }
  }, [walletPassId])

  // Fetch unread notification count for sidebar badge
  const fetchUnreadCount = useCallback(async () => {
    const wpId = walletPassId || (typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('wallet_pass_id')
        || localStorage.getItem('qwikker-wallet-pass-id')
      : null)

    if (!wpId) return

    try {
      const res = await fetch(`/api/user/notifications?countOnly=true&wallet_pass_id=${wpId}`)
      if (res.ok) {
        const data = await res.json()
        setNotifBadge(data.unreadCount || 0)
      }
    } catch {
      // Silently fail - badge is non-critical
    }
  }, [walletPassId])

  useEffect(() => {
    fetchUnreadCount()
    // Refresh badge every 60 seconds
    const interval = setInterval(fetchUnreadCount, 60_000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  // Helper function to append wallet_pass_id to navigation URLs
  const getNavUrl = (href: string) => {
    // Try multiple sources for wallet_pass_id
    let activeWalletPassId = walletPassId
    
    // Fallback 1: Check URL parameters
    if (!activeWalletPassId && typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      activeWalletPassId = urlParams.get('wallet_pass_id')
    }
    
    // Fallback 2: Check localStorage
    if (!activeWalletPassId && typeof window !== 'undefined') {
      try {
        activeWalletPassId = localStorage.getItem('qwikker-wallet-pass-id')
      } catch (e) {
        // Ignore localStorage errors
      }
    }
    
    if (!activeWalletPassId) {
      return href
    }
    
    return `${href}?wallet_pass_id=${activeWalletPassId}`
  }

  return (
    <SidebarContext.Provider value={{ sidebarOpen }}>
    <div className="min-h-screen bg-slate-950 text-slate-100">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 transform transition-transform duration-300 z-[110] flex flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:max-w-none`}
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        
        {/* Logo - Fixed at top */}
        <div className="flex-shrink-0 p-6 border-b border-slate-800">
          <div className="text-center space-y-2">
            {/* QWIKKER Logo */}
            <img 
              src="/qwikker-logo-web.svg" 
              alt="QWIKKER User Dashboard" 
              className="qwikker-logo mx-auto"
              style={{ maxHeight: '32px' }}
            />
            {/* User Dashboard Text */}
            <p className="text-sm text-slate-400 font-medium">Discover Local Businesses</p>
          </div>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-scroll overflow-x-hidden scrollbar-hidden p-4 space-y-2"
        style={{ 
          touchAction: 'pan-y',
          overscrollBehavior: 'contain'
        }}>
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={getNavUrl(item.href)}
              onClick={() => setSidebarOpen(false)} // Close mobile sidebar on navigation
              className={`flex items-center gap-3 px-4 py-4 rounded-lg transition-colors touch-manipulation min-h-[48px] ${
                currentSection === item.id
                  ? 'bg-gradient-to-r from-[#00d083]/20 to-[#00b86f]/20 border border-[#00d083]/30 text-[#00d083]'
                  : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100 active:bg-slate-700/50'
              }`}
            >
              <div className={currentSection === item.id ? "text-[#00d083]" : "text-slate-400"}>{item.icon}</div>
              <span className="flex-1">{item.title}</span>
              {item.id === 'notifications' && notifBadge > 0 && (
                <span className="ml-auto px-2 py-0.5 text-xs font-bold bg-blue-500 text-white rounded-full min-w-[20px] text-center">
                  {notifBadge > 99 ? '99+' : notifBadge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Bottom section - User info */}
        <div className="flex-shrink-0 p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
            <div className="w-10 h-10 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-full flex items-center justify-center font-semibold text-black">
              {currentUser?.name?.charAt(0).toUpperCase() || 'Q'}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-slate-100">{currentUser?.name || 'Qwikker User'}</p>
              <p className="text-sm text-slate-400">
                {currentUser?.tier ? `${currentUser.tier.charAt(0).toUpperCase() + currentUser.tier.slice(1)} • Level ${currentUser.level || 1}` : 'Explorer • Level 1'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-80">
        {/* Top header */}
        <header className="bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-4 sm:px-6 py-4"
        style={{
          paddingTop: `calc(env(safe-area-inset-top) + 1rem)`,
        }}>
          <div className="flex items-center justify-between">
            {/* Left side - Mobile menu button */}
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors touch-manipulation min-h-[48px] min-w-[48px] flex items-center justify-center"
                aria-label="Open navigation menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {/* Page title */}
              <div className="hidden lg:block">
                <h1 className="text-lg font-semibold text-slate-100 capitalize">
                  {currentSection === 'secret-menu' ? 'Secret Menu Club' : 
                   currentSection === 'badges' ? 'Achievements' :
                   currentSection === 'chat' ? 'AI Companion' :
                   currentSection}
                </h1>
              </div>
            </div>

            {/* Right side - Location and city switcher */}
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="font-semibold text-slate-100">{cityDisplayName}</p>
                <p className="text-sm text-slate-400">Current City</p>
              </div>
              
              {/* City indicator */}
              <div className="w-10 h-10 bg-slate-700 border border-slate-600 rounded-full flex items-center justify-center font-semibold text-slate-100">
                {cityDisplayName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6"
        style={{
          paddingBottom: `calc(env(safe-area-inset-bottom) + 1rem)`,
        }}>
          {children}
        </main>
      </div>
    </div>
    </SidebarContext.Provider>
  )
}
