'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  MessageSquare, Send, Plus, ArrowLeft, Clock, AlertCircle,
  CheckCircle, Bug, Lightbulb, CreditCard, Store, Image,
  Tag, Calendar, Smartphone, HelpCircle, ChevronRight,
  Shield, ShieldAlert, ShieldX, Skull
} from 'lucide-react'
import { BugSummaryCard } from '@/components/contact-centre/bug-summary-card'

// ─── Category config ─────────────────────────────────────────────
const CATEGORIES = [
  { value: 'bug', label: 'Bug Report', icon: Bug, color: 'text-red-400' },
  { value: 'feature_request', label: 'Feature Request', icon: Lightbulb, color: 'text-yellow-400' },
  { value: 'billing', label: 'Billing', icon: CreditCard, color: 'text-blue-400' },
  { value: 'listing', label: 'Listing Issue', icon: Store, color: 'text-orange-400' },
  { value: 'menu', label: 'Menu Issue', icon: Store, color: 'text-orange-400' },
  { value: 'photos', label: 'Photos Issue', icon: Image, color: 'text-purple-400' },
  { value: 'offers', label: 'Offers Issue', icon: Tag, color: 'text-green-400' },
  { value: 'events', label: 'Events Issue', icon: Calendar, color: 'text-cyan-400' },
  { value: 'app_issue', label: 'App Issue', icon: Smartphone, color: 'text-pink-400' },
  { value: 'other', label: 'Other', icon: HelpCircle, color: 'text-slate-400' },
] as const

// ─── Severity config (canonical) ─────────────────────────────────
const SEVERITIES = [
  { value: 'low', label: 'Low', icon: Shield, color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30', desc: 'Minor issue, workaround exists' },
  { value: 'medium', label: 'Medium', icon: ShieldAlert, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', desc: 'Noticeable issue, partially working' },
  { value: 'high', label: 'High', icon: ShieldX, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', desc: 'Major issue, feature broken' },
  { value: 'critical', label: 'Critical', icon: Skull, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', desc: 'System down or data loss' },
] as const

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-500/20 text-green-400 border-green-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  closed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  resolved: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-slate-400',
  normal: 'text-blue-400',
  high: 'text-orange-400',
  urgent: 'text-red-400',
}

// ─── Activity Trail Ring Buffer ──────────────────────────────────
interface TrailEvent {
  ts: string
  type: 'page_view' | 'click' | 'api_error' | 'navigation'
  path: string
  target?: string
  meta?: Record<string, unknown>
}

const MAX_TRAIL_EVENTS = 25
const MAX_TRAIL_AGE_MS = 5 * 60 * 1000 // 5 minutes

// Strip querystring and hash from paths (privacy)
function stripPath(url: string): string {
  try {
    const u = new URL(url, window.location.origin)
    return u.pathname
  } catch {
    return url.split('?')[0].split('#')[0]
  }
}

// Global ring buffer (persists across re-renders within the session)
let trailBuffer: TrailEvent[] = []
let trailListenerActive = false

function pushTrailEvent(evt: TrailEvent) {
  const now = Date.now()
  // Trim old events
  trailBuffer = trailBuffer.filter(e => now - new Date(e.ts).getTime() < MAX_TRAIL_AGE_MS)
  trailBuffer.push(evt)
  // Keep max size
  if (trailBuffer.length > MAX_TRAIL_EVENTS) {
    trailBuffer = trailBuffer.slice(-MAX_TRAIL_EVENTS)
  }
}

function getTrailSnapshot(): TrailEvent[] {
  const now = Date.now()
  return trailBuffer
    .filter(e => now - new Date(e.ts).getTime() < MAX_TRAIL_AGE_MS)
    .slice(-MAX_TRAIL_EVENTS)
}

function startTrailCapture() {
  if (trailListenerActive || typeof window === 'undefined') return
  trailListenerActive = true

  // Track page views / navigation
  const originalPushState = history.pushState.bind(history)
  history.pushState = function (...args) {
    originalPushState(...args)
    pushTrailEvent({ ts: new Date().toISOString(), type: 'navigation', path: stripPath(window.location.href) })
  }

  window.addEventListener('popstate', () => {
    pushTrailEvent({ ts: new Date().toISOString(), type: 'navigation', path: stripPath(window.location.href) })
  })

  // Track clicks (only on interactive elements, never capture text content)
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement
    if (!target) return
    const tag = target.tagName?.toLowerCase()
    if (!['a', 'button', 'input', 'select'].includes(tag) && !target.closest('button') && !target.closest('a')) return
    const btn = target.closest('button') || target.closest('a') || target
    // Build a safe target identifier (no personal data)
    const id = btn.id || btn.getAttribute('data-testid') || btn.getAttribute('aria-label') || tag
    pushTrailEvent({
      ts: new Date().toISOString(),
      type: 'click',
      path: stripPath(window.location.href),
      target: String(id).slice(0, 80),
    })
  }, { passive: true, capture: true })

  // Initial page view
  pushTrailEvent({ ts: new Date().toISOString(), type: 'page_view', path: stripPath(window.location.href) })
}

interface Thread {
  id: string
  subject: string | null
  category: string
  status: string
  priority: string
  lastMessageAt: string
  lastMessagePreview: string | null
  lastMessageFromRole: string | null
  unreadCount: number
  createdAt: string
}

interface Message {
  id: string
  senderRole: string
  messageType: string
  body: string
  metadata: Record<string, unknown>
  createdAt: string
  isOwn: boolean
}

// Helper: format relative time
function timeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`
  return date.toLocaleDateString()
}

export function ContactCentreClient() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [loading, setLoading] = useState(true)
  const [activeThread, setActiveThread] = useState<Thread | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)

  // New thread form
  const [showNewThread, setShowNewThread] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newCategory, setNewCategory] = useState('other')
  const [newBody, setNewBody] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createSuccess, setCreateSuccess] = useState(false)

  // Bug-specific fields
  const [bugSeverity, setBugSeverity] = useState<string>('medium')
  const [bugStepsToReproduce, setBugStepsToReproduce] = useState('')
  const [bugExpectedBehavior, setBugExpectedBehavior] = useState('')
  const [bugActualBehavior, setBugActualBehavior] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Start activity trail capture on mount
  useEffect(() => {
    startTrailCapture()
  }, [])

  // Fetch threads
  const fetchThreads = useCallback(async () => {
    try {
      const res = await fetch('/api/business/contact/threads')
      if (res.ok) {
        const data = await res.json()
        setThreads(data.threads || [])
      }
    } catch (err) {
      console.error('Failed to fetch threads:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchThreads()
  }, [fetchThreads])

  // Fetch messages for active thread
  const openThread = useCallback(async (thread: Thread) => {
    setActiveThread(thread)
    setMessagesLoading(true)
    setMessages([])

    try {
      const res = await fetch(`/api/business/contact/threads/${thread.id}`)
      if (res.ok) {
        const data = await res.json()
        setMessages(data.messages || [])
      }

      // Mark as read
      await fetch('/api/business/contact/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: thread.id }),
      })

      // Update local unread count
      setThreads(prev =>
        prev.map(t => t.id === thread.id ? { ...t, unreadCount: 0 } : t)
      )
    } catch (err) {
      console.error('Failed to open thread:', err)
    } finally {
      setMessagesLoading(false)
    }
  }, [])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send message in thread
  const handleSendMessage = async () => {
    if (!activeThread || !newMessage.trim() || sending) return
    setSending(true)

    const optimisticMsg: Message = {
      id: `temp-${Date.now()}`,
      senderRole: 'business',
      messageType: 'message',
      body: newMessage.trim(),
      metadata: {},
      createdAt: new Date().toISOString(),
      isOwn: true,
    }
    setMessages(prev => [...prev, optimisticMsg])
    setNewMessage('')

    try {
      const res = await fetch('/api/business/contact/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: activeThread.id, body: newMessage.trim() }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to send message')
        setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
      } else {
        // Update thread list
        fetchThreads()
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
      setError('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  // Reset new-thread form to defaults
  const resetNewThreadForm = () => {
    setNewSubject('')
    setNewCategory('other')
    setNewBody('')
    setBugSeverity('medium')
    setBugStepsToReproduce('')
    setBugExpectedBehavior('')
    setBugActualBehavior('')
    setAttachmentUrl('')
    setDiagnosticsEnabled(true)
    setError(null)
    setCreateSuccess(false)
  }

  // Create new thread
  const handleCreateThread = async () => {
    if (!newBody.trim() || creating) return
    setCreating(true)
    setError(null)

    // Build the payload
    const isBug = newCategory === 'bug' || newCategory === 'app_issue'
    const attachments = attachmentUrl.trim()
      ? [{ type: 'image', url: attachmentUrl.trim(), name: 'screenshot' }]
      : []
    const activityTrail = diagnosticsEnabled ? getTrailSnapshot() : []

    const payload: Record<string, unknown> = {
      subject: newSubject.trim() || null,
      category: newCategory,
      message: newBody.trim(),
      attachments,
      diagnosticsEnabled,
      activityTrail,
    }

    // Bug-specific fields
    if (isBug) {
      payload.severity = bugSeverity
      payload.stepsToReproduce = bugStepsToReproduce.trim() || null
      payload.expectedBehavior = bugExpectedBehavior.trim() || null
      payload.actualBehavior = bugActualBehavior.trim() || null
    }

    try {
      const res = await fetch('/api/business/contact/threads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to create thread')
        return
      }

      const data = await res.json()

      // Show success state briefly, then navigate to the thread
      setCreateSuccess(true)

      // Refresh threads in background
      await fetchThreads()

      // Auto-open the thread after a short delay
      setTimeout(() => {
        if (data.thread?.id) {
          const newThread: Thread = {
            id: data.thread.id,
            subject: data.thread.subject,
            category: data.thread.category,
            status: 'open',
            priority: data.thread.priority || 'normal',
            lastMessageAt: new Date().toISOString(),
            lastMessagePreview: newBody.trim().slice(0, 120),
            lastMessageFromRole: 'business',
            unreadCount: 0,
            createdAt: new Date().toISOString(),
          }
          setShowNewThread(false)
          resetNewThreadForm()
          openThread(newThread)
        } else {
          setShowNewThread(false)
          resetNewThreadForm()
        }
      }, 1500)
    } catch {
      setError('Failed to create thread')
    } finally {
      setCreating(false)
    }
  }

  // Complete task
  const handleCompleteTask = async (messageId: string) => {
    try {
      const res = await fetch('/api/business/contact/tasks/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageId }),
      })

      if (res.ok) {
        // Update local state
        setMessages(prev =>
          prev.map(m =>
            m.id === messageId
              ? { ...m, metadata: { ...m.metadata, status: 'done' } }
              : m
          )
        )
      }
    } catch (err) {
      console.error('Failed to complete task:', err)
    }
  }

  const getCategoryConfig = (cat: string) =>
    CATEGORIES.find(c => c.value === cat) || CATEGORIES[CATEGORIES.length - 1]

  // --- RENDER ---

  const isBugCategory = newCategory === 'bug' || newCategory === 'app_issue'

  // New Thread Form
  if (showNewThread) {
    // Success state after submission
    if (createSuccess) {
      const isBugSuccess = newCategory === 'bug' || newCategory === 'app_issue'
      return (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-16 h-16 rounded-full bg-[#00d083]/20 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-[#00d083]" />
          </div>
          <h2 className="text-xl font-semibold text-white">
            {isBugSuccess ? 'Bug Report Submitted' : 'Message Sent'}
          </h2>
          <p className="text-sm text-slate-400 text-center max-w-xs">
            {isBugSuccess
              ? "We've sent this to your city admin. They've been notified and you'll get replies right here."
              : "Your city admin team has been notified. You'll get replies right here."}
          </p>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => { setShowNewThread(false); resetNewThreadForm() }} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold text-white">New Message</h1>
        </div>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6 space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-300">
                {error}
              </div>
            )}

            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon
                  const isSelected = newCategory === cat.value
                  return (
                    <button
                      key={cat.value}
                      onClick={() => setNewCategory(cat.value)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors ${
                        isSelected
                          ? 'border-[#00d083]/50 bg-[#00d083]/10 text-[#00d083]'
                          : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {cat.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Subject {isBugCategory ? '' : '(optional)'}</label>
              <input
                type="text"
                value={newSubject}
                onChange={e => setNewSubject(e.target.value)}
                placeholder={isBugCategory ? 'Brief bug summary, e.g. "Offer page crashes on load"' : 'Brief summary of your issue...'}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00d083]/50"
              />
            </div>

            {/* Bug Report Fields (shown for bug or app_issue) */}
            {isBugCategory && (
              <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4 space-y-4">
                <p className="text-sm text-red-300 font-medium flex items-center gap-2">
                  <Bug className="w-4 h-4" />
                  Bug Report Details
                </p>

                {/* Severity Picker */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Severity</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {SEVERITIES.map(sev => {
                      const SevIcon = sev.icon
                      const isSelected = bugSeverity === sev.value
                      return (
                        <button
                          key={sev.value}
                          onClick={() => setBugSeverity(sev.value)}
                          className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border text-xs font-medium transition-colors ${
                            isSelected
                              ? `${sev.bg} ${sev.color} border-current`
                              : 'border-slate-700 bg-slate-800/50 text-slate-500 hover:border-slate-600'
                          }`}
                        >
                          <SevIcon className="w-4 h-4" />
                          <span>{sev.label}</span>
                          {isSelected && <span className="text-[10px] opacity-70">{sev.desc}</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Steps to Reproduce */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Steps to Reproduce</label>
                  <textarea
                    value={bugStepsToReproduce}
                    onChange={e => setBugStepsToReproduce(e.target.value)}
                    rows={3}
                    placeholder={"1. Go to...\n2. Click on...\n3. Scroll to..."}
                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                  />
                </div>

                {/* Expected vs Actual */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Expected Behavior</label>
                    <textarea
                      value={bugExpectedBehavior}
                      onChange={e => setBugExpectedBehavior(e.target.value)}
                      rows={2}
                      placeholder="What should have happened..."
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">Actual Behavior</label>
                    <textarea
                      value={bugActualBehavior}
                      onChange={e => setBugActualBehavior(e.target.value)}
                      rows={2}
                      placeholder="What actually happened..."
                      className="w-full bg-slate-700/50 border border-slate-600 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Message / Description */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                {isBugCategory ? 'Additional Details' : 'Message'}
              </label>
              <textarea
                value={newBody}
                onChange={e => setNewBody(e.target.value)}
                rows={isBugCategory ? 3 : 5}
                placeholder={isBugCategory ? 'Any other relevant information...' : 'Describe your issue or request in detail...'}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00d083]/50"
              />
            </div>

            {/* Screenshot / Attachment URL */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Screenshot URL (optional)</label>
              <input
                type="url"
                value={attachmentUrl}
                onChange={e => setAttachmentUrl(e.target.value)}
                placeholder="https://res.cloudinary.com/... or paste image URL"
                className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00d083]/50"
              />
              <p className="text-[10px] text-slate-500 mt-1">Upload to Cloudinary or any image host, then paste the URL here.</p>
            </div>

            {/* Diagnostics Toggle */}
            <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-lg p-3">
              <div>
                <p className="text-sm text-slate-300 font-medium">Include diagnostics</p>
                <p className="text-xs text-slate-500">
                  Shares your browser info, page URL, and recent navigation to help debug faster.
                </p>
              </div>
              <button
                onClick={() => setDiagnosticsEnabled(!diagnosticsEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  diagnosticsEnabled ? 'bg-[#00d083]' : 'bg-slate-600'
                }`}
                role="switch"
                aria-checked={diagnosticsEnabled}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    diagnosticsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <Button
              onClick={handleCreateThread}
              disabled={creating || !newBody.trim()}
              className="w-full bg-[#00d083] hover:bg-[#00b86f] text-black font-semibold disabled:opacity-50"
            >
              {creating ? 'Sending...' : isBugCategory ? 'Submit Bug Report' : 'Send Message'}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Thread Detail View
  if (activeThread) {
    return (
      <div className="flex flex-col h-[calc(100vh-140px)]">
        {/* Thread Header */}
        <div className="flex-shrink-0 flex items-center gap-3 pb-4 border-b border-slate-800">
          <button onClick={() => setActiveThread(null)} className="text-slate-400 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-white truncate">
              {activeThread.subject || getCategoryConfig(activeThread.category).label}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${STATUS_COLORS[activeThread.status] || STATUS_COLORS.open}`}>
                {activeThread.status}
              </span>
              <span className={`text-xs ${PRIORITY_COLORS[activeThread.priority] || PRIORITY_COLORS.normal}`}>
                {activeThread.priority} priority
              </span>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {messagesLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00d083]"></div>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  msg.messageType === 'task'
                    ? 'bg-orange-500/10 border border-orange-500/20 w-full max-w-full'
                    : msg.messageType === 'status_change'
                    ? 'bg-slate-800/30 border border-slate-700 w-full max-w-full text-center'
                    : msg.isOwn
                    ? 'bg-[#00d083]/20 border border-[#00d083]/30'
                    : 'bg-slate-800 border border-slate-700'
                }`}>
                  {/* Task message */}
                  {msg.messageType === 'task' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-orange-400 text-xs font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        ADMIN TASK
                      </div>
                      <p className="font-semibold text-white text-sm">
                        {(msg.metadata?.title as string) || 'Task'}
                      </p>
                    </div>
                  )}

                  {/* Status change message */}
                  {msg.messageType === 'status_change' && (
                    <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {msg.body}
                    </div>
                  )}

                  {/* Regular or task body */}
                  {msg.messageType !== 'status_change' && (
                    <p className="text-sm text-slate-200 whitespace-pre-wrap">{msg.body}</p>
                  )}

                  {/* Bug Summary Card (for messages with bug metadata) */}
                  {msg.metadata?.severity && (
                    <div className="mt-2">
                      <BugSummaryCard
                        metadata={msg.metadata as Record<string, unknown>}
                        showDiagnostics={false}
                      />
                    </div>
                  )}

                  {/* Task action button */}
                  {msg.messageType === 'task' && (msg.metadata?.status as string) === 'open' && (
                    <div className="flex items-center gap-2 mt-3">
                      {(msg.metadata?.deepLink as string) && (
                        <a
                          href={msg.metadata.deepLink as string}
                          className="px-3 py-1.5 bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-xs font-medium rounded-lg transition-colors"
                        >
                          Fix now
                        </a>
                      )}
                      <button
                        onClick={() => handleCompleteTask(msg.id)}
                        className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-300 text-xs font-medium rounded-lg transition-colors"
                      >
                        Mark complete
                      </button>
                    </div>
                  )}

                  {msg.messageType === 'task' && (msg.metadata?.status as string) === 'done' && (
                    <div className="flex items-center gap-1.5 mt-2 text-xs text-green-400">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Completed
                    </div>
                  )}

                  {/* Timestamp */}
                  {msg.messageType !== 'status_change' && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[10px] text-slate-500">
                        {msg.isOwn ? 'You' : msg.senderRole === 'admin' ? 'Admin' : msg.senderRole === 'system' ? 'System' : msg.senderRole}
                      </span>
                      <span className="text-[10px] text-slate-600">
                        {timeAgo(new Date(msg.createdAt))}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        {activeThread.status !== 'closed' && (
          <div className="flex-shrink-0 pt-4 pb-2 border-t border-slate-800">
            <div className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#00d083]/50"
              />
              <Button
                onClick={handleSendMessage}
                disabled={sending || !newMessage.trim()}
                className="bg-[#00d083] hover:bg-[#00b86f] text-black px-4 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {activeThread.status === 'closed' && (
          <div className="flex-shrink-0 pt-4 border-t border-slate-800">
            <p className="text-center text-sm text-slate-500">This thread has been closed by admin.</p>
          </div>
        )}
      </div>
    )
  }

  // Thread List View (default)
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Contact Centre</h1>
          <p className="text-slate-400 text-sm mt-1">Message your city admin team</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setNewCategory('bug')
              setShowNewThread(true)
            }}
            variant="outline"
            className="border-red-500/30 text-red-400 hover:bg-red-500/10 flex items-center gap-2"
          >
            <Bug className="w-4 h-4" />
            Report a Bug
          </Button>
          <Button
            onClick={() => setShowNewThread(true)}
            className="bg-[#00d083] hover:bg-[#00b86f] text-black font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Message
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#00d083]"></div>
        </div>
      ) : threads.length === 0 ? (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-12 text-center">
            <MessageSquare className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-300 mb-2">No Messages Yet</h2>
            <p className="text-slate-400 mb-6">
              Need help? Report a bug, request a feature, or ask a question.
            </p>
            <Button
              onClick={() => setShowNewThread(true)}
              className="bg-[#00d083] hover:bg-[#00b86f] text-black font-semibold"
            >
              Send Your First Message
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {threads.map(thread => {
            const catConfig = getCategoryConfig(thread.category)
            const CatIcon = catConfig.icon
            const hasUnread = thread.unreadCount > 0

            return (
              <button
                key={thread.id}
                onClick={() => openThread(thread)}
                className={`w-full text-left rounded-lg p-4 transition-all ${
                  hasUnread
                    ? 'bg-slate-800/70 border-l-4 border-l-[#00d083] border border-[#00d083]/20 hover:bg-slate-800/90'
                    : 'bg-slate-800/40 border border-slate-700 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Category icon */}
                  <div className={`flex-shrink-0 ${catConfig.color}`}>
                    <CatIcon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`font-semibold text-sm truncate ${hasUnread ? 'text-white' : 'text-slate-300'}`}>
                        {thread.subject || catConfig.label}
                      </span>
                      <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded-full border ${STATUS_COLORS[thread.status]}`}>
                        {thread.status}
                      </span>
                    </div>
                    <p className={`text-xs truncate ${hasUnread ? 'text-slate-300' : 'text-slate-500'}`}>
                      {thread.lastMessageFromRole === 'business' ? 'You: ' : 'Admin: '}
                      {thread.lastMessagePreview || 'No messages'}
                    </p>
                  </div>

                  {/* Right side: time + unread badge */}
                  <div className="flex-shrink-0 flex flex-col items-end gap-1">
                    <span className="text-[10px] text-slate-500">
                      {timeAgo(new Date(thread.lastMessageAt))}
                    </span>
                    {hasUnread && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-[#00d083] text-black rounded-full">
                        {thread.unreadCount}
                      </span>
                    )}
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
