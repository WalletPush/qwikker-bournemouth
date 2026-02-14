'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { AtlasConfigSection } from '@/components/hqadmin/AtlasConfigSection'

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
    // Atlas fields
    atlas_enabled: boolean
    mapbox_public_token: string | null
    mapbox_style_url: string | null
    atlas_min_rating: number
    atlas_max_results: number
    atlas_default_zoom: number
    atlas_pitch: number
    atlas_bearing: number
    lat: number | null
    lng: number | null
    onboarding_search_radius_m: number
    import_search_radius_m: number
    import_max_radius_m: number
  }
  admins: Array<{
    id: string
    username: string
    email: string
    full_name: string
    is_active: boolean
    last_login: string | null
    created_at: string
  }>
  stats: {
    businesses: number
    pending_claims: number
    approved_claims: number
    push_total: number
    push_this_week: number
    push_recipients: number
    push_clicks: number
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
    console.log('🔍 [HQ Frontend] Fetching franchise:', franchiseId)
    fetch(`/api/hq/franchises/${franchiseId}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(data => {
        console.log('✅ [HQ Frontend] Data received:', {
          franchiseCity: data.franchise?.city,
          adminsCount: data.admins?.length || 0,
          auditLogsCount: data.audit_logs?.length || 0,
          admins: data.admins
        })
        setData(data)
      })
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Businesses" value={stats.businesses} />
        <StatCard label="Pending Claims" value={stats.pending_claims} alert={stats.pending_claims > 0} />
        <StatCard label="Approved Claims" value={stats.approved_claims} />
      </div>

      {/* Push Notification Stats */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-medium text-white mb-4">Push Notification Analytics</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Total Pushes Sent" value={stats.push_total} />
          <StatCard label="Pushes This Week" value={stats.push_this_week} />
          <StatCard label="Total Recipients" value={stats.push_recipients} />
          <StatCard label="Total Clicks" value={stats.push_clicks} />
        </div>
        {stats.push_recipients > 0 && (
          <div className="mt-4 pt-4 border-t border-neutral-800">
            <div className="flex items-center gap-2 text-sm text-neutral-400">
              <span>Click-Through Rate:</span>
              <span className="text-[#00d083] font-semibold">
                {((stats.push_clicks / stats.push_recipients) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}
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
          <ConfigRow label="Atlas (Mapbox)" configured={franchise.atlas_enabled && !!franchise.mapbox_public_token} />
        </div>
      </div>

      {/* Atlas Configuration */}
      <AtlasConfigSection 
        city={franchise.city}
        initialConfig={{
          atlas_enabled: franchise.atlas_enabled,
          mapbox_public_token: franchise.mapbox_public_token || '',
          mapbox_style_url: franchise.mapbox_style_url || 'mapbox://styles/mapbox/dark-v11',
          atlas_min_rating: franchise.atlas_min_rating || 4.4,
          atlas_max_results: franchise.atlas_max_results || 12,
          atlas_default_zoom: franchise.atlas_default_zoom || 13,
          atlas_pitch: franchise.atlas_pitch || 45,
          atlas_bearing: franchise.atlas_bearing || 0,
          lat: franchise.lat,
          lng: franchise.lng,
          onboarding_search_radius_m: franchise.onboarding_search_radius_m || 5000,
          import_search_radius_m: franchise.import_search_radius_m || 10000,
          import_max_radius_m: franchise.import_max_radius_m || 200000
        }}
        onSave={async (config) => {
          const res = await fetch(`/api/hq/franchises/${franchiseId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
          })
          
          if (!res.ok) throw new Error('Failed to save')
          
          // Refresh data
          const refreshRes = await fetch(`/api/hq/franchises/${franchiseId}`)
          const refreshData = await refreshRes.json()
          setData(refreshData)
          
          alert('Atlas configuration saved successfully!')
        }}
      />

      {/* Admins */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-6">
        <h2 className="text-lg font-medium text-white mb-4">Franchise Admins</h2>
        
        {admins.length === 0 ? (
          <div className="text-sm text-neutral-500 py-4">
            No admins assigned yet. Use the Users section to create franchise admins.
          </div>
        ) : (
          <div className="space-y-3">
            {admins.map(admin => (
              <div key={admin.id} className="flex items-center justify-between py-3 px-4 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-white">
                      {admin.full_name}
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      admin.is_active 
                        ? 'bg-[#00D083]/10 text-[#00D083]' 
                        : 'bg-neutral-700 text-neutral-400'
                    }`}>
                      {admin.is_active ? 'active' : 'inactive'}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-400 mt-1">
                    {admin.email} · @{admin.username}
                  </div>
                  <div className="text-xs text-neutral-500 mt-0.5">
                    Added {new Date(admin.created_at).toLocaleDateString()}
                    {admin.last_login && ` · Last login ${new Date(admin.last_login).toLocaleString()}`}
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
          <div className="text-sm text-neutral-500 py-4">
            No recent activity. Actions like business imports, claim approvals, and config changes will appear here.
          </div>
        ) : (
          <div className="space-y-2">
            {audit_logs.map(log => {
              // Format action message
              let actionMessage = log.action.replace(/_/g, ' ')
              
              // Add metadata details for specific actions
              if (log.action === 'businesses_imported' && log.metadata?.imported_count) {
                actionMessage = `Imported ${log.metadata.imported_count} business${log.metadata.imported_count > 1 ? 'es' : ''}`
                if (log.metadata.display_category) {
                  actionMessage += ` (${log.metadata.display_category})`
                }
              }
              
              return (
                <div key={log.id} className="flex items-start gap-3 py-3 px-4 bg-neutral-800/30 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-[#00D083] mt-1.5 flex-shrink-0"></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-white capitalize">{actionMessage}</div>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
              )
            })}
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

