'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, TrendingUp, Users, Clock, Globe, Monitor, Smartphone } from 'lucide-react'
import { getAdminQRAnalytics } from '@/lib/actions/admin-qr-analytics-actions'

interface CountMap {
  [key: string]: number
}

interface QRAnalytics {
  qr_code: string
  qr_name: string
  business_name: string | null
  category: string | null
  qr_type: string | null
  total_scans: number
  unique_scans: number
  last_scanned: string | null
  os_breakdown: CountMap
  browser_breakdown: CountMap
  peak_times: { morning: number; afternoon: number; evening: number; night: number }
}

interface DailyScan {
  date: string
  scans: number
}

interface QRAnalyticsProps {
  city: string
}

function BreakdownBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-300 text-sm w-20 truncate">{label}</span>
      <div className="flex-1 bg-slate-700 rounded-full h-2.5 overflow-hidden">
        <div className={`${color} h-full rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-slate-400 text-xs w-16 text-right">{value} ({pct}%)</span>
    </div>
  )
}

function PeakTimeChart({ times }: { times: { morning: number; afternoon: number; evening: number; night: number } }) {
  const entries = [
    { label: '6am–12pm', short: 'Morning', value: times.morning, color: 'from-amber-400 to-amber-500' },
    { label: '12pm–6pm', short: 'Afternoon', value: times.afternoon, color: 'from-orange-400 to-orange-500' },
    { label: '6pm–12am', short: 'Evening', value: times.evening, color: 'from-indigo-400 to-indigo-500' },
    { label: '12am–6am', short: 'Night', value: times.night, color: 'from-slate-500 to-slate-600' },
  ]
  const max = Math.max(...entries.map(e => e.value), 1)

  return (
    <div className="grid grid-cols-4 gap-2">
      {entries.map(({ label, short, value, color }) => (
        <div key={label} className="text-center">
          <div className="h-20 flex items-end justify-center mb-2">
            <div
              className={`w-8 bg-gradient-to-t ${color} rounded-t-md transition-all duration-500`}
              style={{ height: `${max > 0 ? (value / max) * 100 : 0}%`, minHeight: value > 0 ? '4px' : '0' }}
            />
          </div>
          <p className="text-white font-semibold text-sm">{value}</p>
          <p className="text-slate-400 text-xs font-medium">{short}</p>
          <p className="text-slate-500 text-[10px]">{label}</p>
        </div>
      ))}
    </div>
  )
}

export function QRAnalyticsDetailed({ city }: QRAnalyticsProps) {
  const [analytics, setAnalytics] = useState<QRAnalytics[]>([])
  const [dailyScans, setDailyScans] = useState<DailyScan[]>([])
  const [loading, setLoading] = useState(true)
  const [totalScans, setTotalScans] = useState(0)
  const [globalOs, setGlobalOs] = useState<CountMap>({})
  const [globalBrowser, setGlobalBrowser] = useState<CountMap>({})
  const [globalPeakTimes, setGlobalPeakTimes] = useState({ morning: 0, afternoon: 0, evening: 0, night: 0 })
  const [topRegions, setTopRegions] = useState<CountMap>({})
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '60d'>('30d')

  useEffect(() => {
    fetchAnalytics()
  }, [city, timeRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 60
      const result = await getAdminQRAnalytics(city, daysAgo)

      setAnalytics(result.analytics)
      setTotalScans(result.totalScans)
      setDailyScans(result.dailyScans)
      setGlobalOs(result.globalOsBreakdown)
      setGlobalBrowser(result.globalBrowserBreakdown)
      setGlobalPeakTimes(result.globalPeakTimes)
      setTopRegions(result.topRegions)
    } catch (error) {
      console.error('❌ Error fetching QR analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalUniqueScans = analytics.reduce((sum, qr) => sum + qr.unique_scans, 0)
  const maxScans = Math.max(...(dailyScans.map(d => d.scans) || [1]))

  const sortedOs = Object.entries(globalOs).sort(([, a], [, b]) => b - a)
  const sortedBrowser = Object.entries(globalBrowser).sort(([, a], [, b]) => b - a)
  const sortedRegions = Object.entries(topRegions).sort(([, a], [, b]) => b - a)
  const totalOsCount = sortedOs.reduce((s, [, v]) => s + v, 0)
  const totalBrowserCount = sortedBrowser.reduce((s, [, v]) => s + v, 0)
  const totalRegionCount = sortedRegions.reduce((s, [, v]) => s + v, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#00d083] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-white text-lg">Loading QR analytics...</div>
          <div className="text-slate-400 text-sm">Fetching scan data from database</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">QR Code Analytics</h2>
          <p className="text-slate-400">Track performance and engagement across all QR codes</p>
        </div>
        <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
          {(['7d', '30d', '60d'] as const).map(range => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-[#00d083] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '60 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Scans</p>
                <p className="text-3xl font-bold text-white mt-1">{totalScans.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-[#00d083]/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#00d083]" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Active QR Codes</p>
                <p className="text-3xl font-bold text-white mt-1">{analytics.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <BarChart className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Unique Scanners</p>
                <p className="text-3xl font-bold text-white mt-1">{totalUniqueScans.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Avg Scans/QR</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {analytics.length > 0 ? Math.round(totalScans / analytics.length) : 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Global Insights: OS, Browser, Peak Times, Regions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Peak Scan Times */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Clock className="w-5 h-5 text-yellow-400" />
              Peak Scan Times
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PeakTimeChart times={globalPeakTimes} />
          </CardContent>
        </Card>

        {/* Top Regions */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Globe className="w-5 h-5 text-emerald-400" />
              Top Regions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedRegions.length > 0 ? (
              <div className="space-y-2.5">
                {sortedRegions.slice(0, 6).map(([region, count]) => (
                  <BreakdownBar key={region} label={region} value={count} total={totalRegionCount} color="bg-emerald-500" />
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-6">No region data yet</p>
            )}
          </CardContent>
        </Card>

        {/* OS Breakdown */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Smartphone className="w-5 h-5 text-blue-400" />
              Operating System
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedOs.length > 0 ? (
              <div className="space-y-2.5">
                {sortedOs.map(([os, count]) => (
                  <BreakdownBar key={os} label={os} value={count} total={totalOsCount} color="bg-blue-500" />
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-6">No OS data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Browser Breakdown */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Monitor className="w-5 h-5 text-purple-400" />
              Browser
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sortedBrowser.length > 0 ? (
              <div className="space-y-2.5">
                {sortedBrowser.map(([browser, count]) => (
                  <BreakdownBar key={browser} label={browser} value={count} total={totalBrowserCount} color="bg-purple-500" />
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm text-center py-6">No browser data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Scan Trend Chart */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#00d083]" />
            Scan Trend ({timeRange === '7d' ? 'Last 7 Days' : timeRange === '30d' ? 'Last 30 Days' : 'Last 60 Days'})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dailyScans.length > 0 ? (
            <div className="space-y-2">
              {dailyScans.map((day, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="text-xs text-slate-400 w-20">
                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                  <div className="flex-1 bg-slate-700 rounded-full h-8 overflow-hidden relative">
                    <div
                      className="bg-gradient-to-r from-[#00d083] to-[#00b570] h-full transition-all duration-500 flex items-center justify-end pr-3"
                      style={{ width: `${maxScans > 0 ? (day.scans / maxScans) * 100 : 0}%`, minWidth: day.scans > 0 ? '40px' : '0' }}
                    >
                      {day.scans > 0 && <span className="text-white text-xs font-semibold">{day.scans}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              No scan data available for this period
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual QR Code Breakdown */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart className="w-5 h-5 text-purple-400" />
            Individual QR Code Performance
          </CardTitle>
          <p className="text-slate-400 text-sm mt-1">Detailed breakdown for each QR code</p>
        </CardHeader>
        <CardContent>
          {analytics.length > 0 ? (
            <div className="space-y-4">
              {analytics.map((qr, idx) => {
                const categoryLabel = qr.category
                  ? qr.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                  : 'General'

                const osEntries = Object.entries(qr.os_breakdown).sort(([, a], [, b]) => b - a)
                const browserEntries = Object.entries(qr.browser_breakdown).sort(([, a], [, b]) => b - a)
                const osTotal = osEntries.reduce((s, [, v]) => s + v, 0)
                const browserTotal = browserEntries.reduce((s, [, v]) => s + v, 0)

                return (
                  <div key={idx} className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                    {/* Header */}
                    <div className="p-4 flex items-center gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#00d083] to-[#00b570] rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        #{idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-semibold text-lg truncate">
                          {qr.business_name || qr.qr_name}
                        </h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          {qr.business_name && (
                            <span className="text-slate-400 text-sm truncate">{qr.qr_name}</span>
                          )}
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300">
                            {categoryLabel}
                          </span>
                        </div>
                        <p className="text-slate-500 text-xs font-mono mt-1">{qr.qr_code}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-3xl font-bold text-white">{qr.total_scans.toLocaleString()}</p>
                        <p className="text-xs text-slate-400">total scans</p>
                      </div>
                    </div>

                    {/* Stats Row */}
                    <div className="px-4 pb-3 border-t border-slate-700 pt-3">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                          <p className="text-slate-400 text-xs mb-1">Unique Scanners</p>
                          <p className="text-xl font-bold text-white">{qr.unique_scans}</p>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                          <p className="text-slate-400 text-xs mb-1">Scans / User</p>
                          <p className="text-xl font-bold text-white">
                            {qr.unique_scans > 0 ? (qr.total_scans / qr.unique_scans).toFixed(1) : '0'}
                          </p>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                          <p className="text-slate-400 text-xs mb-1">Top OS</p>
                          <p className="text-xl font-bold text-white truncate">
                            {osEntries.length > 0 ? osEntries[0][0] : '—'}
                          </p>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                          <p className="text-slate-400 text-xs mb-1">Top Browser</p>
                          <p className="text-xl font-bold text-white truncate">
                            {browserEntries.length > 0 ? browserEntries[0][0] : '—'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Per-QR device & time breakdown */}
                    {(osTotal > 0 || browserTotal > 0) && (
                      <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {osTotal > 0 && (
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-2">Operating System</p>
                            <div className="space-y-1.5">
                              {osEntries.map(([os, count]) => (
                                <BreakdownBar key={os} label={os} value={count} total={osTotal} color="bg-blue-500" />
                              ))}
                            </div>
                          </div>
                        )}
                        {browserTotal > 0 && (
                          <div>
                            <p className="text-slate-400 text-xs font-medium mb-2">Browser</p>
                            <div className="space-y-1.5">
                              {browserEntries.map(([browser, count]) => (
                                <BreakdownBar key={browser} label={browser} value={count} total={browserTotal} color="bg-purple-500" />
                              ))}
                            </div>
                          </div>
                        )}
                        <div>
                          <p className="text-slate-400 text-xs font-medium mb-2">Peak Times</p>
                          <PeakTimeChart times={qr.peak_times} />
                        </div>
                      </div>
                    )}

                    {qr.last_scanned && (
                      <div className="px-4 pb-4">
                        <p className="text-slate-400 text-xs flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          Last scanned: {new Date(qr.last_scanned).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400">
              <p className="text-lg mb-2">No QR codes found</p>
              <p className="text-sm">Generate your first QR code in the QR Management tab</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
