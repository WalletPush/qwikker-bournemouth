'use client'

import { useState, useEffect, useCallback } from 'react'

interface PartnerClaim {
  id: string
  city_name: string
  city_slug: string
  country: string | null
  full_name: string
  email: string
  status:
    | 'submitted'
    | 'email_verified'
    | 'held'
    | 'claimed'
    | 'converted'
    | 'expired'
    | 'released'
    | 'rejected'
  claimed_at: string
  expires_at: string | null
  converted_at: string | null
  verified_at?: string | null
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

interface PartnerMarket {
  id: string
  city_name: string
  city_slug: string
  country: string | null
  status: 'owned' | 'reserved' | 'available'
  tier: 'hub' | 'partner'
  blocked: boolean
  manual_review_only: boolean
  lat: number | null
  lng: number | null
  notes: string | null
}

interface FoundingMeta {
  secured: number
  converted: number
  total: number
  open: boolean
}

export function PartnerClaimsPage() {
  const [claims, setClaims] = useState<PartnerClaim[]>([])
  const [waitlist, setWaitlist] = useState<WaitlistEntry[]>([])
  const [markets, setMarkets] = useState<PartnerMarket[]>([])
  const [founding, setFounding] = useState<FoundingMeta | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'claims' | 'waitlist' | 'markets'>('claims')
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesValue, setNotesValue] = useState('')

  const fetchData = useCallback(async () => {
    try {
      const [partnersRes, marketsRes] = await Promise.all([
        fetch('/api/hq/partners'),
        fetch('/api/hq/partners/markets'),
      ])
      if (!partnersRes.ok) throw new Error('Failed to fetch')
      const data = await partnersRes.json()
      setClaims(data.claims || [])
      setWaitlist(data.waitlist || [])
      if (data.founding) setFounding(data.founding)
      if (marketsRes.ok) {
        const m = await marketsRes.json()
        setMarkets(m.markets || [])
      }
    } catch (error) {
      console.error('Failed to fetch partner data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleAction = useCallback(async (id: string, action: string, notes?: string, extra?: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/hq/partners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, notes, ...extra }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Action failed')
      }
      await fetchData()
      setEditingNotes(null)
    } catch (error) {
      console.error('Action failed:', error)
      alert(error instanceof Error ? error.message : 'Action failed')
    }
  }, [fetchData])

  const getStatusBadge = (claim: PartnerClaim) => {
    const isExpired =
      !!claim.expires_at &&
      new Date(claim.expires_at) < new Date() &&
      (claim.status === 'claimed' || claim.status === 'held')
    const status = isExpired ? 'expired' : claim.status

    const config: Record<string, { label: string; classes: string }> = {
      submitted: { label: 'Awaiting verify', classes: 'bg-slate-500/10 text-slate-300 border-slate-500/20' },
      email_verified: { label: 'Queue', classes: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
      held: { label: 'Held', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
      claimed: { label: 'Held', classes: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
      converted: { label: 'Converted', classes: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
      expired: { label: 'Expired', classes: 'bg-red-500/10 text-red-400 border-red-500/20' },
      released: { label: 'Released', classes: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
      rejected: { label: 'Rejected', classes: 'bg-red-500/10 text-red-300 border-red-500/20' },
    }

    const c = config[status] || config.released
    return (
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.classes}`}>
        {c.label}
      </span>
    )
  }

  const getCountdown = (expiresAt: string | null) => {
    if (!expiresAt) return '—'
    const diff = new Date(expiresAt).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days > 365) return 'Reserved indefinitely'
    if (days > 1) return `${days} days left`
    const hours = Math.floor(diff / (1000 * 60 * 60))
    return `${hours}h left`
  }

  const queueClaims = claims.filter((c) => c.status === 'email_verified' || c.status === 'submitted')
  const activeClaims = claims.filter((c) => c.status === 'claimed' || c.status === 'held')
  const otherClaims = claims.filter(
    (c) => !['claimed', 'held', 'email_verified', 'submitted'].includes(c.status)
  )

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
            {activeClaims.length} active holds &middot; {waitlist.length} on waitlist
            {founding
              ? ` · ${founding.secured}/${founding.total} founding secured`
              : ''}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
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
          <button
            onClick={() => setActiveTab('markets')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'markets'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Markets ({markets.length})
          </button>
        </div>
      </div>

      {activeTab === 'claims' && (
        <div className="space-y-6">
          {queueClaims.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-amber-500/80 uppercase tracking-wider mb-3">
                Review queue ({queueClaims.length})
              </h2>
              <div className="space-y-3">
                {queueClaims.map((claim) => (
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

          {/* Active Claims */}
          {activeClaims.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Active holds</h2>
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

      {activeTab === 'markets' && (
        <div className="rounded-lg border border-slate-800 overflow-hidden">
          {markets.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-500">No markets yet. Apply the Phase 2 migration to seed hubs.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">City</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Tier</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {markets.map((m) => (
                  <tr key={m.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-white">{m.city_name}</p>
                      <p className="text-xs text-slate-500">{m.country}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400 capitalize">{m.tier}</td>
                    <td className="px-4 py-3 text-sm capitalize text-slate-300">
                      {m.status}
                      {m.blocked ? ' · blocked' : ''}
                      {m.manual_review_only ? ' · review' : ''}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {(['available', 'reserved', 'owned'] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={m.status === status}
                            onClick={async () => {
                              await fetch('/api/hq/partners/markets', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: m.id, status }),
                              })
                              fetchData()
                            }}
                            className="px-2 py-1 rounded text-[10px] font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 capitalize"
                          >
                            {status}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={async () => {
                            await fetch('/api/hq/partners/markets', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: m.id, blocked: !m.blocked }),
                            })
                            fetchData()
                          }}
                          className="px-2 py-1 rounded text-[10px] font-medium bg-slate-800 text-amber-400 hover:bg-slate-700"
                        >
                          {m.blocked ? 'Unblock' : 'Block'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
  getCountdown: (expiresAt: string | null) => string
  onAction: (id: string, action: string, notes?: string, extra?: Record<string, unknown>) => void
  editingNotes: string | null
  setEditingNotes: (id: string | null) => void
  notesValue: string
  setNotesValue: (v: string) => void
}) {
  const isHeld = claim.status === 'claimed' || claim.status === 'held'
  const isQueue = claim.status === 'email_verified' || claim.status === 'submitted'
  const isExpired =
    !!claim.expires_at && new Date(claim.expires_at) < new Date() && isHeld

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
            <span>Submitted {new Date(claim.claimed_at).toLocaleDateString()}</span>
            {isHeld && !isExpired && (
              <span className="text-amber-400">{getCountdown(claim.expires_at)}</span>
            )}
            {isExpired && <span className="text-red-400">Expired</span>}
            {claim.status === 'email_verified' && (
              <span className="text-amber-400">Needs review (SLA: 2 business days)</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {isQueue && claim.status === 'email_verified' && (
            <>
              <button
                onClick={() => onAction(claim.id, 'approve_hold')}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
              >
                Approve hold
              </button>
              <button
                onClick={() => onAction(claim.id, 'reject')}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
              >
                Reject
              </button>
            </>
          )}
          {claim.status === 'submitted' && (
            <p className="text-xs text-slate-500 self-center">Waiting for email verification</p>
          )}
          {claim.status === 'rejected' && (
            <button
              onClick={() => onAction(claim.id, 'release')}
              className="px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
            >
              Release (allow re-enquire)
            </button>
          )}
          {(isHeld || isExpired) && (
            <>
              <button
                onClick={() => onAction(claim.id, 'extend')}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
              >
                Extend 30d
              </button>
              <button
                onClick={() => {
                  const now = new Date().toISOString()
                  onAction(claim.id, 'convert', undefined, {
                    agreement_signed_at: now,
                    payment_confirmed_at: now,
                  })
                }}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
              >
                Convert (paid)
              </button>
              <button
                onClick={() => onAction(claim.id, 'release')}
                className="px-3 py-1.5 rounded-md text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
              >
                Release
              </button>
            </>
          )}
        </div>
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
