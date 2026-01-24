'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Franchise {
  id: string
  city: string
  subdomain: string
  status: string
  created_at: string
  health?: {
    email: boolean
    sms: boolean
  }
}

export default function FranchisesPage() {
  const [franchises, setFranchises] = useState<Franchise[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [launchingCity, setLaunchingCity] = useState<string | null>(null)

  useEffect(() => {
    fetchFranchises()
  }, [])

  async function fetchFranchises() {
    try {
      const response = await fetch('/api/hq/franchises', { 
        credentials: 'include' 
      })
      
      const data = await response.json().catch(() => ({}))
      
      if (response.ok) {
        setFranchises(data.franchises || [])
      } else {
        const errorMsg = data.details || data.error || `HTTP ${response.status}`
        setError(`Failed to fetch franchises: ${errorMsg}`)
      }
    } catch (err: any) {
      setError(`Network error: ${err.message || 'Unknown'}`)
    } finally {
      setLoading(false)
    }
  }

  function handleLaunchCity(cityName: string, subdomain: string) {
    setLaunchingCity(cityName)
    // Redirect to create page with pre-filled city info
    window.location.href = `/hqadmin/franchises/create?city=${encodeURIComponent(cityName)}&subdomain=${subdomain}&launch=true`
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Franchises</h1>
          <p className="text-slate-400 mt-1">Create and manage franchise cities</p>
        </div>
        
        <Link
          href="/hqadmin/franchises/create"
          className="px-4 py-2 bg-[#00D083]/10 hover:bg-[#00D083]/20 text-[#00D083] border border-[#00D083]/20 rounded-lg font-medium transition-colors"
        >
          + Create Franchise
        </Link>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#00D083] border-r-transparent"></div>
          <p className="text-slate-400 mt-4">Loading franchises...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-400">{error}</p>
        </div>
      )}

      {/* Franchise List */}
      {!loading && !error && franchises.length === 0 && (
        <div className="text-center py-12">
          <svg className="w-16 h-16 mx-auto text-slate-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <h3 className="text-xl font-semibold text-white mb-2">No franchises yet</h3>
          <p className="text-slate-400 mb-6">Create your first franchise to get started</p>
          <Link
            href="/hqadmin/franchises/create"
            className="inline-block px-4 py-2 bg-[#00D083]/10 hover:bg-[#00D083]/20 text-[#00D083] border border-[#00D083]/20 rounded-lg font-medium transition-colors"
          >
            + Create First Franchise
          </Link>
        </div>
      )}

      {!loading && !error && franchises.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  City
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Health
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {franchises.map((franchise) => (
                <tr key={franchise.id} className="hover:bg-slate-800/30">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-white capitalize">
                        {franchise.city}
                      </div>
                      <div className="text-xs text-slate-400">
                        {franchise.subdomain}.qwikker.com
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={franchise.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex gap-2">
                      <HealthIndicator active={!!franchise.health?.email} label="Email" />
                      <HealthIndicator active={!!franchise.health?.sms} label="SMS" />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                    {new Date(franchise.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-3">
                      {franchise.status === 'coming_soon' && (
                        <button
                          onClick={() => handleLaunchCity(franchise.city, franchise.subdomain)}
                          disabled={launchingCity === franchise.city}
                          className="px-3 py-1.5 bg-[#00D083]/10 hover:bg-[#00D083]/20 text-[#00D083] border border-[#00D083]/20 text-xs rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {launchingCity === franchise.city ? 'Loading...' : 'Launch'}
                        </button>
                      )}
                      <Link
                        href={`/hqadmin/franchises/${franchise.id}`}
                        className="text-[#00D083] hover:text-[#00b86f]"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    pending_setup: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    coming_soon: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    suspended: 'bg-red-500/10 text-red-400 border-red-500/20',
  }
  
  const color = colors[status as keyof typeof colors] || colors.pending_setup
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${color}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function HealthIndicator({ active, label }: { active: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-500' : 'bg-slate-600'}`} />
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  )
}

