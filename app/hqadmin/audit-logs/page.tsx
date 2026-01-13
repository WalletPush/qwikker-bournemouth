'use client'

import { useEffect, useState } from 'react'

interface AuditLog {
  id: string
  actor_user_id: string | null
  actor_email: string | null
  actor_type: 'hq_admin' | 'city_admin' | 'system'
  action: string
  resource_type: string
  resource_id: string | null
  city: string | null
  metadata: Record<string, any>
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

interface AuditData {
  logs: AuditLog[]
  total: number
  filters: {
    cities: string[]
    actions: string[]
  }
}

export default function AuditLogsPage() {
  const [data, setData] = useState<AuditData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [selectedAction, setSelectedAction] = useState<string>('')
  const [page, setPage] = useState(0)
  const pageSize = 50

  const fetchLogs = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedCity) params.set('city', selectedCity)
    if (selectedAction) params.set('action', selectedAction)
    params.set('limit', pageSize.toString())
    params.set('offset', (page * pageSize).toString())

    fetch(`/api/hq/audit?${params}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchLogs()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCity, selectedAction, page])

  if (loading && !data) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-800 rounded w-64"></div>
          <div className="h-64 bg-neutral-800 rounded"></div>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-8">
        <div className="bg-red-950/20 border border-red-900/50 rounded-lg p-4 text-red-400">
          <p className="font-medium">Failed to load audit logs</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const totalPages = Math.ceil(data.total / pageSize)

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Audit Logs</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Immutable record of all HQ admin actions
        </p>
      </div>

      {/* Filters */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-neutral-400 block mb-2">Filter by City</label>
            <select
              value={selectedCity}
              onChange={(e) => {
                setSelectedCity(e.target.value)
                setPage(0)
              }}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white text-sm"
            >
              <option value="">All Cities</option>
              {data.filters.cities.map(city => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <label className="text-sm text-neutral-400 block mb-2">Filter by Action</label>
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value)
                setPage(0)
              }}
              className="w-full bg-neutral-800 border border-neutral-700 rounded px-3 py-2 text-white text-sm"
            >
              <option value="">All Actions</option>
              {data.filters.actions.map(action => (
                <option key={action} value={action}>{action.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSelectedCity('')
                setSelectedAction('')
                setPage(0)
              }}
              className="px-3 py-2 text-sm border border-neutral-700 text-white rounded hover:bg-neutral-800"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-neutral-400">
        <span>Total: {data.total.toLocaleString()} events</span>
        {(selectedCity || selectedAction) && (
          <span className="text-[#00D083]">
            (filtered: {data.logs.length} shown)
          </span>
        )}
      </div>

      {/* Logs Table */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
        {data.logs.length === 0 ? (
          <div className="p-8 text-center text-neutral-500">
            No audit logs found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-neutral-800/50">
                <tr className="text-left border-b border-neutral-800">
                  <th className="p-3 text-sm font-medium text-neutral-400">Timestamp</th>
                  <th className="p-3 text-sm font-medium text-neutral-400">Admin</th>
                  <th className="p-3 text-sm font-medium text-neutral-400">Action</th>
                  <th className="p-3 text-sm font-medium text-neutral-400">Resource</th>
                  <th className="p-3 text-sm font-medium text-neutral-400">City</th>
                  <th className="p-3 text-sm font-medium text-neutral-400">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                {data.logs.map(log => (
                  <tr key={log.id} className="hover:bg-neutral-800/30">
                    <td className="p-3 text-sm text-white whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3 text-sm text-neutral-300">
                      <div>
                        {log.actor_email || 'System'}
                        {log.actor_type && (
                          <span className="ml-2 text-xs text-neutral-500">({log.actor_type})</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs bg-neutral-800 text-neutral-300">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="p-3 text-sm text-neutral-400">
                      {log.resource_type}
                    </td>
                    <td className="p-3 text-sm text-neutral-300">
                      {log.city || '—'}
                    </td>
                    <td className="p-3 text-xs text-neutral-500 max-w-xs truncate">
                      {JSON.stringify(log.metadata)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-2 text-sm border border-neutral-700 text-white rounded hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <span className="text-sm text-neutral-400">
            Page {page + 1} of {totalPages}
          </span>

          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-2 text-sm border border-neutral-700 text-white rounded hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

