'use client'

import { useState } from 'react'
import Link from 'next/link'

interface UserDashboardLayoutProps {
  children: React.ReactNode
  currentSection: string
  currentUser?: any
  walletPassId?: string
  currentCity?: string
  cityDisplayName?: string
}

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
    id: 'events', 
    title: 'Events', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>, 
    href: '/user/events' 
  },
  { 
    id: 'secret-menu', 
    title: 'Secret Menu', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>, 
    href: '/user/secret-menu' 
  },
  { 
    id: 'chat', 
    title: 'AI Chat', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>, 
    href: '/user/chat' 
  },
  { 
    id: 'settings', 
    title: 'Settings', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, 
    href: '/user/settings' 
  }
]

export function UserDashboardLayoutMobile({ children, currentSection, currentUser, walletPassId, currentCity = 'bournemouth', cityDisplayName = 'Bournemouth' }: UserDashboardLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  // Helper function to append wallet_pass_id to navigation URLs
  const getNavUrl = (href: string) => {
    if (!walletPassId) {
      return href
    }
    return `${href}?wallet_pass_id=${walletPassId}`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Mobile Header */}
      <div className="lg:hidden bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-black font-bold" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-100">Qwikker</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-full flex items-center justify-center text-xs font-semibold text-black">
                {currentUser?.name?.charAt(0).toUpperCase() || 'Q'}
              </div>
              <span className="text-sm text-slate-300">{currentUser?.name || 'Qwikker User'}</span>
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-300 hover:text-white p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <div className="fixed right-0 top-0 h-full w-64 bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 p-4">
            <div className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.id}
                  href={getNavUrl(item.href)}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    currentSection === item.id
                      ? 'bg-gradient-to-r from-[#00d083]/20 to-[#00b86f]/20 border border-[#00d083]/30 text-[#00d083]'
                      : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100'
                  }`}
                >
                  <div className={currentSection === item.id ? "text-[#00d083]" : "text-slate-400"}>{item.icon}</div>
                  <span className="flex-1">{item.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-50 lg:w-80 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 lg:flex lg:flex-col">
        {/* Logo */}
        <div className="flex-shrink-0 p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-black font-bold" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-100">Qwikker</h1>
              <p className="text-sm text-slate-400">Discover Local Businesses</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                currentSection === item.id
                  ? 'bg-gradient-to-r from-[#00d083]/20 to-[#00b86f]/20 border border-[#00d083]/30 text-[#00d083]'
                  : 'text-slate-300 hover:bg-slate-800/50 hover:text-slate-100'
              }`}
            >
              <div className={currentSection === item.id ? "text-[#00d083]" : "text-slate-400"}>{item.icon}</div>
              <span className="flex-1">{item.title}</span>
            </Link>
          ))}
        </nav>

        {/* User info */}
        <div className="flex-shrink-0 p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
            <div className="w-10 h-10 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-full flex items-center justify-center font-semibold text-black">
              {currentUser?.name?.charAt(0).toUpperCase() || 'Q'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-slate-100 truncate">{currentUser?.name || 'Qwikker User'}</p>
              <p className="text-sm text-slate-400 truncate">
                {currentUser?.tier ? `${currentUser.tier.charAt(0).toUpperCase() + currentUser.tier.slice(1)} • Level ${currentUser.level || 1}` : 'Explorer • Level 1'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-80">
        {/* Desktop header */}
        <header className="hidden lg:block bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-slate-100 capitalize">
                {currentSection === 'secret-menu' ? 'Secret Menu Club' : currentSection}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-full">
                <div className="w-2 h-2 bg-[#00d083] rounded-full"></div>
                <span className="text-sm text-slate-300">{cityDisplayName}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 lg:p-6 max-w-full overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800">
        <div className="flex items-center justify-around py-2">
          {navItems.slice(0, 5).map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                currentSection === item.id
                  ? 'text-[#00d083]'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <div className="w-5 h-5">{item.icon}</div>
              <span className="text-xs font-medium">{item.title.split(' ')[0]}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
