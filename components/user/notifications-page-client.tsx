'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, ExternalLink, Calendar, Building2, CheckCheck } from 'lucide-react'

// Helper function to format time difference (replaces date-fns)
function formatDistanceToNow(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  
  const diffMonths = Math.floor(diffDays / 30)
  return `${diffMonths} month${diffMonths === 1 ? '' : 's'} ago`
}

interface Notification {
  id: string
  message: string
  sentAt: string
  readAt: string | null
  trackingUrl: string
  destinationUrl: string
  businessId: string
  businessName: string
  businessLogo: string | null
  city: string
  shortCode: string
}

interface NotificationsPageClientProps {
  currentUser: any
  currentCity: string
  cityDisplayName: string
}

export function NotificationsPageClient({ currentUser, currentCity, cityDisplayName }: NotificationsPageClientProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [markingAll, setMarkingAll] = useState(false)

  const limit = 20

  useEffect(() => {
    if (!currentUser) {
      setLoading(false)
      return
    }

    fetchNotifications()
  }, [currentUser, page])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      const offset = page * limit
      const walletPassParam = currentUser?.wallet_pass_id ? `&wallet_pass_id=${currentUser.wallet_pass_id}` : ''
      const response = await fetch(`/api/user/notifications?limit=${limit}&offset=${offset}${walletPassParam}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications')
      }

      const data = await response.json()
      
      if (page === 0) {
        setNotifications(data.notifications || [])
      } else {
        setNotifications(prev => [...prev, ...(data.notifications || [])])
      }
      
      setUnreadCount(data.unreadCount || 0)
      setHasMore(data.pagination?.hasMore || false)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching notifications:', err)
      setError(err.message || 'Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  // Mark a single notification as read (optimistic)
  const markAsRead = useCallback(async (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, readAt: new Date().toISOString() } : n)
    )
    setUnreadCount(prev => Math.max(0, prev - 1))

    try {
      await fetch('/api/user/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationIds: [notificationId],
          wallet_pass_id: currentUser?.wallet_pass_id,
        }),
      })
    } catch {
      /* optimistic */
    }
  }, [currentUser?.wallet_pass_id])

  // Mark all notifications as read
  const markAllAsRead = async () => {
    setMarkingAll(true)
    setNotifications(prev =>
      prev.map(n => n.readAt ? n : { ...n, readAt: new Date().toISOString() })
    )
    setUnreadCount(0)

    try {
      await fetch('/api/user/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          markAll: true,
          wallet_pass_id: currentUser?.wallet_pass_id,
        }),
      })
    } catch {
      /* optimistic */
    } finally {
      setMarkingAll(false)
    }
  }

  const handleOpenNotification = (notification: Notification) => {
    if (!notification.readAt) {
      markAsRead(notification.id)
    }
    window.open(notification.trackingUrl, '_blank')
  }

  if (!currentUser) {
    return (
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-10 text-center">
          <Bell className="w-10 h-10 text-amber-300 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-white mb-1">Sign in required</h2>
          <p className="text-sm text-zinc-400">
            Open Qwikker from your wallet pass to see notifications.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="rounded-2xl border border-[#00d083]/25 bg-gradient-to-br from-[#00d083]/12 via-zinc-900 to-sky-500/10 px-4 py-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#00d083] font-semibold mb-1">
              Inbox
            </p>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-2">
              Notifications
              {unreadCount > 0 && (
                <span className="text-xs font-bold text-black bg-[#00d083] px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-sm text-zinc-300 mt-1.5">
              Messages from businesses in {cityDisplayName}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={markingAll}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#9dffc0] border border-[#00d083]/35 bg-[#00d083]/10 rounded-full transition-colors disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{markingAll ? 'Marking…' : 'Mark all read'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-700/80 bg-zinc-800/80 px-3.5 py-3">
        <p className="text-xs text-zinc-400">
          Your wallet pass shows the latest message. This feed keeps the full history.
        </p>
      </div>

      {loading && page === 0 && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-zinc-700/80 bg-zinc-800/60 p-4 animate-pulse"
            >
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-xl bg-zinc-700/80" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-1/3 rounded bg-zinc-700/80" />
                  <div className="h-3 w-full rounded bg-zinc-700/50" />
                  <div className="h-3 w-2/3 rounded bg-zinc-700/40" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
          <p className="text-sm text-rose-200">{error}</p>
        </div>
      )}

      {!loading && notifications.length === 0 && (
        <div className="rounded-2xl border border-zinc-700/80 bg-gradient-to-b from-zinc-800 to-zinc-900 px-4 py-12 text-center shadow-md shadow-black/30">
          <div className="w-14 h-14 rounded-full bg-[#00d083]/15 border border-[#00d083]/30 flex items-center justify-center mx-auto mb-4">
            <Bell className="w-7 h-7 text-[#00d083]" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-1">No notifications yet</h2>
          <p className="text-sm text-zinc-400">
            When partners send updates, they&apos;ll show up here.
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        {notifications.map((notification) => {
          const isUnread = !notification.readAt
          return (
            <div
              key={notification.id}
              className={`relative rounded-2xl p-4 transition-all border shadow-sm shadow-black/20 ${
                isUnread
                  ? 'bg-zinc-800 border-[#00d083]/35 ring-1 ring-[#00d083]/15'
                  : 'bg-zinc-800/70 border-zinc-700/80'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 relative">
                  {notification.businessLogo ? (
                    <img
                      src={notification.businessLogo}
                      alt={notification.businessName}
                      className="w-11 h-11 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-zinc-700 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-zinc-400" />
                    </div>
                  )}
                  {isUnread && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-[#00d083] rounded-full border-2 border-zinc-900" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="min-w-0">
                      <h3 className={`font-semibold truncate ${isUnread ? 'text-white' : 'text-zinc-300'}`}>
                        {notification.businessName}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        <span>{formatDistanceToNow(new Date(notification.sentAt))}</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleOpenNotification(notification)}
                      className="shrink-0 px-3 py-1.5 bg-[#00d083]/20 hover:bg-[#00d083]/30 text-[#9dffc0] text-xs font-semibold rounded-full border border-[#00d083]/35 transition-colors flex items-center gap-1.5"
                    >
                      <span>View</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <p className={`text-sm whitespace-pre-wrap break-words ${isUnread ? 'text-zinc-200' : 'text-zinc-400'}`}>
                    {notification.message}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {hasMore && (
        <div className="pt-1 text-center">
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={loading}
            className="px-5 py-2.5 text-xs font-semibold text-[#9dffc0] border border-[#00d083]/35 bg-[#00d083]/10 rounded-full transition-colors disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  )
}
