'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ElegantModal } from '@/components/ui/elegant-modal'
import type { BusinessAnalytics } from '@/lib/actions/business-analytics-actions'

interface AnalyticsPageClientProps {
  profile: any
  analytics: BusinessAnalytics
}

const CHART_HEIGHT = 180

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

  // Build SVG area chart path
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
        {/* Hover overlay with tooltips */}
        <div className="absolute inset-0 flex">
          {data.map((day, i) => {
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

function TrendBadge({ value }: { value: number }) {
  const isPositive = value >= 0
  return (
    <p className={`text-xs flex items-center gap-1 ${isPositive ? 'text-[#00d083]' : 'text-red-400'}`}>
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isPositive ? "M7 17l9.2-9.2M17 17V7H7" : "M17 7l-9.2 9.2M7 7v10h10"} />
      </svg>
      {isPositive ? '+' : ''}{value.toFixed(1)}% from last month
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
        {trend !== undefined && <TrendBadge value={trend} />}
        {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}

export function AnalyticsPageClient({ profile, analytics }: AnalyticsPageClientProps) {
  const [showModal, setShowModal] = useState(true)
  const [hasAnalyticsAccess, setHasAnalyticsAccess] = useState(false)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    checkAnalyticsAccess()
  }, [profile])

  const checkAnalyticsAccess = async () => {
    if (!profile?.id) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/user/feature-access?feature=analytics')
      
      if (response.ok) {
        const data = await response.json()
        setHasAnalyticsAccess(data.hasAccess)
      } else {
        setHasAnalyticsAccess(profile?.plan === 'spotlight' || profile?.plan === 'pro')
      }
    } catch (error) {
      console.error('Error checking analytics access:', error)
      setHasAnalyticsAccess(profile?.plan === 'spotlight' || profile?.plan === 'pro')
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
  return (
    <div className="space-y-6">
      {!hasAnalyticsAccess && (
        <ElegantModal
          isOpen={showModal}
          onClose={() => { window.location.href = '/dashboard' }}
          title="Analytics Dashboard"
          description="Get deep insights into your business performance with detailed analytics and reporting."
          type="info"
          size="md"
          actions={[
            {
              label: 'Upgrade to Spotlight',
              onClick: () => { window.location.href = '/dashboard/settings' },
              variant: 'default',
              className: 'bg-gradient-to-r from-[#00d083] to-[#00b86f] hover:from-[#00b86f] hover:to-[#00a05c] text-black font-semibold'
            }
          ]}
        >
          <div className="space-y-4">
            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <h4 className="font-medium text-blue-400 mb-3">Unlock Advanced Analytics</h4>
              <div className="space-y-2 text-sm text-slate-300">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                  <span>Profile views, saves, and engagement tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                  <span>Offer performance and claim trends</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                  <span>Loyalty program insights</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                  <span>30-day performance trends</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400 text-center">
              Available on Spotlight plan. Data is anonymized and privacy-friendly.
            </p>
          </div>
        </ElegantModal>
      )}

      <div className={!hasAnalyticsAccess && showModal ? "blur-[8px] select-none pointer-events-none" : ""}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
          <p className="text-gray-400">Last 30 days of performance data</p>
        </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard
          title="Profile Views"
          value={analytics.totalProfileViews.toLocaleString()}
          trend={analytics.viewTrend}
          subtitle={`${analytics.uniqueViewers} unique viewers`}
        />
        <StatCard
          title="Offer Claims"
          value={analytics.totalOfferClaims.toLocaleString()}
          trend={analytics.claimTrend}
          subtitle={`${analytics.activeOffers} active offers`}
        />
        <StatCard
          title="QR Scans"
          value={analytics.totalQRScans.toLocaleString()}
          trend={analytics.qrScanTrend}
          subtitle={`${analytics.uniqueQRScanners} unique ${analytics.uniqueQRScanners === 1 ? 'person' : 'people'}`}
        />
        <StatCard
          title="Saves"
          value={analytics.totalSaves.toLocaleString()}
          trend={analytics.saveTrend}
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
            subtitle="Tapped Book Now in last 30 days"
          />
        )}
      </div>

      {/* Loyalty Stats (only if business has loyalty) */}
      {analytics.loyaltyMembers !== null && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            title="Loyalty Members"
            value={analytics.loyaltyMembers.toLocaleString()}
            subtitle="Active program members"
          />
          <StatCard
            title="Stamps Earned"
            value={(analytics.loyaltyStampEarns || 0).toLocaleString()}
            subtitle="Verified in-store visits this month"
          />
          <StatCard
            title="Rewards Redeemed"
            value={(analytics.loyaltyRedemptions || 0).toLocaleString()}
            subtitle="Rewards claimed this month"
          />
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Performance Trends</CardTitle>
            <p className="text-xs text-slate-400">Last 30 days — profile views and offer claims</p>
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
                  <p className="text-gray-400 text-sm">No activity yet this month</p>
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
                        <p className="text-sm text-gray-400">{offer.claims} claims this month</p>
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

      {/* QR Scan Trend — Mountain Chart */}
      <Card className="bg-slate-800/50 border-slate-700 mb-8">
        <CardHeader>
          <CardTitle className="text-white">QR Scan Trend</CardTitle>
          <p className="text-xs text-slate-400">Last 30 days — scans from your linked QR codes</p>
        </CardHeader>
        <CardContent>
          <QRScanAreaChart data={analytics.dailyData} />
        </CardContent>
      </Card>

      {/* Viewer & Scan Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Viewer Breakdown</CardTitle>
            <p className="text-xs text-slate-400">Last 30 days</p>
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
              <p className="text-xs text-slate-400">When people scan your codes — last 30 days</p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <BreakdownBar label="Morning (6am–12pm)" value={analytics.qrScansByTime.morning} total={analytics.totalQRScans} color="bg-amber-400" />
                <BreakdownBar label="Afternoon (12–5pm)" value={analytics.qrScansByTime.afternoon} total={analytics.totalQRScans} color="bg-orange-500" />
                <BreakdownBar label="Evening (5–10pm)" value={analytics.qrScansByTime.evening} total={analytics.totalQRScans} color="bg-purple-500" />
                <BreakdownBar label="Night (10pm–6am)" value={analytics.qrScansByTime.night} total={analytics.totalQRScans} color="bg-indigo-500" />
              </div>
              <p className="text-center text-slate-500 text-xs mt-4">
                {analytics.uniqueQRScanners} unique {analytics.uniqueQRScanners === 1 ? 'person' : 'people'} scanned your codes
              </p>
            </CardContent>
          </Card>
        )}
      </div>
      </div>
    </div>
  )
}
