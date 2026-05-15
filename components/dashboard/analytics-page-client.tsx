'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getBusinessAnalytics } from '@/lib/actions/business-analytics-actions'
import type { BusinessAnalytics } from '@/lib/actions/business-analytics-actions'
import type { AnalyticsLevel } from '@/lib/utils/subscription-helpers'

interface AnalyticsPageClientProps {
  profile: any
  analytics: BusinessAnalytics
}

const CHART_HEIGHT = 180

// --- Blur overlay for premium sections ---
function BlurredSection({
  locked,
  upgradeMessage,
  children,
}: {
  locked: boolean
  upgradeMessage: string
  children: React.ReactNode
}) {
  if (!locked) return <>{children}</>

  return (
    <div className="relative">
      <div className="blur-[6px] select-none pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center z-10">
        <div className="text-center bg-slate-900/70 backdrop-blur-sm rounded-xl px-6 py-4 border border-slate-700/50 max-w-xs">
          <div className="w-10 h-10 mx-auto mb-2 bg-slate-700/80 rounded-full flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-sm text-slate-300 mb-3">{upgradeMessage}</p>
          <Button asChild size="sm" className="bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black font-semibold">
            <Link href="/dashboard/settings">Upgrade Plan</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}

// --- Charts and sub-components ---

function DailyChart({ data }: { data: BusinessAnalytics['dailyData'] }) {
  const maxVal = Math.max(...data.map(d => d.views + d.claims), 1)

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
      <div className="flex items-end gap-[2px]" style={{ height: CHART_HEIGHT }}>
        {data.map((day) => {
          const viewPx = maxVal > 0 ? Math.round((day.views / maxVal) * CHART_HEIGHT) : 0
          const claimPx = maxVal > 0 ? Math.round((day.claims / maxVal) * CHART_HEIGHT) : 0
          const label = new Date(day.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

          return (
            <div key={day.date} className="flex-1 flex flex-col items-end justify-end group relative">
              <div className="absolute -top-14 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 pointer-events-none">
                <div className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg">
                  <p className="text-slate-400 font-medium mb-0.5">{label}</p>
                  <p className="text-[#00d083]">{day.views} {day.views === 1 ? 'view' : 'views'}</p>
                  {day.claims > 0 && <p className="text-blue-400">{day.claims} {day.claims === 1 ? 'claim' : 'claims'}</p>}
                </div>
              </div>
              {day.views > 0 && (
                <div
                  className="w-full rounded-t-sm bg-[#00d083]/60 group-hover:bg-[#00d083] transition-colors"
                  style={{ height: Math.max(viewPx, 4) }}
                />
              )}
              {day.claims > 0 && (
                <div
                  className="w-full rounded-t-sm bg-blue-500/60 group-hover:bg-blue-500 transition-colors mt-[1px]"
                  style={{ height: Math.max(claimPx, 4) }}
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

function QRScanAreaChart({ data }: { data: BusinessAnalytics['dailyData'] }) {
  const maxVal = Math.max(...data.map(d => d.scans), 1)
  const totalScans = data.reduce((sum, d) => sum + d.scans, 0)

  if (totalScans === 0) {
    return (
      <div className="h-48 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-10 h-10 text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
          <p className="text-gray-400 text-sm">No QR scans yet</p>
          <p className="text-gray-500 text-xs mt-1">Scans will appear when customers use your QR codes</p>
        </div>
      </div>
    )
  }

  const width = 100
  const height = 100
  const points = data.map((day, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - (maxVal > 0 ? (day.scans / maxVal) * (height * 0.85) : 0)
    return { x, y, scans: day.scans, date: day.date }
  })

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`

  return (
    <div>
      <div className="relative" style={{ height: CHART_HEIGHT }}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="scanGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#a855f7" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#scanGradient)" />
          <path d={linePath} fill="none" stroke="#a855f7" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
          {points.filter(p => p.scans > 0).map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="1.2" fill="#a855f7" className="opacity-80" />
          ))}
        </svg>
        <div className="absolute inset-0 flex">
          {data.map((day) => {
            const label = new Date(day.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
            return (
              <div key={day.date} className="flex-1 group relative">
                {day.scans > 0 && (
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 hidden group-hover:block z-20 pointer-events-none">
                    <div className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs whitespace-nowrap shadow-lg">
                      <p className="text-slate-400 font-medium">{label}</p>
                      <p className="text-purple-400">{day.scans} {day.scans === 1 ? 'scan' : 'scans'}</p>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex justify-between mt-3 text-[10px] text-slate-500">
        <span>{new Date(data[0]?.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
        <span>{new Date(data[data.length - 1]?.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
      </div>
    </div>
  )
}

function BreakdownBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-300">{label}</span>
        <span className="text-white font-medium">{value.toLocaleString()} <span className="text-slate-500 text-xs">({pct.toFixed(0)}%)</span></span>
      </div>
      <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.max(pct, value > 0 ? 2 : 0)}%` }} />
      </div>
    </div>
  )
}

function TrendBadge({ value, periodDays }: { value: number; periodDays: number }) {
  const isPositive = value >= 0
  const periodLabel = periodDays <= 30 ? 'last month' : `previous ${periodDays} days`
  return (
    <p className={`text-xs flex items-center gap-1 ${isPositive ? 'text-[#00d083]' : 'text-red-400'}`}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isPositive ? "M7 17l9.2-9.2M17 17V7H7" : "M17 7l-9.2 9.2M7 7v10h10"} />
      </svg>
      {isPositive ? '+' : ''}{value.toFixed(1)}% vs {periodLabel}
    </p>
  )
}

function StatCard({ title, value, subtitle, trend, periodDays = 30 }: { title: string; value: string; subtitle?: string; trend?: number; periodDays?: number }) {
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-400">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">{value}</div>
        {trend !== undefined && <TrendBadge value={trend} periodDays={periodDays} />}
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

// --- Main component ---

const PERIOD_OPTIONS = [
  { label: '30 days', value: 30 },
  { label: '60 days', value: 60 },
  { label: '90 days', value: 90 },
] as const

export function AnalyticsPageClient({ profile, analytics: initialAnalytics }: AnalyticsPageClientProps) {
  const [analyticsLevel, setAnalyticsLevel] = useState<AnalyticsLevel>('free')
  const [loading, setLoading] = useState(true)
  const [periodDays, setPeriodDays] = useState(30)
  const [analytics, setAnalytics] = useState<BusinessAnalytics>(initialAnalytics)
  const [isPending, startTransition] = useTransition()
  
  useEffect(() => {
    checkAnalyticsAccess()
  }, [profile])

  const handlePeriodChange = (days: number) => {
    if (days === periodDays || !profile?.id) return
    setPeriodDays(days)
    startTransition(async () => {
      const data = await getBusinessAnalytics(profile.id, days)
      setAnalytics(data)
    })
  }

  const checkAnalyticsAccess = async () => {
    if (!profile?.id) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/user/feature-access?feature=analytics')
      
      if (response.ok) {
        const data = await response.json()
        if (data.hasAccess) {
          setAnalyticsLevel('full')
        } else {
          setAnalyticsLevel(data.analyticsLevel || 'free')
        }
      } else {
        // Fallback based on plan
        const plan = profile?.plan
        if (plan === 'spotlight' || plan === 'pro') setAnalyticsLevel('full')
        else if (plan === 'featured') setAnalyticsLevel('advanced')
        else if (plan === 'starter') setAnalyticsLevel('basic')
        else setAnalyticsLevel('free')
      }
    } catch (error) {
      console.error('Error checking analytics access:', error)
      setAnalyticsLevel('free')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-[#00d083] border-t-transparent rounded-full" />
      </div>
    )
  }

  const isAdvanced = analyticsLevel === 'advanced' || analyticsLevel === 'full'
  const isFull = analyticsLevel === 'full'

  return (
    <div className="space-y-6">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-1">Analytics</h1>
          <p className="text-gray-400">Last {periodDays} days of performance data</p>
        </div>
        <div className="flex items-center gap-1 bg-slate-800/50 border border-slate-700 rounded-lg p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handlePeriodChange(opt.value)}
              disabled={isPending}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                periodDays === opt.value
                  ? 'bg-[#00d083] text-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              } ${isPending ? 'opacity-50' : ''}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* === HEADLINE STATS — always visible === */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          title="Profile Views"
          value={analytics.totalProfileViews.toLocaleString()}
          trend={analytics.viewTrend}
          periodDays={periodDays}
          subtitle={`${analytics.uniqueViewers} unique viewers`}
        />
        <StatCard
          title="Offer Claims"
          value={analytics.totalOfferClaims.toLocaleString()}
          trend={analytics.claimTrend}
          periodDays={periodDays}
          subtitle={`${analytics.activeOffers} active offers`}
        />
        <StatCard
          title="QR Scans"
          value={analytics.totalQRScans.toLocaleString()}
          trend={analytics.qrScanTrend}
          periodDays={periodDays}
          subtitle={`${analytics.uniqueQRScanners} unique ${analytics.uniqueQRScanners === 1 ? 'person' : 'people'}`}
        />
        <StatCard
          title="Saves"
          value={analytics.totalSaves.toLocaleString()}
          trend={analytics.saveTrend}
          periodDays={periodDays}
          subtitle="Users who saved your listing"
        />
        <StatCard
          title="Vibes"
          value={analytics.totalVibes.toLocaleString()}
          subtitle={analytics.positiveVibePercent !== null ? `${analytics.positiveVibePercent}% positive` : 'Not enough data yet'}
        />
        {analytics.bookingClicks > 0 && (
          <StatCard
            title="Booking Clicks"
            value={analytics.bookingClicks.toLocaleString()}
            subtitle={`Tapped Book Now in last ${periodDays} days`}
          />
        )}
      </div>

      {/* === PERFORMANCE TRENDS + TOP OFFERS — Featured+ === */}
      <BlurredSection
        locked={!isAdvanced}
        upgradeMessage="Upgrade to Featured or Spotlight to see performance trends and offer rankings"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Performance Trends</CardTitle>
              <p className="text-xs text-slate-400">Last {periodDays} days — profile views and offer claims</p>
            </CardHeader>
            <CardContent>
              {analytics.dailyData.length > 0 && analytics.dailyData.some(d => d.views > 0 || d.claims > 0) ? (
                <DailyChart data={analytics.dailyData} />
              ) : (
                <div className="h-64 flex items-center justify-center">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <p className="text-gray-400 text-sm">No activity in this period</p>
                    <p className="text-gray-500 text-xs mt-1">Data will appear as customers interact with your listing</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Top Performing Offers</CardTitle>
            </CardHeader>
            <CardContent>
              {analytics.topOffers.length > 0 ? (
                <div className="space-y-4">
                  {analytics.topOffers.map((offer, index) => (
                    <div key={offer.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 bg-[#00d083]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-[#00d083] font-bold">#{index + 1}</span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-medium text-white truncate">{offer.offerName}</h4>
                          <p className="text-sm text-gray-400">{offer.claims} claims</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <svg className="w-12 h-12 text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <p className="text-gray-400 text-sm">No offer claims yet</p>
                  <p className="text-gray-500 text-xs mt-1">Create offers to start tracking performance</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </BlurredSection>

      {/* === PEAK DAYS + FIRST-TIME vs RETURNING — Featured+ === */}
      <BlurredSection
        locked={!isAdvanced}
        upgradeMessage="Upgrade to see when visitors come and how many are returning"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Peak Days</CardTitle>
              <p className="text-xs text-slate-400">When people visit your listing</p>
            </CardHeader>
            <CardContent>
              {analytics.peakDays.length > 0 && analytics.peakDays.some(d => d.views > 0) ? (
                <div className="space-y-3">
                  {analytics.peakDays.map((day) => {
                    const maxViews = Math.max(...analytics.peakDays.map(d => d.views), 1)
                    const pct = (day.views / maxViews) * 100
                    return (
                      <div key={day.day} className="flex items-center gap-3">
                        <span className="text-sm text-slate-400 w-24 flex-shrink-0">{day.day.slice(0, 3)}</span>
                        <div className="flex-1 h-6 bg-slate-700/30 rounded overflow-hidden">
                          <div className="h-full bg-[#00d083]/50 rounded transition-all" style={{ width: `${Math.max(pct, day.views > 0 ? 3 : 0)}%` }} />
                        </div>
                        <span className="text-sm text-white font-medium w-8 text-right">{day.views}</span>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-center text-slate-500 text-sm py-6">No visit data yet</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Visitor Type</CardTitle>
              <p className="text-xs text-slate-400">First-time vs returning visitors</p>
            </CardHeader>
            <CardContent>
              {(analytics.firstTimeVisitors > 0 || analytics.returningVisitors > 0) ? (
                <div className="space-y-4">
                  <BreakdownBar label="First-time visitors" value={analytics.firstTimeVisitors} total={analytics.firstTimeVisitors + analytics.returningVisitors} color="bg-blue-500" />
                  <BreakdownBar label="Returning visitors" value={analytics.returningVisitors} total={analytics.firstTimeVisitors + analytics.returningVisitors} color="bg-[#00d083]" />
                  <div className="mt-4 p-3 bg-slate-700/20 rounded-lg">
                    <p className="text-xs text-slate-400">
                      <span className="text-white font-medium">{analytics.repeatVisitors}</span> people visited more than once
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-center text-slate-500 text-sm py-6">No visitor data yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </BlurredSection>

      {/* === AI DISCOVERY INSIGHTS — Spotlight only === */}
      <BlurredSection
        locked={!isFull}
        upgradeMessage="Upgrade to Spotlight to see how people discover you through AI"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card className="bg-slate-800/50 border-slate-700 border-l-4 border-l-purple-500/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                AI Discovery
              </CardTitle>
              <p className="text-xs text-slate-400">How the AI concierge is recommending you</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <p className="text-2xl font-bold text-purple-400">{analytics.aiMentions}</p>
                  <p className="text-xs text-slate-400">AI recommendations</p>
                </div>
                <div className="text-center p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                  <p className="text-2xl font-bold text-purple-400">{analytics.atlasDirections}</p>
                  <p className="text-xs text-slate-400">Directions via Atlas</p>
                </div>
              </div>
              {analytics.aiMentions === 0 && analytics.atlasDirections === 0 && (
                <p className="text-xs text-slate-500 text-center">AI recommendation data will appear as people chat with the concierge.</p>
              )}
              {analytics.aiMentions > 0 && (
                <p className="text-xs text-slate-400 text-center mt-2">
                  Your business was recommended in {analytics.aiMentions} AI conversation{analytics.aiMentions !== 1 ? 's' : ''} in the last {periodDays} days
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-slate-800/50 border-slate-700 border-l-4 border-l-purple-500/50" style={{ maxHeight: '420px', display: 'flex', flexDirection: 'column' }}>
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                What People Asked
              </CardTitle>
              <p className="text-xs text-slate-400">
                {analytics.aiDiscoveryQueries.length > 0
                  ? `${analytics.aiDiscoveryQueries.reduce((sum, q) => sum + q.count, 0)} unique conversations — last ${periodDays} days`
                  : 'Queries that led the AI to recommend you'}
              </p>
            </CardHeader>
            <div className="px-6 pb-6 overflow-y-auto flex-1" style={{ scrollbarWidth: 'thin', scrollbarColor: '#475569 transparent' }}>
              {analytics.aiDiscoveryQueries.length > 0 ? (
                <div className="space-y-1.5">
                  {analytics.aiDiscoveryQueries.map((q, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 p-2 bg-slate-700/20 rounded-lg">
                      <span className="text-sm text-slate-300 leading-snug">&ldquo;{q.query}&rdquo;</span>
                      <span className="text-xs text-purple-400 font-medium flex-shrink-0 mt-0.5">{q.count}x</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-4">Discovery query data will appear as people chat with the AI.</p>
              )}
            </div>
          </Card>
        </div>
      </BlurredSection>

      {/* === QR SCAN TREND + ACTIVITY — Featured+ === */}
      <BlurredSection
        locked={!isAdvanced}
        upgradeMessage="Upgrade to Featured or Spotlight to see QR scan trends and timing"
      >
        <Card className="bg-slate-800/50 border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-white">QR Scan Trend</CardTitle>
            <p className="text-xs text-slate-400">Last {periodDays} days — scans from your linked QR codes</p>
          </CardHeader>
          <CardContent>
            <QRScanAreaChart data={analytics.dailyData} />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Viewer Breakdown</CardTitle>
              <p className="text-xs text-slate-400">Last {periodDays} days</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <BreakdownBar label="Registered users" value={analytics.registeredViewers} total={analytics.totalProfileViews} color="bg-[#00d083]" />
                <BreakdownBar label="Anonymous viewers" value={analytics.anonymousViewers} total={analytics.totalProfileViews} color="bg-slate-500" />
                <BreakdownBar label="Unique viewers" value={analytics.uniqueViewers} total={analytics.totalProfileViews} color="bg-blue-500" />
              </div>
              {analytics.totalProfileViews === 0 && (
                <p className="text-center text-slate-500 text-sm mt-6">No profile views recorded yet</p>
              )}
            </CardContent>
          </Card>

          {analytics.totalQRScans > 0 && (
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
              <CardTitle className="text-white">QR Scan Activity</CardTitle>
              <p className="text-xs text-slate-400">When people scan your codes — last {periodDays} days</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <BreakdownBar label="Morning (6am-12pm)" value={analytics.qrScansByTime.morning} total={analytics.totalQRScans} color="bg-amber-400" />
                  <BreakdownBar label="Afternoon (12-5pm)" value={analytics.qrScansByTime.afternoon} total={analytics.totalQRScans} color="bg-orange-500" />
                  <BreakdownBar label="Evening (5-10pm)" value={analytics.qrScansByTime.evening} total={analytics.totalQRScans} color="bg-purple-500" />
                  <BreakdownBar label="Night (10pm-6am)" value={analytics.qrScansByTime.night} total={analytics.totalQRScans} color="bg-indigo-500" />
                </div>
                <p className="text-center text-slate-500 text-xs mt-4">
                  {analytics.uniqueQRScanners} unique {analytics.uniqueQRScanners === 1 ? 'person' : 'people'} scanned your codes
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </BlurredSection>

      {/* === LOYALTY STATS — only if business has loyalty === */}
      {analytics.loyaltyMembers !== null && (
        <BlurredSection
          locked={!isAdvanced}
          upgradeMessage="Upgrade to see loyalty program insights"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Loyalty Members"
              value={analytics.loyaltyMembers.toLocaleString()}
              subtitle="Active program members"
            />
            <StatCard
              title="Stamps Earned"
              value={(analytics.loyaltyStampEarns || 0).toLocaleString()}
              subtitle={`Verified in-store visits — last ${periodDays} days`}
            />
            <StatCard
              title="Rewards Redeemed"
              value={(analytics.loyaltyRedemptions || 0).toLocaleString()}
              subtitle={`Rewards claimed — last ${periodDays} days`}
            />
          </div>
        </BlurredSection>
      )}
    </div>
  )
}
