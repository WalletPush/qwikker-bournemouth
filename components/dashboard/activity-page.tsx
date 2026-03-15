'use client'

import { useState, useEffect, useCallback } from 'react'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  metadata: Record<string, unknown>
  read: boolean
  created_at: string
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; accent: string }> = {
  offer_claim: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
    accent: 'text-amber-400 bg-amber-400/10',
  },
  loyalty_join: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
    accent: 'text-[#00d083] bg-[#00d083]/10',
  },
  stamp_earn: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    accent: 'text-blue-400 bg-blue-400/10',
  },
  redemption: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
      </svg>
    ),
    accent: 'text-purple-400 bg-purple-400/10',
  },
  business_save: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    ),
    accent: 'text-pink-400 bg-pink-400/10',
  },
  change_approved: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    accent: 'text-emerald-400 bg-emerald-400/10',
  },
  change_rejected: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    accent: 'text-red-400 bg-red-400/10',
  },
  admin_message: {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
      </svg>
    ),
    accent: 'text-slate-300 bg-slate-400/10',
  },
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

type FilterTab = 'all' | 'unread'

export function ActivityPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [offset, setOffset] = useState(0)
  const LIMIT = 30

  const fetchNotifications = useCallback(async (reset = false) => {
    try {
      const currentOffset = reset ? 0 : offset
      const params = new URLSearchParams({
        limit: String(LIMIT),
        offset: String(currentOffset),
        ...(filter === 'unread' ? { unreadOnly: 'true' } : {}),
      })

      const res = await fetch(`/api/business/notifications?${params}`)
      if (!res.ok) return

      const data = await res.json()
      setNotifications(prev =>
        reset ? data.notifications : [...prev, ...data.notifications]
      )
      setTotal(data.total)
      setUnreadCount(data.unreadCount)
      if (reset) setOffset(0)
    } catch {
      // Non-critical
    } finally {
      setLoading(false)
    }
  }, [filter, offset])

  useEffect(() => {
    setLoading(true)
    setOffset(0)
    fetchNotifications(true)
  }, [filter]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/business/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markAllRead' }),
      })
      setNotifications(prev => prev.map(n => ({ ...n, read: true })))
      setUnreadCount(0)
    } catch {
      // Non-critical
    }
  }

  const handleMarkRead = async (id: string) => {
    try {
      await fetch('/api/business/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'markRead', notificationId: id }),
      })
      setNotifications(prev =>
        prev.map(n => (n.id === id ? { ...n, read: true } : n))
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {
      // Non-critical
    }
  }

  const handleLoadMore = () => {
    const newOffset = offset + LIMIT
    setOffset(newOffset)
    // Fetch next page
    const params = new URLSearchParams({
      limit: String(LIMIT),
      offset: String(newOffset),
      ...(filter === 'unread' ? { unreadOnly: 'true' } : {}),
    })
    fetch(`/api/business/notifications?${params}`)
      .then(res => res.json())
      .then(data => {
        setNotifications(prev => [...prev, ...data.notifications])
        setTotal(data.total)
      })
      .catch(() => {})
  }

  const hasMore = notifications.length < total

  const defaultConfig = TYPE_CONFIG.admin_message

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Activity</h1>
          <p className="text-sm text-slate-400 mt-1">
            Offer claims, loyalty events, and status updates
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm text-[#00d083] hover:text-[#00b86f] transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {(['all', 'unread'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab
                ? 'bg-[#00d083]/10 text-[#00d083] border border-[#00d083]/30'
                : 'bg-slate-800/50 text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            {tab === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-700 rounded w-2/3" />
                  <div className="h-3 bg-slate-700 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <p className="text-slate-400 font-medium">No activity yet</p>
          <p className="text-sm text-slate-500 mt-1">
            {filter === 'unread'
              ? 'All caught up.'
              : 'Activity from offer claims, loyalty events, and approvals will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => {
            const config = TYPE_CONFIG[n.type] || defaultConfig
            return (
              <button
                key={n.id}
                onClick={() => !n.read && handleMarkRead(n.id)}
                className={`w-full text-left flex items-start gap-3 p-4 rounded-xl transition-colors ${
                  n.read
                    ? 'bg-slate-800/30 hover:bg-slate-800/40'
                    : 'bg-slate-800/60 hover:bg-slate-800/80 border border-slate-700/50'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${config.accent}`}>
                  {config.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${n.read ? 'text-slate-400' : 'text-white'}`}>
                      {n.title}
                    </p>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-500">{getRelativeTime(n.created_at)}</span>
                      {!n.read && (
                        <div className="w-2 h-2 rounded-full bg-[#00d083]" />
                      )}
                    </div>
                  </div>
                  <p className={`text-sm mt-0.5 ${n.read ? 'text-slate-500' : 'text-slate-400'}`}>
                    {n.message}
                  </p>
                </div>
              </button>
            )
          })}

          {hasMore && (
            <button
              onClick={handleLoadMore}
              className="w-full py-3 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </div>
  )
}
