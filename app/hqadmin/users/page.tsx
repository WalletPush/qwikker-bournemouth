'use client'

import { useEffect, useState } from 'react'

interface HQAdmin {
  id: string
  user_id: string
  email: string
  role: string
  is_active: boolean
  created_at: string
}

interface FranchiseAdmin {
  id: string
  user_id: string
  city: string
  role: string
  created_at: string
  created_by: string | null
}

interface UsersData {
  hq_admins: HQAdmin[]
  franchise_admins: FranchiseAdmin[]
}

export default function UsersPage() {
  const [data, setData] = useState<UsersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'hq' | 'franchise'>('hq')
  const [updating, setUpdating] = useState<string | null>(null)

  const fetchUsers = () => {
    fetch('/api/hq/users')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const toggleActive = async (id: string, currentValue: boolean) => {
    if (!confirm(`${currentValue ? 'Deactivate' : 'Activate'} this admin?`)) return

    setUpdating(id)
    try {
      const res = await fetch('/api/hq/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'hq',
          id,
          is_active: !currentValue
        })
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      // Refresh data
      fetchUsers()
    } catch (err) {
      alert(`Failed to update user: ${err instanceof Error ? err.message : 'Unknown error'}`)
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
          <p className="font-medium">Failed to load users</p>
          <p className="text-sm mt-1">{error || 'Unknown error'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">Users</h1>
        <p className="text-sm text-neutral-400 mt-1">
          Manage HQ admins and franchise admins
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-neutral-800">
        <button
          onClick={() => setActiveTab('hq')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'hq'
              ? 'border-[#00D083] text-white'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          HQ Admins ({data.hq_admins.length})
        </button>
        <button
          onClick={() => setActiveTab('franchise')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'franchise'
              ? 'border-[#00D083] text-white'
              : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          Franchise Admins ({data.franchise_admins.length})
        </button>
      </div>

      {/* HQ Admins Table */}
      {activeTab === 'hq' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          {data.hq_admins.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              No HQ admins found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-800/50">
                  <tr className="text-left border-b border-neutral-800">
                    <th className="p-3 text-sm font-medium text-neutral-400">Email</th>
                    <th className="p-3 text-sm font-medium text-neutral-400">Role</th>
                    <th className="p-3 text-sm font-medium text-neutral-400">Status</th>
                    <th className="p-3 text-sm font-medium text-neutral-400">Created</th>
                    <th className="p-3 text-sm font-medium text-neutral-400">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {data.hq_admins.map(admin => (
                    <tr key={admin.id} className="hover:bg-neutral-800/30">
                      <td className="p-3 text-sm text-white">{admin.email}</td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-neutral-800 text-neutral-300">
                          {admin.role}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                          admin.is_active 
                            ? 'bg-[#00D083]/10 text-[#00D083]' 
                            : 'bg-neutral-800 text-neutral-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            admin.is_active ? 'bg-[#00D083]' : 'bg-neutral-500'
                          }`}></span>
                          {admin.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-neutral-400">
                        {new Date(admin.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3">
                        <button
                          onClick={() => toggleActive(admin.id, admin.is_active)}
                          disabled={updating === admin.id}
                          className={`px-3 py-1 text-xs rounded border ${
                            admin.is_active
                              ? 'border-orange-500 text-orange-400 hover:bg-orange-500/10'
                              : 'border-[#00D083] text-[#00D083] hover:bg-[#00D083]/10'
                          } disabled:opacity-50`}
                        >
                          {updating === admin.id ? 'Updating...' : admin.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Franchise Admins Table */}
      {activeTab === 'franchise' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
          {data.franchise_admins.length === 0 ? (
            <div className="p-8 text-center text-neutral-500">
              No franchise admins found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-neutral-800/50">
                  <tr className="text-left border-b border-neutral-800">
                    <th className="p-3 text-sm font-medium text-neutral-400">City</th>
                    <th className="p-3 text-sm font-medium text-neutral-400">User ID</th>
                    <th className="p-3 text-sm font-medium text-neutral-400">Role</th>
                    <th className="p-3 text-sm font-medium text-neutral-400">Created</th>
                    <th className="p-3 text-sm font-medium text-neutral-400">Created By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {data.franchise_admins.map(admin => (
                    <tr key={admin.id} className="hover:bg-neutral-800/30">
                      <td className="p-3 text-sm text-white font-medium capitalize">
                        {admin.city}
                      </td>
                      <td className="p-3 text-xs text-neutral-400 font-mono">
                        {admin.user_id ? admin.user_id.slice(0, 8) + '...' : '—'}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-neutral-800 text-neutral-300">
                          {admin.role}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-neutral-400">
                        {new Date(admin.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-xs text-neutral-500 font-mono">
                        {admin.created_by ? admin.created_by.slice(0, 8) + '...' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

