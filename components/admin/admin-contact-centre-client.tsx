'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  lastMessageAt: string
  lastMessagePreview: string | null
  lastMessageFromRole: string
  unreadCount: number
  businessId: string
  businessName: string
  businessLogo: string | null
  businessEmail: string | null
  createdAt: string
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

interface ThreadDetail {
  id: string
  subject: string | null
  category: string
  status: string
  priority: string
  createdAt: string
  lastMessageAt: string
  metadata: Record<string, unknown>
  business: {
    id: string
    business_name: string
    logo: string | null
    email: string | null
    phone: string | null
    business_type: string | null
    business_category: string | null
    business_town: string | null
  } | null
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

function getCategoryColor(cat: string): string {
  const map: Record<string, string> = {
    bug: 'bg-red-500/20 text-red-400 border-red-500/30',
    feature_request: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    billing: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    support: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    task: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    other: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  }
  return map[cat] || map.other
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    open: 'bg-green-500/20 text-green-400 border-green-500/30',
    closed: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
    resolved: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  }
  return map[status] || map.open
}

function getPriorityIcon(priority: string): string {
  const map: Record<string, string> = { low: '↓', normal: '●', high: '▲', urgent: '!!!' }
  return map[priority] || '●'
}

// ─── Component ────────────────────────────────────────────────────
interface AdminContactCentreProps {
  city: string
}

export function AdminContactCentreClient({ city }: AdminContactCentreProps) {
  // ─── Thread list state ────────────────────────────────────────
  const [threads, setThreads] = useState<Thread[]>([])
  const [loadingThreads, setLoadingThreads] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('open')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [priorityFilter, setPriorityFilter] = useState<string>('')
  const [unreadFilter, setUnreadFilter] = useState(false)

  // ─── Active thread state ──────────────────────────────────────
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [threadDetail, setThreadDetail] = useState<ThreadDetail | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  // ─── Compose state ────────────────────────────────────────────
  const [replyBody, setReplyBody] = useState('')
  const [sending, setSending] = useState(false)
  const [isNote, setIsNote] = useState(false)

  // ─── HQ Escalation state ───────────────────────────────────────
  const [showEscalateForm, setShowEscalateForm] = useState(false)
  const [escalateSubject, setEscalateSubject] = useState('')
  const [escalateMessage, setEscalateMessage] = useState('')
  const [escalateCategory, setEscalateCategory] = useState('support')
  const [escalateSeverity, setEscalateSeverity] = useState('medium')
  const [escalateAttachmentUrl, setEscalateAttachmentUrl] = useState('')
  const [escalateSteps, setEscalateSteps] = useState('')
  const [escalateExpected, setEscalateExpected] = useState('')
  const [escalateActual, setEscalateActual] = useState('')
  const [escalating, setEscalating] = useState(false)

  // ─── Dedicated Bug Report to HQ state ──────────────────────────
  const [showBugReportForm, setShowBugReportForm] = useState(false)
  const [bugReportSubject, setBugReportSubject] = useState('')
  const [bugReportMessage, setBugReportMessage] = useState('')
  const [bugReportSeverity, setBugReportSeverity] = useState('medium')
  const [bugReportAffectedArea, setBugReportAffectedArea] = useState('dashboard')
  const [bugReportSteps, setBugReportSteps] = useState('')
  const [bugReportExpected, setBugReportExpected] = useState('')
  const [bugReportActual, setBugReportActual] = useState('')
  const [bugReportAttachmentUrl, setBugReportAttachmentUrl] = useState('')
  const [bugReportLinkedThreadId, setBugReportLinkedThreadId] = useState('')
  const [submittingBugReport, setSubmittingBugReport] = useState(false)

  // ─── New task state ───────────────────────────────────────────
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskBody, setTaskBody] = useState('')
  const [taskActionType, setTaskActionType] = useState('other')
  const [taskDeepLink, setTaskDeepLink] = useState('')
  const [creatingTask, setCreatingTask] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ─── Fetch threads ────────────────────────────────────────────
  const fetchThreads = useCallback(async () => {
    try {
      const params = new URLSearchParams({ type: 'business_admin' })
      if (statusFilter) params.set('status', statusFilter)
      if (searchQuery) params.set('search', searchQuery)
      if (categoryFilter) params.set('category', categoryFilter)
      if (priorityFilter) params.set('priority', priorityFilter)
      if (unreadFilter) params.set('unread', 'true')
      const res = await fetch(`/api/admin/contact/threads?${params}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setThreads(data.threads || [])
    } catch (err) {
      console.error('Error fetching admin threads:', err)
    } finally {
      setLoadingThreads(false)
    }
  }, [statusFilter, searchQuery, categoryFilter, priorityFilter, unreadFilter])

  useEffect(() => {
    fetchThreads()
    const interval = setInterval(fetchThreads, 30_000)
    return () => clearInterval(interval)
  }, [fetchThreads])

  // ─── Fetch thread detail + messages ───────────────────────────
  const openThread = useCallback(async (threadId: string) => {
    setActiveThreadId(threadId)
    setLoadingMessages(true)
    setShowTaskForm(false)
    setIsNote(false)
    try {
      const res = await fetch(`/api/admin/contact/threads/${threadId}`)
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setThreadDetail(data.thread)
      setMessages(data.messages || [])
      // Mark as read on the thread list locally
      setThreads(prev => prev.map(t => t.id === threadId ? { ...t, unreadCount: 0 } : t))
    } catch (err) {
      console.error('Error fetching thread detail:', err)
    } finally {
      setLoadingMessages(false)
    }
  }, [])

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─── Send reply (message or note) ─────────────────────────────
  const handleSendReply = async () => {
    if (!activeThreadId || !replyBody.trim()) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/contact/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: activeThreadId,
          body: replyBody.trim(),
          messageType: isNote ? 'note' : 'message',
        }),
      })
      if (!res.ok) throw new Error('Failed')
      const data = await res.json()
      setMessages(prev => [...prev, data.message])
      setReplyBody('')
      fetchThreads()
    } catch (err) {
      console.error('Error sending reply:', err)
    } finally {
      setSending(false)
    }
  }

  // ─── Update thread status ─────────────────────────────────────
  const handleUpdateStatus = async (status: string) => {
    if (!activeThreadId) return
    try {
      await fetch('/api/admin/contact/threads-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId: activeThreadId, status }),
      })
      // Refresh
      openThread(activeThreadId)
      fetchThreads()
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  // ─── Create task ──────────────────────────────────────────────
  const handleCreateTask = async () => {
    if (!threadDetail?.business?.id || !taskTitle.trim() || !taskBody.trim()) return
    setCreatingTask(true)
    try {
      const res = await fetch('/api/admin/contact/tasks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: threadDetail.business.id,
          threadId: activeThreadId,
          title: taskTitle.trim(),
          body: taskBody.trim(),
          actionType: taskActionType,
          deepLink: taskDeepLink.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      setTaskTitle('')
      setTaskBody('')
      setTaskDeepLink('')
      setShowTaskForm(false)
      // Refresh messages
      if (activeThreadId) openThread(activeThreadId)
      fetchThreads()
    } catch (err) {
      console.error('Error creating task:', err)
    } finally {
      setCreatingTask(false)
    }
  }

  const isBugEscalation = escalateCategory === 'bug' || escalateCategory === 'platform_issue' || escalateCategory === 'app_issue'

  // Reset escalation form fields
  const resetEscalateForm = () => {
    setEscalateSubject('')
    setEscalateMessage('')
    setEscalateCategory('support')
    setEscalateSeverity('medium')
    setEscalateAttachmentUrl('')
    setEscalateSteps('')
    setEscalateExpected('')
    setEscalateActual('')
  }

  // ─── Escalate to HQ (generic or linked to a thread) ─────────────
  const handleEscalate = async (linkedThreadId?: string) => {
    if (!escalateMessage.trim()) return
    setEscalating(true)
    try {
      const attachments = escalateAttachmentUrl.trim()
        ? [{ type: 'image', url: escalateAttachmentUrl.trim(), name: 'screenshot' }]
        : []

      const payload: Record<string, unknown> = {
        subject: escalateSubject.trim() || undefined,
        category: escalateCategory,
        message: escalateMessage.trim(),
        attachments,
        diagnosticsEnabled: true,
      }

      // Bug-specific fields
      if (isBugEscalation) {
        payload.severity = escalateSeverity
        if (escalateSteps.trim()) payload.stepsToReproduce = escalateSteps.trim()
        if (escalateExpected.trim()) payload.expectedBehavior = escalateExpected.trim()
        if (escalateActual.trim()) payload.actualBehavior = escalateActual.trim()
      }

      // When escalating a specific business thread, pass its ID for idempotency
      if (linkedThreadId) {
        payload.linkedThreadId = linkedThreadId
      }

      const res = await fetch('/api/admin/contact/escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed')

      const data = await res.json()

      resetEscalateForm()
      setShowEscalateForm(false)

      // If the escalation created or found an HQ thread, update local thread detail metadata
      if (data.thread?.id && threadDetail) {
        setThreadDetail({
          ...threadDetail,
          metadata: { ...threadDetail.metadata, hqThreadId: data.thread.id },
        })
      }

      // Refresh the thread detail to pick up metadata changes
      if (activeThreadId) openThread(activeThreadId)
    } catch (err) {
      console.error('Error escalating to HQ:', err)
    } finally {
      setEscalating(false)
    }
  }

  // ─── Dedicated Bug Report to HQ ─────────────────────────────────
  const resetBugReportForm = () => {
    setBugReportSubject('')
    setBugReportMessage('')
    setBugReportSeverity('medium')
    setBugReportAffectedArea('dashboard')
    setBugReportSteps('')
    setBugReportExpected('')
    setBugReportActual('')
    setBugReportAttachmentUrl('')
    setBugReportLinkedThreadId('')
  }

  const handleSubmitBugReport = async () => {
    if (!bugReportMessage.trim() || !bugReportSubject.trim()) return
    setSubmittingBugReport(true)
    try {
      const attachments = bugReportAttachmentUrl.trim()
        ? [{ type: 'image', url: bugReportAttachmentUrl.trim(), name: 'screenshot' }]
        : []

      const payload: Record<string, unknown> = {
        subject: `[${bugReportAffectedArea.toUpperCase()}] ${bugReportSubject.trim()}`,
        category: 'bug',
        message: bugReportMessage.trim(),
        attachments,
        diagnosticsEnabled: true,
        severity: bugReportSeverity,
      }

      if (bugReportSteps.trim()) payload.stepsToReproduce = bugReportSteps.trim()
      if (bugReportExpected.trim()) payload.expectedBehavior = bugReportExpected.trim()
      if (bugReportActual.trim()) payload.actualBehavior = bugReportActual.trim()
      if (bugReportLinkedThreadId) payload.linkedThreadId = bugReportLinkedThreadId

      const res = await fetch('/api/admin/contact/escalate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Failed to submit bug report')

      resetBugReportForm()
      setShowBugReportForm(false)
      fetchThreads()
    } catch (err) {
      console.error('Error submitting bug report to HQ:', err)
    } finally {
      setSubmittingBugReport(false)
    }
  }

  // ─── Render thread list ───────────────────────────────────────
  const renderThreadList = () => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-700/50 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Contact Centre</h3>
          <Badge className="bg-[#00d083]/20 text-[#00d083] border-[#00d083]/30">
            {threads.filter(t => t.unreadCount > 0).length} unread
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setShowBugReportForm(!showBugReportForm); setShowEscalateForm(false) }}
            className="flex-1 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 h-8"
          >
            🐛 Report Bug to HQ
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setShowEscalateForm(!showEscalateForm); setShowBugReportForm(false) }}
            className="flex-1 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-8"
          >
            Message HQ
          </Button>
        </div>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="p-4 space-y-3">

        {/* Escalate to HQ full form */}
        {showEscalateForm && !activeThreadId && (
          <div className="p-3 bg-amber-950/20 border border-amber-500/20 rounded-xl space-y-3">
            <p className="text-xs font-semibold text-amber-400">Report to HQ</p>

            {/* Category selector */}
            <div className="flex flex-wrap gap-1.5">
              {[
                { value: 'support', label: 'Support' },
                { value: 'bug', label: 'Bug' },
                { value: 'platform_issue', label: 'Platform Issue' },
                { value: 'feature_request', label: 'Feature Request' },
                { value: 'billing', label: 'Billing' },
                { value: 'other', label: 'Other' },
              ].map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setEscalateCategory(cat.value)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                    escalateCategory === cat.value
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                      : 'border-slate-700 bg-slate-800 text-slate-500 hover:border-slate-600'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <Input
              placeholder="Subject..."
              value={escalateSubject}
              onChange={e => setEscalateSubject(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white text-xs"
            />

            {/* Severity picker (for bug-like categories) */}
            {isBugEscalation && (
              <div className="space-y-2 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Bug Details</p>
                <div className="flex gap-1.5">
                  {(['low', 'medium', 'high', 'critical'] as const).map(sev => (
                    <button
                      key={sev}
                      onClick={() => setEscalateSeverity(sev)}
                      className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                        escalateSeverity === sev
                          ? sev === 'critical' ? 'border-red-500/50 bg-red-500/10 text-red-400'
                          : sev === 'high' ? 'border-orange-500/50 bg-orange-500/10 text-orange-400'
                          : sev === 'medium' ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                          : 'border-slate-500/50 bg-slate-500/10 text-slate-400'
                          : 'border-slate-700 bg-slate-800 text-slate-500 hover:border-slate-600'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>
                <Textarea
                  placeholder="Steps to reproduce..."
                  value={escalateSteps}
                  onChange={e => setEscalateSteps(e.target.value)}
                  rows={2}
                  className="bg-slate-800 border-slate-700 text-white text-xs resize-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Textarea
                    placeholder="Expected behavior..."
                    value={escalateExpected}
                    onChange={e => setEscalateExpected(e.target.value)}
                    rows={2}
                    className="bg-slate-800 border-slate-700 text-white text-xs resize-none"
                  />
                  <Textarea
                    placeholder="Actual behavior..."
                    value={escalateActual}
                    onChange={e => setEscalateActual(e.target.value)}
                    rows={2}
                    className="bg-slate-800 border-slate-700 text-white text-xs resize-none"
                  />
                </div>
              </div>
            )}

            <Textarea
              placeholder="Describe the issue..."
              value={escalateMessage}
              onChange={e => setEscalateMessage(e.target.value)}
              rows={3}
              className="bg-slate-800 border-slate-700 text-white text-xs resize-none"
            />

            {/* Attachment URL */}
            <Input
              placeholder="Screenshot URL (optional)..."
              value={escalateAttachmentUrl}
              onChange={e => setEscalateAttachmentUrl(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white text-xs"
            />

            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="outline" onClick={() => { setShowEscalateForm(false); resetEscalateForm() }} className="text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handleEscalate()}
                disabled={escalating || !escalateMessage.trim()}
                className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
              >
                {escalating ? 'Sending...' : 'Send to HQ'}
              </Button>
            </div>
          </div>
        )}

        {/* Dedicated Bug Report to HQ form */}
        {showBugReportForm && !activeThreadId && (
          <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-xl space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base">🐛</span>
              <p className="text-sm font-bold text-red-400">Report a Bug to Qwikker HQ</p>
            </div>
            <p className="text-[10px] text-slate-500">
              Use this form to report bugs directly to the Qwikker HQ team. Include as much detail as possible.
            </p>

            {/* Affected area selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Affected Area</label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { value: 'dashboard', label: 'Dashboard' },
                  { value: 'app', label: 'App' },
                  { value: 'listing', label: 'Listings' },
                  { value: 'menu', label: 'Menus' },
                  { value: 'photos', label: 'Photos' },
                  { value: 'offers', label: 'Offers' },
                  { value: 'events', label: 'Events' },
                  { value: 'billing', label: 'Billing' },
                  { value: 'auth', label: 'Auth / Login' },
                  { value: 'notifications', label: 'Notifications' },
                  { value: 'other', label: 'Other' },
                ].map(area => (
                  <button
                    key={area.value}
                    onClick={() => setBugReportAffectedArea(area.value)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                      bugReportAffectedArea === area.value
                        ? 'border-red-500/50 bg-red-500/10 text-red-400'
                        : 'border-slate-700 bg-slate-800 text-slate-500 hover:border-slate-600'
                    }`}
                  >
                    {area.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity picker */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Severity</label>
              <div className="flex gap-1.5">
                {[
                  { value: 'low', label: 'Low', colors: 'border-slate-500/50 bg-slate-500/10 text-slate-400' },
                  { value: 'medium', label: 'Medium', colors: 'border-amber-500/50 bg-amber-500/10 text-amber-400' },
                  { value: 'high', label: 'High', colors: 'border-orange-500/50 bg-orange-500/10 text-orange-400' },
                  { value: 'critical', label: 'Critical', colors: 'border-red-500/50 bg-red-500/10 text-red-400' },
                ].map(sev => (
                  <button
                    key={sev.value}
                    onClick={() => setBugReportSeverity(sev.value)}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                      bugReportSeverity === sev.value
                        ? sev.colors
                        : 'border-slate-700 bg-slate-800 text-slate-500 hover:border-slate-600'
                    }`}
                  >
                    {sev.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Subject *</label>
              <Input
                placeholder="Brief description of the bug..."
                value={bugReportSubject}
                onChange={e => setBugReportSubject(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white text-xs"
              />
            </div>

            {/* Steps to Reproduce */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Steps to Reproduce *</label>
              <Textarea
                placeholder="1. Go to...\n2. Click on...\n3. See error..."
                value={bugReportSteps}
                onChange={e => setBugReportSteps(e.target.value)}
                rows={3}
                className="bg-slate-800 border-slate-700 text-white text-xs resize-none"
              />
            </div>

            {/* Expected vs Actual */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Expected Behavior</label>
                <Textarea
                  placeholder="What should have happened..."
                  value={bugReportExpected}
                  onChange={e => setBugReportExpected(e.target.value)}
                  rows={2}
                  className="bg-slate-800 border-slate-700 text-white text-xs resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Actual Behavior</label>
                <Textarea
                  placeholder="What actually happened..."
                  value={bugReportActual}
                  onChange={e => setBugReportActual(e.target.value)}
                  rows={2}
                  className="bg-slate-800 border-slate-700 text-white text-xs resize-none"
                />
              </div>
            </div>

            {/* Description / additional context */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Additional Details *</label>
              <Textarea
                placeholder="Any other context, error messages, console logs..."
                value={bugReportMessage}
                onChange={e => setBugReportMessage(e.target.value)}
                rows={3}
                className="bg-slate-800 border-slate-700 text-white text-xs resize-none"
              />
            </div>

            {/* Screenshot */}
            <Input
              placeholder="Screenshot URL (optional)..."
              value={bugReportAttachmentUrl}
              onChange={e => setBugReportAttachmentUrl(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white text-xs"
            />

            {/* Link to business thread */}
            {threads.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Link to Business Thread (optional)
                </label>
                <select
                  value={bugReportLinkedThreadId}
                  onChange={e => setBugReportLinkedThreadId(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-md px-3 py-2"
                >
                  <option value="">-- None --</option>
                  {threads.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.businessName} — {t.subject || t.lastMessagePreview?.slice(0, 40) || 'No subject'}
                    </option>
                  ))}
                </select>
                <p className="text-[9px] text-slate-600">
                  Attach the business conversation that surfaced this bug
                </p>
              </div>
            )}

            {/* Auto-diagnostics notice */}
            <p className="text-[9px] text-slate-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              Server diagnostics will be included automatically
            </p>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setShowBugReportForm(false); resetBugReportForm() }}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitBugReport}
                disabled={submittingBugReport || !bugReportMessage.trim() || !bugReportSubject.trim()}
                className="text-xs bg-red-600 hover:bg-red-700 text-white"
              >
                {submittingBugReport ? 'Submitting...' : '🐛 Submit Bug Report'}
              </Button>
            </div>
          </div>
        )}

        {/* Search + filters + thread list (hidden when a form is open) */}
        {!showBugReportForm && !showEscalateForm && (<>
        <Input
          placeholder="Search by business name..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
        />

        {/* Status filter tabs */}
        <div className="flex gap-2">
          {['open', 'closed', 'resolved', ''].map(s => (
            <button
              key={s || 'all'}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                statusFilter === s
                  ? 'bg-[#00d083]/20 text-[#00d083] border border-[#00d083]/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>

        {/* Filter chips (unread, category, priority) */}
        <div className="flex flex-wrap gap-1.5">
          {/* Unread only */}
          <button
            onClick={() => setUnreadFilter(!unreadFilter)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${
              unreadFilter
                ? 'border-red-500/50 bg-red-500/10 text-red-400'
                : 'border-slate-700 bg-slate-800 text-slate-500 hover:border-slate-600'
            }`}
          >
            Unread
          </button>

          {/* Category: Bugs */}
          <button
            onClick={() => setCategoryFilter(categoryFilter === 'bug' ? '' : 'bug')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${
              categoryFilter === 'bug'
                ? 'border-red-500/50 bg-red-500/10 text-red-400'
                : 'border-slate-700 bg-slate-800 text-slate-500 hover:border-slate-600'
            }`}
          >
            Bugs
          </button>

          {/* Priority: Critical/High */}
          <button
            onClick={() => setPriorityFilter(priorityFilter === 'urgent,high' ? '' : 'urgent,high')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${
              priorityFilter === 'urgent,high'
                ? 'border-orange-500/50 bg-orange-500/10 text-orange-400'
                : 'border-slate-700 bg-slate-800 text-slate-500 hover:border-slate-600'
            }`}
          >
            Critical/High
          </button>

          {/* Clear all filters */}
          {(unreadFilter || categoryFilter || priorityFilter) && (
            <button
              onClick={() => { setUnreadFilter(false); setCategoryFilter(''); setPriorityFilter('') }}
              className="px-2.5 py-1 rounded-full text-[10px] font-medium border border-slate-700 bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Thread list */}
        {loadingThreads ? (
          <div className="p-4 text-center text-slate-500">Loading threads...</div>
        ) : threads.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-slate-400 text-sm">No threads found</p>
            <p className="text-slate-500 text-xs mt-1">Messages from businesses will appear here</p>
          </div>
        ) : (
          threads.map(thread => (
            <button
              key={thread.id}
              onClick={() => openThread(thread.id)}
              className={`w-full text-left p-4 border-b border-slate-800/50 hover:bg-slate-800/50 transition-all ${
                activeThreadId === thread.id ? 'bg-slate-800/70 border-l-2 border-l-[#00d083]' : ''
              } ${thread.unreadCount > 0 ? 'bg-slate-800/30' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white text-sm truncate">
                      {thread.businessName}
                    </span>
                    {thread.unreadCount > 0 && (
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-bold">
                        {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
                      </span>
                    )}
                  </div>
                  {thread.subject && (
                    <p className="text-xs text-slate-300 font-medium truncate">{thread.subject}</p>
                  )}
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {thread.lastMessagePreview || 'No messages yet'}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right space-y-1">
                  <p className="text-[10px] text-slate-500">{formatTimeAgo(thread.lastMessageAt)}</p>
                  <Badge className={`text-[10px] py-0 ${getCategoryColor(thread.category)}`}>
                    {thread.category}
                  </Badge>
                </div>
              </div>
            </button>
          ))
        )}
        </>)}
        </div>
      </div>
    </div>
  )

  // ─── Render message view ──────────────────────────────────────
  const renderMessageView = () => {
    if (!activeThreadId) {
      return (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto text-slate-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p className="text-slate-400 font-medium">Select a conversation</p>
            <p className="text-slate-500 text-sm mt-1">Choose a thread from the left panel</p>
          </div>
        </div>
      )
    }

    return (
      <div className="flex flex-col h-full">
        {/* Thread header */}
        <div className="flex-shrink-0 p-4 border-b border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Back button (mobile) */}
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
                  <h3 className="font-bold text-white">
                    {threadDetail?.business?.business_name || 'Loading...'}
                  </h3>
                  {threadDetail && (
                    <Badge className={`text-[10px] py-0 ${getStatusColor(threadDetail.status)}`}>
                      {threadDetail.status}
                    </Badge>
                  )}
                </div>
                {threadDetail?.subject && (
                  <p className="text-xs text-slate-400">{threadDetail.subject}</p>
                )}
              </div>
            </div>

            {/* Thread actions */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowTaskForm(!showTaskForm)}
                className="text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
              >
                + Task
              </Button>
              {threadDetail?.status === 'open' ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUpdateStatus('resolved')}
                  className="text-xs border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
                >
                  Resolve
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUpdateStatus('open')}
                  className="text-xs border-green-500/30 text-green-400 hover:bg-green-500/10"
                >
                  Re-open
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleUpdateStatus('closed')}
                className="text-xs border-slate-500/30 text-slate-400 hover:bg-slate-500/10"
              >
                Close
              </Button>

              {/* Escalate to HQ button (per-thread) */}
              {threadDetail?.metadata?.hqThreadId ? (
                <a
                  href={`/admin?tab=contact-centre`}
                  className="inline-flex items-center px-2.5 py-1.5 rounded-md text-xs font-medium border border-amber-500/30 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
                >
                  Escalated to HQ
                </a>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEscalateSubject(threadDetail?.subject || '')
                    setShowEscalateForm(!showEscalateForm)
                  }}
                  className="text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                >
                  Escalate to HQ
                </Button>
              )}

              {/* Dismiss thread view */}
              <button
                onClick={() => setActiveThreadId(null)}
                className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors"
                title="Close conversation"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Business info bar */}
          {threadDetail?.business && (
            <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
              {threadDetail.business.email && <span>{threadDetail.business.email}</span>}
              {threadDetail.business.phone && <span>{threadDetail.business.phone}</span>}
              {threadDetail.business.business_category && (
                <span>{threadDetail.business.business_category}</span>
              )}
            </div>
          )}
        </div>

        {/* Per-thread Escalate to HQ form (collapsible) */}
        {showEscalateForm && activeThreadId && !threadDetail?.metadata?.hqThreadId && (
          <div className="flex-shrink-0 p-4 border-b border-slate-700/50 bg-amber-950/20">
            <p className="text-xs font-semibold text-amber-400 mb-2">Escalate this thread to HQ</p>
            <div className="space-y-2">
              <Input
                placeholder="Subject..."
                value={escalateSubject}
                onChange={e => setEscalateSubject(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white text-xs"
              />
              <Textarea
                placeholder="Describe why this needs HQ attention..."
                value={escalateMessage}
                onChange={e => setEscalateMessage(e.target.value)}
                rows={3}
                className="bg-slate-800 border-slate-700 text-white text-xs resize-none"
              />
              <div className="flex gap-2 justify-end">
                <Button size="sm" variant="outline" onClick={() => setShowEscalateForm(false)} className="text-xs">
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleEscalate(activeThreadId)}
                  disabled={escalating || !escalateMessage.trim()}
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white"
                >
                  {escalating ? 'Sending...' : 'Escalate to HQ'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Task form (collapsible) */}
        {showTaskForm && threadDetail?.business && (
          <div className="flex-shrink-0 p-4 border-b border-slate-700/50 bg-cyan-950/20">
            <h4 className="text-sm font-semibold text-cyan-400 mb-3">Assign Task to {threadDetail.business.business_name}</h4>
            <div className="space-y-2">
              <Input
                placeholder="Task title..."
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white text-sm"
              />
              <Textarea
                placeholder="Task description / instructions..."
                value={taskBody}
                onChange={e => setTaskBody(e.target.value)}
                rows={2}
                className="bg-slate-800 border-slate-700 text-white text-sm resize-none"
              />
              <div className="flex gap-2">
                <select
                  value={taskActionType}
                  onChange={e => setTaskActionType(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white text-xs rounded-md px-2 py-1.5"
                >
                  <option value="update_profile">Update Profile</option>
                  <option value="upload_menu">Upload Menu</option>
                  <option value="respond">Respond</option>
                  <option value="review_offer">Review Offer</option>
                  <option value="other">Other</option>
                </select>
                <Input
                  placeholder="Deep link (optional)..."
                  value={taskDeepLink}
                  onChange={e => setTaskDeepLink(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-white text-xs flex-1"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowTaskForm(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateTask}
                  disabled={creatingTask || !taskTitle.trim() || !taskBody.trim()}
                  className="text-xs bg-cyan-600 hover:bg-cyan-700 text-white"
                >
                  {creatingTask ? 'Creating...' : 'Create Task'}
                </Button>
              </div>
            </div>
          </div>
        )}

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
                className={`flex ${msg.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    msg.messageType === 'status_change'
                      ? 'bg-slate-800/50 text-slate-500 text-center text-xs italic mx-auto max-w-none rounded-lg'
                      : msg.messageType === 'note'
                      ? 'bg-amber-950/30 border border-amber-500/20 text-amber-200'
                      : msg.messageType === 'task'
                      ? 'bg-cyan-950/30 border border-cyan-500/20 text-cyan-200'
                      : msg.senderRole === 'admin'
                      ? 'bg-[#00d083]/10 border border-[#00d083]/20 text-white'
                      : 'bg-slate-800 border border-slate-700 text-white'
                  }`}
                >
                  {/* Task header */}
                  {msg.messageType === 'task' && msg.metadata && (
                    <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-cyan-500/20">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-cyan-400">
                        Task
                      </span>
                      <span className="text-xs font-medium text-white">
                        {(msg.metadata as Record<string, unknown>).title as string}
                      </span>
                      <Badge className={`text-[10px] py-0 ml-auto ${
                        (msg.metadata as Record<string, unknown>).status === 'done'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}>
                        {(msg.metadata as Record<string, unknown>).status as string}
                      </Badge>
                    </div>
                  )}

                  {/* Note label */}
                  {msg.messageType === 'note' && (
                    <div className="flex items-center gap-1 mb-1 text-[10px] font-semibold uppercase tracking-wider text-amber-400">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                      Internal Note
                    </div>
                  )}

                  {/* Message body */}
                  {msg.messageType !== 'status_change' && (
                    <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                  )}
                  {msg.messageType === 'status_change' && (
                    <p>{msg.body}</p>
                  )}

                  {/* Bug Summary Card (admin sees diagnostics + trail) */}
                  {msg.metadata && (msg.metadata as Record<string, unknown>).severity && (
                    <div className="mt-2">
                      <BugSummaryCard
                        metadata={msg.metadata as Record<string, unknown>}
                        showDiagnostics={true}
                      />
                    </div>
                  )}

                  {/* Timestamp */}
                  {msg.messageType !== 'status_change' && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      {msg.senderRole === 'admin' ? 'You' : 'Business'} &middot; {formatTimeAgo(msg.createdAt)}
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
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setIsNote(false)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                !isNote
                  ? 'bg-[#00d083]/20 text-[#00d083] border border-[#00d083]/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Reply
            </button>
            <button
              onClick={() => setIsNote(true)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                isNote
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Internal Note
            </button>
          </div>
          <div className="flex gap-2">
            <Textarea
              placeholder={isNote ? 'Write an internal note (hidden from business)...' : 'Type your reply...'}
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              rows={2}
              className={`flex-1 bg-slate-800 border-slate-700 text-white text-sm resize-none ${
                isNote ? 'border-amber-500/30' : ''
              }`}
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
              className={`self-end ${
                isNote
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-[#00d083] hover:bg-[#00b86f]'
              } text-white`}
            >
              {sending ? '...' : isNote ? 'Note' : 'Send'}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Main layout ──────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-200px)] flex rounded-2xl overflow-hidden border border-slate-700/50 bg-slate-900/50">
      {/* Thread list - left panel */}
      <div className={`w-full lg:w-[380px] lg:flex-shrink-0 border-r border-slate-700/50 min-h-0 ${
        activeThreadId ? 'hidden lg:flex lg:flex-col' : 'flex flex-col'
      }`}>
        {renderThreadList()}
      </div>

      {/* Message view - right panel */}
      <div className={`flex-1 ${
        activeThreadId ? 'flex flex-col' : 'hidden lg:flex lg:flex-col'
      }`}>
        {renderMessageView()}
      </div>
    </div>
  )
}
