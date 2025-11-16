'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AdminLogoutButton } from '@/components/admin-logout-button'

interface AdminToolsLayoutProps {
  children: React.ReactNode
  city?: string
  cityDisplayName?: string
}

export function AdminToolsLayout({ children, city = 'bournemouth', cityDisplayName = 'Bournemouth' }: AdminToolsLayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const toolsNavItems = [
    {
      id: 'find-user',
      label: 'Find Users',
      href: '/admin/find-user',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
      description: 'Search for users and identify email mismatches'
    },
    {
      id: 'fix-email',
      label: 'Fix User Email',
      href: '/admin/emergency-email-fix',
      icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
      description: 'Manually fix user authentication emails'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-950">
      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-slate-900/95 backdrop-blur-xl border-r border-indigo-500/30 transform transition-transform duration-300 z-50 flex flex-col ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:max-w-none`}>
        
        {/* Logo - Fixed at top */}
        <div className="flex-shrink-0 p-6 border-b border-slate-700/50">
          <div className="text-center space-y-2">
            {/* QWIKKER Logo */}
            <img 
              src="/Qwikker Logo web.svg" 
              alt="QWIKKER Admin Dashboard" 
              className="qwikker-logo mx-auto"
              style={{ maxHeight: '32px' }}
            />
            {/* Admin Dashboard Text */}
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <p className="text-lg font-bold text-white">Admin Tools</p>
                <div className="px-2 py-1 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold rounded-full border border-indigo-400/50">
                  ADMIN
                </div>
              </div>
              <p className="text-sm text-indigo-300">{cityDisplayName}</p>
            </div>
          </div>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-scroll overflow-x-hidden scrollbar-hidden p-4 space-y-2"
        style={{ 
          touchAction: 'pan-y',
          overscrollBehavior: 'contain'
        }}>
          {/* Back to Dashboard */}
          <Link href="/admin">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 text-slate-300 hover:text-white hover:bg-slate-800/50 border-b border-slate-700/50 mb-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Dashboard</span>
            </button>
          </Link>

          {/* Tools Section Header */}
          <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Admin Tools
          </div>

          {/* Tools Navigation Items */}
          {toolsNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.id} href={item.href}>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#00d083]/20 to-[#00b86f]/20 border border-[#00d083]/30 text-[#00d083]'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex-shrink-0 mt-0.5">{item.icon}</div>
                  <div className="text-left">
                    <div className="font-semibold">{item.label}</div>
                    <div className={`text-xs mt-0.5 ${isActive ? 'text-[#00d083]/80' : 'text-slate-500'}`}>
                      {item.description}
                    </div>
                  </div>
                </button>
              </Link>
            )
          })}
        </nav>

        {/* Bottom section - Admin info */}
        <div className="flex-shrink-0 p-4 border-t border-slate-700">
          <AdminLogoutButton />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-80">
        {/* Top header */}
        <header className="bg-slate-900/95 backdrop-blur-xl border-b border-slate-700 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left side - Mobile menu button */}
            <div className="flex items-center">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="lg:hidden p-3 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors touch-manipulation min-h-[48px] min-w-[48px] flex items-center justify-center"
                aria-label="Open navigation menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              {/* Page title */}
              <div className="ml-4 lg:ml-0">
                <h1 className="text-lg font-semibold text-slate-100">
                  {pathname === '/admin/find-user' && '🔍 Find Users & Email Mismatches'}
                  {pathname === '/admin/emergency-email-fix' && '🔧 Emergency Email Fix'}
                </h1>
              </div>
            </div>

            {/* Right side - City info */}
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="font-semibold text-slate-100">{cityDisplayName}</p>
                <p className="text-sm text-slate-400">Admin Tools</p>
              </div>
              
              {/* City indicator */}
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center font-semibold text-slate-100">
                {cityDisplayName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main>
          {children}
        </main>
      </div>
    </div>
  )
}

