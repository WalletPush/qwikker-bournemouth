'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AcquisitionDraftReview, type AcquisitionResult, type ReviewStatus } from '@/components/admin/acquisition-draft-review'
import { CampaignOverview } from '@/components/admin/acquisition/acquisition-dashboard'
import { JourneySteps, type JourneyStep } from '@/components/admin/acquisition/journey-steps'
import { BusinessCard } from '@/components/admin/acquisition/business-card'
import type { PipelineRow, RowEnrichment } from '@/components/admin/acquisition/types'
import { deriveStage, HIGH_CONFIDENCE } from '@/lib/listing-engine/pipeline-stage'
import { buildWhatsappLink, normalizeWhatsappNumber } from '@/lib/utils/phone'
import { getFranchisePublicUrl } from '@/lib/utils/franchise-url'
import { MessageCircle } from 'lucide-react'

type Step = 1 | 2 | 3

// The three result buckets shown under the active journey step, replacing the flat
// card grid. A row's bucket is derived from its real signals (see bucketOf below).
type BucketKey = 'ready' | 'no_email' | 'attention'

const BUCKET_ORDER: BucketKey[] = ['ready', 'no_email', 'attention']

const BUCKET_META: Record<JourneyStep, Record<BucketKey, { label: string; desc: string; tone: 'ready' | 'warn' | 'muted' }>> = {
  enrich: {
    ready: {
      label: 'Best candidates',
      desc: 'Website + email on file — most likely to enrich into a complete, contactable listing.',
      tone: 'ready',
    },
    no_email: {
      label: 'Website, no email',
      desc: 'Good content likely — we’ll hunt for a contact while enriching.',
      tone: 'warn',
    },
    attention: {
      label: 'Little to work with',
      desc: 'No website on file — content may be thin. Enrich anyway or skip.',
      tone: 'muted',
    },
  },
  confirm: {
    ready: {
      label: 'Send-ready',
      desc: 'Everything checks out: website, menu/services, grounded content and an email. Confirm & invite in one go.',
      tone: 'ready',
    },
    no_email: {
      label: 'Ready — no email',
      desc: 'Strong listing, but no contact yet. Publish live, find the email, then invite.',
      tone: 'warn',
    },
    attention: {
      label: 'Needs attention',
      desc: 'Missing signals or lower confidence — worth a quick review before publishing.',
      tone: 'muted',
    },
  },
  invite: {
    ready: {
      label: 'Ready to invite',
      desc: 'Live listing with an email on file — send the claim invite.',
      tone: 'ready',
    },
    no_email: {
      label: 'No email yet',
      desc: 'Live, but we need a contact before inviting.',
      tone: 'warn',
    },
    attention: {
      label: 'Needs attention',
      desc: 'Something’s off — review individually.',
      tone: 'muted',
    },
  },
  sent: {
    ready: {
      label: 'Engaged',
      desc: 'Clicked Claim or Present Mode after the invite.',
      tone: 'ready',
    },
    no_email: {
      label: 'Waiting',
      desc: 'Invite sent — no tracked clicks yet.',
      tone: 'warn',
    },
    attention: {
      label: 'Check recipient',
      desc: 'Sent, but no recipient email is recorded.',
      tone: 'muted',
    },
  },
}

const BUCKET_TONE: Record<'ready' | 'warn' | 'muted', { border: string; dot: string }> = {
  ready: { border: 'border-emerald-800/70 bg-emerald-950/20', dot: 'bg-emerald-400' },
  warn: { border: 'border-amber-800/60 bg-amber-950/15', dot: 'bg-amber-400' },
  muted: { border: 'border-slate-800 bg-slate-900/60', dot: 'bg-slate-500' },
}

export function AcquisitionPipeline({ cityDisplayName }: { cityDisplayName: string }) {
  const [rows, setRows] = useState<PipelineRow[]>([])
  /** Server claim KPIs (invite cohort) — not derived from unclaimed-only rows. */
  const [serverClaimKpis, setServerClaimKpis] = useState<{
    claimed: number
    emailsSent: number
    claimRate: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  // Guided journey: the page walks through three plain-language jobs.
  const [journeyStep, setJourneyStep] = useState<JourneyStep>('enrich')
  const initialStepSet = useRef(false)

  // Which result bucket is expanded to its full-width list (null = show the 3 cards).
  const [openBucket, setOpenBucket] = useState<BucketKey | null>(null)
  // Gated bulk send: the recipients awaiting explicit confirmation in the modal.
  const [bulkRecipients, setBulkRecipients] = useState<PipelineRow[] | null>(null)
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkSummary, setBulkSummary] = useState<{ sent: number; total: number; failed: number } | null>(null)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set())
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null)
  const [batchSummary, setBatchSummary] = useState<{ done: number; total: number; failed: number } | null>(null)

  // Drawer state
  const [drawer, setDrawer] = useState<PipelineRow | null>(null)
  const [step, setStep] = useState<Step>(1)
  const [drawerResult, setDrawerResult] = useState<AcquisitionResult | null>(null)
  const [drawerDecisions, setDrawerDecisions] = useState<Record<string, ReviewStatus>>({})
  const [drawerEdits, setDrawerEdits] = useState<Record<string, string>>({})
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [drawerError, setDrawerError] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [publishedAt, setPublishedAt] = useState<string | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [presentMode, setPresentMode] = useState(false)
  const [presentSearch, setPresentSearch] = useState('')
  const [presentingId, setPresentingId] = useState<string | null>(null)
  const [pdfBusyId, setPdfBusyId] = useState<string | null>(null)
  const [presentError, setPresentError] = useState<string | null>(null)
  const [confirmingAll, setConfirmingAll] = useState(false)
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set())
  const patchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const editTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Outreach (step 3) state — deliberately per-business, with an explicit
  // confirm gate. There is NO bulk-send path anywhere in this UI.
  const [emailValue, setEmailValue] = useState('')
  const [emailSaved, setEmailSaved] = useState(false)
  // When more than one email is discovered we force the admin to explicitly pick
  // which one to invite before we auto-preview or allow a send.
  const [emailPicked, setEmailPicked] = useState(true)
  const [foundEmails, setFoundEmails] = useState<string[]>([])
  const [findingEmail, setFindingEmail] = useState(false)
  const [savingEmail, setSavingEmail] = useState(false)
  const [preview, setPreview] = useState<{ to: string; subject: string; html: string } | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [sending, setSending] = useState(false)
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [outreachError, setOutreachError] = useState<string | null>(null)

  const loadPipeline = async () => {
    setLoading(true)
    setError(null)
    try {
      // Pull the full unclaimed set (API default 1000) so journey counts stay
      // accurate on large import cities. Ready enrichments outside the page are
      // force-included server-side — existing AI drafts never need re-running.
      const res = await fetch(`/api/admin/offer-engine/pipeline?unclaimed=1&limit=1000`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setRows(data.rows || [])
      if (
        data.counts &&
        typeof data.counts.claimed === 'number' &&
        typeof data.counts.emailsSent === 'number'
      ) {
        setServerClaimKpis({
          claimed: data.counts.claimed,
          emailsSent: data.counts.emailsSent,
          claimRate:
            typeof data.counts.claimRate === 'number'
              ? data.counts.claimRate
              : data.counts.emailsSent > 0
                ? Math.round((data.counts.claimed / data.counts.emailsSent) * 1000) / 10
                : 0,
        })
      }
      setSelected(new Set())
      if (data.meta?.truncated && process.env.NODE_ENV !== 'production') {
        console.warn(
          `[acquisition] pipeline truncated: returned ${data.meta.returned} of ${data.meta.matchedTotal}`
        )
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPipeline()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Recompute the derived pipeline stage locally after a mutation, using the exact
  // same logic as the server so cards jump to the right column without a reload.
  const recomputeStage = (r: PipelineRow): PipelineRow => ({
    ...r,
    stage: deriveStage({
      claimed: r.claimed,
      hasEnrichment: !!r.enrichment,
      status: r.enrichment?.status,
      confidence: r.confidence,
      reviewAction: r.reviewAction,
      sentAt: r.sentAt,
    }),
  })

  const patchRow = (id: string, patch: Partial<PipelineRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? recomputeStage({ ...r, ...patch }) : r)))
  }

  const updateRowEnrichment = (id: string, enrichment: RowEnrichment) => {
    patchRow(id, { enrichment })
  }

  const updateRowEmail = (id: string, email: string | null, candidates?: string[]) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, email, emailCandidates: candidates ?? r.emailCandidates } : r
      )
    )
  }

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const enrichOne = async (id: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/offer-engine/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Enrich failed')
      patchRow(id, {
        enrichment: {
          status: 'ready',
          offersCount: data.result?.offers?.length || 0,
          hasListing: !!data.result?.listing?.business_description?.value,
          generatedAt: new Date().toISOString(),
          published: false,
        },
        confidence: data.confidence ?? null,
        flags: data.flags ?? [],
        reviewAction: null,
        sentAt: null,
        email: data.savedEmail ?? null,
        emailCandidates: data.emailCandidates || [],
      })
      return true
    } catch {
      updateRowEnrichment(id, { status: 'error', offersCount: 0, hasListing: false, generatedAt: null, published: false })
      return false
    }
  }

  // Sequentially enrich an explicit set of ids with live progress. Shared by
  // "Generate for these", per-card enrich, and select-based enrich.
  const runEnrich = async (ids: string[]) => {
    if (ids.length === 0 || batchRunning) return
    setBatchRunning(true)
    setBatchSummary(null)
    setBatchProgress({ done: 0, total: ids.length })
    let failed = 0
    for (let i = 0; i < ids.length; i++) {
      const id = ids[i]
      setEnrichingIds((prev) => new Set(prev).add(id))
      const ok = await enrichOne(id)
      if (!ok) failed++
      setEnrichingIds((prev) => {
        const n = new Set(prev)
        n.delete(id)
        return n
      })
      setBatchProgress({ done: i + 1, total: ids.length })
    }
    setBatchRunning(false)
    setBatchProgress(null)
    setSelected(new Set())
    setBatchSummary({ done: ids.length - failed, total: ids.length, failed })
  }

  // Review-by-exception: approve/skip/reject one or many. Optimistic; the server
  // reconciles on next load. Approve -> Ready to Send; reject -> off the board.
  const applyReview = async (ids: string[], action: 'approved' | 'skipped' | 'rejected') => {
    if (ids.length === 0) return
    setRows((prev) => prev.map((r) => (ids.includes(r.id) ? recomputeStage({ ...r, reviewAction: action }) : r)))
    setSelected(new Set())
    try {
      await fetch('/api/admin/offer-engine/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessIds: ids, action }),
      })
    } catch {
      /* best-effort; a reload reconciles */
    }
  }

  const counts = useMemo(() => {
    const by = (s: string) => rows.filter((r) => r.stage === s).length
    // Prefer server claim KPIs — rows are loaded with unclaimed=1, so claimed
    // businesses disappear from the client list after they claim.
    const emailsSent = serverClaimKpis?.emailsSent ?? rows.filter((r) => r.sentAt).length
    const claimed = serverClaimKpis?.claimed ?? by('claimed')
    const claimRate =
      serverClaimKpis?.claimRate ??
      (emailsSent > 0 ? Math.round((claimed / emailsSent) * 1000) / 10 : 0)
    return {
      total: rows.length,
      enriched: rows.filter((r) => r.enrichment?.status === 'ready').length,
      imported: by('imported'),
      enriching: enrichingIds.size,
      needsReview: by('needs_review') + by('error'),
      readyToSend: by('ready_to_send'),
      sent: by('sent'),
      claimed,
      emailsSent,
      claimRate,
    }
  }, [rows, enrichingIds, serverClaimKpis])

  // Distinct categories for the "focus a category" picker.
  const categories = useMemo(() => {
    const set = new Set<string>()
    rows.forEach((r) => set.add(r.category || 'Uncategorised'))
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [rows])

  // The three jobs of the journey, derived from the live rows. Claimed + rejected
  // are never actionable here.
  const journey = useMemo(() => {
    const active = rows.filter((r) => !r.claimed && r.stage !== 'rejected')
    return {
      enrich: active.filter((r) => r.enrichment?.status !== 'ready'),
      confirm: active.filter((r) => r.enrichment?.status === 'ready' && !r.enrichment.published),
      invite: active.filter((r) => !!r.enrichment?.published && !r.sentAt),
      sent: rows.filter((r) => !r.claimed && !!r.sentAt),
    }
  }, [rows])

  const journeyCounts = {
    enrich: journey.enrich.length,
    confirm: journey.confirm.length,
    invite: journey.invite.length,
    sent: journey.sent.length,
  }

  // Pick a sensible starting step the first time data lands: wherever there's work.
  useEffect(() => {
    if (initialStepSet.current || rows.length === 0) return
    initialStepSet.current = true
    if (journey.enrich.length > 0) setJourneyStep('enrich')
    else if (journey.confirm.length > 0) setJourneyStep('confirm')
    else if (journey.invite.length > 0) setJourneyStep('invite')
    else if (journey.sent.length > 0) setJourneyStep('sent')
  }, [
    rows.length,
    journey.enrich.length,
    journey.confirm.length,
    journey.invite.length,
    journey.sent.length,
  ])

  // Rows shown for the active step, optionally narrowed to one category.
  const stepRows = useMemo(() => {
    let base = journey[journeyStep]
    if (categoryFilter !== 'all') base = base.filter((r) => (r.category || 'Uncategorised') === categoryFilter)

    // Sent: newest invites first. Elsewhere: best-first so the strongest listings
    // (most signals / highest confidence) rise to the top.
    if (journeyStep === 'sent') {
      return [...base].sort((a, b) => {
        const ta = a.sentAt ? new Date(a.sentAt).getTime() : 0
        const tb = b.sentAt ? new Date(b.sentAt).getTime() : 0
        return tb - ta || a.name.localeCompare(b.name)
      })
    }

    const rank = (r: PipelineRow): number => {
      if (r.confidence != null) return r.confidence
      let s = 0
      if (r.hasWebsite) s += 25
      if (r.email) s += 15
      if (r.rating) s += 10
      return s
    }
    return [...base].sort((a, b) => rank(b) - rank(a) || a.name.localeCompare(b.name))
  }, [journey, journeyStep, categoryFilter])

  // Group the current step's rows into the 3 result buckets. Criteria are
  // step-aware: pre-enrich we can only judge raw signals; post-enrich we use the
  // real confidence score + whether we have a contact email.
  const buckets = useMemo(() => {
    const bucketOf = (r: PipelineRow): BucketKey => {
      if (journeyStep === 'enrich') {
        if (r.hasWebsite && r.email) return 'ready'
        if (r.hasWebsite) return 'no_email'
        return 'attention'
      }
      if (journeyStep === 'invite') {
        return r.email ? 'ready' : 'no_email'
      }
      if (journeyStep === 'sent') {
        const recipient = r.sentToEmail || r.email
        if (!recipient) return 'attention'
        if ((r.claimLinkClickCount || 0) > 0 || (r.demoLinkClickCount || 0) > 0) return 'ready'
        return 'no_email'
      }
      // confirm: "send-ready" needs a strong (high-confidence) draft AND an email.
      const strong = (r.confidence ?? 0) >= HIGH_CONFIDENCE
      if (strong && r.email) return 'ready'
      if (strong && !r.email) return 'no_email'
      return 'attention'
    }
    const b: Record<BucketKey, PipelineRow[]> = { ready: [], no_email: [], attention: [] }
    for (const r of stepRows) b[bucketOf(r)].push(r)
    return b
  }, [stepRows, journeyStep])

  // Recipients eligible for a bulk invite from a bucket: has an email, not already
  // sent, not claimed. Used to size the "send invites" buttons + the confirm modal.
  const sendableIn = (list: PipelineRow[]) => list.filter((r) => !!r.email && !r.sentAt && !r.claimed)

  const runBulkSend = async () => {
    if (!bulkRecipients || bulkRecipients.length === 0) return
    setBulkSending(true)
    try {
      const ids = bulkRecipients.map((r) => r.id)
      const res = await fetch('/api/admin/offer-engine/send-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessIds: ids }),
      })
      const data = await res.json().catch(() => ({}))
      const okIds = new Set<string>(
        (data.results || [])
          .filter((x: { ok: boolean }) => x.ok)
          .map((x: { businessId: string }) => x.businessId)
      )
      const now = new Date().toISOString()
      setRows((prev) =>
        prev.map((r) =>
          okIds.has(r.id)
            ? recomputeStage({
                ...r,
                sentAt: now,
                sentToEmail: r.email,
                enrichment: r.enrichment ? { ...r.enrichment, published: true } : r.enrichment,
              })
            : r
        )
      )
      const sent = typeof data.sent === 'number' ? data.sent : okIds.size
      setBulkSummary({ sent, total: ids.length, failed: ids.length - sent })
    } catch {
      setBulkSummary({ sent: 0, total: bulkRecipients.length, failed: bulkRecipients.length })
    } finally {
      setBulkSending(false)
      setBulkRecipients(null)
    }
  }

  const resetOutreach = (row: PipelineRow | null) => {
    setEmailValue(row?.email || '')
    setEmailSaved(!!row?.email)
    const candidates = row?.emailCandidates || []
    setFoundEmails(candidates)
    // Force an explicit choice only when there's genuine ambiguity (2+ candidates).
    setEmailPicked(candidates.length <= 1)
    setFindingEmail(false)
    setSavingEmail(false)
    setPreview(null)
    setPreviewing(false)
    setSending(false)
    // Restore prior send so reopening a Sent business shows "Invite sent ✓"
    // instead of the full compose UI again.
    setSentTo(row?.sentAt ? row.sentToEmail || row.email || 'recipient' : null)
    setOutreachError(null)
  }

  const goToAdjacent = (dir: -1 | 1) => {
    if (!drawer) return
    const idx = rows.findIndex((r) => r.id === drawer.id)
    if (idx === -1) return
    const next = rows[idx + dir]
    if (next) openDrawer(next)
  }

  const openDrawer = async (row: PipelineRow, initialStep: Step = 1) => {
    setDrawer(row)
    setStep(initialStep)
    setDrawerResult(null)
    setDrawerDecisions({})
    setDrawerError(null)
    setPublishError(null)
    setPublishedAt(row.enrichment?.published ? 'existing' : null)
    resetOutreach(row)
    if (row.enrichment?.status === 'ready') {
      setDrawerLoading(true)
      try {
        const res = await fetch(`/api/admin/offer-engine/enrichment?businessId=${row.id}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to load draft')
        setDrawerResult(data.enrichment?.draft || null)
        setDrawerDecisions(data.enrichment?.decisions || {})
        setDrawerEdits(data.enrichment?.edits || {})
        setPublishedAt(data.enrichment?.published_at || null)
        if (data.enrichment?.sent_at) {
          const to = data.enrichment.sent_to_email || row.email || 'recipient'
          setSentTo(to)
          patchRow(row.id, {
            sentAt: data.enrichment.sent_at,
            sentToEmail: data.enrichment.sent_to_email ?? row.email,
            claimLinkClickCount: data.enrichment.claim_link_click_count ?? 0,
            demoLinkClickCount: data.enrichment.demo_link_click_count ?? 0,
            claimLinkClickedAt: data.enrichment.claim_link_clicked_at ?? null,
            demoLinkClickedAt: data.enrichment.demo_link_clicked_at ?? null,
          })
        }
      } catch (e) {
        setDrawerError(e instanceof Error ? e.message : 'Failed to load draft')
      } finally {
        setDrawerLoading(false)
      }
    }
  }

  const publishListing = async () => {
    if (!drawer) return
    setPublishing(true)
    setPublishError(null)
    try {
      const res = await fetch('/api/admin/offer-engine/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: drawer.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Publish failed')
      setPublishedAt(data.publishedAt || new Date().toISOString())
      setRows((prev) =>
        prev.map((r) =>
          r.id === drawer.id && r.enrichment
            ? { ...r, enrichment: { ...r.enrichment, published: true } }
            : r
        )
      )
    } catch (e) {
      setPublishError(e instanceof Error ? e.message : 'Publish failed')
    } finally {
      setPublishing(false)
    }
  }

  // Launch Present Mode (prospecting demo) for a business in a new tab.
  // Mints a signed token server-side (gated on enrichment) then opens /demo/<token>
  // on the CURRENT host so it works in-person even on localhost / patchy signal.
  const presentBusinessById = async (businessId: string) => {
    setPresentingId(businessId)
    setPresentError(null)
    // Open a tab synchronously so mobile Safari doesn't block the async popup.
    const tab = typeof window !== 'undefined' ? window.open('', '_blank') : null
    try {
      const res = await fetch('/api/admin/offer-engine/present-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not start Present Mode')
      if (tab) tab.location.href = data.path
      else if (typeof window !== 'undefined') window.location.href = data.path
    } catch (e) {
      if (tab) tab.close()
      setPresentError(e instanceof Error ? e.message : 'Could not start Present Mode')
    } finally {
      setPresentingId(null)
    }
  }

  // One-click download: server renders /demo/<token>?pdf=1 in headless Chrome and
  // streams back a real PDF (looks exactly like the demo). Takes a few seconds.
  const downloadPdfById = async (businessId: string, name?: string | null) => {
    setPdfBusyId(businessId)
    setPresentError(null)
    try {
      const res = await fetch(
        `/api/admin/offer-engine/present-pdf?businessId=${encodeURIComponent(businessId)}`
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Could not generate PDF')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const safe = (name || 'Qwikker listing').replace(/[^\w\s-]/g, '').trim() || 'Qwikker listing'
      a.download = `${safe} - Qwikker.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch (e) {
      setPresentError(e instanceof Error ? e.message : 'Could not generate PDF')
    } finally {
      setPdfBusyId(null)
    }
  }

  const markRowPublished = (id: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id && r.enrichment ? { ...r, enrichment: { ...r.enrichment, published: true } } : r))
    )
  }

  // Confirm = publish the listing live. Per-card confirm straight from the board.
  const confirmRow = async (id: string) => {
    setConfirmingIds((prev) => new Set(prev).add(id))
    try {
      const res = await fetch('/api/admin/offer-engine/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: id }),
      })
      if (res.ok) markRowPublished(id)
    } catch {
      /* best-effort; a reload reconciles */
    } finally {
      setConfirmingIds((prev) => {
        const n = new Set(prev)
        n.delete(id)
        return n
      })
    }
  }

  // Ready, high-confidence, not-yet-published, unclaimed -> eligible for one-click bulk confirm.
  const confirmableHighConfidence = () =>
    rows.filter(
      (r) =>
        !r.claimed &&
        r.enrichment?.status === 'ready' &&
        !r.enrichment.published &&
        (r.confidence ?? 0) >= HIGH_CONFIDENCE
    )

  const confirmAllHighConfidence = async (explicitIds?: string[]) => {
    const ids = explicitIds ?? confirmableHighConfidence().map((r) => r.id)
    if (ids.length === 0) return
    setConfirmingAll(true)
    try {
      const res = await fetch('/api/admin/offer-engine/publish-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessIds: ids }),
      })
      const data = await res.json().catch(() => ({}))
      const okIds = new Set<string>(
        (data.results || []).filter((x: { ok: boolean }) => x.ok).map((x: { businessId: string }) => x.businessId)
      )
      setRows((prev) =>
        prev.map((r) => (okIds.has(r.id) && r.enrichment ? { ...r, enrichment: { ...r.enrichment, published: true } } : r))
      )
    } finally {
      setConfirmingAll(false)
    }
  }

  const closeDrawer = () => {
    setDrawer(null)
    setDrawerResult(null)
    resetOutreach(null)
  }

  const enrichFromDrawer = async () => {
    if (!drawer) return
    setDrawerLoading(true)
    setDrawerError(null)
    try {
      const res = await fetch('/api/admin/offer-engine/enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: drawer.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Enrich failed')
      setDrawerResult(data.result)
      setDrawerDecisions({})
      patchRow(drawer.id, {
        enrichment: {
          status: 'ready',
          offersCount: data.result?.offers?.length || 0,
          hasListing: !!data.result?.listing?.business_description?.value,
          generatedAt: new Date().toISOString(),
          published: !!publishedAt,
        },
        confidence: data.confidence ?? null,
        flags: data.flags ?? [],
        reviewAction: null,
        sentAt: null,
        email: data.savedEmail ?? null,
        emailCandidates: data.emailCandidates || [],
      })
      const candidates: string[] = data.emailCandidates || []
      // Refresh outreach state so step 3 is ready without re-scraping
      if (data.savedEmail) {
        setEmailValue(data.savedEmail)
        setEmailSaved(true)
      }
      if (candidates.length > 0) setFoundEmails(candidates)
      // Multiple candidates => make the admin pick before we preview/send.
      setEmailPicked(candidates.length <= 1)
    } catch (e) {
      setDrawerError(e instanceof Error ? e.message : 'Enrich failed')
    } finally {
      setDrawerLoading(false)
    }
  }

  const persistDecisions = (businessId: string, decisions: Record<string, ReviewStatus>) => {
    setDrawerDecisions(decisions)
    if (patchTimer.current) clearTimeout(patchTimer.current)
    patchTimer.current = setTimeout(() => {
      fetch('/api/admin/offer-engine/enrichment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, decisions }),
      }).catch(() => {})
    }, 500)
  }

  const persistEdits = (businessId: string, edits: Record<string, string>) => {
    setDrawerEdits(edits)
    if (editTimer.current) clearTimeout(editTimer.current)
    editTimer.current = setTimeout(() => {
      fetch('/api/admin/offer-engine/enrichment', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, edits }),
      }).catch(() => {})
    }, 600)
  }

  // ---- Outreach actions (step 3) ----
  const findEmail = async () => {
    if (!drawer) return
    setFindingEmail(true)
    setOutreachError(null)
    setFoundEmails([])
    try {
      const res = await fetch('/api/admin/find-business-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: drawer.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not search the website')
      const emails: string[] = data.emails || []
      setFoundEmails(emails)
      // A single hit can be used straight away; multiple hits require an explicit pick.
      if (emails.length === 1) {
        pickEmail(emails[0])
      } else if (emails.length > 1) {
        setEmailPicked(false)
      } else {
        setOutreachError('No email addresses found on the website.')
      }
    } catch (e) {
      setOutreachError(e instanceof Error ? e.message : 'Could not search the website')
    } finally {
      setFindingEmail(false)
    }
  }

  const pickEmail = (email: string) => {
    setEmailValue(email)
    setEmailSaved(false)
    setEmailPicked(true)
    setPreview(null)
  }

  const saveEmail = async () => {
    if (!drawer || !emailValue.trim()) return
    setSavingEmail(true)
    setOutreachError(null)
    try {
      const res = await fetch('/api/admin/offer-engine/set-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: drawer.id, email: emailValue.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not save email')
      setEmailSaved(true)
      setPreview(null)
      updateRowEmail(drawer.id, data.email)
    } catch (e) {
      setOutreachError(e instanceof Error ? e.message : 'Could not save email')
    } finally {
      setSavingEmail(false)
    }
  }

  const previewEmail = async () => {
    if (!drawer) return
    setPreviewing(true)
    setOutreachError(null)
    setPreview(null)
    try {
      const res = await fetch('/api/admin/send-claim-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: drawer.id, mode: 'preview' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not build preview')
      setPreview({ to: data.to, subject: data.subject, html: data.html })
    } catch (e) {
      setOutreachError(e instanceof Error ? e.message : 'Could not build preview')
    } finally {
      setPreviewing(false)
    }
  }

  const sendEmail = async () => {
    // Guarded, single explicit action: named recipient must be chosen (no bulk send).
    if (!drawer || !emailValue.trim() || !emailPicked) return
    setSending(true)
    setOutreachError(null)
    try {
      const res = await fetch('/api/admin/send-claim-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: drawer.id, mode: 'send' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send')
      setSentTo(data.to || emailValue)
      patchRow(drawer.id, {
        sentAt: new Date().toISOString(),
        sentToEmail: data.to || emailValue,
      })
    } catch (e) {
      setOutreachError(e instanceof Error ? e.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  // Auto-build the email preview as soon as the outreach step opens with a chosen
  // email on file — no manual "Preview" click needed.
  useEffect(() => {
    if (step !== 3 || !drawer || drawer.claimed || sentTo) return
    if (!emailSaved || !emailPicked || !emailValue.trim()) return
    if (preview || previewing) return
    previewEmail()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, drawer?.id, emailSaved, emailPicked, emailValue])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Campaign overview (KPIs) */}
        <CampaignOverview
          counts={counts}
          cityDisplayName={cityDisplayName}
          onEmailsSentClick={() => {
            setJourneyStep('sent')
            setSelected(new Set())
            setOpenBucket(null)
          }}
        />

        {/* Present Mode toggle — flips the whole tab into an in-person demo launcher */}
        <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2.5">
          <div>
            <p className="text-sm font-medium text-slate-200">{presentMode ? 'Present Mode' : 'Pipeline'}</p>
            <p className="text-xs text-slate-500">
              {presentMode
                ? 'Search an enriched business and open its full-screen demo to show in person.'
                : 'Import, enrich, confirm & invite. Flip to Present Mode for door-to-door demos.'}
            </p>
          </div>
          <button
            onClick={() => {
              setPresentMode((v) => !v)
              setOpenBucket(null)
              setPresentError(null)
            }}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              presentMode
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'border border-emerald-700 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/40'
            }`}
          >
            {presentMode ? '← Back to pipeline' : '▶ Present Mode'}
          </button>
        </div>

        {presentError && (
          <div className="rounded-lg border border-red-900 bg-red-950/50 text-red-300 px-4 py-3 text-sm">
            {presentError}
          </div>
        )}

        {presentMode && (
          <PresentPicker
            rows={rows}
            search={presentSearch}
            onSearch={setPresentSearch}
            presentingId={presentingId}
            onPresent={presentBusinessById}
            pdfBusyId={pdfBusyId}
            onDownloadPdf={downloadPdfById}
          />
        )}

        {!presentMode && (
        <>
        {/* Journey steps */}
        <JourneySteps
          step={journeyStep}
          counts={journeyCounts}
          onSelect={(s) => {
            setJourneyStep(s)
            setSelected(new Set())
            setOpenBucket(null)
          }}
        />

        {/* One quiet control row: focus a category + refresh */}
        <div className="flex items-center justify-end gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded px-2 py-2 max-w-[200px]"
            aria-label="Choose a category"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <Button variant="ghost" onClick={loadPipeline} disabled={loading} className="text-slate-400">
            {loading ? 'Refreshing…' : 'Refresh'}
          </Button>
        </div>

        {/* Slim progress strip while a batch enrich is running */}
        {batchRunning && batchProgress && (
          <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-300">
            Generating {batchProgress.done}/{batchProgress.total}…
          </div>
        )}

        {/* Batch completion banner (enrich) */}
        {batchSummary && journeyStep === 'enrich' && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-3 flex-wrap">
            <div className="text-sm text-emerald-200">
              <span className="font-semibold">Done — {batchSummary.done} of {batchSummary.total} enriched.</span>{' '}
              {batchSummary.failed > 0 && (
                <span className="text-amber-300">{batchSummary.failed} failed (check the website/keys).</span>
              )}{' '}
              Next: head to <span className="text-emerald-300 font-medium">Confirm &amp; publish</span>.
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button onClick={() => { setJourneyStep('confirm'); setBatchSummary(null) }}>Go to Confirm</Button>
              <button
                onClick={() => setBatchSummary(null)}
                className="text-emerald-300/70 hover:text-emerald-200 text-sm px-2"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Bulk-send completion banner */}
        {bulkSummary && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-3 flex-wrap">
            <div className="text-sm text-emerald-200">
              <span className="font-semibold">
                Sent {bulkSummary.sent} of {bulkSummary.total} claim invite{bulkSummary.total !== 1 ? 's' : ''}.
              </span>{' '}
              {bulkSummary.failed > 0 && (
                <span className="text-amber-300">{bulkSummary.failed} couldn’t send (check the email/keys).</span>
              )}
            </div>
            <button
              onClick={() => setBulkSummary(null)}
              className="text-emerald-300/70 hover:text-emerald-200 text-sm px-2"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-900 bg-red-950/50 text-red-300 px-4 py-3 text-sm">{error}</div>
        )}

        {/* Grid for the current step */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 animate-pulse">Loading…</div>
        ) : stepRows.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            {categoryFilter !== 'all' ? (
              <>
                Nothing in this category.{' '}
                <button className="underline hover:text-slate-300" onClick={() => setCategoryFilter('all')}>
                  Show all categories
                </button>
              </>
            ) : journeyStep === 'enrich' ? (
              'Nothing to enrich — every unclaimed business already has AI content. Nice!'
            ) : journeyStep === 'confirm' ? (
              'No drafts waiting. Enrich some businesses first, or you\u2019ve confirmed them all.'
            ) : journeyStep === 'sent' ? (
              'No claim invites sent yet. Send from Invite, then they show up here with click tracking.'
            ) : (
              'No live listings waiting for an invite yet. Confirm some listings first.'
            )}
          </div>
        ) : openBucket ? (
          /* Expanded bucket — full-width list with a bulk-action bar */
          (() => {
            const list = buckets[openBucket]
            const meta = BUCKET_META[journeyStep][openBucket]
            const sendable = sendableIn(list)
            const publishable = list.filter((r) => r.enrichment?.status === 'ready' && !r.enrichment.published)
            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <button
                    onClick={() => setOpenBucket(null)}
                    className="text-sm text-slate-400 hover:text-slate-200"
                  >
                    ← Back to groups
                  </button>
                  <span className="text-sm text-slate-300 font-medium">
                    {meta.label} · {list.length}
                  </span>
                </div>

                {/* Bulk actions for the whole group */}
                <div className="flex items-center justify-end gap-2 flex-wrap">
                  {journeyStep === 'enrich' &&
                    list.length > 0 &&
                    (() => {
                      const selInList = list.filter((r) => selected.has(r.id))
                      return (
                        <Button
                          onClick={() => runEnrich((selInList.length > 0 ? selInList : list).map((r) => r.id))}
                          disabled={batchRunning}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          {batchRunning
                            ? 'Generating…'
                            : selInList.length > 0
                              ? `Generate ${selInList.length} selected`
                              : `Generate all (${list.length})`}
                        </Button>
                      )
                    })()}
                  {journeyStep === 'confirm' && publishable.length > 0 && (
                    <Button
                      variant="secondary"
                      onClick={() => confirmAllHighConfidence(publishable.map((r) => r.id))}
                      disabled={confirmingAll}
                      title="Publishes each listing live AND makes the business + its featured menu items discoverable by the Qwikker AI."
                    >
                      {confirmingAll ? 'Confirming…' : `Confirm & publish all (${publishable.length})`}
                    </Button>
                  )}
                  {(journeyStep === 'confirm' || journeyStep === 'invite') &&
                    openBucket === 'ready' &&
                    sendable.length > 0 && (
                      <Button
                        onClick={() => setBulkRecipients(sendable)}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {journeyStep === 'confirm'
                          ? `Confirm & send invites (${sendable.length})`
                          : `Send invites (${sendable.length})`}
                      </Button>
                    )}
                </div>

                {list.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">Nothing in this group right now.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {list.map((row) => (
                      <BusinessCard
                        key={row.id}
                        row={row}
                        mode={journeyStep}
                        selected={selected.has(row.id)}
                        onToggleSelect={toggleSelect}
                        onOpen={openDrawer}
                        isEnriching={enrichingIds.has(row.id)}
                        onEnrichOne={(id) => runEnrich([id])}
                        onConfirm={confirmRow}
                        onReject={(id) => applyReview([id], 'rejected')}
                        onInvite={(r) => openDrawer(r, 3)}
                        confirming={confirmingIds.has(row.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })()
        ) : (
          /* The 3 result buckets for the active step */
          <div className="space-y-3">
            {BUCKET_ORDER.map((key) => {
              const list = buckets[key]
              if (list.length === 0) return null
              const meta = BUCKET_META[journeyStep][key]
              const tone = BUCKET_TONE[meta.tone]
              return (
                <button
                  key={key}
                  onClick={() => setOpenBucket(key)}
                  className={`w-full text-left rounded-xl border p-4 transition-colors hover:brightness-110 ${tone.border}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${tone.dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-100">{meta.label}</h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-200 tabular-nums">
                          {list.length}
                        </span>
                      </div>
                      <p className="text-sm text-slate-400 mt-0.5">{meta.desc}</p>
                    </div>
                    <span className="text-slate-500 text-lg shrink-0" aria-hidden>
                      ›
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        )}
        </>
        )}
      </div>

      {/* Full-width review (fills the tab; the admin sidebar stays visible) */}
      {drawer && (
        <div className="fixed inset-0 z-50 bg-slate-950 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-4 sm:p-6 md:p-8">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-bold text-slate-100">{drawer.name}</h2>
                  {/* Present Mode: only meaningful once enriched (needs the draft to be worth showing) */}
                  {!drawer.claimed && drawerResult && (
                    <>
                      <button
                        onClick={() => presentBusinessById(drawer.id)}
                        disabled={presentingId === drawer.id}
                        title="Open a personalised, full-screen demo of this listing to show the owner in person. Claim happens through the normal claim flow."
                        className="inline-flex items-center gap-1.5 rounded-md border border-emerald-700 bg-emerald-950/40 px-2.5 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-900/40 disabled:opacity-50"
                      >
                        {presentingId === drawer.id ? 'Opening…' : '▶ Present'}
                      </button>
                      <button
                        onClick={() => downloadPdfById(drawer.id, drawer.name)}
                        disabled={pdfBusyId === drawer.id}
                        title="Generate and download this demo as a PDF (looks exactly like the live demo)."
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1 text-xs font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                      >
                        {pdfBusyId === drawer.id ? 'Generating…' : '⬇ PDF'}
                      </button>
                    </>
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  {[drawer.town, drawer.category, drawer.claimed ? 'Claimed' : 'Unclaimed'].filter(Boolean).join(' · ')}
                </p>
                {presentError && <p className="text-xs text-red-400 mt-1">{presentError}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {(() => {
                  const idx = rows.findIndex((r) => r.id === drawer.id)
                  return (
                    <>
                      <button
                        onClick={() => goToAdjacent(-1)}
                        disabled={idx <= 0}
                        className="text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm px-2 py-1"
                        aria-label="Previous business"
                      >
                        ‹
                      </button>
                      <span className="text-xs text-slate-500 tabular-nums">
                        {idx + 1}/{rows.length}
                      </span>
                      <button
                        onClick={() => goToAdjacent(1)}
                        disabled={idx === -1 || idx >= rows.length - 1}
                        className="text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-sm px-2 py-1"
                        aria-label="Next business"
                      >
                        ›
                      </button>
                      <button onClick={closeDrawer} className="text-slate-400 hover:text-slate-100 text-sm px-2 py-1 ml-1">
                        Close ✕
                      </button>
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Stepper */}
            <div className="flex items-center gap-2 mb-5">
              {([
                { n: 1 as Step, label: 'Listing' },
                { n: 2 as Step, label: 'Offers' },
                { n: 3 as Step, label: 'Outreach' },
              ]).map((s, i) => (
                <div key={s.n} className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => setStep(s.n)}
                    className={`flex items-center gap-2 text-sm font-medium ${
                      step === s.n ? 'text-emerald-400' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${
                        step === s.n
                          ? 'border-emerald-500 bg-emerald-950 text-emerald-300'
                          : 'border-slate-700 text-slate-400'
                      }`}
                    >
                      {s.n}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                  {i < 2 && <div className="flex-1 h-px bg-slate-800" />}
                </div>
              ))}
            </div>

            {/* Confirm bar — Confirm = publish the listing live; offers held for claim */}
            {!drawerLoading && drawerResult && !drawer.claimed && (
              <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-3 mb-4">
                {publishedAt ? (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm text-emerald-300">
                      ✓ Confirmed — the listing is <span className="font-semibold">live</span> on the public profile
                      and <span className="font-semibold">discoverable by the Qwikker AI</span>.
                    </p>
                    <div className="flex items-center gap-2">
                      {step !== 3 &&
                        (drawer.sentAt || sentTo ? (
                          <Button
                            variant="secondary"
                            onClick={() => setStep(3)}
                            className="border-sky-700 text-sky-300"
                          >
                            Invite sent ✓
                          </Button>
                        ) : (
                          <Button onClick={() => setStep(3)} className="bg-emerald-600 hover:bg-emerald-700">
                            Send claim invite →
                          </Button>
                        ))}
                      <Button variant="secondary" onClick={publishListing} disabled={publishing}>
                        {publishing ? 'Updating…' : 'Re-publish'}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-sm text-slate-300">
                      <span className="font-semibold text-slate-100">Confirm</span> to publish the accepted listing
                      (description, tagline &amp; featured items) live now.{' '}
                      <span className="text-emerald-400/90">This also makes the business &amp; its featured menu items discoverable by the Qwikker AI.</span>{' '}
                      <span className="text-slate-500">Offers stay as drafts for the owner to approve at claim.</span>
                    </p>
                    <Button
                      onClick={publishListing}
                      disabled={publishing}
                      title="Publishes the listing live AND makes the business + its featured menu items discoverable by the Qwikker AI."
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      {publishing ? 'Confirming…' : 'Confirm & publish live'}
                    </Button>
                  </div>
                )}
                {publishError && <p className="text-xs text-red-400 mt-2">{publishError}</p>}
              </div>
            )}

            {drawerError && (
              <div className="rounded-lg border border-red-900 bg-red-950/50 text-red-300 px-4 py-3 text-sm mb-4">
                {drawerError}
              </div>
            )}

            {drawerLoading && <div className="py-8 text-center text-slate-400 animate-pulse">Working…</div>}

            {/* Steps 1 & 2: listing / offers review */}
            {!drawerLoading && (step === 1 || step === 2) && (
              <>
                {!drawerResult ? (
                  <div className="py-8 text-center space-y-4">
                    <p className="text-slate-400">This business hasn&apos;t been enriched yet.</p>
                    <Button onClick={enrichFromDrawer}>Enrich now</Button>
                    <p className="text-xs text-slate-600">
                      You can still go to <button className="underline" onClick={() => setStep(3)}>Outreach</button> to send
                      a claim invite without a draft.
                    </p>
                  </div>
                ) : (
                  <AcquisitionDraftReview
                    key={`${drawer.id}-${step}`}
                    result={drawerResult}
                    section={step === 1 ? 'listing' : 'offers'}
                    initialDecisions={drawerDecisions}
                    onDecisionsChange={(d) => persistDecisions(drawer.id, d)}
                    initialEdits={drawerEdits}
                    onEditsChange={(e) => persistEdits(drawer.id, e)}
                  />
                )}
              </>
            )}

            {/* Step 3: outreach */}
            {!drawerLoading && step === 3 && (
              <OutreachStep
                claimed={drawer.claimed}
                hasWebsite={drawer.hasWebsite}
                businessId={drawer.id}
                businessName={drawer.name}
                city={drawer.city}
                whatsapp={drawer.whatsapp ?? null}
                whatsappVerified={drawer.whatsappVerified ?? false}
                phone={drawer.phone ?? null}
                dialCode={drawer.dialCode}
                emailValue={emailValue}
                setEmailValue={(v) => {
                  setEmailValue(v)
                  setEmailSaved(false)
                  setEmailPicked(true)
                  setPreview(null)
                }}
                emailSaved={emailSaved}
                emailPicked={emailPicked}
                foundEmails={foundEmails}
                findingEmail={findingEmail}
                onFind={findEmail}
                onPick={pickEmail}
                savingEmail={savingEmail}
                onSave={saveEmail}
                preview={preview}
                previewing={previewing}
                onPreview={previewEmail}
                sending={sending}
                onSend={sendEmail}
                sentTo={sentTo}
                outreachError={outreachError}
              />
            )}

            {/* Step nav */}
            {!drawerLoading && (
              <div className="flex items-center justify-between gap-3 border-t border-slate-800 mt-6 pt-4">
                <Button
                  variant="secondary"
                  onClick={() => setStep((s) => (s > 1 ? ((s - 1) as Step) : s))}
                  disabled={step === 1}
                >
                  Back
                </Button>
                {step < 3 ? (
                  <Button onClick={() => setStep((s) => ((s + 1) as Step))}>
                    Next: {step === 1 ? 'Offers' : 'Outreach'}
                  </Button>
                ) : (
                  <Button variant="secondary" onClick={closeDrawer}>
                    Done
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Gated bulk send — lists every recipient before anything goes out */}
      {bulkRecipients && (
        <BulkSendModal
          recipients={bulkRecipients}
          sending={bulkSending}
          onCancel={() => (bulkSending ? undefined : setBulkRecipients(null))}
          onConfirm={runBulkSend}
        />
      )}
    </div>
  )
}

/**
 * In-person launcher. Flips the tab into a search over ENRICHED businesses
 * (a draft is required — Present Mode needs it to be worth showing) and renders
 * each as a listing card with a big PRESENT button that opens /demo/<token>.
 */
function PresentPicker({
  rows,
  search,
  onSearch,
  presentingId,
  onPresent,
  pdfBusyId,
  onDownloadPdf,
}: {
  rows: PipelineRow[]
  search: string
  onSearch: (v: string) => void
  presentingId: string | null
  onPresent: (id: string) => void
  pdfBusyId: string | null
  onDownloadPdf: (id: string, name?: string | null) => void
}) {
  // Eligible = enriched (draft ready) and not yet claimed.
  const eligible = rows.filter((r) => !r.claimed && r.enrichment?.status === 'ready')
  const q = search.trim().toLowerCase()
  const list = q
    ? eligible.filter((r) =>
        [r.name, r.town, r.category].filter(Boolean).some((f) => String(f).toLowerCase().includes(q))
      )
    : eligible

  return (
    <div className="space-y-4">
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Search an enriched business to present…"
        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-emerald-600 focus:outline-none"
      />

      {eligible.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 py-12 text-center text-sm text-slate-500">
          No enriched businesses yet. Enrich a business first — Present Mode needs its AI draft
          (description, dishes &amp; offers) to be worth showing.
        </div>
      ) : list.length === 0 ? (
        <div className="py-10 text-center text-slate-500">No matches for “{search}”.</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {list.map((r) => (
            <div key={r.id} className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-slate-100">{r.name}</h3>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {[r.town, r.category].filter(Boolean).join(' · ') || 'Local business'}
                  </p>
                </div>
                {r.rating != null && (
                  <span className="shrink-0 rounded-full bg-slate-800 px-2 py-0.5 text-xs font-medium text-amber-300">
                    ★ {r.rating.toFixed(1)}
                    {r.reviewCount != null ? ` (${r.reviewCount})` : ''}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                {r.enrichment?.published && (
                  <span className="rounded-full bg-emerald-950/60 px-2 py-0.5 text-emerald-300">Published</span>
                )}
                {r.enrichment?.offersCount ? (
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">
                    {r.enrichment.offersCount} offer{r.enrichment.offersCount !== 1 ? 's' : ''}
                  </span>
                ) : null}
                {r.hasWebsite && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-300">Website</span>}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => onPresent(r.id)}
                  disabled={presentingId === r.id}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
                >
                  {presentingId === r.id ? 'Opening…' : '▶ Present'}
                </button>
                <button
                  onClick={() => onDownloadPdf(r.id, r.name)}
                  disabled={pdfBusyId === r.id}
                  title="Generate and download this demo as a PDF (looks exactly like the live demo)."
                  className="shrink-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800 disabled:opacity-60"
                >
                  {pdfBusyId === r.id ? '…' : '⬇ PDF'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BulkSendModal({
  recipients,
  sending,
  onCancel,
  onConfirm,
}: {
  recipients: PipelineRow[]
  sending: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="relative w-full max-w-lg bg-slate-950 border border-slate-800 rounded-xl shadow-xl max-h-[85vh] flex flex-col">
        <div className="p-5 border-b border-slate-800">
          <h2 className="text-lg font-bold text-slate-100">
            Send {recipients.length} claim invite{recipients.length !== 1 ? 's' : ''}?
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Each listing is published live, then a personalised claim email is sent to the address below.
            Businesses already invited are skipped. This can’t be undone.
          </p>
        </div>

        <div className="overflow-y-auto p-4 space-y-1.5">
          {recipients.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2"
            >
              <span className="text-sm text-slate-200 truncate">{r.name}</span>
              <span className="text-xs text-slate-400 truncate shrink-0 max-w-[55%]">{r.email}</span>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={sending} className="bg-emerald-600 hover:bg-emerald-700">
            {sending ? 'Sending…' : `Send ${recipients.length} invite${recipients.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Short, warm WhatsApp opener — casual/brief, with a real one-tap claim link. */
function defaultWhatsappMessage(name: string, city: string | null, claimUrl: string): string {
  const place = city ? `Qwikker ${city.charAt(0).toUpperCase()}${city.slice(1)}` : 'Qwikker'
  return (
    `Hi 👋 This is ${place} — the local discovery app people here use to find great places to eat, drink & visit.\n\n` +
    `I've just added ${name} to Qwikker. Your listing is already LIVE and can be claimed for FREE. Claiming lets you:\n` +
    `✅ Add offers\n` +
    `✅ Edit your info\n` +
    `✅ Appear in AI recommendations\n` +
    `✅ Set up loyalty rewards\n\n` +
    (claimUrl ? `Claim it here (takes 2 mins):\n${claimUrl}` : `Want the link to claim it (free)? 🙌`)
  )
}

/** Display a WhatsApp number in a readable international form (e.g. +447911123456). */
function formatWaNumber(raw: string, dialCode?: string): string {
  const norm = normalizeWhatsappNumber(raw, dialCode)
  return norm ? `+${norm}` : raw
}

function OutreachStep(props: {
  claimed: boolean
  hasWebsite: boolean
  businessId: string
  businessName: string
  city: string | null
  whatsapp: string | null
  whatsappVerified: boolean
  phone: string | null
  dialCode?: string
  emailValue: string
  setEmailValue: (v: string) => void
  emailSaved: boolean
  emailPicked: boolean
  foundEmails: string[]
  findingEmail: boolean
  onFind: () => void
  onPick: (email: string) => void
  savingEmail: boolean
  onSave: () => void
  preview: { to: string; subject: string; html: string } | null
  previewing: boolean
  onPreview: () => void
  sending: boolean
  onSend: () => void
  sentTo: string | null
  outreachError: string | null
}) {
  const {
    claimed, hasWebsite, businessId, businessName, city, whatsapp, whatsappVerified, dialCode,
    emailValue, setEmailValue, emailSaved, emailPicked, foundEmails, findingEmail, onFind, onPick,
    savingEmail, onSave, preview, previewing, onPreview, sending, onSend, sentTo, outreachError,
  } = props

  // Local toggle to reveal the raw email editor ("wrong address? edit").
  const [editing, setEditing] = useState(false)

  // WhatsApp outreach: a click-to-chat link with a pre-filled, editable message the
  // franchise sends by hand (compliant — no WhatsApp Business API / cold-send needed).
  // We ONLY use a real WhatsApp number here (explicit wa.me link or a mobile scraped
  // from the site) — never a landline or the generic Google number, which aren't on
  // WhatsApp and would open a dead chat.
  const waNumberRaw = whatsapp
  const waNumberDisplay = waNumberRaw ? formatWaNumber(waNumberRaw, dialCode) : null
  // Claim link must point at the LIVE franchise subdomain (e.g. bournemouth.qwikker.com),
  // never window.location.origin — the admin often runs on localhost or an admin host,
  // and this URL is sent to a real business.
  const claimUrl = `${getFranchisePublicUrl(city || '')}/claim?business_id=${businessId}`
  const [waMessage, setWaMessage] = useState(() => defaultWhatsappMessage(businessName, city, claimUrl))
  // The message is collapsed by default — the number is the headline; open to edit.
  const [waMessageOpen, setWaMessageOpen] = useState(false)
  const waLink = waNumberRaw ? buildWhatsappLink(waNumberRaw, waMessage, dialCode) : null
  const hasEmailOnFile = !!emailValue.trim() || foundEmails.length > 0

  if (claimed) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900 px-4 py-6 text-center text-slate-400 text-sm">
        This business is already claimed — no claim invite needed.
      </div>
    )
  }

  if (sentTo) {
    return (
      <div className="rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-6 text-center space-y-1">
        <p className="text-emerald-300 font-semibold">Claim invite sent ✓</p>
        <p className="text-xs text-slate-400">Delivered to {sentTo}</p>
      </div>
    )
  }

  // Explicit choice required: 2+ emails found and none picked yet.
  const needsChoice = foundEmails.length > 1 && !emailPicked
  const readyToSend = emailSaved && emailPicked && !!emailValue.trim()

  return (
    <div className="space-y-5">
      {outreachError && (
        <div className="rounded-lg border border-red-900 bg-red-950/50 text-red-300 px-4 py-3 text-sm">
          {outreachError}
        </div>
      )}

      {/* Multiple emails found — must pick one before we preview/send */}
      {needsChoice && (
        <div className="rounded-lg border border-amber-800 bg-amber-950/30 px-4 py-3 space-y-2">
          <p className="text-sm text-amber-200 font-medium">
            We found {foundEmails.length} email addresses — which one should we invite?
          </p>
          <div className="flex flex-col gap-2">
            {foundEmails.map((e) => (
              <button
                key={e}
                onClick={() => onPick(e)}
                className="text-left text-sm px-3 py-2 rounded border border-slate-700 text-slate-200 hover:border-emerald-600 hover:bg-emerald-950/30"
              >
                {e}
              </button>
            ))}
          </div>
          <button
            className="text-xs text-slate-400 underline hover:text-slate-300"
            onClick={() => { setEditing(true); onPick('') }}
          >
            None of these — type a different address
          </button>
        </div>
      )}

      {/* Contact email: compact when settled, editable on demand */}
      {!needsChoice && (
        <div className="space-y-2">
          {readyToSend && !editing ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
              <div className="min-w-0">
                <p className="text-xs text-slate-500">Claim invite will go to</p>
                <p className="text-sm text-slate-100 truncate">{emailValue}</p>
              </div>
              <button
                className="text-xs text-blue-400 hover:text-blue-300 shrink-0"
                onClick={() => setEditing(true)}
              >
                wrong address? edit
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Contact email</label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                  placeholder="owner@business.com"
                  className="bg-slate-900 border-slate-700 text-slate-100 flex-1"
                />
                <Button
                  variant="secondary"
                  onClick={() => { onSave(); setEditing(false) }}
                  disabled={!emailValue.trim() || savingEmail || (emailSaved && emailPicked)}
                >
                  {savingEmail ? 'Saving…' : emailSaved && emailPicked ? 'Saved ✓' : 'Save'}
                </Button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="ghost"
                  className="text-xs text-blue-400 hover:text-blue-300 px-0 h-auto"
                  onClick={onFind}
                  disabled={!hasWebsite || findingEmail}
                >
                  {findingEmail ? 'Searching website…' : 'Find email from website'}
                </Button>
                {!hasWebsite && <span className="text-xs text-slate-600">(no website on file)</span>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* WhatsApp outreach — ideal for door-to-door and when there's no email.
          A click-to-chat link opens WhatsApp with a pre-filled, editable message;
          the franchise taps send. Nothing is ever messaged automatically. */}
      <div className={`rounded-lg border px-4 py-3 space-y-3 ${!hasEmailOnFile ? 'border-emerald-800 bg-emerald-950/30' : 'border-slate-800 bg-slate-900'}`}>
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-sm font-medium text-slate-200">
            {!hasEmailOnFile ? 'No email? Message them on WhatsApp' : 'Or reach them on WhatsApp'}
          </p>
        </div>

        {waLink ? (
          <>
            {/* Headline: the number we'll message + how confident we are it's WhatsApp. */}
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-slate-500">WhatsApp number</p>
                <p className="text-sm font-semibold text-slate-100 tabular-nums truncate">{waNumberDisplay}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {whatsappVerified
                    ? '✓ Explicit WhatsApp link on their site'
                    : 'Mobile from their site — likely on WhatsApp, confirm before sending'}
                </p>
              </div>
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 shrink-0"
              >
                <MessageCircle className="w-4 h-4" />
                Open WhatsApp
              </a>
            </div>

            {/* Message is collapsed by default — expand to review/edit before sending. */}
            <button
              type="button"
              onClick={() => setWaMessageOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
            >
              {waMessageOpen ? '▾ Hide message' : '▸ Preview / edit message'}
            </button>
            {waMessageOpen && (
              <>
                <textarea
                  value={waMessage}
                  onChange={(e) => setWaMessage(e.target.value)}
                  rows={6}
                  className="w-full text-sm rounded-md bg-slate-950 border border-slate-700 text-slate-100 p-3 resize-y focus:outline-none focus:ring-1 focus:ring-emerald-600"
                />
                <p className="text-xs text-slate-500">
                  Opens WhatsApp with the message pre-filled — you tap send. Qwikker never messages anyone automatically.
                </p>
              </>
            )}
          </>
        ) : (
          <p className="text-xs text-slate-500">
            No WhatsApp number found yet. We only use an explicit WhatsApp link or a mobile scraped from their site — never a
            landline or the Google number. Enrich this business to search their site for one.
          </p>
        )}
      </div>

      {/* Auto-built preview + single guarded send */}
      {readyToSend && (
        <div className="space-y-3">
          {previewing && <p className="text-xs text-slate-500 animate-pulse">Building preview…</p>}
          {!preview && !previewing && (
            <Button variant="secondary" onClick={onPreview}>Show preview</Button>
          )}
          {preview && (
            <div className="rounded-lg border border-slate-800 overflow-hidden">
              <div className="bg-slate-900 px-4 py-2 text-xs text-slate-400 border-b border-slate-800">
                <div>To: <span className="text-slate-200">{preview.to}</span></div>
                <div>Subject: <span className="text-slate-200">{preview.subject}</span></div>
              </div>
              <iframe
                srcDoc={preview.html}
                title="Email preview"
                className="w-full bg-white"
                style={{ height: 680 }}
              />
            </div>
          )}

          {/* The button naming the recipient IS the confirmation — one explicit, per-business action */}
          <div className="space-y-1">
            <Button
              onClick={onSend}
              disabled={sending || !readyToSend}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
            >
              {sending ? 'Sending…' : `Send claim invite to ${emailValue}`}
            </Button>
            <p className="text-xs text-slate-500">
              One email, to this business only. There is no bulk-send here.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
