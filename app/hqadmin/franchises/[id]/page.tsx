'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface FranchiseDetail {
  franchise: {
    id: string
    city: string
    subdomain: string
    status: string
    sms_enabled: boolean
    sms_verified: boolean
    resend_api_key: string | null
    openai_api_key: string | null
    stripe_secret_key: string | null
    google_places_api_key: string | null
    twilio_account_sid: string | null
    created_at: string
  }
  admins: Array<{
    id: string
    user_id: string
    role: string
    created_at: string
  }>
  stats: {
    businesses: number
    pending_claims: number
    approved_claims: number
  }
  audit_logs: Array<{
    id: string
    timestamp: string
    action: string
    metadata: Record<string, any>
  }>
}

export default function FranchiseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [data, setData] = useState<FranchiseDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  const franchiseId = params.id as string

  useEffect(() => {
    fetch(`/api/hq/franchises/${franchiseId}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [franchiseId])

  const handleStatusChange = async (newStatus: string) => {
    if (!confirm(`Change franchise status to "${newStatus}"?`)) return

    setUpdating(true)
    try {
      const res = await fetch(`/api/hq/franchises/${franchiseId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      // Refresh data
      const refreshRes = await fetch(`/api/hq/franchises/${franchiseId}`)
      const refreshData = await refreshRes.json()
      setData(refreshData)
    } catch (err) {
      alert(`Failed to update status: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-800 rounded w-64"></div>
          <div className="h-64 bg-neutral-800 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-4 text-red-400">
          <p className="font-medium">Failed to load franchise</p>
          <p className="text-sm mt-1">{error || 'Unknown error'}</p>
        </div>
      </div>
    )
  }

  const { franchise, admins, stats, audit_logs } = data

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/hqadmin/franchises"
            className="text-sm text-neutral-400 hover:text-white mb-2 inline-block"
          >
            ← Back to franchises
          </Link>
          <h1 className="text-2xl font-semibold text-white capitalize">{franchise.city}</h1>
          <p className="text-sm text-neutral-400 mt-1">{franchise.subdomain}.qwikker.com</p>
        </div>

        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium ${
          franchise.status === 'active' 
            ? 'bg-[#00D083]/10 text-[#00D083]' 
            : franchise.status === 'suspended'
            ? 'bg-orange-500/10 text-orange-400'
            : 'bg-neutral-800 text-neutral-400'
        }`}>
          <span className={`w-2 h-2 rounded-full ${
            franchise.status === 'active' ? 'bg-[#00D083]' : 
            franchise.status === 'suspended' ? 'bg-orange-500' : 'bg-neutral-500'
          }`}></span>
          {franchise.status}
        </span>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Total Businesses" value={stats.businesses} />
        <StatCard label="Pending Claims" value={stats.pending_claims} alert={stats.pending_claims > 0} />
        <StatCard label="Approved Claims" value={stats.approved_claims} />
      </div>

      {/* Control Levers */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <h2 className="text-lg font-medium text-white mb-4">Control Levers</h2>
        
        <div className="space-y-4">
          {/* Status Control */}
          <div className="flex items-center justify-between py-3 border-b border-neutral-800">
            <div>
              <div className="text-sm font-medium text-white">Franchise Status</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                {franchise.status === 'active' ? 'Franchise is live and operational' : 
                 franchise.status === 'suspended' ? 'Franchise access is suspended' :
                 'Franchise is archived'}
              </div>
            </div>
            <div className="flex gap-2">
              {franchise.status !== 'active' && (
                <button
                  onClick={() => handleStatusChange('active')}
                  disabled={updating}
                  className="px-3 py-1.5 text-sm bg-[#00D083] text-black rounded hover:bg-[#00D083]/90 disabled:opacity-50"
                >
                  Activate
                </button>
              )}
              {franchise.status !== 'suspended' && (
                <button
                  onClick={() => handleStatusChange('suspended')}
                  disabled={updating}
                  className="px-3 py-1.5 text-sm border border-orange-500 text-orange-400 rounded hover:bg-orange-500/10 disabled:opacity-50"
                >
                  Suspend
                </button>
              )}
              {franchise.status !== 'archived' && (
                <button
                  onClick={() => handleStatusChange('archived')}
                  disabled={updating}
                  className="px-3 py-1.5 text-sm border border-neutral-700 text-neutral-400 rounded hover:bg-neutral-800 disabled:opacity-50"
                >
                  Archive
                </button>
              )}
            </div>
          </div>

          {/* Access Link */}
          <div className="flex items-center justify-between py-3 border-b border-neutral-800">
            <div>
              <div className="text-sm font-medium text-white">Franchise Dashboard</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                https://{franchise.subdomain}.qwikker.com/admin
              </div>
            </div>
            <a
              href={`https://${franchise.subdomain}.qwikker.com/admin`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 text-sm border border-neutral-700 text-white rounded hover:bg-neutral-800"
            >
              Open →
            </a>
          </div>

          {/* Impersonate (future feature) */}
          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-medium text-white">Impersonate Admin</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                Log in as franchise admin (coming soon)
              </div>
            </div>
            <button
              disabled
              className="px-3 py-1.5 text-sm border border-neutral-700 text-neutral-600 rounded opacity-50 cursor-not-allowed"
            >
              Impersonate
            </button>
          </div>
        </div>
      </div>

      {/* Configuration Status */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <h2 className="text-lg font-medium text-white mb-4">Configuration Status</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ConfigRow label="Email (Resend)" configured={!!franchise.resend_api_key} />
          <ConfigRow label="SMS (Twilio)" configured={franchise.sms_enabled && franchise.sms_verified} />
          <ConfigRow label="AI (OpenAI)" configured={!!franchise.openai_api_key} />
          <ConfigRow label="Payments (Stripe)" configured={!!franchise.stripe_secret_key} />
          <ConfigRow label="Maps (Google Places)" configured={!!franchise.google_places_api_key} />
        </div>
      </div>

      {/* Admins */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <h2 className="text-lg font-medium text-white mb-4">Franchise Admins</h2>
        
        {admins.length === 0 ? (
          <div className="text-sm text-neutral-500 py-4">No admins assigned</div>
        ) : (
          <div className="space-y-2">
            {admins.map(admin => (
              <div key={admin.id} className="flex items-center justify-between py-3 border-b border-neutral-800 last:border-0">
                <div>
                  <div className="text-sm text-white font-mono">{admin.user_id}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {admin.role} · Added {new Date(admin.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <h2 className="text-lg font-medium text-white mb-4">Recent Activity</h2>
        
        {audit_logs.length === 0 ? (
          <div className="text-sm text-neutral-500 py-4">No recent activity</div>
        ) : (
          <div className="space-y-2">
            {audit_logs.map(log => (
              <div key={log.id} className="flex items-start gap-3 py-2 border-b border-neutral-800 last:border-0">
                <div className="w-2 h-2 rounded-full bg-[#00D083] mt-1.5"></div>
                <div className="flex-1">
                  <div className="text-sm text-white">{log.action.replace(/_/g, ' ')}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className={`bg-neutral-900 border ${alert ? 'border-orange-900/50' : 'border-neutral-800'} rounded-lg p-4`}>
      <div className="text-sm text-neutral-400 mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${alert ? 'text-orange-400' : 'text-white'}`}>
        {value.toLocaleString()}
      </div>
    </div>
  )
}

function ConfigRow({ label, configured }: { label: string; configured: boolean }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-white">{label}</span>
      {configured ? (
        <span className="text-[#00D083] text-sm">✓ Configured</span>
      ) : (
        <span className="text-neutral-600 text-sm">Not configured</span>
      )}
    </div>
  )
}

