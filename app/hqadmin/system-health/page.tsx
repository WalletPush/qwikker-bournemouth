'use client'

import { useEffect, useState } from 'react'

interface SystemHealth {
  overall: {
    status: string
    timestamp: string
  }
  email: {
    configured: number
    total: number
    percentage: number
    status: string
  }
  sms: {
    configured: number
    total: number
    errors: number
    sent_24h: number
    failed_24h: number
    percentage: number
    status: string
  }
  database: {
    status: string
    response_time_ms: string
  }
  activity: {
    claims_7d: number
  }
  franchises: Array<{
    id: string
    city: string
    status: string
    email_healthy: boolean
    sms_healthy: boolean
    sms_error: string | null
  }>
}

export default function SystemHealthPage() {
  const [data, setData] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const fetchHealth = () => {
    setLoading(true)
    fetch('/api/hq/system/health')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        setData(data)
        setLastRefresh(new Date())
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchHealth()
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !data) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-800 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-neutral-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-8">
        <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-4 text-red-400">
          <p className="font-medium">Failed to load system health</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">System Health</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Real-time operational status across all franchises
          </p>
        </div>
        <div className="text-right">
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="px-3 py-1.5 text-sm border border-neutral-700 text-white rounded hover:bg-neutral-800 disabled:opacity-50"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <div className="text-xs text-neutral-500 mt-1">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Overall Status */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            data.overall.status === 'operational' ? 'bg-[#00D083]' :
            data.overall.status === 'degraded' ? 'bg-orange-500' : 'bg-red-500'
          }`}></div>
          <div>
            <div className="text-lg font-semibold text-white">
              {data.overall.status === 'operational' ? 'All Systems Operational' :
               data.overall.status === 'degraded' ? 'System Degraded' : 'System Down'}
            </div>
            <div className="text-sm text-neutral-400 mt-0.5">
              Platform is {data.overall.status}
            </div>
          </div>
        </div>
      </div>

      {/* Service Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ServiceCard
          label="Email Configured"
          status={data.email.status}
          metric={`${data.email.percentage}%`}
          subtitle={`${data.email.configured} of ${data.email.total} configured`}
        />
        <ServiceCard
          label="SMS Configured"
          status={data.sms.status}
          metric={`${data.sms.percentage}%`}
          subtitle={`${data.sms.configured} configured · ${data.sms.errors} errors`}
        />
        <ServiceCard
          label="Business Imports"
          status={(data as any).imports?.status || 'unknown'}
          metric={`${(data as any).imports?.percentage || 0}%`}
          subtitle={`${(data as any).imports?.configured || 0} of ${(data as any).imports?.total || 0} configured`}
        />
        <ServiceCard
          label="Database"
          status={data.database.status}
          metric={data.database.status === 'healthy' ? '✓' : '✗'}
          subtitle={`Response: ${data.database.response_time_ms}`}
        />
      </div>

      {/* SMS Activity (Last 24h) */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <h2 className="text-lg font-medium text-white mb-4">SMS Activity (24h)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-neutral-400 mb-1">Messages Sent</div>
            <div className="text-2xl font-semibold text-[#00D083]">{data.sms.sent_24h}</div>
          </div>
          <div>
            <div className="text-sm text-neutral-400 mb-1">Failed</div>
            <div className="text-2xl font-semibold text-orange-400">{data.sms.failed_24h}</div>
          </div>
        </div>
      </div>

      {/* Activity Metrics */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <h2 className="text-lg font-medium text-white mb-4">Platform Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-neutral-400 mb-1">Claims (7 days)</div>
            <div className="text-2xl font-semibold text-white">{data.activity.claims_7d}</div>
          </div>
        </div>
      </div>

      {/* Per-Franchise Health */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <h2 className="text-lg font-medium text-white mb-4">Franchise Health</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-800 text-left">
                <th className="pb-3 text-sm font-medium text-neutral-400">City</th>
                <th className="pb-3 text-sm font-medium text-neutral-400">Status</th>
                <th className="pb-3 text-sm font-medium text-neutral-400">Email</th>
                <th className="pb-3 text-sm font-medium text-neutral-400">SMS</th>
                <th className="pb-3 text-sm font-medium text-neutral-400">Imports</th>
                <th className="pb-3 text-sm font-medium text-neutral-400">Issues</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {data.franchises.map(f => (
                <tr key={f.id} className="hover:bg-neutral-800/50">
                  <td className="py-3 text-white font-medium capitalize">{f.city}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded ${
                      f.status === 'active' 
                        ? 'bg-[#00D083]/10 text-[#00D083]' 
                        : 'bg-neutral-800 text-neutral-400'
                    }`}>
                      {f.status}
                    </span>
                  </td>
                  <td className="py-3">
                    {f.email_healthy ? (
                      <span className="text-[#00D083]">✓</span>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="py-3">
                    {f.sms_healthy ? (
                      <span className="text-[#00D083]">✓</span>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="py-3">
                    {(f as any).imports_healthy ? (
                      <span className="text-[#00D083]">✓</span>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                  <td className="py-3">
                    {f.sms_error ? (
                      <span className="text-xs text-orange-400 truncate max-w-xs block">
                        {f.sms_error}
                      </span>
                    ) : (
                      <span className="text-neutral-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ServiceCard({ label, status, metric, subtitle }: {
  label: string
  status: string
  metric: string
  subtitle: string
}) {
  const statusColor = 
    status === 'healthy' ? 'border-[#00D083]/50 bg-[#00D083]/5' :
    status === 'warning' || status === 'partial' ? 'border-orange-500/50 bg-orange-500/5' :
    'border-red-500/50 bg-red-500/5'

  const metricColor =
    status === 'healthy' ? 'text-[#00D083]' :
    status === 'warning' || status === 'partial' ? 'text-orange-400' :
    'text-red-400'

  return (
    <div className={`bg-neutral-900 border ${statusColor} rounded-lg p-6`}>
      <div className="text-sm font-medium text-neutral-400 mb-2">{label}</div>
      <div className={`text-3xl font-semibold ${metricColor} mb-1`}>{metric}</div>
      <div className="text-xs text-neutral-500">{subtitle}</div>
    </div>
  )
}

