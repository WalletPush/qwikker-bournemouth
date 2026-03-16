'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ElegantModal } from '@/components/ui/elegant-modal'
import type { BusinessAnalytics } from '@/lib/actions/business-analytics-actions'

interface AnalyticsPageClientProps {
  profile: any
  analytics: BusinessAnalytics
}

function DailyChart({ data }: { data: BusinessAnalytics['dailyVisits'] }) {
  const maxVisits = Math.max(...data.map(d => d.visits), 1)
  const maxClaims = Math.max(...data.map(d => d.claims), 1)
  const maxVal = Math.max(maxVisits, maxClaims)

  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <div className="w-3 h-3 rounded-sm bg-[#00d083]/70" />
          Visits
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <div className="w-3 h-3 rounded-sm bg-blue-500/70" />
          Claims
        </div>
      </div>
      <div className="flex items-end gap-[2px] h-48">
        {data.map((day) => {
          const visitHeight = maxVal > 0 ? (day.visits / maxVal) * 100 : 0
          const claimHeight = maxVal > 0 ? (day.claims / maxVal) * 100 : 0
          const label = new Date(day.date + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-[1px] group relative" title={`${label}: ${day.visits} visits, ${day.claims} claims`}>
              <div className="w-full flex flex-col items-center gap-[1px] flex-1 justify-end">
                <div
                  className="w-full rounded-t-sm bg-[#00d083]/60 group-hover:bg-[#00d083] transition-colors min-h-[1px]"
                  style={{ height: `${Math.max(visitHeight, day.visits > 0 ? 2 : 0)}%` }}
                />
                {day.claims > 0 && (
                  <div
                    className="w-full rounded-t-sm bg-blue-500/60 group-hover:bg-blue-500 transition-colors"
                    style={{ height: `${Math.max(claimHeight, 2)}%` }}
                  />
                )}
              </div>
              <div className="absolute -bottom-5 text-[8px] text-slate-500 hidden group-hover:block whitespace-nowrap">
                {label}
              </div>
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
        // Fallback to old system
        setHasAnalyticsAccess(profile?.plan === 'spotlight' || profile?.plan === 'pro')
      }
    } catch (error) {
      console.error('Error checking analytics access:', error)
      // Fallback to old system
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
      {/* Show upgrade modal for non-Spotlight users */}
      {!hasAnalyticsAccess && (
        <ElegantModal
          isOpen={showModal}
          onClose={() => {
            window.location.href = '/dashboard'
          }}
          title="Analytics Dashboard"
          description="Get deep insights into your business performance with detailed analytics and reporting."
          type="info"
          size="md"
          actions={[
            {
              label: 'Upgrade to Spotlight',
              onClick: () => {
                window.location.href = '/dashboard/settings'
              },
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
                  <span>Search visibility & impressions tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                  <span>Offer performance & conversion rates</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                  <span>Customer demographics & behavior insights</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-[#00d083] rounded-full"></div>
                  <span>Export data & performance tracking</span>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-400 text-center">
              Available on Spotlight plan • Data is anonymized & privacy-friendly
            </p>
          </div>
        </ElegantModal>
      )}

      {/* Content - blurred for non-Spotlight users */}
      <div className={!hasAnalyticsAccess && showModal ? "blur-[8px] select-none pointer-events-none" : ""}>
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Analytics Overview</h1>
          <p className="text-gray-400">Track your business performance and customer engagement</p>
        </div>

      {/* Key Metrics - REAL DATA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Total Visits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics.totalVisits.toLocaleString()}</div>
            <p className={`text-xs flex items-center gap-1 ${analytics.visitTrend >= 0 ? 'text-[#00d083]' : 'text-red-400'}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={analytics.visitTrend >= 0 ? "M7 17l9.2-9.2M17 17V7H7" : "M17 7l-9.2 9.2M7 7v10h10"} />
              </svg>
              {analytics.visitTrend >= 0 ? '+' : ''}{analytics.visitTrend.toFixed(1)}% from last month
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {analytics.uniqueVisitors} unique • {analytics.registeredVisitors} registered
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Offer Claims</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics.totalOfferClaims.toLocaleString()}</div>
            <p className={`text-xs flex items-center gap-1 ${analytics.claimTrend >= 0 ? 'text-[#00d083]' : 'text-red-400'}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={analytics.claimTrend >= 0 ? "M7 17l9.2-9.2M17 17V7H7" : "M17 7l-9.2 9.2M7 7v10h10"} />
              </svg>
              {analytics.claimTrend >= 0 ? '+' : ''}{analytics.claimTrend.toFixed(1)}% from last month
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {analytics.activeOffers} active offers
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics.conversionRate.toFixed(2)}%</div>
            <p className="text-xs text-slate-400">
              Visits to offer claims
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {analytics.avgVisitsPerUser.toFixed(1)} avg visits/user
            </p>
          </CardContent>
        </Card>

      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Performance Chart - Real daily data */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Performance Trends</CardTitle>
            <p className="text-xs text-slate-400">Last 30 days — visits and offer claims</p>
          </CardHeader>
          <CardContent>
            {analytics.dailyVisits.length > 0 && analytics.dailyVisits.some(d => d.visits > 0 || d.claims > 0) ? (
              <DailyChart data={analytics.dailyVisits} />
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

        {/* Top Offers - REAL DATA */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Top Performing Offers</CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.topOffers.length > 0 ? (
              <div className="space-y-4">
                {analytics.topOffers.map((offer, index) => {
                  const conversionRate = analytics.totalVisits > 0 
                    ? (offer.claims / analytics.totalVisits) * 100 
                    : 0
                  
                  return (
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
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-[#00d083] font-semibold">{conversionRate.toFixed(2)}%</p>
                        <p className="text-xs text-gray-400">conversion</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <svg className="w-12 h-12 text-gray-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-gray-400 text-sm">No offer claims yet</p>
                <p className="text-gray-500 text-xs mt-1">Create offers to start tracking claims</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Visitor Breakdown */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Visitor Breakdown</CardTitle>
          <p className="text-xs text-slate-400">Last 30 days</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <BreakdownBar label="Registered users" value={analytics.registeredVisitors} total={analytics.totalVisits} color="bg-[#00d083]" />
            <BreakdownBar label="Anonymous visitors" value={analytics.anonymousVisitors} total={analytics.totalVisits} color="bg-slate-500" />
            <BreakdownBar label="Unique visitors" value={analytics.uniqueVisitors} total={analytics.totalVisits} color="bg-blue-500" />
          </div>
          {analytics.totalVisits === 0 && (
            <p className="text-center text-slate-500 text-sm mt-6">No visits recorded yet</p>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  )
}