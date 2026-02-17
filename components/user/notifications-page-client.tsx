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
    // Optimistic update
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
    } catch (err) {
      console.error('Failed to mark as read:', err)
    }
  }, [currentUser?.wallet_pass_id])

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    setMarkingAll(true)

    // Optimistic update
    const now = new Date().toISOString()
    setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt || now })))
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
    } catch (err) {
      console.error('Failed to mark all as read:', err)
    } finally {
      setMarkingAll(false)
    }
  }, [currentUser?.wallet_pass_id])

  const handleOpenNotification = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.readAt) {
      markAsRead(notification.id)
    }
    // Use trackingUrl for cookie-free identity
    window.open(notification.trackingUrl, '_blank')
  }

  if (!currentUser) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6 text-center">
          <Bell className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Sign In Required</h2>
          <p className="text-slate-400">
            Please sign in to view your notification history.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Bell className="w-8 h-8 text-blue-400" />
              <h1 className="text-3xl font-bold text-white">Notifications</h1>
              {unreadCount > 0 && (
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-blue-500 text-white rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <p className="text-slate-400">
              Your complete notification history from businesses in {cityDisplayName}
            </p>
          </div>

          {/* Mark all as read */}
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              disabled={markingAll}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCheck className="w-4 h-4" />
              <span className="hidden sm:inline">{markingAll ? 'Marking...' : 'Mark all as read'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Helper Text */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-300">
          💡 <strong>Tip:</strong> Your wallet pass shows only the latest message. 
          This feed preserves your full notification history.
        </p>
      </div>

      {/* Loading State */}
      {loading && page === 0 && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Notifications List */}
      {!loading && notifications.length === 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-12 text-center">
          <Bell className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-300 mb-2">No Notifications Yet</h2>
          <p className="text-slate-400 mb-4">
            You haven't received any notifications from businesses yet.
          </p>
          <p className="text-sm text-slate-500">
            Enable Wallet Pass Promotions in Settings to receive offers and updates.
          </p>
        </div>
      )}

      {/* Notifications Grid */}
      <div className="space-y-4">
        {notifications.map((notification) => {
          const isUnread = !notification.readAt
          return (
            <div
              key={notification.id}
              className={`relative rounded-lg p-5 transition-all ${
                isUnread
                  ? 'bg-slate-800/70 border-l-4 border-l-blue-500 border border-blue-500/20 hover:bg-slate-800/90'
                  : 'bg-slate-800/50 border border-slate-700 hover:bg-slate-800/70 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Business Logo + Unread Dot */}
                <div className="flex-shrink-0 relative">
                  {notification.businessLogo ? (
                    <img
                      src={notification.businessLogo}
                      alt={notification.businessName}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-slate-400" />
                    </div>
                  )}
                  {isUnread && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-slate-900" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h3 className={`font-semibold mb-1 ${isUnread ? 'text-white' : 'text-slate-300'}`}>
                        {notification.businessName}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {formatDistanceToNow(new Date(notification.sentAt))}
                        </span>
                      </div>
                    </div>
                    
                    {/* Open Button */}
                    <button
                      onClick={() => handleOpenNotification(notification)}
                      className="flex-shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                      <span>View</span>
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Message */}
                  <p className={`text-sm whitespace-pre-wrap break-words ${isUnread ? 'text-slate-200' : 'text-slate-400'}`}>
                    {notification.message}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={loading}
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {loading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  )
}
