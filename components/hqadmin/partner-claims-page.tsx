'use client'

import { useState, useEffect, useCallback } from 'react'

interface PartnerClaim {
  id: string
  city_name: string
  city_slug: string
  country: string | null
  full_name: string
  email: string
  status: 'claimed' | 'converted' | 'expired' | 'released'
  claimed_at: string
  expires_at: string
  converted_at: string | null
  notes: string | null
  created_at: string
}

interface WaitlistEntry {
  id: string
  city_slug: string
  city_name: string
  full_name: string
  email: string
  notified_at: string | null
  created_at: string
}

export function PartnerClaimsPage() {
  const [claims, setClaims] = useState<PartnerClaim[]>([])
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'claims' | 'waitlist'>('claims')
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/hq/partners')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setClaims(data.claims || [])
      setWaitlist(data.waitlist || [])
    } catch (error) {
      console.error('Failed to fetch partner data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAction = useCallback(async (id: string, action: string, notes?: string) => {
    try {
      const res = await fetch('/api/hq/partners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, notes }),
      })
      if (!res.ok) throw new Error('Action failed')
      await fetchData()
      setEditingNotes(null)
    } catch (error) {
      console.error('Action failed:', error)
    }
  }, [fetchData])

  const getStatusBadge = (claim: PartnerClaim) => {
    const isExpired = new Date(claim.expires_at) < new Date() && claim.status === 'claimed'
    const status = isExpired ? 'expired' : claim.status

    const config: Record<string, { label: string; classes: string }> = {
      claimed: { label: 'Active', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
      converted: { label: 'Converted', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      expired: { label: 'Expired', classes: 'bg-red-500/10 text-red-400 border-red-500/20' },
      released: { label: 'Released', classes: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
    }

    const c = config[status] || config.released
    return (
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.classes}`}>
        {c.label}
      </span>
    )
  }

  const getCountdown = (expiresAt: string) => {
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days > 1) return `${days} days left`
    const hours = Math.floor(diff / (1000 * 60 * 60))
    return `${hours}h left`
  }

  const activeClaims = claims.filter(c => c.status === 'claimed')
  const otherClaims = claims.filter(c => c.status !== 'claimed')

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-800 rounded w-48" />
          <div className="h-64 bg-slate-800 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Partner Claims</h1>
          <p className="text-sm text-slate-400 mt-1">
            {activeClaims.length} active {activeClaims.length === 1 ? 'claim' : 'claims'} &middot; {waitlist.length} on waitlist
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('claims')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'claims'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Claims ({claims.length})
          </button>
          <button
            onClick={() => setActiveTab('waitlist')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'waitlist'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Waitlist ({waitlist.length})
          </button>
        </div>
      </div>

      {activeTab === 'claims' && (
        <div className="space-y-6">
          {/* Active Claims */}
          {activeClaims.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Active Claims</h2>
              <div className="space-y-3">
                {activeClaims.map(claim => (
                  <ClaimCard
                    key={claim.id}
                    claim={claim}
                    getStatusBadge={getStatusBadge}
                    getCountdown={getCountdown}
                    onAction={handleAction}
                    editingNotes={editingNotes}
                    setEditingNotes={setEditingNotes}
                    notesValue={notesValue}
                    setNotesValue={setNotesValue}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past Claims */}
          {otherClaims.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Past Claims</h2>
              <div className="space-y-3">
                {otherClaims.map(claim => (
                  <ClaimCard
                    key={claim.id}
                    claim={claim}
                    getStatusBadge={getStatusBadge}
                    getCountdown={getCountdown}
                    onAction={handleAction}
                    editingNotes={editingNotes}
                    setEditingNotes={setEditingNotes}
                    notesValue={notesValue}
                    setNotesValue={setNotesValue}
                  />
                ))}
              </div>
            </div>
          )}

          {claims.length === 0 && (
            <div className="text-center py-16">
              <p className="text-slate-500">No partner claims yet.</p>
              <p className="text-sm text-slate-600 mt-1">Claims will appear here when partners submit through the landing page.</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'waitlist' && (
        <div>
          {waitlist.length > 0 ? (
            <div className="rounded-lg border border-slate-800 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">City</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Email</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {waitlist.map(entry => (
                    <tr key={entry.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-sm font-medium text-white">{entry.city_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-300">{entry.full_name}</td>
                      <td className="px-4 py-3 text-sm text-slate-400">{entry.email}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-slate-500">No waitlist entries yet.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ClaimCard({
  claim,
  getStatusBadge,
  getCountdown,
  onAction,
  editingNotes,
  setEditingNotes,
  notesValue,
  setNotesValue,
}: {
  claim: PartnerClaim
  getStatusBadge: (claim: PartnerClaim) => React.ReactNode
  getCountdown: (expiresAt: string) => string
  onAction: (id: string, action: string, notes?: string) => void
  editingNotes: string | null
  setEditingNotes: (id: string | null) => void
  notesValue: string
  setNotesValue: (v: string) => void
}) {
  const isActive = claim.status === 'claimed'
  const isExpired = new Date(claim.expires_at) < new Date() && isActive

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">{claim.city_name}</h3>
            {getStatusBadge(claim)}
          </div>
          {claim.country && <p className="text-xs text-slate-500">{claim.country}</p>}
          <p className="text-sm text-slate-300">{claim.full_name}</p>
          <p className="text-sm text-slate-400">{claim.email}</p>
          <div className="flex items-center gap-4 text-xs text-slate-500 pt-1">
            <span>Claimed {new Date(claim.claimed_at).toLocaleDateString()}</span>
            {isActive && !isExpired && (
              <span className="text-amber-400">{getCountdown(claim.expires_at)}</span>
            )}
            {isExpired && <span className="text-red-400">Expired</span>}
          </div>
        </div>

        {(isActive || isExpired) && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onAction(claim.id, 'extend')}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Extend 30d
            </button>
            <button
              onClick={() => onAction(claim.id, 'convert')}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            >
              Convert
            </button>
            <button
              onClick={() => onAction(claim.id, 'release')}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
            >
              Release
            </button>
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="mt-4 pt-4 border-t border-slate-800">
        {editingNotes === claim.id ? (
          <div className="space-y-2">
            <textarea
              value={notesValue}
              onChange={e => setNotesValue(e.target.value)}
              placeholder="Add notes about this claim..."
              rows={3}
              className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
            />
            <div className="flex gap-2">
              <button
                onClick={() => onAction(claim.id, 'update_notes', notesValue)}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-500 text-white hover:bg-emerald-400 transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setEditingNotes(null)}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => {
              setEditingNotes(claim.id)
              setNotesValue(claim.notes || '')
            }}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            {claim.notes ? (
              <span className="text-slate-400">{claim.notes}</span>
            ) : (
              'Add notes...'
            )}
          </button>
        )}
      </div>
    </div>
  )
}
