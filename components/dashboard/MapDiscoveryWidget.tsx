'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, TrendingUp, ExternalLink, Clock, Search } from 'lucide-react'

interface MapDiscoveryWidgetProps {
  businessId: string
  businessTier: string
}

interface MapMetrics {
  ok: boolean
  enabled: boolean
  tier: string
  mapViews: number
  directionsClicks: number
  conversionRate: number
  period: string
  advanced?: {
    topQueries: Array<{ query: string; count: number }>
    peakHours: Array<{ hour: number; hourLabel: string; views: number }>
  }
  message?: string
}

export function MapDiscoveryWidget({ businessId, businessTier }: MapDiscoveryWidgetProps) {
  const [metrics, setMetrics] = useState<MapMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('/api/dashboard/atlas/metrics')
        const data = await res.json()
        setMetrics(data)
      } catch (error) {
        console.error('Failed to fetch Atlas metrics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [businessId])

  // Show upsell for Starter/free tier
  if (!loading && metrics && !metrics.enabled) {
    return (
      <Card className="border-neutral-800 bg-gradient-to-br from-neutral-900 to-neutral-950">
        <CardHeader>
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#00D083]" />
              Map Discovery
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              Featured+
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-neutral-400 mb-4">
            See how many users find your business through our interactive Atlas map and get driving directions.
          </div>
          <button className="w-full px-4 py-2 bg-[#00D083] hover:bg-[#00D083]/90 text-black rounded font-medium text-sm transition-colors">
            Upgrade to Featured
          </button>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="border-neutral-800 bg-neutral-900">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#00D083]" />
            Map Discovery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-16 bg-neutral-800 rounded"></div>
            <div className="h-16 bg-neutral-800 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!metrics || !metrics.ok) {
    return null
  }

  const { mapViews, directionsClicks, conversionRate, period, advanced } = metrics
  const isSpotlight = businessTier === 'spotlight'

  return (
    <Card className="border-neutral-800 bg-neutral-900">
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#00D083]" />
            Map Discovery
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {period.replace('last_', '').replace('_days', 'd')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Core Metrics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{mapViews}</div>
            <div className="text-xs text-neutral-400">Map Views</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-[#00D083]">{directionsClicks}</div>
            <div className="text-xs text-neutral-400">Directions</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{conversionRate}%</div>
            <div className="text-xs text-neutral-400">Conversion</div>
          </div>
        </div>

        {/* Spotlight: Advanced Metrics */}
        {isSpotlight && advanced && (
          <>
            {/* Top Queries */}
            {advanced.topQueries.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <Search className="w-4 h-4" />
                  Top Search Terms
                </div>
                <div className="space-y-1">
                  {advanced.topQueries.map((q, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-neutral-300">"{q.query}"</span>
                      <Badge variant="secondary" className="text-xs">{q.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Peak Hours */}
            {advanced.peakHours.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <Clock className="w-4 h-4" />
                  Peak Discovery Times
                </div>
                <div className="space-y-1">
                  {advanced.peakHours.map((h, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-neutral-300">{h.hourLabel}</span>
                      <Badge variant="secondary" className="text-xs">{h.views} views</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* CTA */}
        <div className="pt-4 border-t border-neutral-800">
          <p className="text-xs text-neutral-500 mb-3">
            {mapViews > 0 
              ? `${directionsClicks} users got directions to your business`
              : 'Users discovering businesses on our interactive map will see you here'}
          </p>
          {!isSpotlight && (
            <button className="w-full px-4 py-2 border border-[#00D083] text-[#00D083] rounded text-sm hover:bg-[#00D083]/10 transition-colors flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Upgrade to Spotlight for Advanced Insights
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
