'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface CityAnalyticsData {
  city: string
  cityDisplayName: string
  metrics: {
    passesCreated: number
    passesInstalled: number
    installationRate: string
    activeBusinesses: number
    totalOffers: number
    offersClaimed: number
    redemptionRate: string
  }
}

export function AdminAnalytics({ city }: { city: string }) {
  const [analytics, setAnalytics] = useState<CityAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
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
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
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
        <p className="text-slate-400">Unable to load analytics</p>
      </div>
    )
  }

  // Animated counter component
  const AnimatedCounter = ({ value, suffix = '', className = "" }: { value: number | string, suffix?: string, className?: string }) => (
    <div className={`text-3xl font-bold ${className}`}>
      <span className="tabular-nums">{value}</span>{suffix}
    </div>
  )

  // Progress bar component
  const ProgressBar = ({ percentage, color = "bg-blue-500" }: { percentage: number, color?: string }) => (
    <div className="w-full bg-slate-700 rounded-full h-2 mt-2">
      <div 
        className={`${color} h-2 rounded-full transition-all duration-1000 ease-out`}
        style={{ width: `${Math.min(percentage, 100)}%` }}
      ></div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Main Analytics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Wallet Passes */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="text-center">
              <AnimatedCounter value={analytics.metrics.passesCreated} className="text-blue-400" />
              <p className="text-slate-400 text-sm mt-1">Passes Created</p>
              <ProgressBar percentage={(analytics.metrics.passesCreated / 100) * 100} color="bg-blue-400" />
            </div>
          </CardContent>
        </Card>

        {/* Pass Install Rate */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="text-center">
              <AnimatedCounter value={analytics.metrics.installationRate} suffix="%" className="text-green-400" />
              <p className="text-slate-400 text-sm mt-1">Install Rate</p>
              <ProgressBar percentage={parseFloat(analytics.metrics.installationRate)} color="bg-green-400" />
            </div>
          </CardContent>
        </Card>

        {/* Active Businesses */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="text-center">
              <AnimatedCounter value={analytics.metrics.activeBusinesses} className="text-purple-400" />
              <p className="text-slate-400 text-sm mt-1">Businesses</p>
              <ProgressBar percentage={(analytics.metrics.activeBusinesses / 50) * 100} color="bg-purple-400" />
            </div>
          </CardContent>
        </Card>

        {/* Redemption Rate */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="text-center">
              <AnimatedCounter value={analytics.metrics.redemptionRate} suffix="%" className="text-orange-400" />
              <p className="text-slate-400 text-sm mt-1">Redemption</p>
              <ProgressBar percentage={parseFloat(analytics.metrics.redemptionRate)} color="bg-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QR Code Analytics Dropdowns */}
      <div className="space-y-3">
        <h3 className="text-white text-lg font-semibold">QR Code Performance</h3>
        
        {/* Qwikker Marketing */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader 
            className="cursor-pointer hover:bg-slate-700/30 transition-colors py-4"
            onClick={() => toggleSection('qwikkerMarketing')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-green-400 font-semibold">Qwikker Marketing</div>
                <div className="text-slate-400 text-sm">Flyers, Leaflets, Promo Packs, Other</div>
              </div>
              <svg 
                className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.qwikkerMarketing ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </CardHeader>
          {expandedSections.qwikkerMarketing && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-4 gap-4 mb-4">
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-white font-semibold">Flyers</div>
                  <div className="text-green-400 text-sm">89 scans (7d)</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-white font-semibold">Leaflets</div>
                  <div className="text-green-400 text-sm">34 scans (7d)</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-white font-semibold">Promo Packs</div>
                  <div className="text-green-400 text-sm">23 scans (7d)</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-white font-semibold">Other</div>
                  <div className="text-green-400 text-sm">10 scans (7d)</div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Static Business QR */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader 
            className="cursor-pointer hover:bg-slate-700/30 transition-colors py-4"
            onClick={() => toggleSection('staticBusiness')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-orange-400 font-semibold">Static Business QR</div>
                <div className="text-slate-400 text-sm">Window Stickers, Offers, Secret Menus, Other</div>
              </div>
              <svg 
                className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.staticBusiness ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </CardHeader>
          {expandedSections.staticBusiness && (
            <CardContent className="pt-0">
              <div className="grid grid-cols-4 gap-4 mb-4">
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-white font-semibold">Window Stickers</div>
                  <div className="text-orange-400 text-sm">167 scans (7d)</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-white font-semibold">Offers</div>
                  <div className="text-orange-400 text-sm">89 scans (7d)</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-white font-semibold">Secret Menus</div>
                  <div className="text-orange-400 text-sm">34 scans (7d)</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-white font-semibold">Other</div>
                  <div className="text-orange-400 text-sm">8 scans (7d)</div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Dynamic Business QR */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader 
            className="cursor-pointer hover:bg-slate-700/30 transition-colors py-4"
            onClick={() => toggleSection('dynamicBusiness')}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-blue-400 font-semibold">Dynamic Business QR</div>
                <div className="text-slate-400 text-sm">Spotlight Tier, Deep Linking, Intent Routing</div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full hover:bg-blue-500/30 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    // This would open a business selector modal
                  }}
                >
                  All Businesses
                </button>
                <svg 
                  className={`w-5 h-5 text-slate-400 transition-transform ${expandedSections.dynamicBusiness ? 'rotate-180' : ''}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </CardHeader>
          {expandedSections.dynamicBusiness && (
            <CardContent className="pt-0">
              {/* Business Filter Dropdown */}
              <div className="mb-4 p-3 bg-slate-700/30 rounded-lg">
                <label className="text-slate-300 text-sm font-medium mb-2 block">Filter by Business:</label>
                <select className="w-full bg-slate-800 border border-slate-600 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="">All Businesses</option>
                  <option value="julies-sports-bar">Julie's Sports Bar</option>
                  <option value="seaside-cafe">Seaside Café</option>
                  <option value="the-crown-inn">The Crown Inn</option>
                  <option value="pizza-palace">Pizza Palace</option>
                </select>
              </div>

              <div className="grid grid-cols-4 gap-4 mb-4">
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-white font-semibold">Discover</div>
                  <div className="text-blue-400 text-sm">234 scans (7d)</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-white font-semibold">Offers</div>
                  <div className="text-blue-400 text-sm">123 scans (7d)</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-white font-semibold">Secret Menu</div>
                  <div className="text-blue-400 text-sm">67 scans (7d)</div>
                </div>
                <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                  <div className="text-white font-semibold">Other</div>
                  <div className="text-blue-400 text-sm">21 scans (7d)</div>
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  )
}