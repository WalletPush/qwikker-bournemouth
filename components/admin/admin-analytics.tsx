'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface AnalyticsData {
  city: string
  cityDisplayName: string
  metrics: {
    passesCreated: number
    passesInstalled: number
    installationRate: string
    offersClaimed: number
    offersRedeemed: number
    redemptionRate: string
    activeBusinesses: number
    totalOffers: number
    secretMenuItems: number
  }
  rfm: {
    recency: { Recent: number; Moderate: number; Distant: number }
    frequency: { Frequent: number; Regular: number; Rare: number }
    monetary: { High: number; Medium: number; Low: number }
  }
  trends: {
    passGrowth: string
    offerGrowth: string
    businessGrowth: string
  }
}

export function AdminAnalytics({ city }: { city: string }) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'rfm'>('overview')

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/admin/analytics')
      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="text-center text-slate-400 py-12">
        <p>Failed to load analytics data</p>
      </div>
    )
  }

  const { metrics, rfm, trends } = analytics

  const PieChart = ({ data, colors }: { data: Record<string, number>, colors: Record<string, string> }) => (
    <div className="relative w-32 h-32 mx-auto">
      <div className="w-full h-full rounded-full" style={{
        background: `conic-gradient(${Object.entries(data).map(([key, value], index) => 
          `${colors[key]} ${index === 0 ? 0 : Object.values(data).slice(0, index).reduce((a, b) => a + b, 0) * 3.6}deg ${Object.values(data).slice(0, index + 1).reduce((a, b) => a + b, 0) * 3.6}deg`
        ).join(', ')})`
      }}>
        <div className="absolute inset-2 bg-slate-800 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-bold">100%</span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-100 mb-2">
          📊 {analytics.cityDisplayName} Performance Dashboard
        </h1>
        <p className="text-slate-400">Local user engagement and business metrics for your city</p>
        <div className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-[#00d083]/20 border border-[#00d083]/30 rounded-full">
          <div className="w-2 h-2 bg-[#00d083] rounded-full animate-pulse"></div>
          <span className="text-[#00d083] text-sm font-medium">Live Data from {analytics.cityDisplayName}</span>
        </div>
      </div>

      {/* View Mode Selector */}
      <div className="flex justify-center">
        <div className="inline-flex bg-slate-800/50 rounded-lg p-1 border border-slate-700">
          <Button
            onClick={() => setViewMode('overview')}
            variant={viewMode === 'overview' ? 'default' : 'ghost'}
            size="sm"
            className={viewMode === 'overview' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}
          >
            📊 Overview
          </Button>
          <Button
            onClick={() => setViewMode('detailed')}
            variant={viewMode === 'detailed' ? 'default' : 'ghost'}
            size="sm"
            className={viewMode === 'detailed' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}
          >
            📈 Detailed
          </Button>
          <Button
            onClick={() => setViewMode('rfm')}
            variant={viewMode === 'rfm' ? 'default' : 'ghost'}
            size="sm"
            className={viewMode === 'rfm' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}
          >
            🎯 User Segments
          </Button>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Essential Metrics Only */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 border-blue-700/30">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-400 mb-1">{metrics.passesCreated}</div>
                <div className="text-xs text-slate-400">Total Users</div>
                <div className="text-xs text-blue-300 mt-1">🔵 REAL DATA</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-900/20 to-green-800/20 border-green-700/30">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-400 mb-1">{metrics.activeBusinesses}</div>
                <div className="text-xs text-slate-400">Active Businesses</div>
                <div className="text-xs text-green-300 mt-1">🟢 REAL DATA</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/20 border-purple-700/30">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-purple-400 mb-1">{metrics.totalOffers}</div>
                <div className="text-xs text-slate-400">Business Offers</div>
                <div className="text-xs text-purple-300 mt-1">🟣 REAL DATA</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/20 border-yellow-700/30">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400 mb-1">{metrics.secretMenuItems}</div>
                <div className="text-xs text-slate-400">Secret Items</div>
                <div className="text-xs text-yellow-300 mt-1">🟡 REAL DATA</div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Summary */}
          <Card className="bg-slate-800/30 border-slate-700">
            <CardContent className="p-6">
              <h3 className="text-lg font-bold text-slate-100 mb-4">📋 Quick Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-400">Pass Install Rate:</span>
                  <span className="ml-2 text-white font-semibold">{metrics.installationRate}%</span>
                  <span className="ml-2 text-blue-400 text-xs">🔵 REAL</span>
                </div>
                <div>
                  <span className="text-slate-400">Avg Secret Items/Business:</span>
                  <span className="ml-2 text-white font-semibold">{(metrics.secretMenuItems / Math.max(metrics.activeBusinesses, 1)).toFixed(1)}</span>
                  <span className="ml-2 text-green-400 text-xs">🟢 CALCULATED</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {viewMode === 'detailed' && (
        <div className="space-y-6">
          {/* All Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 border-blue-700/30">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-blue-400 mb-2">{metrics.passesCreated}</div>
                <div className="text-sm text-slate-400">Passes Created</div>
                <div className="text-xs text-blue-300 mt-1">🔵 REAL DATA</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-900/20 to-yellow-800/20 border-yellow-700/30">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-yellow-400 mb-2">{metrics.passesInstalled}</div>
                <div className="text-sm text-slate-400">Passes Installed</div>
                <div className="text-xs text-yellow-300 mt-1">🟡 REAL DATA</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-900/20 to-green-800/20 border-green-700/30">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-green-400 mb-2">{metrics.activeBusinesses}</div>
                <div className="text-sm text-slate-400">Active Businesses</div>
                <div className="text-xs text-green-300 mt-1">🟢 REAL DATA</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-gray-900/20 to-gray-800/20 border-gray-700/30">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-gray-400 mb-2">{metrics.offersClaimed}</div>
                <div className="text-sm text-slate-400">Offers Claimed</div>
                <div className="text-xs text-red-300 mt-1">🔴 SIMULATED</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-teal-900/20 to-teal-800/20 border-teal-700/30">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-teal-400 mb-2">{metrics.offersRedeemed}</div>
                <div className="text-sm text-slate-400">Offers Redeemed</div>
                <div className="text-xs text-red-300 mt-1">🔴 SIMULATED</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-900/20 to-purple-800/20 border-purple-700/30">
              <CardContent className="p-6 text-center">
                <div className="text-3xl font-bold text-purple-400 mb-2">{metrics.secretMenuItems}</div>
                <div className="text-sm text-slate-400">Secret Menu Items</div>
                <div className="text-xs text-purple-300 mt-1">🟣 REAL DATA</div>
              </CardContent>
            </Card>
          </div>

          {/* City Performance Summary */}
          <div className="bg-gradient-to-r from-slate-800/50 to-slate-700/50 border border-slate-600 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-slate-100 mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-[#00d083]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {analytics.cityDisplayName} Market Overview
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{metrics.installationRate}%</div>
                <div className="text-slate-400">Pass Install Rate</div>
                <div className="text-xs text-blue-300 mt-1">🔵 REAL</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-400">{metrics.redemptionRate}%</div>
                <div className="text-slate-400">Offer Redemption</div>
                <div className="text-xs text-red-300 mt-1">🔴 SIMULATED</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{(metrics.secretMenuItems / Math.max(metrics.activeBusinesses, 1)).toFixed(1)}</div>
                <div className="text-slate-400">Avg Secret Items</div>
                <div className="text-xs text-green-300 mt-1">🟢 CALCULATED</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{(metrics.totalOffers / Math.max(metrics.activeBusinesses, 1)).toFixed(1)}</div>
                <div className="text-slate-400">Avg Offers</div>
                <div className="text-xs text-green-300 mt-1">🟢 CALCULATED</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'rfm' && (
        <div className="space-y-6">
          {/* Data Quality Warning */}
          <Card className="bg-orange-900/20 border-orange-700/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="text-orange-400">⚠️</div>
                <div>
                  <h3 className="text-orange-300 font-semibold">RFM Analysis - Mixed Data Quality</h3>
                  <p className="text-orange-200 text-sm mt-1">
                    This analysis uses REAL user data for recency, but frequency/monetary are calculated from limited user stats. 
                    Full transaction tracking needed for accurate RFM.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* RFM Analysis */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  Recency 
                  <span className="text-xs bg-blue-600 px-2 py-1 rounded">🔵 REAL</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PieChart 
                  data={rfm.recency}
                  colors={{
                    Recent: '#3B82F6',
                    Moderate: '#10B981', 
                    Distant: '#F59E0B'
                  }}
                />
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-slate-300">Recent (≤7 days)</span>
                    </div>
                    <span className="text-slate-400">{rfm.recency.Recent.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-slate-300">Moderate (8-30 days)</span>
                    </div>
                    <span className="text-slate-400">{rfm.recency.Moderate.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-slate-300">Distant (&gt;30 days)</span>
                    </div>
                    <span className="text-slate-400">{rfm.recency.Distant.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  Frequency 
                  <span className="text-xs bg-red-600 px-2 py-1 rounded">🔴 LIMITED</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PieChart 
                  data={rfm.frequency}
                  colors={{
                    Frequent: '#3B82F6',
                    Regular: '#10B981',
                    Rare: '#F59E0B'
                  }}
                />
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-slate-300">Frequent (≥5 visits)</span>
                    </div>
                    <span className="text-slate-400">{rfm.frequency.Frequent.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-slate-300">Regular (2-4 visits)</span>
                    </div>
                    <span className="text-slate-400">{rfm.frequency.Regular.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-slate-300">Rare (&lt;2 visits)</span>
                    </div>
                    <span className="text-slate-400">{rfm.frequency.Rare.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  Monetary 
                  <span className="text-xs bg-red-600 px-2 py-1 rounded">🔴 LIMITED</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PieChart 
                  data={rfm.monetary}
                  colors={{
                    High: '#3B82F6',
                    Medium: '#10B981',
                    Low: '#F59E0B'
                  }}
                />
                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-slate-300">High (≥£5)</span>
                    </div>
                    <span className="text-slate-400">{rfm.monetary.High.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-slate-300">Medium (£2-£5)</span>
                    </div>
                    <span className="text-slate-400">{rfm.monetary.Medium.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                      <span className="text-slate-300">Low (&lt;£2)</span>
                    </div>
                    <span className="text-slate-400">{rfm.monetary.Low.toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
