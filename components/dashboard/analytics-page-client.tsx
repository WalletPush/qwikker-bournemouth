'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ElegantModal } from '@/components/ui/elegant-modal'
import type { BusinessAnalytics } from '@/lib/actions/business-analytics-actions'

interface AnalyticsPageClientProps {
  profile: any
  analytics: BusinessAnalytics
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
                  <span>Export data & QR code tracking</span>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-400">QR Code Scans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{analytics.totalQRScans.toLocaleString()}</div>
            <p className={`text-xs flex items-center gap-1 ${analytics.qrScanTrend >= 0 ? 'text-[#00d083]' : 'text-red-400'}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={analytics.qrScanTrend >= 0 ? "M7 17l9.2-9.2M17 17V7H7" : "M17 7l-9.2 9.2M7 7v10h10"} />
              </svg>
              {analytics.qrScanTrend >= 0 ? '+' : ''}{analytics.qrScanTrend.toFixed(1)}% from last month
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Last 30 days
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Performance Chart */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Performance Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 bg-slate-700/30 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <svg className="w-16 h-16 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-gray-400">Interactive performance chart</p>
              </div>
            </div>
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

      {/* Customer Demographics */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Customer Demographics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="h-32 w-32 bg-slate-700/30 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-2">Age Groups</h3>
              <p className="text-sm text-gray-400">Detailed age breakdown</p>
            </div>
            <div className="text-center">
              <div className="h-32 w-32 bg-slate-700/30 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-2">Locations</h3>
              <p className="text-sm text-gray-400">Geographic distribution</p>
            </div>
            <div className="text-center">
              <div className="h-32 w-32 bg-slate-700/30 rounded-full mx-auto mb-4 flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-white mb-2">Devices</h3>
              <p className="text-sm text-gray-400">Mobile vs desktop usage</p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  )
}