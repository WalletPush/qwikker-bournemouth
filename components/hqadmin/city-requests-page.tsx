'use client'

import { useEffect, useState } from 'react'

interface Voter {
  id: string
  email: string
  name: string | null
  createdAt: string
  notifiedAt: string | null
}

interface CityRequest {
  cityName: string
  normalizedName: string
  voteCount: number
  notifiedCount: number
  latestVote: string
  voters: Voter[]
}

export function CityRequestsPage() {
  const [cities, setCities] = useState<CityRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCity, setExpandedCity] = useState<string | null>(null)
  const [notifyingCity, setNotifyingCity] = useState<string | null>(null)
  const [notifyUrl, setNotifyUrl] = useState('')
  const [notifyResult, setNotifyResult] = useState<{ city: string; message: string } | null>(null)

  useEffect(() => {
    fetchCities()
  }, [])

  async function fetchCities() {
    try {
      setLoading(true)
      const res = await fetch('/api/hq/city-requests')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setCities(data.cities || [])
    } catch (err: any) {
      setError(err.message || 'Failed to load city requests')
    } finally {
      setLoading(false)
    }
  }

  async function handleNotify(city: CityRequest) {
    if (!notifyUrl.trim()) return

    try {
      setNotifyingCity(city.normalizedName)
      const res = await fetch('/api/hq/city-requests/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cityNameNormalized: city.normalizedName,
          cityUrl: notifyUrl.trim(),
          cityDisplayName: city.cityName,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setNotifyResult({ city: city.normalizedName, message: data.message })
        setNotifyUrl('')
        fetchCities()
      } else {
        setNotifyResult({ city: city.normalizedName, message: `Error: ${data.error}` })
      }
    } catch {
      setNotifyResult({ city: city.normalizedName, message: 'Failed to send notifications' })
    } finally {
      setNotifyingCity(null)
    }
  }

  const totalVotes = cities.reduce((sum, c) => sum + c.voteCount, 0)
  const uniqueCities = cities.length

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-neutral-800 rounded w-64" />
          <div className="h-32 bg-neutral-800 rounded" />
          <div className="h-32 bg-neutral-800 rounded" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">City Requests</h1>
        <p className="text-neutral-400 text-sm mt-1">
          Votes from the "Vote for your city" form on the homepage.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
          <p className="text-neutral-400 text-xs uppercase tracking-wider mb-1">Total Votes</p>
          <p className="text-2xl font-semibold text-white">{totalVotes}</p>
        </div>
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
          <p className="text-neutral-400 text-xs uppercase tracking-wider mb-1">Unique Cities</p>
          <p className="text-2xl font-semibold text-white">{uniqueCities}</p>
        </div>
        <div className="bg-neutral-800/50 border border-neutral-700 rounded-lg p-4">
          <p className="text-neutral-400 text-xs uppercase tracking-wider mb-1">Most Requested</p>
          <p className="text-2xl font-semibold text-white">{cities[0]?.cityName || '—'}</p>
        </div>
      </div>

      {cities.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-neutral-400">No city requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cities.map((city) => {
            const isExpanded = expandedCity === city.normalizedName
            const unnotifiedCount = city.voteCount - city.notifiedCount
            const allNotified = unnotifiedCount === 0

            return (
              <div
                key={city.normalizedName}
                className="bg-neutral-800/50 border border-neutral-700 rounded-lg overflow-hidden"
              >
                {/* City row */}
                <button
                  onClick={() => setExpandedCity(isExpanded ? null : city.normalizedName)}
                  className="w-full flex items-center justify-between p-4 hover:bg-neutral-700/30 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#00d083]/10 text-[#00d083] font-semibold text-sm">
                      {city.voteCount}
                    </div>
                    <div>
                      <p className="text-white font-medium">{city.cityName}</p>
                      <p className="text-neutral-500 text-xs">
                        Last vote: {new Date(city.latestVote).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {allNotified && (
                          <span className="ml-2 text-emerald-400">All notified</span>
                        )}
                        {!allNotified && city.notifiedCount > 0 && (
                          <span className="ml-2 text-amber-400">{city.notifiedCount}/{city.voteCount} notified</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <svg
                    className={`w-5 h-5 text-neutral-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-neutral-700 p-4 space-y-4">
                    {/* Voter list */}
                    <div>
                      <p className="text-neutral-400 text-xs uppercase tracking-wider mb-2">
                        Voters ({city.voters.length})
                      </p>
                      <div className="space-y-1 max-h-60 overflow-y-auto">
                        {city.voters.map((voter) => (
                          <div
                            key={voter.id}
                            className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-neutral-700/30"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="text-white truncate">{voter.email}</span>
                              {voter.name && (
                                <span className="text-neutral-500 truncate">({voter.name})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0 text-xs">
                              <span className="text-neutral-500">
                                {new Date(voter.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                              </span>
                              {voter.notifiedAt ? (
                                <span className="text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">Notified</span>
                              ) : (
                                <span className="text-neutral-500 bg-neutral-700/50 px-1.5 py-0.5 rounded">Pending</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Notify section */}
                    {!allNotified && (
                      <div className="border-t border-neutral-700 pt-4">
                        <p className="text-sm text-white font-medium mb-2">
                          Notify {unnotifiedCount} voter{unnotifiedCount === 1 ? '' : 's'} that {city.cityName} is live
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="url"
                            placeholder="City URL (e.g. https://bournemouth.qwikker.com)"
                            value={notifyingCity === null || expandedCity === city.normalizedName ? notifyUrl : ''}
                            onChange={(e) => setNotifyUrl(e.target.value)}
                            className="flex-1 px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-md text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-[#00d083]/50"
                          />
                          <button
                            onClick={() => handleNotify(city)}
                            disabled={!notifyUrl.trim() || notifyingCity === city.normalizedName}
                            className="px-4 py-2 bg-[#00d083] hover:bg-[#00b86f] disabled:opacity-50 disabled:cursor-not-allowed text-black text-sm font-medium rounded-md transition-colors whitespace-nowrap"
                          >
                            {notifyingCity === city.normalizedName ? 'Sending...' : 'Send Notifications'}
                          </button>
                        </div>
                        {notifyResult?.city === city.normalizedName && (
                          <p className={`text-xs mt-2 ${notifyResult.message.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}>
                            {notifyResult.message}
                          </p>
                        )}
                      </div>
                    )}

                    {allNotified && (
                      <div className="border-t border-neutral-700 pt-4">
                        <p className="text-sm text-emerald-400 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          All voters have been notified.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
