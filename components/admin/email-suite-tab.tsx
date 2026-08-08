'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  getSuiteManualTemplates,
  AUDIENCE_LABELS,
  type SuiteTemplateDef,
  type AudiencePreset,
} from '@/lib/email/suite-template-catalog'
import { EmailSuiteInboxSetup } from '@/components/admin/email-suite-inbox-setup'

type SuiteSubTab = 'inbox' | 'history' | 'templates' | 'campaigns' | 'automations' | 'settings'

/** Make email HTML fill the iframe viewport and size the frame to the full message. */
function wrapPreviewSrcDoc(html: string): string {
  const fillCss = `<style>
    html, body { margin:0 !important; padding:0 !important; min-height:100% !important; height:auto !important; background-color:#0a0a0a !important; }
  </style>`
  if (/<\/head>/i.test(html)) return html.replace(/<\/head>/i, `${fillCss}</head>`)
  if (/<html/i.test(html)) return html.replace(/<html[^>]*>/i, (m) => `${m}<head>${fillCss}</head>`)
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>${fillCss}</head><body>${html}</body></html>`
}

function EmailHtmlPreview({ html, title }: { html: string; title: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(640)
  const srcDoc = useMemo(() => wrapPreviewSrcDoc(html), [html])

  const fitHeight = useCallback(() => {
    const doc = iframeRef.current?.contentDocument
    if (!doc) return
    const next = Math.max(
      doc.body?.scrollHeight || 0,
      doc.documentElement?.scrollHeight || 0,
      480
    )
    setHeight(Math.min(next + 8, 1600))
  }, [])

  return (
    <iframe
      ref={iframeRef}
      title={title}
      sandbox="allow-same-origin"
      srcDoc={srcDoc}
      onLoad={fitHeight}
      className="w-full border-0 bg-[#0a0a0a]"
      style={{ height }}
    />
  )
}

interface EmailSuiteTabProps {
  city: string
}

interface SuiteStatus {
  configured: boolean
  fromEmail: string | null
  fromName: string | null
  replyTo: string
  failedLast7d: number
  inboundUnread: number
}

interface HistorySend {
  id: string
  to_email: string
  subject: string
  template_key: string | null
  category: string
  status: string
  direction: string
  sent_at: string | null
  created_at: string
  business_id: string | null
  business_name?: string | null
}

interface AutomationRow {
  key: string
  name: string
  description: string
  enabled: boolean
  lastRunAt: string | null
}

interface RecipientOption {
  id: string
  business_name: string
  first_name: string | null
  last_name: string | null
  email: string
}

function formatRecipientName(r: RecipientOption): string {
  const person = [r.first_name, r.last_name].filter(Boolean).join(' ').trim()
  return person ? `${r.business_name} · ${person}` : r.business_name
}

const SUB_TABS: { id: SuiteSubTab; label: string }[] = [
  { id: 'inbox', label: 'Inbox' },
  { id: 'history', label: 'History' },
  { id: 'templates', label: 'Templates' },
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'automations', label: 'Automations' },
  { id: 'settings', label: 'Settings' },
]

export function EmailSuiteTab({ city }: EmailSuiteTabProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const businessId = searchParams.get('businessId')
  const compose = searchParams.get('compose') === '1'
  const initialSub = (searchParams.get('emailTab') as SuiteSubTab) || (compose ? 'templates' : 'history')

  const [subTab, setSubTab] = useState<SuiteSubTab>(
    SUB_TABS.some((t) => t.id === initialSub) ? initialSub : 'history'
  )
  const [status, setStatus] = useState<SuiteStatus | null>(null)
  const [sends, setSends] = useState<HistorySend[]>([])
  const [total, setTotal] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedHtml, setSelectedHtml] = useState<string | null>(null)
  const [selectedSubject, setSelectedSubject] = useState('')
  const [templates, setTemplates] = useState<SuiteTemplateDef[]>(() => getSuiteManualTemplates())
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewSubject, setPreviewSubject] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('claim_invitation')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [customSubject, setCustomSubject] = useState('')
  const [customText, setCustomText] = useState('')
  const [trialDays, setTrialDays] = useState(7)
  const [campaigns, setCampaigns] = useState<Array<Record<string, unknown>>>([])
  const [automations, setAutomations] = useState<AutomationRow[]>([])
  const [suppressions, setSuppressions] = useState<Array<Record<string, unknown>>>([])
  const [inbound, setInbound] = useState<Array<Record<string, unknown>>>([])
  const [selectedInboundId, setSelectedInboundId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyBusy, setReplyBusy] = useState(false)
  const [replyNotice, setReplyNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sendBusy, setSendBusy] = useState(false)
  const [bulkConfirm, setBulkConfirm] = useState<{
    count: number
    recipients: Array<{ id: string; business_name: string; email: string }>
  } | null>(null)
  const [campaignName, setCampaignName] = useState('')
  const [audiencePreset, setAudiencePreset] = useState<AudiencePreset>('unclaimed_with_email')
  const [q, setQ] = useState('')
  const [previewAcknowledged, setPreviewAcknowledged] = useState(false)
  const [campaignDryRun, setCampaignDryRun] = useState<{
    count: number
    recipients: Array<{ id: string; business_name: string; email: string }>
    sampleHtml: string
    sampleSubject: string
    warning: string | null
  } | null>(null)
  const [offersNote, setOffersNote] = useState<string | null>(null)
  const [recipientQuery, setRecipientQuery] = useState('')
  const [recipientResults, setRecipientResults] = useState<RecipientOption[]>([])
  const [recipientSearching, setRecipientSearching] = useState(false)
  const [selectedRecipient, setSelectedRecipient] = useState<RecipientOption | null>(null)
  const [recipientMenuOpen, setRecipientMenuOpen] = useState(false)

  const campaignTemplates = templates.filter((t) => t.campaignAllowed)
  const selectedDef = templates.find((t) => t.key === selectedTemplate)

  const setSub = (id: SuiteSubTab) => {
    setError(null)
    setSubTab(id)
    const url = new URL(window.location.href)
    url.searchParams.set('tab', 'email-suite')
    url.searchParams.set('emailTab', id)
    router.replace(url.pathname + url.search, { scroll: false })
  }

  const syncBusinessIdInUrl = useCallback(
    (id: string | null) => {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', 'email-suite')
      url.searchParams.set('emailTab', subTab === 'templates' ? 'templates' : subTab)
      if (id) {
        url.searchParams.set('businessId', id)
      } else {
        url.searchParams.delete('businessId')
        url.searchParams.delete('compose')
      }
      router.replace(url.pathname + url.search, { scroll: false })
    },
    [router, subTab]
  )

  const selectRecipient = useCallback(
    (r: RecipientOption) => {
      setSelectedRecipient(r)
      setRecipientQuery('')
      setRecipientResults([])
      setRecipientMenuOpen(false)
      setPreviewAcknowledged(false)
      syncBusinessIdInUrl(r.id)
    },
    [syncBusinessIdInUrl]
  )

  const clearRecipient = useCallback(() => {
    setSelectedRecipient(null)
    setRecipientQuery('')
    setRecipientResults([])
    setPreviewAcknowledged(false)
    syncBusinessIdInUrl(null)
  }, [syncBusinessIdInUrl])

  const loadStatus = useCallback(async () => {
    const res = await fetch('/api/admin/email-suite/status')
    if (res.ok) setStatus(await res.json())
  }, [])

  const loadHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (businessId) params.set('businessId', businessId)
      if (q) params.set('q', q)
      const res = await fetch(`/api/admin/email-suite/history?${params}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed to load history')
      setSends(json.sends || [])
      setTotal(json.total || 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [businessId, q])

  const openSend = async (id: string) => {
    setSelectedId(id)
    const res = await fetch(`/api/admin/email-suite/history?id=${id}`)
    const json = await res.json()
    if (res.ok) {
      setSelectedHtml(json.send?.html_body || null)
      setSelectedSubject(json.send?.subject || '')
    }
  }

  const loadTemplates = useCallback(async () => {
    const res = await fetch('/api/admin/email-suite/templates')
    if (res.ok) {
      const json = await res.json()
      if (Array.isArray(json.templates) && json.templates.length > 0) {
        setTemplates(json.templates)
      }
    }
  }, [])

  const runPreview = useCallback(async (templateKey = selectedTemplate) => {
    setPreviewLoading(true)
    setPreviewAcknowledged(false)
    try {
      const res = await fetch('/api/admin/email-suite/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey,
          businessId: businessId || undefined,
          customSubject:
            templateKey === 'custom' ? customSubject || 'Message from Qwikker' : undefined,
          customText:
            templateKey === 'custom'
              ? customText || 'Your custom message will appear here…'
              : undefined,
          trialDays: templateKey === 'trial_extension' ? trialDays : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Preview failed')
      setPreviewHtml(json.html)
      setPreviewSubject(json.subject)
      if (json.offersSource === 'enrichment') {
        setOffersNote(`Using ${json.offersCount} AI offer(s) from Acquisition Engine draft`)
      } else if (json.offersSource === 'none') {
        setOffersNote(
          'No Acquisition draft offers on file — email will use generic copy. Re-run offer generation in Acquisition Engine first for tailored suggestions.'
        )
      } else if (json.offersSource === 'sample') {
        setOffersNote('Sample offers shown — open from a CRM card to load real draft offers')
      } else {
        setOffersNote(null)
      }
      setError(null)
    } catch (e) {
      setPreviewHtml(null)
      setError(e instanceof Error ? e.message : 'Preview failed')
    } finally {
      setPreviewLoading(false)
    }
  }, [selectedTemplate, businessId, customSubject, customText, trialDays])

  const doSend = async (confirmBulk = false) => {
    if (!businessId) {
      setError('Search and select a recipient to send a 1:1 template, or use Campaigns for audiences.')
      return
    }
    if (!previewHtml || !previewAcknowledged) {
      setError('Preview the email and tick “I’ve checked the preview” before sending.')
      return
    }
    if (selectedTemplate === 'custom' && (!customSubject.trim() || !customText.trim())) {
      setError('Custom messages need a subject and body.')
      return
    }
    if (selectedTemplate === 'trial_extension' && (!trialDays || trialDays < 1)) {
      setError('Enter how many days the trial was extended by.')
      return
    }
    setSendBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/email-suite/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey: selectedTemplate,
          businessIds: [businessId],
          audiencePreset: 'business_ids',
          customSubject: selectedTemplate === 'custom' ? customSubject : undefined,
          customText: selectedTemplate === 'custom' ? customText : undefined,
          trialDays: selectedTemplate === 'trial_extension' ? trialDays : undefined,
          confirmBulk,
          previewAcknowledged: true,
        }),
      })
      const json = await res.json()
      if (res.status === 409 && json.requiresConfirmation) {
        setBulkConfirm({ count: json.recipientCount, recipients: json.recipients || [] })
        return
      }
      if (!res.ok) throw new Error(json.error || 'Send failed')
      setBulkConfirm(null)
      setSub('history')
      await loadHistory()
      alert(`Sent ${json.sent}, skipped ${json.skipped}, failed ${json.failed}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setSendBusy(false)
    }
  }

  const loadCampaigns = useCallback(async () => {
    const res = await fetch('/api/admin/email-suite/campaigns')
    if (res.ok) {
      const json = await res.json()
      setCampaigns(json.campaigns || [])
    }
  }, [])

  // When template changes in Campaigns, snap audience to a recommended preset
  useEffect(() => {
    if (subTab !== 'campaigns') return
    const def = templates.find((t) => t.key === selectedTemplate)
    if (!def?.campaignAllowed) {
      const first = templates.find((t) => t.campaignAllowed)
      if (first) setSelectedTemplate(first.key)
      return
    }
    if (!def.recommendedAudiences.includes(audiencePreset)) {
      setAudiencePreset(def.recommendedAudiences[0] || 'live')
    }
  }, [subTab, selectedTemplate, templates, audiencePreset])

  const previewCampaignAudience = async () => {
    setSendBusy(true)
    setError(null)
    setCampaignDryRun(null)
    try {
      const res = await fetch('/api/admin/email-suite/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateKey: selectedTemplate,
          audiencePreset,
          customSubject: selectedTemplate === 'custom' ? customSubject : undefined,
          customText: selectedTemplate === 'custom' ? customText : undefined,
          trialDays: selectedTemplate === 'trial_extension' ? trialDays : undefined,
          dryRun: true,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Audience preview failed')
      setCampaignDryRun({
        count: json.recipientCount,
        recipients: json.recipients || [],
        sampleHtml: json.samplePreview?.html || '',
        sampleSubject: json.samplePreview?.subject || '',
        warning: json.warning || null,
      })
      setPreviewHtml(json.samplePreview?.html || null)
      setPreviewSubject(json.samplePreview?.subject || '')
      setPreviewAcknowledged(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Audience preview failed')
    } finally {
      setSendBusy(false)
    }
  }

  const sendCampaign = async (confirmBulk = false) => {
    if (!campaignDryRun) {
      setError('Preview the audience and email first.')
      return
    }
    if (!previewAcknowledged) {
      setError('Tick “I’ve checked the preview” before sending.')
      return
    }
    if (selectedTemplate === 'trial_extension' && (!trialDays || trialDays < 1)) {
      setError('Enter how many days the trial was extended by.')
      return
    }
    setSendBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/email-suite/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName || `${selectedTemplate} campaign`,
          templateKey: selectedTemplate,
          audienceFilter: { preset: audiencePreset },
          sendNow: true,
          confirmBulk,
          previewAcknowledged: true,
          customSubject: selectedTemplate === 'custom' ? customSubject : undefined,
          customText: selectedTemplate === 'custom' ? customText : undefined,
          trialDays: selectedTemplate === 'trial_extension' ? trialDays : undefined,
        }),
      })
      const json = await res.json()
      if (res.status === 409 && json.requiresConfirmation) {
        setBulkConfirm({ count: json.recipientCount, recipients: json.recipients || [] })
        return
      }
      if (!res.ok) throw new Error(json.error || json.send?.error || 'Campaign failed')
      setBulkConfirm(null)
      setCampaignDryRun(null)
      await loadCampaigns()
      setSub('history')
      alert(`Campaign sent: ${json.send?.sent ?? 0} ok, ${json.send?.skipped ?? 0} skipped`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Campaign failed')
    } finally {
      setSendBusy(false)
    }
  }

  const saveCampaignDraft = async () => {
    setSendBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/email-suite/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: campaignName || `${selectedTemplate} campaign`,
          templateKey: selectedTemplate,
          audienceFilter: { preset: audiencePreset },
          sendNow: false,
          customSubject: selectedTemplate === 'custom' ? customSubject : undefined,
          customText: selectedTemplate === 'custom' ? customText : undefined,
          trialDays: selectedTemplate === 'trial_extension' ? trialDays : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Save failed')
      await loadCampaigns()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSendBusy(false)
    }
  }

  const loadAutomations = useCallback(async () => {
    const res = await fetch('/api/admin/email-suite/automations')
    if (res.ok) {
      const json = await res.json()
      setAutomations(json.automations || [])
    }
  }, [])

  const toggleAutomation = async (key: string, enabled: boolean) => {
    const res = await fetch('/api/admin/email-suite/automations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ automationKey: key, enabled }),
    })
    if (res.ok) await loadAutomations()
    else {
      const json = await res.json()
      setError(json.error || 'Update failed')
    }
  }

  const loadSettings = useCallback(async () => {
    const res = await fetch('/api/admin/email-suite/suppressions')
    if (res.ok) {
      const json = await res.json()
      setSuppressions(json.suppressions || [])
    }
  }, [])

  const loadInbox = useCallback(async () => {
    const res = await fetch('/api/admin/email-suite/inbox')
    if (res.ok) {
      const json = await res.json()
      const rows = (json.inbound || []) as Array<Record<string, unknown>>
      setInbound(rows)
      setSelectedInboundId((prev) => {
        if (prev && rows.some((r) => String(r.id) === prev)) return prev
        return rows[0] ? String(rows[0].id) : null
      })
    }
  }, [])

  const selectedInbound = useMemo(
    () => inbound.find((m) => String(m.id) === selectedInboundId) || null,
    [inbound, selectedInboundId]
  )

  const replySubjectFor = (subject: string) =>
    /^re:\s/i.test(subject.trim()) ? subject.trim() : `Re: ${subject.trim() || '(no subject)'}`

  const sendInboxReply = async () => {
    if (!selectedInbound || !replyText.trim()) return
    const toEmail = String(selectedInbound.from_email || '')
    if (!toEmail.includes('@')) {
      setReplyNotice('Missing sender email on this message')
      return
    }
    setReplyBusy(true)
    setReplyNotice(null)
    setError(null)
    try {
      const res = await fetch('/api/admin/email-suite/inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail,
          subject: replySubjectFor(String(selectedInbound.subject || '')),
          text: replyText.trim(),
          businessId: selectedInbound.business_id ? String(selectedInbound.business_id) : undefined,
          threadId: selectedInbound.thread_id
            ? String(selectedInbound.thread_id)
            : String(selectedInbound.id),
          inReplyToSendId: String(selectedInbound.id),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json.error || 'Reply failed')
        setReplyBusy(false)
        return
      }
      setReplyText('')
      setReplyNotice('Reply sent — it will also appear in History')
      void loadStatus()
    } catch {
      setError('Reply failed')
    } finally {
      setReplyBusy(false)
    }
  }

  useEffect(() => {
    loadStatus()
  }, [loadStatus])

  useEffect(() => {
    if (subTab === 'history') loadHistory()
    if (subTab === 'templates') loadTemplates()
    if (subTab === 'campaigns') {
      loadTemplates()
      loadCampaigns()
    }
    if (subTab === 'automations') loadAutomations()
    if (subTab === 'settings') loadSettings()
    if (subTab === 'inbox') loadInbox()
  }, [
    subTab,
    loadHistory,
    loadTemplates,
    loadCampaigns,
    loadAutomations,
    loadSettings,
    loadInbox,
  ])

  // Resolve selected recipient when businessId is in the URL (CRM deep-link or picker)
  useEffect(() => {
    if (!businessId) {
      setSelectedRecipient(null)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/admin/email-suite/recipients?id=${businessId}`)
        const json = await res.json()
        if (cancelled) return
        if (res.ok && json.recipient) {
          setSelectedRecipient(json.recipient as RecipientOption)
        } else {
          setSelectedRecipient(null)
        }
      } catch {
        if (!cancelled) setSelectedRecipient(null)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [businessId])

  // Debounced recipient search
  useEffect(() => {
    const term = recipientQuery.trim()
    if (term.length < 2) {
      setRecipientResults([])
      setRecipientSearching(false)
      return
    }

    setRecipientSearching(true)
    const handle = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/admin/email-suite/recipients?q=${encodeURIComponent(term)}`
        )
        const json = await res.json()
        if (res.ok) {
          setRecipientResults((json.recipients || []) as RecipientOption[])
          setRecipientMenuOpen(true)
        } else {
          setRecipientResults([])
        }
      } catch {
        setRecipientResults([])
      } finally {
        setRecipientSearching(false)
      }
    }, 250)

    return () => window.clearTimeout(handle)
  }, [recipientQuery])

  // Auto-preview when Templates tab is open / template changes
  useEffect(() => {
    if (subTab !== 'templates') return
    void runPreview(selectedTemplate)
  }, [subTab, selectedTemplate, businessId, runPreview])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Email Suite</h2>
          <p className="text-sm text-slate-400">
            History, templates, campaigns &amp; automations for {city}
            {selectedRecipient ? (
              <span className="ml-2 text-[#00d083]">
                · {selectedRecipient.business_name}
              </span>
            ) : businessId ? (
              <span className="ml-2 text-[#00d083]">· filtered to one business</span>
            ) : null}
          </p>
        </div>
        {status && (
          <div
            className={`text-xs px-3 py-1.5 rounded-lg border ${
              status.configured
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
            }`}
          >
            {status.configured
              ? `From ${status.fromName || 'QWIKKER'} <${status.fromEmail}>`
              : 'Email not configured — add Resend key in City Configuration'}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-700 pb-2">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setSub(t.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              subTab === t.id
                ? 'bg-[#00d083] text-black'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            {t.label}
            {t.id === 'inbox' && status?.inboundUnread ? (
              <span className="ml-1 text-[10px] opacity-80">({status.inboundUnread})</span>
            ) : null}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {bulkConfirm && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
          <p className="text-sm text-amber-100 font-medium">
            Confirm bulk send to {bulkConfirm.count} recipients
          </p>
          <ul className="max-h-40 overflow-auto text-xs text-slate-300 space-y-1">
            {bulkConfirm.recipients.slice(0, 40).map((r) => (
              <li key={r.id}>
                {r.business_name} — {r.email}
              </li>
            ))}
            {bulkConfirm.recipients.length > 40 && (
              <li>…and {bulkConfirm.recipients.length - 40} more</li>
            )}
          </ul>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={sendBusy}
              onClick={() =>
                subTab === 'campaigns' ? sendCampaign(true) : doSend(true)
              }
              className="px-3 py-1.5 rounded-lg bg-[#00d083] text-black text-sm font-semibold"
            >
              Confirm send
            </button>
            <button
              type="button"
              onClick={() => setBulkConfirm(null)}
              className="px-3 py-1.5 rounded-lg bg-slate-700 text-slate-200 text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {subTab === 'inbox' && (
        <div className="space-y-3">
          {inbound.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-600 p-8 text-center text-slate-400 text-sm">
              No inbound messages yet
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ul className="space-y-2 max-h-[70vh] overflow-auto">
                {inbound.map((m) => {
                  const id = String(m.id)
                  const active = id === selectedInboundId
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInboundId(id)
                          setReplyNotice(null)
                        }}
                        className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                          active
                            ? 'border-[#00d083]/50 bg-[#00d083]/10'
                            : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
                        }`}
                      >
                        <div className="text-slate-100 font-medium truncate">
                          {String(m.subject || '(no subject)')}
                        </div>
                        <div className="text-xs text-slate-400 truncate">
                          From {String(m.from_email)} · {String(m.created_at)}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>

              <div className="rounded-xl border border-slate-700 bg-slate-900/40 flex flex-col min-h-[420px] overflow-hidden">
                {selectedInbound ? (
                  <>
                    <div className="px-3 py-2 border-b border-slate-700 bg-slate-900/80 space-y-0.5">
                      <div className="text-sm text-slate-100 font-medium">
                        {String(selectedInbound.subject || '(no subject)')}
                      </div>
                      <div className="text-xs text-slate-400">
                        From {String(selectedInbound.from_email)} · To{' '}
                        {String(selectedInbound.to_email)} · {String(selectedInbound.created_at)}
                      </div>
                    </div>
                    <div className="flex-1 min-h-[200px] max-h-[45vh] overflow-auto bg-[#0a0a0a]">
                      {selectedInbound.html_body ? (
                        <EmailHtmlPreview
                          html={String(selectedInbound.html_body)}
                          title="Inbound email"
                        />
                      ) : selectedInbound.text_body ? (
                        <pre className="p-4 text-sm text-slate-200 whitespace-pre-wrap font-sans">
                          {String(selectedInbound.text_body)}
                        </pre>
                      ) : (
                        <div className="p-6 text-sm text-slate-500 text-center">
                          No message body stored for this email. Subject and sender are still shown —
                          try asking the sender to resend, or check Resend → Receiving.
                        </div>
                      )}
                    </div>
                    <div className="border-t border-slate-700 p-3 space-y-2 bg-slate-900/60">
                      <div className="text-xs text-slate-400">
                        Reply to{' '}
                        <span className="text-slate-200 font-mono">
                          {String(selectedInbound.from_email)}
                        </span>
                        {' · '}
                        Subject:{' '}
                        <span className="text-slate-300">
                          {replySubjectFor(String(selectedInbound.subject || ''))}
                        </span>
                      </div>
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={4}
                        placeholder="Write a reply…"
                        className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={replyBusy || !replyText.trim()}
                          onClick={() => void sendInboxReply()}
                          className="px-3 py-1.5 rounded-lg bg-[#00d083] text-black text-sm font-semibold disabled:opacity-50"
                        >
                          {replyBusy ? 'Sending…' : 'Send reply'}
                        </button>
                        {replyNotice && (
                          <span className="text-xs text-[#00d083]">{replyNotice}</span>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center flex-1 text-sm text-slate-500 p-6">
                    Select a message
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {subTab === 'history' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            {businessId && (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-[#00d083]/30 bg-[#00d083]/10 px-3 py-2">
                <p className="text-xs text-[#00d083] truncate">
                  Filtered to{' '}
                  {selectedRecipient?.business_name || 'one business'} — other sends are hidden
                </p>
                <button
                  type="button"
                  onClick={clearRecipient}
                  className="shrink-0 text-xs text-slate-200 hover:text-white underline"
                >
                  Show all
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search business, name, email, or subject"
                className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void loadHistory()
                }}
              />
              <button
                type="button"
                onClick={loadHistory}
                className="px-3 py-2 rounded-lg bg-slate-700 text-sm text-slate-100"
              >
                Search
              </button>
            </div>
            <p className="text-xs text-slate-500">{total} sends</p>
            {loading && <p className="text-sm text-slate-400">Loading…</p>}
            <ul className="space-y-2 max-h-[60vh] overflow-auto">
              {sends.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => openSend(s.id)}
                    className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                      selectedId === s.id
                        ? 'border-[#00d083]/50 bg-[#00d083]/10'
                        : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-100 font-medium truncate">{s.subject}</span>
                      <span className="text-[10px] uppercase text-slate-400 shrink-0">{s.status}</span>
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {s.business_name ? `${s.business_name} · ` : ''}
                      {s.to_email} · {s.template_key || s.category} ·{' '}
                      {s.sent_at || s.created_at}
                    </div>
                  </button>
                </li>
              ))}
              {!loading && sends.length === 0 && (
                <li className="text-sm text-slate-400 p-4 border border-dashed border-slate-600 rounded-xl text-center">
                  No logged sends yet. Sends from the Suite, claim invites, and system emails that
                  use the logger appear here.
                </li>
              )}
            </ul>
          </div>
          <div className="rounded-xl border border-slate-700 bg-[#0a0a0a] min-h-[320px] overflow-hidden">
            {selectedHtml ? (
              <>
                <div className="px-3 py-2 border-b border-slate-700 text-sm text-slate-200 bg-slate-900/80">
                  {selectedSubject}
                </div>
                <EmailHtmlPreview html={selectedHtml} title="Email preview" />
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-sm text-slate-500 p-6 text-center min-h-[320px]">
                Select a send to view the HTML snapshot
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="space-y-2">
              <p className="text-xs text-slate-400">
                {templates.length} templates — search for a recipient to send, or preview with
                sample data
                {selectedRecipient ? (
                  <span className="text-[#00d083]">
                    {' '}
                    · sending to {selectedRecipient.business_name}
                  </span>
                ) : null}
              </p>
              {selectedRecipient ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-[#00d083]/40 bg-[#00d083]/10 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-100 truncate">
                      {formatRecipientName(selectedRecipient)}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{selectedRecipient.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={clearRecipient}
                    className="shrink-0 text-xs text-slate-300 hover:text-white px-2 py-1 rounded-lg hover:bg-slate-800/60"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <input
                    value={recipientQuery}
                    onChange={(e) => setRecipientQuery(e.target.value)}
                    onFocus={() => {
                      if (recipientResults.length > 0) setRecipientMenuOpen(true)
                    }}
                    onBlur={() => {
                      // Allow click on results before closing
                      window.setTimeout(() => setRecipientMenuOpen(false), 150)
                    }}
                    placeholder="Search by business, name, or email"
                    className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                    autoComplete="off"
                  />
                  {recipientSearching && (
                    <p className="absolute right-3 top-2.5 text-[11px] text-slate-500">Searching…</p>
                  )}
                  {recipientMenuOpen && recipientQuery.trim().length >= 2 && (
                    <ul className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
                      {recipientResults.length === 0 && !recipientSearching ? (
                        <li className="px-3 py-2.5 text-xs text-slate-500">No businesses with email found</li>
                      ) : (
                        recipientResults.map((r) => (
                          <li key={r.id}>
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => selectRecipient(r)}
                              className="w-full text-left px-3 py-2.5 hover:bg-slate-800/80 border-b border-slate-800 last:border-0"
                            >
                              <p className="text-sm text-slate-100 truncate">{formatRecipientName(r)}</p>
                              <p className="text-xs text-slate-400 truncate">{r.email}</p>
                            </button>
                          </li>
                        ))
                      )}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <ul className="space-y-2 max-h-[50vh] overflow-auto pr-1">
              {templates.map((t) => (
                <li key={t.key}>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate(t.key)}
                    className={`w-full text-left rounded-xl border px-3 py-2.5 transition-colors ${
                      selectedTemplate === t.key
                        ? 'border-[#00d083]/50 bg-[#00d083]/10'
                        : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-100">{t.name}</span>
                      <span className="text-[10px] uppercase tracking-wide text-slate-400 shrink-0">
                        {t.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{t.description}</p>
                  </button>
                </li>
              ))}
            </ul>
            {selectedTemplate === 'custom' && (
              <div className="space-y-2">
                <input
                  value={customSubject}
                  onChange={(e) => {
                    setCustomSubject(e.target.value)
                    setPreviewAcknowledged(false)
                  }}
                  placeholder="Subject"
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                />
                <textarea
                  value={customText}
                  onChange={(e) => {
                    setCustomText(e.target.value)
                    setPreviewAcknowledged(false)
                  }}
                  placeholder="Your message (include a greeting if you want). Sign-off + support line are added automatically."
                  rows={6}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                />
              </div>
            )}
            {selectedTemplate === 'trial_extension' && (
              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400">Days extended</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={trialDays}
                  onChange={(e) => {
                    const next = Number(e.target.value)
                    setTrialDays(Number.isFinite(next) ? Math.max(1, Math.min(365, next)) : 7)
                    setPreviewAcknowledged(false)
                  }}
                  className="w-28 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                />
                <p className="text-[11px] text-slate-500">
                  Shown in the email as “we’ve extended your trial by X days”.
                </p>
              </label>
            )}
            {offersNote && selectedTemplate === 'offer_suggestions' && (
              <p className="text-xs text-amber-200/90">{offersNote}</p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => runPreview()}
                disabled={previewLoading || status?.configured === false}
                className="px-3 py-2 rounded-lg bg-slate-700 text-sm text-slate-100 disabled:opacity-50"
              >
                {previewLoading ? 'Loading…' : 'Refresh preview'}
              </button>
              <button
                type="button"
                onClick={() => doSend(false)}
                disabled={
                  sendBusy ||
                  !status?.configured ||
                  !businessId ||
                  !previewHtml ||
                  !previewAcknowledged
                }
                className="px-3 py-2 rounded-lg bg-[#00d083] text-black text-sm font-semibold disabled:opacity-50"
              >
                {sendBusy ? 'Sending…' : 'Send to business'}
              </button>
            </div>
            {previewHtml && (
              <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={previewAcknowledged}
                  onChange={(e) => setPreviewAcknowledged(e.target.checked)}
                  className="mt-0.5"
                />
                I’ve checked the preview — this is what will be sent
              </label>
            )}
          </div>
          <div className="rounded-xl border border-slate-700 bg-[#0a0a0a] min-h-[320px] overflow-hidden">
            {previewLoading && !previewHtml ? (
              <div className="flex items-center justify-center min-h-[480px] text-sm text-slate-500 p-6">
                Loading preview…
              </div>
            ) : previewHtml ? (
              <>
                <div className="px-3 py-2 border-b border-slate-700 text-sm text-slate-200 bg-slate-900/80">
                  {previewSubject}
                </div>
                <div className="max-h-[70vh] overflow-y-auto">
                  <EmailHtmlPreview html={previewHtml} title="Template preview" />
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center min-h-[480px] text-sm text-slate-500 p-6 text-center">
                Select a template to preview
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'campaigns' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">
            Campaigns are for matched audiences only (e.g. claim → unclaimed). Welcome / approval /
            weekly digest are not blast templates — use Templates (1:1) or Automations.
          </p>
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-100">New campaign</h3>
            <input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Campaign name"
              className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={campaignTemplates.some((t) => t.key === selectedTemplate) ? selectedTemplate : campaignTemplates[0]?.key}
                onChange={(e) => {
                  setSelectedTemplate(e.target.value)
                  setCampaignDryRun(null)
                  setPreviewAcknowledged(false)
                }}
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100"
              >
                {campaignTemplates.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name}
                  </option>
                ))}
              </select>
              <select
                value={audiencePreset}
                onChange={(e) => {
                  setAudiencePreset(e.target.value as AudiencePreset)
                  setCampaignDryRun(null)
                  setPreviewAcknowledged(false)
                }}
                className="rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100"
              >
                {(selectedDef?.recommendedAudiences || ['live']).map((a) => (
                  <option key={a} value={a}>
                    {AUDIENCE_LABELS[a]}
                  </option>
                ))}
              </select>
            </div>
            {selectedTemplate === 'custom' && (
              <div className="space-y-2">
                <input
                  value={customSubject}
                  onChange={(e) => setCustomSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                />
                <textarea
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Message body"
                  rows={4}
                  className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                />
              </div>
            )}
            {selectedTemplate === 'trial_extension' && (
              <label className="block space-y-1.5">
                <span className="text-xs text-slate-400">Days extended</span>
                <input
                  type="number"
                  min={1}
                  max={365}
                  value={trialDays}
                  onChange={(e) => {
                    const next = Number(e.target.value)
                    setTrialDays(Number.isFinite(next) ? Math.max(1, Math.min(365, next)) : 7)
                    setCampaignDryRun(null)
                    setPreviewAcknowledged(false)
                  }}
                  className="w-28 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-100"
                />
              </label>
            )}
            <p className="text-[11px] text-slate-500">
              Hard cap 50 recipients/send. Flow: preview audience → check email → confirm.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={sendBusy || !status?.configured}
                onClick={saveCampaignDraft}
                className="px-3 py-2 rounded-lg bg-slate-700 text-sm text-slate-100 disabled:opacity-50"
              >
                Save draft
              </button>
              <button
                type="button"
                disabled={sendBusy || !status?.configured}
                onClick={previewCampaignAudience}
                className="px-3 py-2 rounded-lg bg-[#00d083] text-black text-sm font-semibold disabled:opacity-50"
              >
                {sendBusy ? 'Loading…' : 'Preview audience & email'}
              </button>
            </div>
          </div>

          {campaignDryRun && (
            <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3">
              <p className="text-sm text-amber-100 font-medium">
                {campaignDryRun.count} recipients — review before send
              </p>
              {campaignDryRun.warning && (
                <p className="text-xs text-amber-200">{campaignDryRun.warning}</p>
              )}
              <ul className="max-h-32 overflow-auto text-xs text-slate-300 space-y-1">
                {campaignDryRun.recipients.slice(0, 40).map((r) => (
                  <li key={r.id}>
                    {r.business_name} — {r.email}
                  </li>
                ))}
                {campaignDryRun.recipients.length > 40 && (
                  <li>…and {campaignDryRun.recipients.length - 40} more</li>
                )}
              </ul>
              <div className="rounded-lg border border-slate-700 overflow-hidden bg-[#0a0a0a]">
                <div className="px-3 py-2 border-b border-slate-700 text-sm text-slate-200 bg-slate-900/80">
                  {campaignDryRun.sampleSubject}
                </div>
                <div className="max-h-[40vh] overflow-y-auto">
                  <EmailHtmlPreview html={campaignDryRun.sampleHtml} title="Campaign preview" />
                </div>
              </div>
              <label className="flex items-start gap-2 text-xs text-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={previewAcknowledged}
                  onChange={(e) => setPreviewAcknowledged(e.target.checked)}
                  className="mt-0.5"
                />
                I’ve checked the preview and recipient list
              </label>
              <button
                type="button"
                disabled={sendBusy || !previewAcknowledged}
                onClick={() => sendCampaign(false)}
                className="px-3 py-2 rounded-lg bg-[#00d083] text-black text-sm font-semibold disabled:opacity-50"
              >
                {sendBusy ? 'Sending…' : `Send to ${campaignDryRun.count} businesses`}
              </button>
            </div>
          )}

          <ul className="space-y-2">
            {campaigns.map((c) => (
              <li
                key={String(c.id)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm flex justify-between gap-2"
              >
                <div>
                  <div className="text-slate-100 font-medium">{String(c.name)}</div>
                  <div className="text-xs text-slate-400">
                    {String(c.template_key)} · {String(c.status)}
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  {c.stats ? JSON.stringify(c.stats) : null}
                </div>
              </li>
            ))}
            {campaigns.length === 0 && (
              <li className="text-sm text-slate-400 text-center py-6">No campaigns yet</li>
            )}
          </ul>
        </div>
      )}

      {subTab === 'automations' && (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            Automations are off by default per city. Weekly digest only runs when enabled and the
            cron hits /api/cron/email-digest with CRON_SECRET.
          </p>
          {automations.map((a) => (
            <div
              key={a.key}
              className="rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-3 flex items-start justify-between gap-3"
            >
              <div>
                <div className="text-slate-100 font-medium text-sm">{a.name}</div>
                <div className="text-xs text-slate-400 mt-1">{a.description}</div>
                {a.lastRunAt && (
                  <div className="text-[10px] text-slate-500 mt-1">Last run: {a.lastRunAt}</div>
                )}
              </div>
              <button
                type="button"
                onClick={() => toggleAutomation(a.key, !a.enabled)}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  a.enabled ? 'bg-[#00d083] text-black' : 'bg-slate-700 text-slate-200'
                }`}
              >
                {a.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>
          ))}
        </div>
      )}

      {subTab === 'settings' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-4 text-sm space-y-2">
            <div className="text-slate-100 font-medium">Identity</div>
            <p className="text-slate-400 text-xs">
              From: {status?.fromEmail || '—'} · Reply-To: {status?.replyTo || '—'}
            </p>
            <p className="text-slate-500 text-xs">
              Failed sends (7d): {status?.failedLast7d ?? 0}
            </p>
          </div>
          <EmailSuiteInboxSetup city={city} />
          <div>
            <h3 className="text-sm font-semibold text-slate-100 mb-2">Suppressions</h3>
            <ul className="space-y-1 max-h-64 overflow-auto">
              {suppressions.map((s) => (
                <li key={String(s.id)} className="text-xs text-slate-300 border-b border-slate-800 py-1.5">
                  {String(s.email)} · {String(s.scope)} · {String(s.unsubscribed_at)}
                </li>
              ))}
              {suppressions.length === 0 && (
                <li className="text-sm text-slate-500">No suppressions yet</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
