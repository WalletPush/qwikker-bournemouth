'use client'

import { useEffect, useState } from 'react'

interface FeatureFlag {
  id: string
  flag_key: string
  flag_name: string
  description: string | null
  scope: string
  city: string | null
  is_enabled: boolean
  created_at: string
  updated_at: string
}

interface FeatureFlagsData {
  flags: FeatureFlag[]
}

export default function FeatureFlagsPage() {
  const [data, setData] = useState<FeatureFlagsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchFlags = () => {
    fetch('/api/hq/feature-flags')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchFlags()
  }, [])

  const toggleFlag = async (flagId: string, currentValue: boolean) => {
    setUpdating(flagId)
    try {
      const res = await fetch('/api/hq/feature-flags', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: flagId,
          is_enabled: !currentValue
        })
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      // Refresh data
      fetchFlags()
    } catch (err) {
      alert(`Failed to update flag: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setUpdating(null)
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
          <p className="font-medium">Failed to load feature flags</p>
          <p className="text-sm mt-1">{error || 'Unknown error'}</p>
        </div>
      </div>
    )
  }

  // Separate global and city-specific flags
  const globalFlags = data.flags.filter(f => f.scope === 'global')
  const cityFlags = data.flags.filter(f => f.scope === 'city')

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Feature Flags</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Global feature toggles across all franchises
        </p>
      </div>

      {/* Warning Banner */}
      <div className="bg-orange-950/20 border border-orange-900/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-orange-400 text-lg">⚠️</div>
          <div>
            <div className="text-sm font-medium text-orange-400">Production Impact</div>
            <div className="text-xs text-orange-300/70 mt-1">
              Changes to global flags affect all franchises immediately.
            </div>
          </div>
        </div>
      </div>

      {/* Global Flags */}
      {globalFlags.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-white mb-3">Global Flags</h2>
          <div className="space-y-3">
            {globalFlags.map(flag => (
              <div
                key={flag.id}
                className="bg-neutral-900 border border-neutral-800 rounded-lg p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-medium text-white">{flag.flag_name}</h3>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                        flag.is_enabled 
                          ? 'bg-[#00D083]/10 text-[#00D083]' 
                          : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          flag.is_enabled ? 'bg-[#00D083]' : 'bg-neutral-500'
                        }`}></span>
                        {flag.is_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    {flag.description && (
                      <p className="text-sm text-neutral-400">{flag.description}</p>
                    )}
                    <p className="text-xs text-neutral-600 mt-1">Key: {flag.flag_key}</p>
                  </div>

                  <div className="ml-4">
                    <button
                      onClick={() => toggleFlag(flag.id, flag.is_enabled)}
                      disabled={updating === flag.id}
                      className={`px-4 py-2 text-sm rounded font-medium transition-colors disabled:opacity-50 ${
                        flag.is_enabled
                          ? 'bg-neutral-800 text-white hover:bg-neutral-700'
                          : 'bg-[#00D083] text-black hover:bg-[#00D083]/90'
                      }`}
                    >
                      {updating === flag.id ? 'Updating...' : flag.is_enabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* City Flags (if any) */}
      {cityFlags.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-white mb-3">City-Specific Flags</h2>
          <div className="space-y-3">
            {cityFlags.map(flag => (
              <div
                key={flag.id}
                className="bg-neutral-900 border border-neutral-800 rounded-lg p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-base font-medium text-white">{flag.flag_name}</h3>
                      <span className="px-2 py-0.5 rounded text-xs bg-neutral-800 text-neutral-400">
                        {flag.city}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${
                        flag.is_enabled 
                          ? 'bg-[#00D083]/10 text-[#00D083]' 
                          : 'bg-neutral-800 text-neutral-400'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          flag.is_enabled ? 'bg-[#00D083]' : 'bg-neutral-500'
                        }`}></span>
                        {flag.is_enabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    {flag.description && (
                      <p className="text-sm text-neutral-400">{flag.description}</p>
                    )}
                  </div>

                  <div className="ml-4">
                    <button
                      onClick={() => toggleFlag(flag.id, flag.is_enabled)}
                      disabled={updating === flag.id}
                      className={`px-4 py-2 text-sm rounded font-medium transition-colors disabled:opacity-50 ${
                        flag.is_enabled
                          ? 'bg-neutral-800 text-white hover:bg-neutral-700'
                          : 'bg-[#00D083] text-black hover:bg-[#00D083]/90'
                      }`}
                    >
                      {updating === flag.id ? 'Updating...' : flag.is_enabled ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.flags.length === 0 && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-8 text-center text-neutral-500">
          No feature flags configured
        </div>
      )}
    </div>
  )
}
