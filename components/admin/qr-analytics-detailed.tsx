'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { BarChart, TrendingUp, Smartphone, Clock, MapPin } from 'lucide-react'

interface QRAnalytics {
  qr_code: string
  qr_name: string
  total_scans: number
  scans_7d: number
  scans_30d: number
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

      // 1. Get QR codes with their total scans
      const { data: qrCodes, error: qrError } = await supabase
        .from('qr_codes')
        .select('id, qr_code, name, total_scans, last_scanned_at')
        .eq('city', city)
        .eq('status', 'active')
        .order('total_scans', { ascending: false })

      if (qrError) throw qrError

      // 2. Get scan details for each QR
      const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 60
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - daysAgo)

      const analyticsData: QRAnalytics[] = []
      let totalCount = 0

      for (const qr of qrCodes || []) {
        const { data: scans } = await supabase
          .from('qr_code_scans')
          .select('device_type, scanned_at')
          .eq('qr_code_id', qr.id)
          .gte('scanned_at', startDate.toISOString())

        const mobileScans = scans?.filter(s => s.device_type === 'mobile').length || 0
        const desktopScans = scans?.filter(s => s.device_type === 'desktop').length || 0
        const tabletScans = scans?.filter(s => s.device_type === 'tablet').length || 0
        const recentScans = scans?.length || 0

        analyticsData.push({
          qr_code: qr.qr_code,
          qr_name: qr.name,
          total_scans: qr.total_scans || 0,
          scans_7d: timeRange === '7d' ? recentScans : 0,
          scans_30d: timeRange === '30d' ? recentScans : 0,
          mobile_scans: mobileScans,
          desktop_scans: desktopScans,
          tablet_scans: tabletScans,
          last_scanned: qr.last_scanned_at
        })

        totalCount += qr.total_scans || 0
      }

      setAnalytics(analyticsData)
      setTotalScans(totalCount)

      // 3. Get daily scans for chart
      const { data: dailyData } = await supabase
        .from('qr_code_analytics')
        .select('date, total_scans')
        .eq('city', city)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: true })

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
      console.error('Error fetching QR analytics:', error)
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
          <div className="text-white text-lg">Loading analytics...</div>
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
          <p className="text-slate-400">Track performance and engagement</p>
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
            Scan Trend ({timeRange === '7d' ? '7 Days' : timeRange === '30d' ? '30 Days' : '60 Days'})
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
                      style={{ width: `${(day.scans / maxScans) * 100}%` }}
                    >
                      <span className="text-white text-xs font-semibold">{day.scans}</span>
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

      {/* Best Performing QR Codes */}
      <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart className="w-5 h-5 text-purple-400" />
            Best Performing QR Codes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analytics.slice(0, 10).map((qr, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700 hover:border-slate-600 transition-colors">
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-[#00d083] to-[#00b570] rounded-lg flex items-center justify-center text-white font-bold text-sm">
                  #{idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-semibold truncate">{qr.qr_name}</h4>
                  <p className="text-slate-400 text-xs truncate">{qr.qr_code}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">{qr.total_scans}</p>
                  <p className="text-xs text-slate-400">total scans</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

