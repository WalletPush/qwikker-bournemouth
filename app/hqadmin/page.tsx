'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface DashboardData {
  kpis: {
    total_franchises: number
    active_franchises: number
    suspended_franchises: number
    total_businesses: number
    pending_claims: number
    recent_claims_7d: number
  }
  health: {
    email_healthy: number
    sms_healthy: number
  }
  franchises: Array<{
    id: string
    city: string
    status: string
    email_configured: boolean
    sms_configured: boolean
    created_at: string
  }>
}

export default function HQDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/hq/dashboard')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-800 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-32 bg-neutral-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-4 text-red-400">
          <p className="font-medium">Failed to load dashboard</p>
          <p className="text-sm mt-1">{error || 'Unknown error'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Platform Overview</h1>
        <p className="text-sm text-neutral-400 mt-1">Global system health and franchise status</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Franchises"
          value={data.kpis.total_franchises}
          subtitle={`${data.kpis.active_franchises} active · ${data.kpis.suspended_franchises} suspended`}
        />
        <StatCard
          label="Total Businesses"
          value={data.kpis.total_businesses}
          subtitle="Across all cities"
        />
        <StatCard
          label="Pending Claims"
          value={data.kpis.pending_claims}
          subtitle={`${data.kpis.recent_claims_7d} in last 7 days`}
          alert={data.kpis.pending_claims > 0}
        />
      </div>

      {/* System Health */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <h2 className="text-lg font-medium text-white mb-4">System Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HealthIndicator
            label="Email Configured"
            healthy={data.health.email_healthy}
            total={data.kpis.total_franchises}
          />
          <HealthIndicator
            label="SMS Configured"
            healthy={data.health.sms_healthy}
            total={data.kpis.total_franchises}
          />
        </div>
      </div>

      {/* Franchise Status Grid */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-white">Franchise Status</h2>
          <Link
            href="/hqadmin/franchises"
            className="text-sm text-[#00D083] hover:underline"
          >
            View all →
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-800 text-left">
                <th className="pb-3 text-sm font-medium text-neutral-400">City</th>
                <th className="pb-3 text-sm font-medium text-neutral-400">Status</th>
                <th className="pb-3 text-sm font-medium text-neutral-400">Email</th>
                <th className="pb-3 text-sm font-medium text-neutral-400">SMS</th>
                <th className="pb-3 text-sm font-medium text-neutral-400">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {data.franchises.map(f => (
                <tr key={f.id} className="hover:bg-neutral-800/50">
                  <td className="py-3">
                    <Link
                      href={`/hqadmin/franchises/${f.id}`}
                      className="text-white font-medium hover:text-[#00D083]"
                    >
                      {f.city}
                    </Link>
                  </td>
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded ${
                      f.status === 'active' 
                        ? 'bg-[#00D083]/10 text-[#00D083]' 
                        : 'bg-neutral-800 text-neutral-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        f.status === 'active' ? 'bg-[#00D083]' : 'bg-neutral-500'
                      }`}></span>
                      {f.status}
                    </span>
                  </td>
                  <td className="py-3">
                    {f.email_configured ? (
                      <span className="text-[#00D083] text-sm">✓</span>
                    ) : (
                      <span className="text-neutral-600 text-sm">—</span>
                    )}
                  </td>
                  <td className="py-3">
                    {f.sms_configured ? (
                      <span className="text-[#00D083] text-sm">✓</span>
                    ) : (
                      <span className="text-neutral-600 text-sm">—</span>
                    )}
                  </td>
                  <td className="py-3 text-sm text-neutral-400">
                    {new Date(f.created_at).toLocaleDateString()}
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

function StatCard({ label, value, subtitle, alert }: { 
  label: string
  value: number
  subtitle: string
  alert?: boolean
}) {
  return (
    <div className={`bg-neutral-900 border ${alert ? 'border-orange-900/50' : 'border-neutral-800'} rounded-lg p-6`}>
      <div className="text-sm font-medium text-neutral-400 mb-2">{label}</div>
      <div className={`text-3xl font-semibold ${alert ? 'text-orange-400' : 'text-white'} mb-1`}>
        {value.toLocaleString()}
      </div>
      <div className="text-xs text-neutral-500">{subtitle}</div>
    </div>
  )
}

function HealthIndicator({ label, healthy, total }: {
  label: string
  healthy: number
  total: number
}) {
  const percentage = total > 0 ? Math.round((healthy / total) * 100) : 0
  const isHealthy = percentage >= 80

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-white">{label}</div>
        <div className="text-xs text-neutral-500 mt-0.5">
          {healthy} of {total} configured
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="text-lg font-semibold text-white">{percentage}%</div>
        <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-[#00D083]' : 'bg-orange-500'}`}></div>
      </div>
    </div>
  )
}
