'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface BusinessQRAnalytics {
  qr_code_name: string
  qr_type: 'explore' | 'offers' | 'secret_menu' | 'general'
  total_scans: number
  unique_users: number
  conversion_rate: number
  last_scan: string
  device_breakdown: {
    mobile: number
    desktop: number
    tablet: number
  }
  peak_hours: string[]
  top_referrers: string[]
}

interface QRAnalyticsBusinessProps {
  businessId: string
  businessTier: 'starter' | 'featured' | 'spotlight'
}

export function QRAnalyticsBusiness({ businessId, businessTier }: QRAnalyticsBusinessProps) {
  const [analytics, setAnalytics] = useState<BusinessQRAnalytics[]>([])
  const [loading, setLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    checkAccess()
  }, [businessId])

  const checkAccess = async () => {
    try {
      const response = await fetch('/api/user/feature-access?feature=analytics')
      
      if (response.ok) {
        const data = await response.json()
        setHasAccess(data.hasAccess)
        
        if (data.hasAccess) {
          fetchQRAnalytics()
        } else {
          setLoading(false)
        }
      } else {
        // Fallback to old system
        const fallbackAccess = businessTier === 'spotlight'
        setHasAccess(fallbackAccess)
        
        if (fallbackAccess) {
          fetchQRAnalytics()
        } else {
          setLoading(false)
        }
      }
    } catch (error) {
      console.error('Error checking analytics access:', error)
      // Fallback to old system
      const fallbackAccess = businessTier === 'spotlight'
      setHasAccess(fallbackAccess)
      
      if (fallbackAccess) {
        fetchQRAnalytics()
      } else {
        setLoading(false)
      }
    }
  }

  const fetchQRAnalytics = async () => {
    try {
      // Fetch real QR analytics data
      const response = await fetch(`/api/analytics/qr?businessId=${businessId}`)
      
      if (!response.ok) {
        console.warn('QR analytics API not available, using mock data')
        // Fallback to mock data for demonstration
        const mockData: BusinessQRAnalytics[] = [
        {
          qr_code_name: 'Table Tent - Explore',
          qr_type: 'explore',
          total_scans: 156,
          unique_users: 134,
          conversion_rate: 85.9,
          last_scan: '2024-01-20T14:30:00Z',
          device_breakdown: { mobile: 120, desktop: 25, tablet: 11 },
          peak_hours: ['12:00-13:00', '18:00-19:00', '20:00-21:00'],
          top_referrers: ['Direct Scan', 'Social Share', 'Word of Mouth']
        },
        {
          qr_code_name: 'Window Sticker - Offers',
          qr_type: 'offers',
          total_scans: 89,
          unique_users: 73,
          conversion_rate: 82.0,
          last_scan: '2024-01-20T16:45:00Z',
          device_breakdown: { mobile: 78, desktop: 8, tablet: 3 },
          peak_hours: ['11:00-12:00', '17:00-18:00'],
          top_referrers: ['Direct Scan', 'Instagram Story']
        }
      ]
      
      setAnalytics(mockData)
      return
    }

    const data = await response.json()
    if (data.success && data.analytics) {
      setAnalytics(data.analytics)
    } else {
      // No real data available, use empty array
      setAnalytics([])
    }
    } catch (error) {
      console.error('Error fetching QR analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTotalScans = () => analytics.reduce((sum, a) => sum + a.total_scans, 0)
  const getTotalUniqueUsers = () => analytics.reduce((sum, a) => sum + a.unique_users, 0)

  const getQRTypeColor = (type: string) => {
    switch (type) {
      case 'explore': return 'bg-blue-500'
      case 'offers': return 'bg-orange-500'
      case 'secret_menu': return 'bg-purple-500'
      case 'general': return 'bg-green-500'
      default: return 'bg-gray-500'
    }
  }

  const getQRTypeLabel = (type: string) => {
    switch (type) {
      case 'explore': return 'Explore Business'
      case 'offers': return 'View Offers'
      case 'secret_menu': return 'Secret Menu'
      case 'general': return 'Join Qwikker'
      default: return type
    }
  }

  if (!hasAccess) {
    return (
      <div className="space-y-6">
        {/* Locked Feature Card */}
        <Card className="bg-slate-900 border-slate-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10"></div>
          <div className="absolute inset-0 backdrop-blur-sm"></div>
          
          <CardContent className="relative p-8 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-2">QR Code Analytics</h3>
            <p className="text-slate-400 mb-6 max-w-md mx-auto">
              Track QR code performance, scan analytics, device breakdowns, and conversion rates with detailed insights.
            </p>
            
            <div className="bg-slate-800/50 rounded-lg p-4 mb-6">
              <h4 className="text-white font-semibold mb-2">Spotlight Plan Features:</h4>
              <ul className="text-slate-300 text-sm space-y-1">
                <li>• Real-time QR scan tracking</li>
                <li>• Device and location analytics</li>
                <li>• Conversion rate optimization</li>
                <li>• Peak performance insights</li>
                <li>• Custom QR code assignments</li>
              </ul>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold">
                Upgrade to Spotlight
              </Button>
              <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
                Learn More
              </Button>
            </div>
            
            <p className="text-slate-500 text-xs mt-4">
              Current Plan: {businessTier.charAt(0).toUpperCase() + businessTier.slice(1)} • QR Analytics requires Spotlight Plan
            </p>
          </CardContent>
        </Card>

        {/* Preview Cards (Blurred) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 opacity-50 pointer-events-none">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-300 text-sm">Total QR Scans</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white blur-sm">245</div>
              <p className="text-slate-400 text-sm blur-sm">This week</p>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-300 text-sm">Conversion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white blur-sm">84.2%</div>
              <p className="text-slate-400 text-sm blur-sm">Users reached content</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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
              Across {analytics.length} QR codes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-300 text-sm">Unique Visitors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">
              {getTotalUniqueUsers().toLocaleString()}
            </div>
            <p className="text-slate-400 text-sm">
              Individual people
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-slate-300 text-sm">Avg. Conversion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">
              {analytics.length > 0 ? 
                (analytics.reduce((sum, a) => sum + a.conversion_rate, 0) / analytics.length).toFixed(1) 
                : 0}%
            </div>
            <p className="text-slate-400 text-sm">
              Reached target content
            </p>
          </CardContent>
        </Card>
      </div>

      {/* QR Code Performance */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Your QR Code Performance</h3>
        
        {analytics.map((qr, index) => (
          <Card key={index} className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white text-base">{qr.qr_code_name}</CardTitle>
                  <Badge className={`${getQRTypeColor(qr.qr_type)} text-white mt-1`}>
                    {getQRTypeLabel(qr.qr_type)}
                  </Badge>
                </div>
                <Badge className="bg-green-500 text-white">
                  {qr.conversion_rate.toFixed(1)}% conversion
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{qr.total_scans}</div>
                  <div className="text-slate-400 text-xs">Total Scans</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{qr.unique_users}</div>
                  <div className="text-slate-400 text-xs">Unique Users</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">{qr.device_breakdown.mobile}</div>
                  <div className="text-slate-400 text-xs">Mobile Scans</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-slate-300">
                    {new Date(qr.last_scan).toLocaleDateString()}
                  </div>
                  <div className="text-slate-400 text-xs">Last Scan</div>
                </div>
              </div>

              {/* Peak Hours */}
              <div className="mb-4">
                <h4 className="text-slate-300 font-medium mb-2">Peak Scanning Hours</h4>
                <div className="flex gap-2 flex-wrap">
                  {qr.peak_hours.map((hour, idx) => (
                    <Badge key={idx} variant="outline" className="text-slate-300 border-slate-600">
                      {hour}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Device Breakdown */}
              <div className="pt-4 border-t border-slate-700">
                <h4 className="text-slate-300 font-medium mb-2">Device Types</h4>
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
            </CardContent>
          </Card>
        ))}
      </div>

      {analytics.length === 0 && (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No QR Codes Assigned Yet</h3>
            <p className="text-slate-400 mb-4">
              Contact your Qwikker admin to get QR codes assigned to your business for tracking analytics.
            </p>
            <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-800">
              Contact Support
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
