'use client'

import { useState } from 'react'
import Link from 'next/link'

interface UserDashboardLayoutProps {
  children: React.ReactNode
  currentSection: string
  currentUser?: any
  walletPassId?: string
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
    id: 'how-it-works', 
    title: 'How It Works', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>, 
    href: '/user/how-it-works' 
  },
  { 
    id: 'chat', 
    title: 'AI Companion', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>, 
    href: '/user/chat' 
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

export function UserDashboardLayout({ children, currentSection, currentUser, walletPassId }: UserDashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Helper function to append wallet_pass_id to navigation URLs
  const getNavUrl = (href: string) => {
    if (!walletPassId) {
      return href
    }
    return `${href}?wallet_pass_id=${walletPassId}`
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 transform transition-transform duration-300 z-50 flex flex-col ${
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
              src="/Qwikker Logo web.svg" 
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
                {currentUser?.tier ? `${currentUser.tier.charAt(0).toUpperCase() + currentUser.tier.slice(1)} • Level ${currentUser.level}` : 'Bournemouth Explorer'}
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
                <p className="font-semibold text-slate-100">Bournemouth</p>
                <p className="text-sm text-slate-400">Current City</p>
              </div>
              
              {/* City indicator */}
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center font-semibold text-slate-100">
                B
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
  )
}
