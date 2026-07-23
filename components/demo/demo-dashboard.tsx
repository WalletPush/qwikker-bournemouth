'use client'

/**
 * A faithful, non-interactive replica of the REAL business dashboard home
 * (components/dashboard/dashboard-layout.tsx + dashboard-home.tsx) rendered with
 * the prospect's own branding and clearly-labelled EXAMPLE data. Shown inside a
 * mac-style window so a business owner sees exactly what their control hub looks
 * like once live — same sidebar, same header, same cards.
 *
 * Everything here is presentational only (no links/actions). Numbers are seeded
 * from the business name so they're stable + believable per business.
 */

import { formatPrice } from '@/lib/utils/price-formatter'

// ---- deterministic mock numbers --------------------------------------------
function seeded(seedStr: string) {
  let s = 0
  for (let i = 0; i < seedStr.length; i++) s = (s * 31 + seedStr.charCodeAt(i)) >>> 0
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

function initialsFor(name: string): string {
  const words = name.split(/\s+/).filter((w) => /[a-zA-Z]/.test(w))
  if (words.length === 0) return (name[0] || 'Q').toUpperCase()
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase()
  return words.slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

// ---- sidebar nav (mirrors the real navItems, incl. groups) -----------------
const icon = (d: string) => (
  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={d} />
  </svg>
)

interface NavRow {
  id: string
  title: string
  d: string
  group?: string
}

const NAV: NavRow[] = [
  { id: 'dashboard', title: 'Dashboard', d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'activity', title: 'Activity', d: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { id: 'action-items', title: 'Action Items', d: 'M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { id: 'contact-centre', title: 'Contact Centre', d: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z' },
  { id: 'profile', title: 'Profile', d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'offers', title: 'Offers', d: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
  { id: 'events', title: 'Events', d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { id: 'files', title: 'Files & Menus', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'secret-menu', title: 'Secret Menu', d: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
  { id: 'loyalty', group: 'Tools', title: 'Loyalty Portal', d: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { id: 'notifications', group: 'Tools', title: 'Send a Push Notification', d: 'M15 17h5l-5 5v-5zM4 12a8 8 0 1116 0c0 3-2 5-2 5H6s-2-2-2-5zM9 21h6' },
  { id: 'analytics', group: 'Tools', title: 'Analytics', d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'referrals', group: 'Tools', title: 'Referrals', d: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z' },
  { id: 'settings', group: ' ', title: 'Settings', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' },
  { id: 'support', group: ' ', title: 'Support', d: 'M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z' },
]

// ---- small presentational card ---------------------------------------------
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-700 bg-slate-800/50 p-4 ${className}`}>{children}</div>
}

function QuickAction({ d, title, hint }: { d: string; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-700 bg-slate-800/50 p-4 transition-colors hover:border-[#00d083]/40 hover:bg-slate-800">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#00d083]/15 text-[#00d083]">
        {icon(d)}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-xs leading-snug text-slate-400">{hint}</p>
      </div>
    </div>
  )
}

export function DemoDashboard({
  businessName,
  logo,
  placeholderImage,
  category,
  town,
  city,
  currencySymbol = '£',
}: {
  businessName: string
  logo?: string | null
  placeholderImage?: string | null
  category: string
  town?: string | null
  city?: string | null
  currencySymbol?: string
}) {
  const rnd = seeded(businessName || 'qwikker')
  const views = Math.round(400 + rnd() * 700)
  const claims = Math.round(views * (0.1 + rnd() * 0.08))
  const members = Math.round(claims * (0.4 + rnd() * 0.3))
  const revenue = Math.round(claims * (8 + rnd() * 6))
  const brandSrc = logo || placeholderImage || null
  const domain = `${(city || 'bournemouth').toLowerCase()}.qwikker.com`
  const location = town || (city ? city.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Your area')

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl">
      {/* window chrome */}
      <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-900 px-4 py-2.5">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <div className="mx-auto flex items-center gap-1.5 rounded-md bg-slate-800 px-3 py-1 text-[11px] text-slate-400">
          <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2m-4 4h8M5 8h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2v-8a2 2 0 012-2z" /></svg>
          {domain}/dashboard
        </div>
      </div>

      <div className="flex">
        {/* ── Sidebar ── */}
        <aside className="w-16 shrink-0 border-r border-slate-800 bg-slate-900/95 py-4 md:w-60">
          {/* logo */}
          <div className="border-b border-slate-800 px-3 pb-4 text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/qwikker-logo-web.svg" alt="QWIKKER" className="mx-auto hidden md:block" style={{ maxHeight: 28 }} />
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg bg-[#00d083] font-extrabold text-black md:hidden">Q</div>
            <p className="mt-1.5 hidden text-[11px] font-medium text-gray-400 md:block">Business Dashboard</p>
          </div>
          {/* nav */}
          <nav className="space-y-0.5 px-2 pt-3">
            {NAV.map((item, i) => {
              const active = item.id === 'dashboard'
              const showGroup = item.group && item.group !== NAV[i - 1]?.group
              return (
                <div key={item.id}>
                  {showGroup && (
                    <div className="px-2 pb-1 pt-3">
                      {item.group?.trim() ? (
                        <p className="hidden border-t border-slate-800 pt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 md:block">
                          {item.group}
                        </p>
                      ) : (
                        <div className="border-t border-slate-800" />
                      )}
                    </div>
                  )}
                  <div
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                      active
                        ? 'border border-[#00d083]/30 bg-gradient-to-r from-[#00d083]/20 to-[#00b86f]/20 text-[#00d083]'
                        : 'text-gray-400'
                    }`}
                  >
                    <span className={active ? 'text-[#00d083]' : 'text-gray-500'}>{icon(item.d)}</span>
                    <span className="hidden flex-1 truncate md:block">{item.title}</span>
                  </div>
                </div>
              )
            })}
          </nav>
        </aside>

        {/* ── Main ── */}
        <div className="min-w-0 flex-1">
          {/* header */}
          <header className="flex items-center justify-between border-b border-slate-800 bg-slate-900/95 px-4 py-3 sm:px-6">
            <h2 className="hidden text-base font-semibold text-white lg:block">Dashboard</h2>
            <div className="flex items-center gap-3 sm:ml-auto">
              <div className="text-right">
                <p className="text-sm font-semibold text-white">{businessName}</p>
                <p className="text-xs text-gray-400">Business Owner</p>
              </div>
              {brandSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={brandSrc} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-white/10" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-700 text-sm font-semibold text-white">
                  {initialsFor(businessName)}
                </div>
              )}
            </div>
          </header>

          {/* content */}
          <div className="space-y-5 p-4 sm:p-5">
            <div>
              <h3 className="text-2xl font-bold text-white">Dashboard</h3>
              <p className="text-sm text-slate-400">Welcome back — here&rsquo;s your business overview.</p>
            </div>

            {/* top cards */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card>
                <p className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                  <span className="text-[#00d083]">{icon('M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z')}</span>
                  Current Plan
                </p>
                <p className="text-2xl font-bold text-[#00d083]">Spotlight</p>
                <p className="text-sm text-gray-400">Active subscription</p>
                <div className="mt-3 rounded-md bg-gradient-to-r from-[#00d083] to-[#00b86f] px-3 py-2 text-center text-sm font-semibold text-white">
                  Manage Plan
                </div>
              </Card>

              <Card>
                <p className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                  <span className="text-green-400">{icon('M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z')}</span>
                  Your Listing
                </p>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-400" />
                  <span className="text-sm text-green-300">Live on Qwikker!</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {businessName} • {category} • {location}
                </p>
                <div className="mt-3 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-xs text-green-200">
                  Your business is approved and live. Keep it fresh with offers &amp; updates.
                </div>
              </Card>

              <Card>
                <p className="mb-3 text-sm font-medium text-white">This month</p>
                <div className="space-y-2.5">
                  {[
                    { l: 'Profile views', v: views.toLocaleString(), c: 'text-white' },
                    { l: 'Offer claims', v: claims.toLocaleString(), c: 'text-[#00d083]' },
                    { l: 'Loyalty members', v: members.toLocaleString(), c: 'text-purple-300' },
                    { l: 'Est. revenue driven', v: formatPrice(revenue, currencySymbol), c: 'text-amber-300' },
                  ].map((r) => (
                    <div key={r.l} className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">{r.l}</span>
                      <span className={`font-semibold ${r.c}`}>{r.v}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* quick actions */}
            <div>
              <p className="mb-3 text-sm font-semibold text-white">Quick actions — everything from one place</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <QuickAction d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" title="Manage offers" hint="Create & edit the deals customers claim." />
                <QuickAction d="M15 17h5l-5 5v-5zM4 12a8 8 0 1116 0c0 3-2 5-2 5H6s-2-2-2-5zM9 21h6" title="Send a push" hint="Ping nearby customers with a live offer." />
                <QuickAction d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" title="Set up loyalty" hint="A wallet stamp card that keeps them coming back." />
                <QuickAction d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" title="Secret menu" hint="Hidden items diners unlock in-app." />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
