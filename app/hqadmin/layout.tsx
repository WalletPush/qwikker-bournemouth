import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HQLogoutButton } from '@/components/hqadmin/hq-logout-button'

export const metadata = {
  title: 'QWIKKER HQ',
  description: 'Platform control plane'
}

export default async function HQAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/hq-login')
  }
  
  // Check if user is an active HQ admin
  const { data: hqAdmin } = await supabase
    .from('hq_admins')
    .select('user_id, is_active')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()
  
  if (!hqAdmin) {
    // Not HQ admin - sign them out and redirect to login
    await supabase.auth.signOut()
    redirect('/hq-login?error=access_denied')
  }
  
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Top Bar */}
      <header className="border-b border-slate-800 bg-slate-900">
        <div className="flex h-16 items-center justify-between px-6">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">QWIKKER HQ</h1>
            <span className="rounded-md bg-slate-800 px-2 py-1 text-xs font-medium text-slate-400">
              CONTROL PLANE
            </span>
          </div>
          
          {/* Right: User */}
          <div className="flex items-center gap-4">
            {/* Environment Badge */}
            <span className="rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
              {process.env.NODE_ENV === 'production' ? 'PROD' : 'DEV'}
            </span>
            
            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-white">{user.email}</p>
                <p className="text-xs text-slate-400">HQ Admin</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-semibold">
                {user.email?.[0].toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex">
        {/* Left Sidebar */}
        <aside className="w-64 border-r border-slate-800 bg-slate-900 h-[calc(100vh-64px)]">
          <nav className="p-4 space-y-1">
            <NavLink href="/hqadmin" icon="dashboard">
              Dashboard
            </NavLink>
            <NavLink href="/hqadmin/franchises" icon="building">
              Franchises
            </NavLink>
            <NavLink href="/hqadmin/users" icon="users">
              Users
            </NavLink>
            <NavLink href="/hqadmin/system-health" icon="heart">
              System Health
            </NavLink>
            <NavLink href="/hqadmin/feature-flags" icon="flag">
              Feature Flags
            </NavLink>
            <NavLink href="/hqadmin/audit-logs" icon="list">
              Audit Logs
            </NavLink>
            <NavLink href="/hqadmin/contact-centre" icon="chat">
              Contact Centre
            </NavLink>
            
            <div className="pt-4 mt-4 border-t border-slate-800">
              <NavLink href="/hqadmin/settings" icon="settings">
                Settings
              </NavLink>
              <HQLogoutButton />
            </div>
          </nav>
        </aside>
        
        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

function NavLink({ 
  href, 
  icon, 
  children 
}: { 
  href: string
  icon: string
  children: React.ReactNode 
}) {
  // You can enhance this with usePathname to show active state
  return (
    <a
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
    >
      <Icon name={icon} />
      <span className="text-sm font-medium">{children}</span>
    </a>
  )
}

function Icon({ name }: { name: string }) {
  const icons: Record<string, JSX.Element> = {
    dashboard: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
    building: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    users: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    heart: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    flag: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
      </svg>
    ),
    list: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    chat: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    settings: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  }
  
  return icons[name] || null
}
