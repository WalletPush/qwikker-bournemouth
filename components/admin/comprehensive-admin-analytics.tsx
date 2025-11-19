'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminAnalytics, getAdminAnalytics } from '@/lib/actions/admin-analytics-actions'
import { getAdminActivity, AdminActivity } from '@/lib/actions/admin-activity-actions'
import { getRealQRAnalytics } from '@/lib/actions/real-qr-actions'
import { QRAnalyticsDetailed } from './qr-analytics-detailed'

interface OfferClaimTrend {
  date: string
  claims: number
  business_name: string
}

interface BusinessPerformance {
  business_name: string
  total_visits: number
  offer_claims: number
  conversion_rate: number
  last_activity: string
}

interface ComprehensiveAnalytics extends AdminAnalytics {
  offerClaimTrends: OfferClaimTrend[]
  topBusinesses: BusinessPerformance[]
  recentActivity: AdminActivity[]
  passInstallRate: number
  averageVisitsPerUser: number
  realQRData: {
    marketing: { total_scans: number, categories: Record<string, number> }
    business_static: { total_scans: number, categories: Record<string, number> }
    business_dynamic: { total_scans: number, categories: Record<string, number> }
  }
}

export function ComprehensiveAdminAnalytics({ city }: { city: string }) {
  const [analytics, setAnalytics] = useState<ComprehensiveAnalytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'activity' | 'offers' | 'businesses' | 'qr'>('overview')
  const [expandedSections, setExpandedSections] = useState<{[key: string]: boolean}>({
    qwikkerMarketing: false,
    staticBusiness: false,
    dynamicBusiness: false
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  useEffect(() => {
    fetchComprehensiveAnalytics()
  }, [city])

  const fetchComprehensiveAnalytics = async () => {
    setLoading(true)
    try {
      // Fetch basic analytics
      const basicAnalytics = await getAdminAnalytics(city)
      
      // Fetch recent activity
      const recentActivity = await getAdminActivity(city, 10)
      
      // Fetch real QR analytics
      const realQRData = await getRealQRAnalytics(city, 30)
      
      // Fetch additional data from API
      const response = await fetch(`/api/admin/comprehensive-analytics?city=${city}`)
      const additionalData = await response.json()

      const comprehensiveAnalytics: ComprehensiveAnalytics = {
        ...basicAnalytics,
        recentActivity: recentActivity || [],
        offerClaimTrends: additionalData.offerClaimTrends || [],
        topBusinesses: additionalData.topBusinesses || [],
        passInstallRate: additionalData.passInstallRate || 0,
        averageVisitsPerUser: additionalData.averageVisitsPerUser || 0,
        realQRData
      }

      setAnalytics(comprehensiveAnalytics)
    } catch (error) {
      console.error('Failed to fetch comprehensive analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
              <div className="animate-pulse">
                <div className="h-8 bg-slate-600 rounded w-1/2 mb-2"></div>
                <div className="h-4 bg-slate-600 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400">Unable to load analytics data</p>
      </div>
    )
  }

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'userAdd':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        )
      case 'wallet':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        )
      case 'gift':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
        )
      case 'mapPin':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
      case 'checkCircle':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-700 pb-4">
        {[
          { id: 'overview', label: 'Overview', icon: 'chart-bar' },
          { id: 'qr', label: 'QR Performance', icon: 'qr-code' },
          { id: 'activity', label: 'Live Activity', icon: 'activity' },
          { id: 'offers', label: 'Offer Analytics', icon: 'gift' },
          { id: 'businesses', label: 'Business Performance', icon: 'building' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === tab.id 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50'
            }`}
          >
            {/* Icon */}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {tab.icon === 'chart-bar' && (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              )}
              {tab.icon === 'qr-code' && (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              )}
              {tab.icon === 'activity' && (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              )}
              {tab.icon === 'gift' && (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              )}
              {tab.icon === 'building' && (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              )}
            </svg>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-400 mb-1">{analytics.totalUsers}</div>
                <div className="text-xs text-slate-400">Total Users</div>
                <div className="text-xs text-green-400 mt-1">
                  +{analytics.recentSignups} this week
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">{analytics.activeUsers}</div>
                <div className="text-xs text-slate-400">Active Users</div>
                <div className="text-xs text-blue-400 mt-1">
                  {analytics.totalUsers > 0 ? Math.round((analytics.activeUsers / analytics.totalUsers) * 100) : 0}% of total
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-400 mb-1">{analytics.approvedBusinesses}</div>
                <div className="text-xs text-slate-400">Active Businesses</div>
                <div className="text-xs text-orange-400 mt-1">
                  {analytics.pendingApplications} pending
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400 mb-1">{analytics.totalOffersClaimed}</div>
                <div className="text-xs text-slate-400">Offers Claimed</div>
                <div className="text-xs text-green-400 mt-1">
                  {analytics.approvedBusinesses > 0 ? Math.round(analytics.totalOffersClaimed / analytics.approvedBusinesses) : 0} avg per business
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-orange-400 mb-1">{analytics.totalBusinessVisits}</div>
                <div className="text-xs text-slate-400">Business Visits</div>
                <div className="text-xs text-blue-400 mt-1">
                  {analytics.averageVisitsPerUser.toFixed(1)} per user
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-cyan-400 mb-1">{analytics.passInstallRate}%</div>
                <div className="text-xs text-slate-400">Pass Install Rate</div>
                <div className="text-xs text-green-400 mt-1">
                  Industry avg: 65%
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Growth Trends */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">User Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-2xl font-bold text-white">{analytics.recentSignups}</div>
                    <div className="text-sm text-slate-400">New users this week</div>
                  </div>
                  <div className={`text-lg font-semibold ${analytics.userGrowthPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {analytics.userGrowthPercentage >= 0 ? '+' : ''}{analytics.userGrowthPercentage}%
                  </div>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-blue-400 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(Math.abs(analytics.userGrowthPercentage), 100)}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Business Growth</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-2xl font-bold text-white">{analytics.approvedBusinesses}</div>
                    <div className="text-sm text-slate-400">Active businesses</div>
                  </div>
                  <div className={`text-lg font-semibold ${analytics.businessGrowthPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {analytics.businessGrowthPercentage >= 0 ? '+' : ''}{analytics.businessGrowthPercentage}%
                  </div>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className="bg-purple-400 h-2 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(Math.abs(analytics.businessGrowthPercentage), 100)}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Live Activity Tab */}
      {activeTab === 'activity' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">Live Activity Feed</h3>
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              Real-time updates
            </div>
          </div>
          
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {analytics.recentActivity.map((activity, index) => (
              <Card key={index} className="bg-slate-800/30 border-slate-700 hover:bg-slate-700/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activity.color}`}>
                      {getIcon(activity.iconType)}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium text-sm">{activity.message}</div>
                      <div className="text-slate-400 text-xs mt-1">{activity.timestamp}</div>
                      {activity.details && (
                        <div className="text-slate-300 text-xs mt-1 bg-slate-700/50 rounded px-2 py-1">
                          {activity.details}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {analytics.recentActivity.length === 0 && (
              <div className="text-center py-8 text-slate-400">
                No recent activity to display
              </div>
            )}
          </div>
        </div>
      )}

      {/* Offer Analytics Tab */}
      {activeTab === 'offers' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-2">{analytics.totalOffersClaimed}</div>
                <div className="text-sm text-slate-400">Total Claims</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">
                  {analytics.approvedBusinesses > 0 ? Math.round(analytics.totalOffersClaimed / analytics.approvedBusinesses) : 0}
                </div>
                <div className="text-sm text-slate-400">Avg Claims/Business</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 border-slate-700">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">
                  {analytics.totalBusinessVisits > 0 ? Math.round((analytics.totalOffersClaimed / analytics.totalBusinessVisits) * 100) : 0}%
                </div>
                <div className="text-sm text-slate-400">Conversion Rate</div>
              </CardContent>
            </Card>
          </div>

          {/* Offer Claim Trends */}
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Recent Offer Claims</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.offerClaimTrends.slice(0, 10).map((trend, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                    <div>
                      <div className="text-white font-medium">{trend.business_name}</div>
                      <div className="text-slate-400 text-sm">{new Date(trend.date).toLocaleDateString()}</div>
                    </div>
                    <div className="text-yellow-400 font-semibold">
                      {trend.claims} claim{trend.claims !== 1 ? 's' : ''}
                    </div>
                  </div>
                ))}
                {analytics.offerClaimTrends.length === 0 && (
                  <div className="text-center py-4 text-slate-400">
                    No offer claims yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Business Performance Tab */}
      {activeTab === 'businesses' && (
        <div className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white">Top Performing Businesses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics.topBusinesses.map((business, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        #{index + 1}
                      </div>
                      <div>
                        <div className="text-white font-medium">{business.business_name}</div>
                        <div className="text-slate-400 text-sm">
                          Last active: {new Date(business.last_activity).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-blue-400 font-semibold">{business.total_visits}</div>
                          <div className="text-slate-400 text-xs">Visits</div>
                        </div>
                        <div>
                          <div className="text-yellow-400 font-semibold">{business.offer_claims}</div>
                          <div className="text-slate-400 text-xs">Claims</div>
                        </div>
                        <div>
                          <div className="text-green-400 font-semibold">{business.conversion_rate}%</div>
                          <div className="text-slate-400 text-xs">Rate</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {analytics.topBusinesses.length === 0 && (
                  <div className="text-center py-4 text-slate-400">
                    No business performance data yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* QR Performance Tab - NEW DETAILED ANALYTICS */}
      {activeTab === 'qr' && (
        <QRAnalyticsDetailed city={city} />
      )}

    </div>
  )
}
