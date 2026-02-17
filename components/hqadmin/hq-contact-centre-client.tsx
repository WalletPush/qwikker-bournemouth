'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { BugSummaryCard } from '@/components/contact-centre/bug-summary-card'

// ─── Types ────────────────────────────────────────────────────────
interface Thread {
  id: string
  subject: string | null
  category: string
  status: string
  priority: string
  city: string
  lastMessageAt: string
  lastMessagePreview: string | null
  lastMessageFromRole: string
  unreadCount: number
  createdAt: string
  metadata: Record<string, unknown>
}

interface Message {
  id: string
  senderRole: string
  senderUserId: string
  messageType: string
  body: string
  metadata: Record<string, unknown> | null
  createdAt: string
}

// ─── Helpers ──────────────────────────────────────────────────────
function formatTimeAgo(dateStr: string): string {
  const now = Date.now()
  const d = new Date(dateStr).getTime()
  const diffMs = now - d
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    open: 'bg-green-500/20 text-green-400 border-green-500/30',
    closed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    resolved: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  }
  return map[status] || map.open
}

function getCategoryColor(cat: string): string {
  const map: Record<string, string> = {
    bug: 'bg-red-500/20 text-red-400 border-red-500/30',
    platform_issue: 'bg-red-500/20 text-red-400 border-red-500/30',
    feature_request: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    billing: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    support: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    other: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  }
  return map[cat] || map.other
}

function getPriorityColor(priority: string): string {
  const map: Record<string, string> = {
    low: 'text-slate-400',
    normal: 'text-blue-400',
    high: 'text-orange-400',
    urgent: 'text-red-400',
  }
  return map[priority] || map.normal
}

// ─── Component ────────────────────────────────────────────────────
export function HQContactCentreClient() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [statusFilter, setStatusFilter] = useState('open')
  const [searchQuery, setSearchQuery] = useState('')

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [activeThread, setActiveThread] = useState<Thread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  const [replyBody, setReplyBody] = useState('')
  const [sending, setSending] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch threads
  const fetchThreads = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.set('status', statusFilter)
      if (searchQuery) params.set('search', searchQuery)
      const res = await fetch(`/api/hq/contact/threads?${params}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setThreads(data.threads || [])
    } catch (err) {
      console.error('Error fetching HQ threads:', err)
    } finally {
      setLoadingThreads(false)
    }
  }, [statusFilter, searchQuery])

  useEffect(() => {
    fetchThreads()
    const interval = setInterval(fetchThreads, 30_000)
    return () => clearInterval(interval)
  }, [fetchThreads])

  // Open thread
  const openThread = useCallback(async (threadId: string) => {
    setActiveThreadId(threadId)
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/hq/contact/threads/${threadId}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setActiveThread(data.thread)
      setMessages(data.messages || [])
      setThreads(prev => prev.map(t => t.id === threadId ? { ...t, unreadCount: 0 } : t))
    } catch (err) {
      console.error('Error fetching HQ thread detail:', err)
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send reply
  const handleSendReply = async () => {
    if (!activeThreadId || !replyBody.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/hq/contact/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: activeThreadId, body: replyBody.trim() }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setMessages(prev => [...prev, data.message])
      setReplyBody('')
      fetchThreads()
    } catch (err) {
      console.error('Error sending HQ reply:', err)
    } finally {
      setSending(false)
    }
  }

  // Update status
  const handleUpdateStatus = async (status: string) => {
    if (!activeThreadId) return
    try {
      await fetch(`/api/hq/contact/threads/${activeThreadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      openThread(activeThreadId)
      fetchThreads()
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  // ─── Render ───────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-200px)] flex rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-900/50">
      {/* Thread list */}
      <div className={`w-full lg:w-[380px] lg:flex-shrink-0 border-r border-slate-700/50 flex flex-col ${
        activeThreadId ? 'hidden lg:flex' : 'flex'
      }`}>
        <div className="flex-shrink-0 p-4 border-b border-slate-700/50 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Escalations</h3>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
              {threads.filter(t => t.unreadCount > 0).length} unread
            </Badge>
          </div>
          <Input
            placeholder="Search by city or subject..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
          />
          <div className="flex gap-2">
            {['open', 'closed', 'resolved', ''].map(s => (
              <button
                key={s || 'all'}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  statusFilter === s
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingThreads ? (
            <div className="p-4 text-center text-slate-500">Loading...</div>
          ) : threads.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-slate-400 text-sm">No escalations</p>
              <p className="text-slate-500 text-xs mt-1">Messages from City Admins appear here</p>
            </div>
          ) : (
            threads.map(thread => (
              <button
                key={thread.id}
                onClick={() => openThread(thread.id)}
                className={`w-full text-left p-4 border-b border-slate-800/50 hover:bg-slate-800/50 transition-all ${
                  activeThreadId === thread.id ? 'bg-slate-800/70 border-l-2 border-l-emerald-400' : ''
                } ${thread.unreadCount > 0 ? 'bg-slate-800/30' : ''}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="text-[10px] py-0 bg-slate-700 text-slate-300 border-slate-600">
                        {thread.city}
                      </Badge>
                      {/* Escalation type badge */}
                      {thread.metadata?.escalationType === 'business_bug' && (
                        <Badge className="text-[10px] py-0 bg-amber-500/20 text-amber-400 border-amber-500/30">
                          Escalated Bug
                        </Badge>
                      )}
                      {thread.metadata?.escalationType === 'admin_report' && (
                        <Badge className="text-[10px] py-0 bg-blue-500/20 text-blue-400 border-blue-500/30">
                          Admin Report
                        </Badge>
                      )}
                      {/* Priority indicator */}
                      {(thread.priority === 'urgent' || thread.priority === 'high') && (
                        <Badge className={`text-[10px] py-0 ${
                          thread.priority === 'urgent'
                            ? 'bg-red-500/20 text-red-400 border-red-500/30'
                            : 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                        }`}>
                          {thread.priority}
                        </Badge>
                      )}
                      {thread.unreadCount > 0 && (
                        <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                          {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
                        </span>
                      )}
                    </div>
                    {thread.subject && (
                      <p className="text-xs text-slate-300 font-medium truncate">{thread.subject}</p>
                    )}
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {thread.lastMessagePreview || 'No messages'}
                    </p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-[10px] text-slate-500">{formatTimeAgo(thread.lastMessageAt)}</p>
                    <Badge className={`text-[10px] py-0 mt-1 ${getCategoryColor(thread.category)}`}>
                      {thread.category}
                    </Badge>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Message view */}
      <div className={`flex-1 flex flex-col ${activeThreadId ? '' : 'hidden lg:flex'}`}>
        {!activeThreadId ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <svg className="w-16 h-16 mx-auto text-slate-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-slate-400 font-medium">Select an escalation</p>
              <p className="text-slate-500 text-sm mt-1">Choose a thread from the left</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveThreadId(null)}
                    className="lg:hidden p-1 hover:bg-slate-800 rounded"
                  >
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge className="text-[10px] bg-slate-700 text-slate-300 border-slate-600">
                        {activeThread?.city}
                      </Badge>
                      <h3 className="font-bold text-white">{activeThread?.subject || 'Escalation'}</h3>
                      {activeThread && (
                        <Badge className={`text-[10px] py-0 ${getStatusColor(activeThread.status)}`}>
                          {activeThread.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Priority badge */}
                  {activeThread?.priority && activeThread.priority !== 'normal' && (
                    <Badge className={`text-[10px] py-0 ${
                      activeThread.priority === 'urgent' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      activeThread.priority === 'high' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                      'bg-slate-500/20 text-slate-400 border-slate-500/30'
                    }`}>
                      {activeThread.priority}
                    </Badge>
                  )}
                  {activeThread?.status === 'open' ? (
                    <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('resolved')}
                      className="text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10">
                      Resolve
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('open')}
                      className="text-xs border-green-500/30 text-green-400 hover:bg-green-500/10">
                      Re-open
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleUpdateStatus('closed')}
                    className="text-xs border-slate-500/30 text-slate-400 hover:bg-slate-500/10">
                    Close
                  </Button>
                </div>
              </div>

              {/* Linked thread info (for escalated business bugs) */}
              {activeThread?.metadata?.escalationType === 'business_bug' && (
                <div className="mt-2 flex items-center gap-3 text-xs text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                  <span className="font-medium">Escalated from business thread</span>
                  {activeThread.metadata.linkedCity && (
                    <Badge className="text-[10px] py-0 bg-slate-700 text-slate-300 border-slate-600">
                      {String(activeThread.metadata.linkedCity)}
                    </Badge>
                  )}
                  {activeThread.metadata.linkedBusinessId && (
                    <span className="text-slate-500">
                      Business: {String(activeThread.metadata.linkedBusinessId).slice(0, 8)}...
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <div className="text-center text-slate-500 mt-8">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-slate-500 mt-8">No messages yet</div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.senderRole === 'hq' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                      msg.messageType === 'status_change'
                        ? 'bg-slate-800/50 text-slate-500 text-center text-xs italic mx-auto max-w-none rounded-lg'
                        : msg.senderRole === 'hq'
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-white'
                        : 'bg-slate-800 border border-slate-700 text-white'
                    }`}>
                      {msg.messageType !== 'status_change' && (
                        <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                      )}
                      {msg.messageType === 'status_change' && <p>{msg.body}</p>}

                      {/* Bug Summary Card (HQ sees diagnostics + trail) */}
                      {msg.metadata && (msg.metadata as Record<string, unknown>).severity && (
                        <div className="mt-2">
                          <BugSummaryCard
                            metadata={msg.metadata as Record<string, unknown>}
                            showDiagnostics={true}
                          />
                        </div>
                      )}

                      {msg.messageType !== 'status_change' && (
                        <p className="text-[10px] text-slate-500 mt-1">
                          {msg.senderRole === 'hq' ? 'You (HQ)' : 'City Admin'} &middot; {formatTimeAgo(msg.createdAt)}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply bar */}
            <div className="flex-shrink-0 p-4 border-t border-slate-700/50">
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type your reply..."
                  value={replyBody}
                  onChange={e => setReplyBody(e.target.value)}
                  rows={2}
                  className="flex-1 bg-slate-800 border-slate-700 text-white text-sm resize-none"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendReply()
                    }
                  }}
                />
                <Button
                  onClick={handleSendReply}
                  disabled={sending || !replyBody.trim()}
                  className="self-end bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {sending ? '...' : 'Send'}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
