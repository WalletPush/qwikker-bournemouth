'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface QRAnalytics {
  qr_code_id: string
  qr_code_name: string
  business_name: string
  total_scans: number
  unique_users: number
  conversion_rate: number
  device_breakdown: {
    mobile: number
    desktop: number
    tablet: number
  }
  time_breakdown: {
    today: number
    week: number
    month: number
  }
  user_types: {
    new_users: number
    existing_users: number
    bounces: number
  }
}

interface QRAnalyticsDashboardProps {
  city: string
  cityDisplayName: string
  businessFilter?: string // Optional business filter
}

export function QRAnalyticsDashboard({ city, cityDisplayName, businessFilter }: QRAnalyticsDashboardProps) {
  const [analytics, setAnalytics] = useState<QRAnalytics[]>([])
  const [businesses, setBusinesses] = useState<Array<{id: string, business_name: string}>>([])
  const [selectedBusiness, setSelectedBusiness] = useState(businessFilter || 'all')
  const [timeRange, setTimeRange] = useState('7d')
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()

  useEffect(() => {
    fetchAnalytics()
    fetchBusinesses()
  }, [selectedBusiness, timeRange])

  const fetchBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('business_profiles')
        .select('id, business_name')
        .eq('city', city)
        .eq('status', 'approved')
        .order('business_name')

      if (error) throw error
      setBusinesses(data || [])
    } catch (error) {
      console.error('Error fetching businesses:', error)
    }
  }

  const fetchAnalytics = async () => {
    try {
      // This would be a complex query joining multiple tables
      // For now, showing mock data structure
      const mockAnalytics: QRAnalytics[] = [
        {
          qr_code_id: '1',
          qr_code_name: 'explore-bournemouth-table-tent-001',
          business_name: "Jerry's Burgers",
          total_scans: 245,
          unique_users: 189,
          conversion_rate: 77.1,
          device_breakdown: { mobile: 180, desktop: 45, tablet: 20 },
          time_breakdown: { today: 12, week: 89, month: 245 },
          user_types: { new_users: 156, existing_users: 33, bounces: 56 }
        },
        {
          qr_code_id: '2',
          qr_code_name: 'offers-bournemouth-window-001',
          business_name: "Seaside Café",
          total_scans: 167,
          unique_users: 134,
          conversion_rate: 80.2,
          device_breakdown: { mobile: 145, desktop: 15, tablet: 7 },
          time_breakdown: { today: 8, week: 56, month: 167 },
          user_types: { new_users: 98, existing_users: 36, bounces: 33 }
        }
      ]

      // Filter by business if selected
      const filteredAnalytics = selectedBusiness === 'all' 
        ? mockAnalytics 
        : mockAnalytics.filter(a => a.business_name.toLowerCase().includes(selectedBusiness.toLowerCase()))

      setAnalytics(filteredAnalytics)
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTotalScans = () => analytics.reduce((sum, a) => sum + a.total_scans, 0)
  const getTotalUniqueUsers = () => analytics.reduce((sum, a) => sum + a.unique_users, 0)
  const getAverageConversion = () => {
    if (analytics.length === 0) return 0
    return analytics.reduce((sum, a) => sum + a.conversion_rate, 0) / analytics.length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00d083]"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Category Analytics */}
      <div className="space-y-8">
        {/* Qwikker Marketing Analytics */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-green-400">Qwikker Marketing</CardTitle>
            <p className="text-slate-400 text-sm">Flyers, Leaflets, Promo Packs, Other</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">156</div>
                <div className="text-slate-400 text-xs">Last 7 Days</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">534</div>
                <div className="text-slate-400 text-xs">Last 30 Days</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">1,247</div>
                <div className="text-slate-400 text-xs">Last 60 Days</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">12</div>
                <div className="text-slate-400 text-xs">Active Codes</div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-slate-800 p-3 rounded-lg">
                <div className="text-white font-semibold">Flyers</div>
                <div className="text-green-400">89 scans (7d)</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg">
                <div className="text-white font-semibold">Leaflets</div>
                <div className="text-green-400">34 scans (7d)</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg">
                <div className="text-white font-semibold">Promo Packs</div>
                <div className="text-green-400">23 scans (7d)</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg">
                <div className="text-white font-semibold">Other</div>
                <div className="text-green-400">10 scans (7d)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Static Business QR Analytics */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-orange-400">Static Business QR</CardTitle>
            <p className="text-slate-400 text-sm">Window Stickers, Offers, Secret Menus, Other</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">298</div>
                <div className="text-slate-400 text-xs">Last 7 Days</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">1,156</div>
                <div className="text-slate-400 text-xs">Last 30 Days</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">2,489</div>
                <div className="text-slate-400 text-xs">Last 60 Days</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">48</div>
                <div className="text-slate-400 text-xs">Available Codes</div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-slate-800 p-3 rounded-lg">
                <div className="text-white font-semibold">Window Stickers</div>
                <div className="text-orange-400">167 scans (7d)</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg">
                <div className="text-white font-semibold">Offers</div>
                <div className="text-orange-400">89 scans (7d)</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg">
                <div className="text-white font-semibold">Secret Menus</div>
                <div className="text-orange-400">34 scans (7d)</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg">
                <div className="text-white font-semibold">Other</div>
                <div className="text-orange-400">8 scans (7d)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Business QR Analytics */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-blue-400">Dynamic Business QR</CardTitle>
                <p className="text-slate-400 text-sm">Spotlight Tier, Deep Linking, Intent Routing</p>
              </div>
              <select
                value={selectedBusiness}
                onChange={(e) => setSelectedBusiness(e.target.value)}
                className="p-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
              >
                <option value="all">All Businesses</option>
                {businesses.map((business) => (
                  <option key={business.id} value={business.business_name}>
                    {business.business_name}
                  </option>
                ))}
              </select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">445</div>
                <div className="text-slate-400 text-xs">Last 7 Days</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">1,678</div>
                <div className="text-slate-400 text-xs">Last 30 Days</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">3,234</div>
                <div className="text-slate-400 text-xs">Last 60 Days</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">8</div>
                <div className="text-slate-400 text-xs">Premium Businesses</div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="bg-slate-800 p-3 rounded-lg">
                <div className="text-white font-semibold">Discover</div>
                <div className="text-blue-400">234 scans (7d)</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg">
                <div className="text-white font-semibold">Offers</div>
                <div className="text-blue-400">123 scans (7d)</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg">
                <div className="text-white font-semibold">Secret Menu</div>
                <div className="text-blue-400">67 scans (7d)</div>
              </div>
              <div className="bg-slate-800 p-3 rounded-lg">
                <div className="text-white font-semibold">Other</div>
                <div className="text-blue-400">21 scans (7d)</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Filter by Category
          </label>
          <select
            value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
          >
            <option value="all">All Categories</option>
            <option value="qwikker-marketing">Qwikker Marketing</option>
            <option value="static-qr">Static QR Codes</option>
            <option value="business-specific">Business-Specific QR</option>
          </select>
        </div>
        
        <div className="flex-1">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Time Range
          </label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="w-full p-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
          >
            <option value="1d">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-300 text-sm">Total QR Scans</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">
              {getTotalScans().toLocaleString()}
            </div>
            <p className="text-slate-400 text-sm">
              Across {analytics.length} active QR codes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-300 text-sm">Unique Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">
              {getTotalUniqueUsers().toLocaleString()}
            </div>
            <p className="text-slate-400 text-sm">
              Individual people who scanned
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-300 text-sm">Avg. Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">
              {getAverageConversion().toFixed(1)}%
            </div>
            <p className="text-slate-400 text-sm">
              Users who reached target content
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics per QR Code */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">QR Code Performance</h3>
        
        {analytics.map((qr) => (
          <Card key={qr.qr_code_id} className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white text-base">{qr.qr_code_name}</CardTitle>
                  <p className="text-slate-400 text-sm">{qr.business_name}</p>
                </div>
                <Badge className="bg-green-500 text-white">
                  {qr.conversion_rate.toFixed(1)}% conversion
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Total Scans */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{qr.total_scans}</div>
                  <div className="text-slate-400 text-xs">Total Scans</div>
                </div>

                {/* Unique Users */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{qr.unique_users}</div>
                  <div className="text-slate-400 text-xs">Unique Users</div>
                </div>

                {/* This Week */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{qr.time_breakdown.week}</div>
                  <div className="text-slate-400 text-xs">This Week</div>
                </div>

                {/* Today */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{qr.time_breakdown.today}</div>
                  <div className="text-slate-400 text-xs">Today</div>
                </div>
              </div>

              {/* Device Breakdown */}
              <div className="mt-4 pt-4 border-t border-slate-700">
                <h4 className="text-slate-300 font-medium mb-2">Device Breakdown</h4>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-slate-400 text-sm">Mobile: {qr.device_breakdown.mobile}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-slate-400 text-sm">Desktop: {qr.device_breakdown.desktop}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="text-slate-400 text-sm">Tablet: {qr.device_breakdown.tablet}</span>
                  </div>
                </div>
              </div>

              {/* User Types */}
              <div className="mt-4 pt-4 border-t border-slate-700">
                <h4 className="text-slate-300 font-medium mb-2">User Types</h4>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="text-slate-400 text-sm">New Users: {qr.user_types.new_users}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-cyan-500 rounded-full"></div>
                    <span className="text-slate-400 text-sm">Existing: {qr.user_types.existing_users}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <span className="text-slate-400 text-sm">Bounced: {qr.user_types.bounces}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
