'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  BarChart, TrendingUp, TrendingDown, Users, Clock, Globe, Monitor,
  Smartphone, Trophy, ArrowUpRight, ArrowDownRight, Repeat, Target, Megaphone,
  Layers, ChevronDown, ChevronUp
} from 'lucide-react'
import { getAdminQRAnalytics } from '@/lib/actions/admin-qr-analytics-actions'

interface CountMap { [key: string]: number }

interface QRAnalytics {
  qr_code: string
  qr_name: string
  business_name: string | null
  category: string | null
  qr_type: string | null
  total_scans: number
  unique_scans: number
  prior_period_scans: number
  last_scanned: string | null
  os_breakdown: CountMap
  browser_breakdown: CountMap
  peak_times: { morning: number; afternoon: number; evening: number; night: number }
}

interface TopPerformer {
  qr_code: string
  qr_name: string
  business_name: string | null
  category: string | null
  total_scans: number
  prior_period_scans: number
  percent_of_total: number
  growth_pct: number | null
}

interface CategoryPerf {
  category: string
  total_scans: number
  qr_count: number
  avg_scans: number
  percent_of_total: number
}

interface CampaignData { source: string; medium: string; campaign: string; scans: number }
interface ConversionData { total_scans: number; identified_users: number; repeat_users: number; identification_rate: number; retention_rate: number }
interface RepeatScannerData { total_unique_scanners: number; repeat_scanners: number; repeat_rate: number; avg_scans_per_repeater: number }
interface DailyScan { date: string; scans: number }
interface QRAnalyticsProps { city: string }

// ── Reusable subcomponents ─────────────────────────────────────────────

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

function GrowthBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-500 text-xs">New</span>
  const isPositive = value >= 0
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
      {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {isPositive ? '+' : ''}{value}%
    </span>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">{label}</p>
            <p className="text-3xl font-bold text-white mt-1">{value}</p>
          </div>
          <div className={`w-12 h-12 ${color} rounded-lg flex items-center justify-center`}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  )
}

function CollapsibleSection({ title, icon, defaultOpen = false, children }: {
  title: string; icon: React.ReactNode; defaultOpen?: boolean; children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-700/20 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2 text-base font-semibold text-white">
          {icon}
          {title}
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>
      {open && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  )
}

// ── Main component ─────────────────────────────────────────────────────

export function QRAnalyticsDetailed({ city }: QRAnalyticsProps) {
  const [analytics, setAnalytics] = useState<QRAnalytics[]>([])
  const [dailyScans, setDailyScans] = useState<DailyScan[]>([])
  const [loading, setLoading] = useState(true)
  const [totalScans, setTotalScans] = useState(0)
  const [currentPeriodScans, setCurrentPeriodScans] = useState(0)
  const [growthPct, setGrowthPct] = useState<number | null>(null)
  const [priorTotal, setPriorTotal] = useState(0)
  const [globalOs, setGlobalOs] = useState<CountMap>({})
  const [globalBrowser, setGlobalBrowser] = useState<CountMap>({})
  const [globalPeakTimes, setGlobalPeakTimes] = useState({ morning: 0, afternoon: 0, evening: 0, night: 0 })
  const [topRegions, setTopRegions] = useState<CountMap>({})
  const [dayOfWeek, setDayOfWeek] = useState<CountMap>({})
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([])
  const [categoryPerf, setCategoryPerf] = useState<CategoryPerf[]>([])
  const [campaigns, setCampaigns] = useState<CampaignData[]>([])
  const [conversions, setConversions] = useState<ConversionData>({ total_scans: 0, identified_users: 0, repeat_users: 0, identification_rate: 0, retention_rate: 0 })
  const [repeatData, setRepeatData] = useState<RepeatScannerData>({ total_unique_scanners: 0, repeat_scanners: 0, repeat_rate: 0, avg_scans_per_repeater: 0 })
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
      setCurrentPeriodScans(result.currentPeriodScans)
      setGrowthPct(result.growthPct)
      setPriorTotal(result.priorPeriodTotalScans)
      setDailyScans(result.dailyScans)
      setGlobalOs(result.globalOsBreakdown)
      setGlobalBrowser(result.globalBrowserBreakdown)
      setGlobalPeakTimes(result.globalPeakTimes)
      setTopRegions(result.topRegions)
      setDayOfWeek(result.dayOfWeek)
      setTopPerformers(result.topPerformers)
      setCategoryPerf(result.categoryPerformance)
      setCampaigns(result.campaigns)
      setConversions(result.conversions)
      setRepeatData(result.repeatScanners)
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

  const dowDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const maxDow = Math.max(...dowDays.map(d => dayOfWeek[d] || 0), 1)
  const maxTopPerformer = topPerformers.length > 0 ? topPerformers[0].total_scans : 1

  const periodLabel = timeRange === '7d' ? 'Last 7 Days' : timeRange === '30d' ? 'Last 30 Days' : 'Last 60 Days'

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#00d083] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <div className="text-white text-lg">Loading QR analytics...</div>
          <div className="text-slate-400 text-sm">Crunching scan data</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header + Time Range */}
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
                timeRange === range ? 'bg-[#00d083] text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '60 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* ── 1. Summary Stats ──────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Scans" value={totalScans.toLocaleString()} icon={<TrendingUp className="w-6 h-6 text-[#00d083]" />} color="bg-[#00d083]/20" />
        <StatCard label="Active QR Codes" value={analytics.length} icon={<BarChart className="w-6 h-6 text-purple-400" />} color="bg-purple-500/20" />
        <StatCard label="Unique Scanners" value={totalUniqueScans.toLocaleString()} icon={<Users className="w-6 h-6 text-blue-400" />} color="bg-blue-500/20" />
        <StatCard label="Avg Scans/QR" value={analytics.length > 0 ? Math.round(totalScans / analytics.length) : 0} icon={<Clock className="w-6 h-6 text-yellow-400" />} color="bg-yellow-500/20" />
      </div>

      {/* ── 2. Growth + Top Performers (side by side) ─────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Growth */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              {growthPct !== null && growthPct >= 0
                ? <TrendingUp className="w-5 h-5 text-emerald-400" />
                : <TrendingDown className="w-5 h-5 text-red-400" />}
              Growth vs Previous Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-700/40 rounded-lg p-3 text-center">
                  <p className="text-slate-400 text-[10px] mb-1">Current</p>
                  <p className="text-xl font-bold text-white">{currentPeriodScans.toLocaleString()}</p>
                </div>
                <div className="bg-slate-700/40 rounded-lg p-3 text-center">
                  <p className="text-slate-400 text-[10px] mb-1">Previous</p>
                  <p className="text-xl font-bold text-white">{priorTotal.toLocaleString()}</p>
                </div>
                <div className="bg-slate-700/40 rounded-lg p-3 text-center">
                  <p className="text-slate-400 text-[10px] mb-1">Change</p>
                  <p className="text-xl font-bold">
                    {growthPct !== null ? (
                      <span className={growthPct >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                        {growthPct >= 0 ? '+' : ''}{growthPct}%
                      </span>
                    ) : <span className="text-slate-500">N/A</span>}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Target className="w-5 h-5 text-rose-400" />
              Engagement Funnel
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#00d083]/10 border border-[#00d083]/30 rounded-lg p-3 text-center">
                <p className="text-[#00d083] text-[10px] font-medium mb-1">Total Scans</p>
                <p className="text-xl font-bold text-white">{conversions.total_scans.toLocaleString()}</p>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-center">
                <p className="text-blue-400 text-[10px] font-medium mb-1">With Pass</p>
                <p className="text-xl font-bold text-white">{conversions.identified_users}</p>
                <p className="text-blue-400 text-[10px] mt-0.5">{conversions.identification_rate}%</p>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
                <p className="text-amber-400 text-[10px] font-medium mb-1">Returning</p>
                <p className="text-xl font-bold text-white">{conversions.repeat_users}</p>
                <p className="text-amber-400 text-[10px] mt-0.5">{conversions.retention_rate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 3. Top Performers Leaderboard ─────────────────────── */}
      {topPerformers.length > 0 && (
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Trophy className="w-5 h-5 text-amber-400" />
              Top Performers ({periodLabel})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.map((tp, idx) => {
                const barPct = maxTopPerformer > 0 ? Math.max((tp.total_scans / maxTopPerformer) * 100, tp.total_scans > 0 ? 5 : 0) : 0
                return (
                  <div key={tp.qr_code} className="flex items-center gap-4">
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? 'bg-amber-400/20 text-amber-400' :
                      idx === 1 ? 'bg-slate-400/20 text-slate-300' :
                      idx === 2 ? 'bg-amber-700/20 text-amber-600' :
                      'bg-slate-700/50 text-slate-400'
                    }`}>
                      #{idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium text-sm truncate">{tp.business_name || tp.qr_name}</span>
                        {tp.category && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 flex-shrink-0">
                            {tp.category.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 bg-slate-700 rounded-full h-2.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            idx === 0 ? 'bg-amber-400' :
                            idx === 1 ? 'bg-slate-300' :
                            idx === 2 ? 'bg-amber-600' :
                            'bg-slate-500'
                          }`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 w-24">
                      <p className="text-white font-bold">{tp.total_scans.toLocaleString()}</p>
                      <GrowthBadge value={tp.growth_pct} />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 4. When They Scan: Peak Times + Day of Week ────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <BarChart className="w-5 h-5 text-cyan-400" />
              Day of Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dowDays.map(day => {
                const val = dayOfWeek[day] || 0
                const pct = maxDow > 0 ? (val / maxDow) * 100 : 0
                return (
                  <div key={day} className="flex items-center gap-3">
                    <span className="text-slate-400 text-sm w-8 font-medium">{day}</span>
                    <div className="flex-1 bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, minWidth: val > 0 ? '8px' : '0' }}
                      />
                    </div>
                    <span className="text-white font-semibold text-sm w-8 text-right">{val}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 5. Category + Repeat Scanners (side by side) ──────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {categoryPerf.length > 0 && (
          <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-white flex items-center gap-2 text-base">
                <Layers className="w-5 h-5 text-violet-400" />
                Category Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {categoryPerf.map(cat => {
                  const maxCat = categoryPerf[0]?.total_scans || 1
                  const barPct = Math.max((cat.total_scans / maxCat) * 100, cat.total_scans > 0 ? 5 : 0)
                  return (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-slate-300 text-sm font-medium">{cat.category}</span>
                        <span className="text-white font-semibold text-sm">{cat.total_scans.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-700 rounded-full h-2.5 overflow-hidden">
                          <div className="bg-gradient-to-r from-violet-500 to-violet-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${barPct}%` }} />
                        </div>
                        <span className="text-slate-500 text-xs w-20 text-right">{cat.qr_count} QR ~{cat.avg_scans}/ea</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Repeat className="w-5 h-5 text-teal-400" />
              Repeat Scanners
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-700/40 rounded-lg p-3 text-center">
                <p className="text-slate-400 text-xs mb-1">Identified</p>
                <p className="text-2xl font-bold text-white">{repeatData.total_unique_scanners}</p>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-3 text-center">
                <p className="text-slate-400 text-xs mb-1">Repeaters</p>
                <p className="text-2xl font-bold text-teal-400">{repeatData.repeat_scanners}</p>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-3 text-center">
                <p className="text-slate-400 text-xs mb-1">Repeat Rate</p>
                <p className="text-2xl font-bold text-white">{repeatData.repeat_rate}%</p>
              </div>
              <div className="bg-slate-700/40 rounded-lg p-3 text-center">
                <p className="text-slate-400 text-xs mb-1">Avg / Repeater</p>
                <p className="text-2xl font-bold text-white">{repeatData.avg_scans_per_repeater}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── 6. Campaign Attribution (conditional) ─────────────── */}
      {campaigns.length > 0 && (
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center gap-2 text-base">
              <Megaphone className="w-5 h-5 text-pink-400" />
              Campaign Attribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left text-slate-400 font-medium pb-3 pr-4">Source</th>
                    <th className="text-left text-slate-400 font-medium pb-3 pr-4">Medium</th>
                    <th className="text-left text-slate-400 font-medium pb-3 pr-4">Campaign</th>
                    <th className="text-right text-slate-400 font-medium pb-3">Scans</th>
                  </tr>
                </thead>
                <tbody>
                  {campaigns.map((c, i) => (
                    <tr key={i} className="border-b border-slate-800 last:border-0">
                      <td className="py-2.5 pr-4 text-white">{c.source}</td>
                      <td className="py-2.5 pr-4 text-slate-300">{c.medium}</td>
                      <td className="py-2.5 pr-4 text-slate-300">{c.campaign}</td>
                      <td className="py-2.5 text-right text-white font-semibold">{c.scans.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── 7. Scan Trend ─────────────────────────────────────── */}
      <CollapsibleSection title={`Scan Trend (${periodLabel})`} icon={<TrendingUp className="w-5 h-5 text-[#00d083]" />} defaultOpen={dailyScans.length <= 14}>
        {dailyScans.length > 0 ? (
          <div className="space-y-1.5">
            {dailyScans.map((day, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="text-xs text-slate-400 w-16">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </div>
                <div className="flex-1 bg-slate-700 rounded-full h-6 overflow-hidden relative">
                  <div
                    className="bg-gradient-to-r from-[#00d083] to-[#00b570] h-full transition-all duration-500 flex items-center justify-end pr-2"
                    style={{ width: `${maxScans > 0 ? (day.scans / maxScans) * 100 : 0}%`, minWidth: day.scans > 0 ? '32px' : '0' }}
                  >
                    {day.scans > 0 && <span className="text-white text-[10px] font-semibold">{day.scans}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">No scan data available for this period</div>
        )}
      </CollapsibleSection>

      {/* ── 8. Device / Region Insights (collapsible) ─────────── */}
      <CollapsibleSection title="Device & Region Insights" icon={<Globe className="w-5 h-5 text-emerald-400" />}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <h4 className="text-slate-300 text-sm font-medium mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400" /> Top Regions
            </h4>
            {sortedRegions.length > 0 ? (
              <div className="space-y-2">
                {sortedRegions.slice(0, 6).map(([region, count]) => (
                  <BreakdownBar key={region} label={region} value={count} total={totalRegionCount} color="bg-emerald-500" />
                ))}
              </div>
            ) : <p className="text-slate-500 text-sm">No region data yet</p>}
          </div>
          <div>
            <h4 className="text-slate-300 text-sm font-medium mb-3 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-blue-400" /> Operating System
            </h4>
            {sortedOs.length > 0 ? (
              <div className="space-y-2">
                {sortedOs.map(([os, count]) => (
                  <BreakdownBar key={os} label={os} value={count} total={totalOsCount} color="bg-blue-500" />
                ))}
              </div>
            ) : <p className="text-slate-500 text-sm">No OS data yet</p>}
          </div>
          <div>
            <h4 className="text-slate-300 text-sm font-medium mb-3 flex items-center gap-2">
              <Monitor className="w-4 h-4 text-purple-400" /> Browser
            </h4>
            {sortedBrowser.length > 0 ? (
              <div className="space-y-2">
                {sortedBrowser.map(([browser, count]) => (
                  <BreakdownBar key={browser} label={browser} value={count} total={totalBrowserCount} color="bg-purple-500" />
                ))}
              </div>
            ) : <p className="text-slate-500 text-sm">No browser data yet</p>}
          </div>
        </div>
      </CollapsibleSection>

      {/* ── 9. Individual QR Code Performance (collapsible) ──── */}
      <CollapsibleSection title="Individual QR Code Performance" icon={<BarChart className="w-5 h-5 text-purple-400" />}>
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
              const qrGrowth = qr.prior_period_scans > 0
                ? Math.round(((qr.unique_scans - qr.prior_period_scans) / qr.prior_period_scans) * 100)
                : null

              return (
                <div key={idx} className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
                  <div className="p-4 flex items-center gap-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-[#00d083] to-[#00b570] rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      #{idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white font-semibold text-lg truncate">{qr.business_name || qr.qr_name}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        {qr.business_name && <span className="text-slate-400 text-sm truncate">{qr.qr_name}</span>}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-700 text-slate-300">{categoryLabel}</span>
                      </div>
                      <p className="text-slate-500 text-xs font-mono mt-1">{qr.qr_code}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-3xl font-bold text-white">{qr.total_scans.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">total scans</p>
                      <GrowthBadge value={qrGrowth} />
                    </div>
                  </div>

                  <div className="px-4 pb-3 border-t border-slate-700 pt-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                        <p className="text-slate-400 text-xs mb-1">Unique</p>
                        <p className="text-xl font-bold text-white">{qr.unique_scans}</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                        <p className="text-slate-400 text-xs mb-1">Scans/User</p>
                        <p className="text-xl font-bold text-white">{qr.unique_scans > 0 ? (qr.total_scans / qr.unique_scans).toFixed(1) : '0'}</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                        <p className="text-slate-400 text-xs mb-1">Top OS</p>
                        <p className="text-xl font-bold text-white truncate">{osEntries.length > 0 ? osEntries[0][0] : '—'}</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                        <p className="text-slate-400 text-xs mb-1">Top Browser</p>
                        <p className="text-xl font-bold text-white truncate">{browserEntries.length > 0 ? browserEntries[0][0] : '—'}</p>
                      </div>
                    </div>
                  </div>

                  {(osTotal > 0 || browserTotal > 0) && (
                    <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      {osTotal > 0 && (
                        <div>
                          <p className="text-slate-400 text-xs font-medium mb-2">OS</p>
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
                          month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-400">
            <p className="text-lg mb-2">No QR codes found</p>
            <p className="text-sm">Generate your first QR code in the QR Management tab</p>
          </div>
        )}
      </CollapsibleSection>
    </div>
  )
}
