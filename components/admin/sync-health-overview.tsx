'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface SyncHealthMetrics {
  totalBusinesses: number
  syncedToGhl: number
  pendingSync: number
  failedSync: number
  syncSuccessRate: number
  avgSyncTime: number
}

export function SyncHealthOverview() {
  const [metrics, setMetrics] = useState<SyncHealthMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [isBulkSyncing, setIsBulkSyncing] = useState(false)

  const fetchMetrics = async () => {
    try {
      const response = await fetch('/api/admin/sync/health')
      const data = await response.json()
      setMetrics(data)
    } catch (error) {
      console.error('Failed to fetch sync metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkSync = async () => {
    setIsBulkSyncing(true)
    try {
      const response = await fetch('/api/admin/sync/bulk-sync', {
        method: 'POST'
      })
      
      const result = await response.json()
      
      if (result.success) {
        alert(`Bulk sync completed: ${result.message}`)
        await fetchMetrics() // Refresh metrics
      } else {
        alert(`Bulk sync failed: ${result.message}`)
      }
    } catch (error) {
      console.error('Bulk sync error:', error)
      alert('Bulk sync failed - check console for details')
    } finally {
      setIsBulkSyncing(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    
    // Refresh metrics every 30 seconds
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <div className="animate-pulse flex items-center gap-4">
            <div className="h-4 bg-slate-700 rounded w-24"></div>
            <div className="h-4 bg-slate-700 rounded w-16"></div>
            <div className="h-4 bg-slate-700 rounded w-20"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!metrics) return null

  const getHealthColor = (rate: number) => {
    if (rate >= 95) return 'text-green-400'
    if (rate >= 80) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getHealthIcon = (rate: number) => {
    if (rate >= 95) {
      return (
        <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
    if (rate >= 80) {
      return (
        <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    }
    return (
      <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Sync Health Metrics */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              {getHealthIcon(metrics.syncSuccessRate)}
              <span className="text-sm font-medium text-slate-300">
                Sync Health
              </span>
              <span className={`text-sm font-bold ${getHealthColor(metrics.syncSuccessRate)}`}>
                {metrics.syncSuccessRate}%
              </span>
            </div>

            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span>
                <span className="text-green-400 font-medium">{metrics.syncedToGhl}</span> synced
              </span>
              {metrics.pendingSync > 0 && (
                <span>
                  <span className="text-yellow-400 font-medium">{metrics.pendingSync}</span> pending
                </span>
              )}
              {metrics.failedSync > 0 && (
                <span>
                  <span className="text-red-400 font-medium">{metrics.failedSync}</span> failed
                </span>
              )}
              <span>
                Avg: <span className="text-slate-300">{metrics.avgSyncTime}s</span>
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={fetchMetrics}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>

            {(metrics.pendingSync > 0 || metrics.failedSync > 0) && (
              <Button
                size="sm"
                onClick={handleBulkSync}
                disabled={isBulkSyncing}
                className="bg-[#00d083] hover:bg-[#00b86f] text-white"
              >
                {isBulkSyncing ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-1" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Sync All ({metrics.pendingSync + metrics.failedSync})
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
