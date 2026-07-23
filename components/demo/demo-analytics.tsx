'use client'

/**
 * A faithful replica of the REAL business Analytics dashboard
 * (components/dashboard/analytics-page-client.tsx) rendered with clearly-labelled
 * EXAMPLE data — so a prospect sees exactly what they'd get once live, not a
 * generic "analytics" card. Each section carries a plain-English "what you'd
 * track here" note. Mock data is seeded from the business name so it's stable and
 * believable per business.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useInView } from '@/components/demo/use-in-view'

const CHART_HEIGHT = 180

// ---- deterministic mock data ------------------------------------------------

function seeded(seedStr: string) {
  let s = 0
  for (let i = 0; i < seedStr.length; i++) s = (s * 31 + seedStr.charCodeAt(i)) >>> 0
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

interface Day {
  date: string
  views: number
  claims: number
  scans: number
}

function buildDays(rnd: () => number, days = 30): Day[] {
  const today = new Date()
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (days - 1 - i))
    const dow = d.getDay()
    const weekend = dow === 5 || dow === 6 ? 1.6 : dow === 0 ? 1.3 : 1
    const views = Math.round((10 + rnd() * 22) * weekend)
    const claims = Math.round(views * (0.08 + rnd() * 0.12))
    const scans = Math.round(views * (0.15 + rnd() * 0.18))
    return { date: d.toISOString().slice(0, 10), views, claims, scans }
  })
}

// ---- faithful chart / card primitives (mirrors the real page) ---------------

function DailyChart({ data }: { data: Day[] }) {
  const maxVal = Math.max(...data.map((d) => d.views + d.claims), 1)
  const { ref, inView } = useInView<HTMLDivElement>()
  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <div className="w-3 h-3 rounded-sm bg-[#00d083]/70" />
          Profile views
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <div className="w-3 h-3 rounded-sm bg-blue-500/70" />
          Offer claims
        </div>
      </div>
      <div ref={ref} className="flex items-end gap-[2px]" style={{ height: CHART_HEIGHT }}>
        {data.map((day, i) => {
          const viewPx = Math.round((day.views / maxVal) * CHART_HEIGHT)
          const claimPx = Math.round((day.claims / maxVal) * CHART_HEIGHT)
          const delay = `${i * 22}ms`
          return (
            <div key={day.date} className="flex-1 flex flex-col items-end justify-end">
              {day.views > 0 && (
                <div
                  className="w-full origin-bottom rounded-t-sm bg-[#00d083]/60 transition-[height] duration-700 ease-out motion-reduce:transition-none"
                  style={{ height: inView ? Math.max(viewPx, 4) : 0, transitionDelay: delay }}
                />
              )}
              {day.claims > 0 && (
                <div
                  className="w-full origin-bottom rounded-t-sm bg-blue-500/60 mt-[1px] transition-[height] duration-700 ease-out motion-reduce:transition-none"
                  style={{ height: inView ? Math.max(claimPx, 4) : 0, transitionDelay: delay }}
                />
              )}
            </div>
          )
        })}
      </div>
      <div className="flex justify-between mt-6 text-[10px] text-slate-500">
        <span>{new Date(data[0]?.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
        <span>{new Date(data[data.length - 1]?.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
      </div>
    </div>
  )
}

function QRScanAreaChart({ data }: { data: Day[] }) {
  const maxVal = Math.max(...data.map((d) => d.scans), 1)
  const width = 100
  const height = 100
  const points = data.map((day, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - (day.scans / maxVal) * (height * 0.85),
    scans: day.scans,
  }))
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`
  const { ref, inView } = useInView<HTMLDivElement>()
  const dots = points.filter((p) => p.scans > 0)
  return (
    <div ref={ref} className="relative" style={{ height: CHART_HEIGHT }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="demoScanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path
          d={areaPath}
          fill="url(#demoScanGradient)"
          className="transition-opacity duration-700 ease-out motion-reduce:transition-none"
          style={{ opacity: inView ? 1 : 0, transitionDelay: '400ms' }}
        />
        <path
          d={linePath}
          fill="none"
          stroke="#a855f7"
          strokeWidth="0.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          className="transition-[stroke-dashoffset] duration-[1200ms] ease-out motion-reduce:transition-none"
          style={{ strokeDasharray: 1, strokeDashoffset: inView ? 0 : 1 }}
        />
        {dots.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="1.2"
            fill="#a855f7"
            className="transition-opacity duration-300 ease-out motion-reduce:transition-none"
            style={{ opacity: inView ? 0.8 : 0, transitionDelay: `${600 + i * 25}ms` }}
          />
        ))}
      </svg>
    </div>
  )
}

function BreakdownBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  const target = Math.max(pct, value > 0 ? 2 : 0)
  const { ref, inView } = useInView<HTMLDivElement>()
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-300">{label}</span>
        <span className="text-white font-medium">
          {value.toLocaleString()} <span className="text-slate-500 text-xs">({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <div ref={ref} className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-[width] duration-1000 ease-out motion-reduce:transition-none`}
          style={{ width: `${inView ? target : 0}%` }}
        />
      </div>
    </div>
  )
}

function PeakBar({ day, views, maxPeak }: { day: string; views: number; maxPeak: number }) {
  const { ref, inView } = useInView<HTMLDivElement>()
  const target = (views / maxPeak) * 100
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 flex-shrink-0 text-sm text-slate-400">{day.slice(0, 3)}</span>
      <div ref={ref} className="h-6 flex-1 overflow-hidden rounded bg-slate-700/30">
        <div
          className="h-full rounded bg-[#00d083]/50 transition-[width] duration-1000 ease-out motion-reduce:transition-none"
          style={{ width: `${inView ? target : 0}%` }}
        />
      </div>
      <span className="w-8 text-right text-sm font-medium text-white">{views}</span>
    </div>
  )
}

function TrendUp({ value }: { value: number }) {
  return (
    <p className="text-xs flex items-center gap-1 text-[#00d083]">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l9.2-9.2M17 17V7H7" />
      </svg>
      +{value.toFixed(1)}% vs last month
    </p>
  )
}

function StatCard({ title, value, subtitle, trend }: { title: string; value: string; subtitle?: string; trend?: number }) {
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-400">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        {trend !== undefined && <TrendUp value={trend} />}
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

/** Plain-English "what you'd track here" note under each section. */
function TrackNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-2 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2">
      <p className="text-xs leading-relaxed text-slate-400">
        <span className="font-semibold text-slate-300">What you’d track here: </span>
        {children}
      </p>
    </div>
  )
}

// ---- main -------------------------------------------------------------------

export function DemoAnalytics({
  businessName,
  offers,
  featuredItems,
  place,
}: {
  businessName: string
  offers: string[]
  featuredItems: string[]
  /** Grammatical place phrase — "in Poole" or "near me" (never "in near me"). */
  place: string
}) {
  const rnd = seeded(businessName || 'qwikker')
  const days = buildDays(rnd)
  const totalViews = days.reduce((s, d) => s + d.views, 0)
  const totalClaims = days.reduce((s, d) => s + d.claims, 0)
  const totalScans = days.reduce((s, d) => s + d.scans, 0)
  const totalSaves = Math.round(totalViews * 0.14)
  const totalVibes = Math.round(totalClaims * 0.6)

  const topOffers = (offers.length ? offers : ['20% off your first visit', 'Free side with any main', 'Midweek 2-for-1'])
    .slice(0, 3)
    .map((name, i) => ({ name, claims: Math.round(totalClaims * (0.5 - i * 0.14)) }))

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const peakDays = dayNames.map((d, i) => ({ day: d, views: Math.round((15 + rnd() * 30) * (i >= 4 ? 1.5 : 1)) }))
  const maxPeak = Math.max(...peakDays.map((d) => d.views), 1)

  const firstTime = Math.round(totalViews * 0.62)
  const returning = totalViews - firstTime

  const aiMentions = Math.round(totalClaims * 0.7)
  const atlasDirections = Math.round(aiMentions * 0.55)

  const queries = (
    featuredItems.length
      ? featuredItems.slice(0, 3).map((it) => `best ${it.toLowerCase()} ${place}`)
      : [`best places to eat ${place}`, `where to go tonight ${place}`, `hidden gems ${place}`]
  )
    .concat([`somewhere for date night ${place}`, `open late near me`])
    .map((query, i) => ({ query, count: Math.max(2, Math.round(aiMentions * (0.3 - i * 0.05))) }))
    .filter((q) => q.count > 0)

  const scanTimes = { morning: Math.round(totalScans * 0.2), afternoon: Math.round(totalScans * 0.35), evening: Math.round(totalScans * 0.35), night: Math.round(totalScans * 0.1) }

  const loyaltyMembers = Math.round(totalClaims * 0.4)
  const stampsEarned = Math.round(loyaltyMembers * 2.3)
  const rewards = Math.round(loyaltyMembers * 0.3)

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-5">
      {/* Header — mirrors the real page */}
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-white">Analytics</h3>
          <p className="text-sm text-gray-400">Last 30 days of performance data</p>
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/50 p-1 text-xs">
          <span className="rounded-md bg-[#00d083] px-3 py-1.5 font-medium text-black">30 days</span>
          <span className="px-3 py-1.5 text-slate-400">60 days</span>
          <span className="px-3 py-1.5 text-slate-400">90 days</span>
        </div>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <StatCard title="Profile Views" value={totalViews.toLocaleString()} trend={18.4} subtitle={`${Math.round(totalViews * 0.8)} unique viewers`} />
        <StatCard title="Offer Claims" value={totalClaims.toLocaleString()} trend={24.1} subtitle={`${topOffers.length} active offers`} />
        <StatCard title="QR Scans" value={totalScans.toLocaleString()} trend={12.7} subtitle="from your linked codes" />
        <StatCard title="Saves" value={totalSaves.toLocaleString()} subtitle="Users who saved your listing" />
        <StatCard title="Vibes" value={totalVibes.toLocaleString()} subtitle="92% positive" />
      </div>
      <TrackNote>
        Every <b>profile view</b>, <b>offer claim</b>, <b>QR scan</b>, <b>save</b> and customer <b>vibe</b> — counted automatically, no setup.
      </TrackNote>

      {/* Performance trends + top offers */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Performance Trends</CardTitle>
            <p className="text-xs text-slate-400">Last 30 days — profile views and offer claims</p>
          </CardHeader>
          <CardContent>
            <DailyChart data={days} />
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Top Performing Offers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topOffers.map((o, index) => (
                <div key={index} className="flex items-center justify-between rounded-lg bg-slate-700/30 p-3">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-[#00d083]/20">
                      <span className="font-bold text-[#00d083]">#{index + 1}</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="truncate font-medium text-white">{o.name}</h4>
                      <p className="text-sm text-gray-400">{o.claims} claims</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <TrackNote>
        Which of <b>your</b> offers people actually claim — ranked — so you double down on what pulls them in.
      </TrackNote>

      {/* Peak days + visitor type */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Peak Days</CardTitle>
            <p className="text-xs text-slate-400">When people visit your listing</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {peakDays.map((day) => (
                <PeakBar key={day.day} day={day.day} views={day.views} maxPeak={maxPeak} />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Visitor Type</CardTitle>
            <p className="text-xs text-slate-400">First-time vs returning visitors</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <BreakdownBar label="First-time visitors" value={firstTime} total={totalViews} color="bg-blue-500" />
              <BreakdownBar label="Returning visitors" value={returning} total={totalViews} color="bg-[#00d083]" />
              <div className="mt-4 rounded-lg bg-slate-700/20 p-3">
                <p className="text-xs text-slate-400">
                  <span className="font-medium text-white">{Math.round(returning * 0.7)}</span> people visited more than once
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <TrackNote>
        Your <b>busiest days</b> (time offers to fill the quiet ones) and how many visitors are <b>new vs regulars</b>.
      </TrackNote>

      {/* AI discovery */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="bg-slate-800/50 border-slate-700 border-l-4 border-l-purple-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              AI Discovery
            </CardTitle>
            <p className="text-xs text-slate-400">How the Qwikker AI is recommending you</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-3 text-center">
                <p className="text-2xl font-bold text-purple-400">{aiMentions}</p>
                <p className="text-xs text-slate-400">AI recommendations</p>
              </div>
              <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-3 text-center">
                <p className="text-2xl font-bold text-purple-400">{atlasDirections}</p>
                <p className="text-xs text-slate-400">Directions via Atlas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700 border-l-4 border-l-purple-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <svg className="h-5 w-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              What People Asked
            </CardTitle>
            <p className="text-xs text-slate-400">Queries that led the Qwikker AI to recommend you</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-1.5">
              {queries.map((q, i) => (
                <div key={i} className="flex items-start justify-between gap-3 rounded-lg bg-slate-700/20 p-2">
                  <span className="text-sm leading-snug text-slate-300">“{q.query}”</span>
                  <span className="mt-0.5 flex-shrink-0 text-xs font-medium text-purple-400">{q.count}x</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      <TrackNote>
        How often the <b>Qwikker AI recommends you</b> — and the <b>exact real questions</b> (about your dishes &amp; vibe) that surfaced you.
      </TrackNote>

      {/* QR scan trend + engagement */}
      <div className="mt-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">QR Scan Trend</CardTitle>
            <p className="text-xs text-slate-400">Last 30 days — scans from your linked QR codes</p>
          </CardHeader>
          <CardContent>
            <QRScanAreaChart data={days} />
          </CardContent>
        </Card>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Engagement Summary</CardTitle>
            <p className="text-xs text-slate-400">How people interact with your listing</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <BreakdownBar label="Profile views" value={totalViews} total={totalViews} color="bg-blue-500" />
              <BreakdownBar label="Offer claims" value={totalClaims} total={totalViews} color="bg-[#00d083]" />
              <BreakdownBar label="Saves" value={totalSaves} total={totalViews} color="bg-purple-500" />
              <BreakdownBar label="QR scans" value={totalScans} total={totalViews} color="bg-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">QR Scan Activity</CardTitle>
            <p className="text-xs text-slate-400">When people scan your codes</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <BreakdownBar label="Morning (6am-12pm)" value={scanTimes.morning} total={totalScans} color="bg-amber-400" />
              <BreakdownBar label="Afternoon (12-5pm)" value={scanTimes.afternoon} total={totalScans} color="bg-orange-500" />
              <BreakdownBar label="Evening (5-10pm)" value={scanTimes.evening} total={totalScans} color="bg-purple-500" />
              <BreakdownBar label="Night (10pm-6am)" value={scanTimes.night} total={totalScans} color="bg-indigo-500" />
            </div>
          </CardContent>
        </Card>
      </div>
      <TrackNote>
        Every <b>scan of your Qwikker QR</b> — the day-by-day trend and the <b>time of day</b> people scan.
      </TrackNote>

      {/* Loyalty */}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard title="Loyalty Members" value={loyaltyMembers.toLocaleString()} subtitle="Active program members" />
        <StatCard title="Stamps Earned" value={stampsEarned.toLocaleString()} subtitle="Verified in-store visits" />
        <StatCard title="Rewards Redeemed" value={rewards.toLocaleString()} subtitle="Rewards claimed" />
      </div>
      <TrackNote>
        Loyalty <b>members</b>, <b>stamps earned</b> from real in-store visits, and <b>rewards redeemed</b>.
      </TrackNote>
    </div>
  )
}
