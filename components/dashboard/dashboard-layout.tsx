'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogoutButton } from '@/components/logout-button'
import { AISupportChat } from './ai-support-chat'

interface DashboardLayoutProps {
  children: React.ReactNode
  currentSection: string
  profile?: any
  actionItemsCount?: number
}

interface NavItem {
  id: string
  title: string
  icon: React.ReactNode
  href: string
  locked?: boolean
}

const navItems: NavItem[] = [
  { 
    id: 'dashboard', 
    title: 'Dashboard', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>, 
    href: '/dashboard' 
  },
  { 
    id: 'profile', 
    title: 'Profile', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>, 
    href: '/dashboard/profile' 
  },
  { 
    id: 'offers', 
    title: 'Offers', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>, 
    href: '/dashboard/offers' 
  },
  { 
    id: 'files', 
    title: 'Files & Menus', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>, 
    href: '/dashboard/files' 
  },
  { 
    id: 'secret-menu', 
    title: 'Secret Menu', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>, 
    href: '/dashboard/secret-menu' 
  },
  { 
    id: 'action-items', 
    title: 'Action Items', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>, 
    href: '/dashboard/action-items' 
  },
  { 
    id: 'loyalty', 
    title: 'Loyalty Cards', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>, 
    href: '/dashboard/loyalty', 
    locked: true 
  },
  { 
    id: 'analytics', 
    title: 'Analytics', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>, 
    href: '/dashboard/analytics', 
    locked: true 
  },
  { 
    id: 'notifications', 
    title: 'Push Notifications', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 12a8 8 0 1116 0c0 3-2 5-2 5H6s-2-2-2-5zM9 21h6" /></svg>, 
    href: '/dashboard/notifications', 
    locked: true 
  },
  { 
    id: 'referrals', 
    title: 'Referrals', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>, 
    href: '/dashboard/referrals' 
  },
  { 
    id: 'settings', 
    title: 'Settings', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>, 
    href: '/dashboard/settings' 
  },
  { 
    id: 'support', 
    title: 'Support', 
    icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" /></svg>, 
    href: '/dashboard/support' 
  },
]

export function DashboardLayout({ children, currentSection, profile, actionItemsCount = 0 }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()

  const businessName = profile?.business_name || 'Your Business'
  const businessInitials = businessName.split(' ').map((word: string) => word[0]).join('').toUpperCase().slice(0, 2)

  const handleLockedFeature = () => {
    // Show upgrade modal or redirect to settings
    router.push('/dashboard/settings')
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
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
                alt="QWIKKER Business Dashboard" 
                className="qwikker-logo mx-auto"
                style={{ maxHeight: '32px' }}
              />
              {/* Business Dashboard Text */}
              <p className="text-sm text-gray-400 font-medium">Business Dashboard</p>
            </div>
          </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-scroll overflow-x-hidden scrollbar-hidden p-4 space-y-2"
        style={{ 
          touchAction: 'pan-y',
          overscrollBehavior: 'contain'
        }}>
          {navItems.map((item) => (
            <div key={item.id}>
              {item.locked ? (
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`w-full flex items-center gap-3 px-4 py-4 rounded-lg transition-colors relative group touch-manipulation min-h-[48px] ${
                    currentSection === item.id 
                      ? 'bg-[#00d083]/10 text-[#00d083] border-r-2 border-[#00d083]' 
                      : 'text-gray-400 hover:bg-slate-800/50 active:bg-slate-700/50'
                  }`}
                >
                  <div className={currentSection === item.id ? 'text-[#00d083]' : 'text-gray-400'}>{item.icon}</div>
                  <span className="flex-1 text-left">{item.title}</span>
                  <div className="w-4 h-4 bg-slate-700 rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    Premium Feature
                  </div>
                </Link>
              ) : (
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-4 rounded-lg transition-colors relative touch-manipulation min-h-[48px] ${
                    currentSection === item.id
                      ? 'bg-gradient-to-r from-[#00d083]/20 to-[#00b86f]/20 border border-[#00d083]/30 text-[#00d083]'
                      : 'text-gray-300 hover:bg-slate-800/50 hover:text-white active:bg-slate-700/50'
                  }`}
                >
                  <div className={currentSection === item.id ? "text-[#00d083]" : "text-gray-400"}>{item.icon}</div>
                  <span className="flex-1">{item.title}</span>
                  {item.id === 'action-items' && actionItemsCount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full font-semibold min-w-[20px] text-center">
                      {actionItemsCount}
                    </span>
                  )}
                </Link>
              )}
            </div>
          ))}
        </nav>
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
              {/* Page title or breadcrumb can go here */}
              <div className="hidden lg:block">
                <h1 className="text-lg font-semibold text-white">Dashboard</h1>
              </div>
            </div>

            {/* Right side - User info with better spacing */}
            <div className="flex items-center gap-4">
              {/* Business name and title */}
              <div className="text-right">
                <p className="font-semibold text-white">{businessName}</p>
                <p className="text-sm text-gray-400">Business Owner</p>
              </div>
              
              {/* Avatar - Perfect circle */}
              <div className="w-10 h-10 bg-gradient-to-br from-[#00d083] to-[#00b86f] rounded-full flex items-center justify-center font-semibold text-black">
                {businessInitials}
              </div>
              
              {/* Logout button */}
              <LogoutButton />
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
        
        {/* AI Support Chat */}
        <AISupportChat profile={profile} />
      </div>
    </div>
  )
}
