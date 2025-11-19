'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { BarChart, TrendingUp, Smartphone, Clock } from 'lucide-react'

interface QRAnalytics {
  qr_code: string
  qr_name: string
  total_scans: number
  mobile_scans: number
  desktop_scans: number
  tablet_scans: number
  last_scanned: string | null
}

interface DailyScan {
  date: string
  scans: number
}

interface QRAnalyticsProps {
  city: string
}

export function QRAnalyticsDetailed({ city }: QRAnalyticsProps) {
  const [analytics, setAnalytics] = useState<QRAnalytics[]>([])
  const [dailyScans, setDailyScans] = useState<DailyScan[]>([])
  const [loading, setLoading] = useState(true)
  const [totalScans, setTotalScans] = useState(0)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '60d'>('30d')

  useEffect(() => {
    fetchAnalytics()
  }, [city, timeRange])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const supabase = createClientComponentClient()
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 60
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysAgo)

      // 1. Get QR codes with their total scans (FAST - no loop)
      const { data: qrCodes, error: qrError } = await supabase
        .from('qr_codes')
        .select('id, qr_code, name, total_scans, last_scanned_at')
        .eq('city', city)
        .eq('status', 'active')
        .order('total_scans', { ascending: false })

      if (qrError) {
        console.error('QR codes fetch error:', qrError)
        throw qrError
      }

      console.log(`✅ Fetched ${qrCodes?.length || 0} QR codes for ${city}`)

      // 2. Get ALL scans in one query (MUCH FASTER than loop)
      const qrIds = qrCodes?.map(qr => qr.id) || []
      
      let deviceCounts: Record<string, { mobile: number, desktop: number, tablet: number }> = {}
      
      if (qrIds.length > 0) {
        const { data: allScans } = await supabase
          .from('qr_code_scans')
          .select('qr_code_id, device_type')
          .in('qr_code_id', qrIds)
          .gte('scanned_at', startDate.toISOString())

        // Aggregate in memory (fast)
        allScans?.forEach(scan => {
          if (!deviceCounts[scan.qr_code_id]) {
            deviceCounts[scan.qr_code_id] = { mobile: 0, desktop: 0, tablet: 0 }
          }
          if (scan.device_type === 'mobile') deviceCounts[scan.qr_code_id].mobile++
          else if (scan.device_type === 'desktop') deviceCounts[scan.qr_code_id].desktop++
          else if (scan.device_type === 'tablet') deviceCounts[scan.qr_code_id].tablet++
        })

        console.log(`✅ Fetched ${allScans?.length || 0} scans across all QRs`)
      }

      // 3. Map analytics data
      const analyticsData: QRAnalytics[] = qrCodes?.map(qr => ({
        qr_code: qr.qr_code,
        qr_name: qr.name,
        total_scans: qr.total_scans || 0,
        mobile_scans: deviceCounts[qr.id]?.mobile || 0,
        desktop_scans: deviceCounts[qr.id]?.desktop || 0,
        tablet_scans: deviceCounts[qr.id]?.tablet || 0,
        last_scanned: qr.last_scanned_at
      })) || []

      setAnalytics(analyticsData)
      setTotalScans(analyticsData.reduce((sum, qr) => sum + qr.total_scans, 0))

      // 4. Get daily scans for chart
      const { data: dailyData } = await supabase
        .from('qr_code_analytics')
        .select('date, total_scans')
        .eq('city', city)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true })

      console.log(`✅ Fetched ${dailyData?.length || 0} daily data points`)

      // Aggregate by date
      const scansByDate = new Map<string, number>()
      dailyData?.forEach(day => {
        const existing = scansByDate.get(day.date) || 0
        scansByDate.set(day.date, existing + day.total_scans)
      })

      const dailyArray = Array.from(scansByDate.entries()).map(([date, scans]) => ({
        date,
        scans
      }))

      setDailyScans(dailyArray)

    } catch (error) {
      console.error('❌ Error fetching QR analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const deviceTotal = analytics.reduce((sum, qr) => sum + qr.mobile_scans + qr.desktop_scans + qr.tablet_scans, 0)
  const mobilePercent = deviceTotal > 0 ? Math.round((analytics.reduce((sum, qr) => sum + qr.mobile_scans, 0) / deviceTotal) * 100) : 0
  const desktopPercent = deviceTotal > 0 ? Math.round((analytics.reduce((sum, qr) => sum + qr.desktop_scans, 0) / deviceTotal) * 100) : 0
  const tabletPercent = deviceTotal > 0 ? Math.round((analytics.reduce((sum, qr) => sum + qr.tablet_scans, 0) / deviceTotal) * 100) : 0

  const maxScans = Math.max(...(dailyScans.map(d => d.scans) || [1]))

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#00d083] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
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
        
        {/* Time Range Selector */}
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
                <p className="text-slate-400 text-sm">Mobile Scans</p>
                <p className="text-3xl font-bold text-white mt-1">{mobilePercent}%</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-blue-400" />
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

      {/* Device Breakdown */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-blue-400" />
            Device Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">Mobile</span>
                <span className="text-white font-semibold">{mobilePercent}%</span>
              </div>
              <div className="bg-slate-700 rounded-full h-3 overflow-hidden">
                <div className="bg-blue-500 h-full" style={{ width: `${mobilePercent}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">Desktop</span>
                <span className="text-white font-semibold">{desktopPercent}%</span>
              </div>
              <div className="bg-slate-700 rounded-full h-3 overflow-hidden">
                <div className="bg-purple-500 h-full" style={{ width: `${desktopPercent}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-300">Tablet</span>
                <span className="text-white font-semibold">{tabletPercent}%</span>
              </div>
              <div className="bg-slate-700 rounded-full h-3 overflow-hidden">
                <div className="bg-green-500 h-full" style={{ width: `${tabletPercent}%` }}></div>
              </div>
            </div>
          </div>
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
                const qrDeviceTotal = qr.mobile_scans + qr.desktop_scans + qr.tablet_scans
                const qrMobilePercent = qrDeviceTotal > 0 ? Math.round((qr.mobile_scans / qrDeviceTotal) * 100) : 0
                const qrDesktopPercent = qrDeviceTotal > 0 ? Math.round((qr.desktop_scans / qrDeviceTotal) * 100) : 0
                const qrTabletPercent = qrDeviceTotal > 0 ? Math.round((qr.tablet_scans / qrDeviceTotal) * 100) : 0

                return (
                  <div key={idx} className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                    {/* Header */}
                    <div className="p-4 flex items-center gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#00d083] to-[#00b570] rounded-lg flex items-center justify-center text-white font-bold">
                        #{idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-white font-semibold text-lg truncate">{qr.qr_name}</h4>
                        <p className="text-slate-400 text-sm truncate font-mono">{qr.qr_code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-bold text-white">{qr.total_scans.toLocaleString()}</p>
                        <p className="text-xs text-slate-400">total scans</p>
                      </div>
                    </div>

                    {/* Device Breakdown */}
                    <div className="px-4 pb-4 border-t border-slate-700 pt-4">
                      <p className="text-slate-300 font-semibold mb-3 text-sm">Device Breakdown</p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <Smartphone className="w-4 h-4 text-blue-400" />
                            <span className="text-slate-300 text-sm font-medium">Mobile</span>
                          </div>
                          <div className="text-2xl font-bold text-white">{qr.mobile_scans}</div>
                          <div className="text-xs text-slate-400">{qrMobilePercent}%</div>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" strokeWidth="2"/>
                              <line x1="8" y1="21" x2="16" y2="21" strokeWidth="2"/>
                              <line x1="12" y1="17" x2="12" y2="21" strokeWidth="2"/>
                            </svg>
                            <span className="text-slate-300 text-sm font-medium">Desktop</span>
                          </div>
                          <div className="text-2xl font-bold text-white">{qr.desktop_scans}</div>
                          <div className="text-xs text-slate-400">{qrDesktopPercent}%</div>
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                          <div className="flex items-center justify-center gap-2 mb-1">
                            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <rect x="5" y="2" width="14" height="20" rx="2" ry="2" strokeWidth="2"/>
                            </svg>
                            <span className="text-slate-300 text-sm font-medium">Tablet</span>
                          </div>
                          <div className="text-2xl font-bold text-white">{qr.tablet_scans}</div>
                          <div className="text-xs text-slate-400">{qrTabletPercent}%</div>
                        </div>
                      </div>
                    </div>

                    {/* Last Scanned */}
                    {qr.last_scanned && (
                      <div className="px-4 pb-4">
                        <p className="text-slate-400 text-xs">
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
