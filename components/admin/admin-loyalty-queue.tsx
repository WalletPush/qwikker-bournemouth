'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { STAMP_ICONS } from '@/lib/loyalty/loyalty-utils'
import type { StampIconKey } from '@/lib/loyalty/loyalty-utils'
import { LoyaltyCardPreview, toLoyaltyCardPreviewProps } from '@/components/loyalty/loyalty-card-preview'
import {
  ExternalLink, Copy, Loader2, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, Image as ImageIcon, Download,
  Users, Play, Pause,
} from 'lucide-react'

interface AdminLoyaltyQueueProps {
  city: string
}

interface LoyaltyRequest {
  id: string
  business_id: string
  design_spec_json: any
  status: string
  created_at: string
  business_profiles?: {
    id: string
    business_name: string
    city: string
    logo: string | null
  }
}

interface ActiveProgram {
  id: string
  business_id: string
  public_id: string
  program_name: string | null
  type: string
  reward_threshold: number
  reward_description: string
  stamp_label: string
  stamp_icon: string
  earn_instructions: string | null
  earn_mode: string
  primary_color: string | null
  background_color: string | null
  logo_url: string | null
  strip_image_url: string | null
  status: string
  city: string
  created_at: string
  member_count: number
  business_profiles?: {
    id: string
    business_name: string
    logo: string | null
    city: string
  }
}

export function AdminLoyaltyQueue({ city }: AdminLoyaltyQueueProps) {
  const [requests, setRequests] = useState<LoyaltyRequest[]>([])
  const [activePrograms, setActivePrograms] = useState<ActiveProgram[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isProgramsLoading, setIsProgramsLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<Record<string, {
    walletpush_template_id: string
    walletpush_api_key: string
    walletpush_pass_type_id: string
  }>>({})
  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [queueRes, programsRes] = await Promise.all([
          fetch('/api/admin/loyalty/queue'),
          fetch('/api/admin/loyalty/programs'),
        ])
        if (queueRes.ok) {
          const data = await queueRes.json()
          setRequests(data.requests || [])
        }
        if (programsRes.ok) {
          const data = await programsRes.json()
          setActivePrograms(data.programs || [])
        }
      } catch (err) {
        console.error('Failed to load loyalty data:', err)
      } finally {
        setIsLoading(false)
        setIsProgramsLoading(false)
      }
    }
    load()
  }, [])

  const updateCredential = useCallback((
    requestId: string,
    field: 'walletpush_template_id' | 'walletpush_api_key' | 'walletpush_pass_type_id',
    value: string
  ) => {
    setCredentials((prev) => ({
      ...prev,
      [requestId]: { ...prev[requestId], [field]: value },
    }))
  }, [])

  const handleActivate = useCallback(async (requestId: string) => {
    const creds = credentials[requestId]
    if (!creds?.walletpush_template_id || !creds?.walletpush_api_key || !creds?.walletpush_pass_type_id) {
      alert('All three WalletPush credential fields are required.')
      return
    }

    setActivatingId(requestId)
    try {
      const res = await fetch('/api/admin/loyalty/request/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, ...creds }),
      })
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId))
      } else {
        const data = await res.json()
        alert(data.error || 'Activation failed')
      }
    } catch {
      alert('Activation failed')
    } finally {
      setActivatingId(null)
    }
  }, [credentials])

  const handleReject = useCallback(async (requestId: string) => {
    setRejectingId(requestId)
    try {
      const res = await fetch('/api/admin/loyalty/request/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, reason: rejectReason }),
      })
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId))
      }
    } catch {} finally {
      setRejectingId(null)
      setRejectReason('')
    }
  }, [rejectReason])

  const copySpecs = useCallback((spec: any) => {
    navigator.clipboard.writeText(JSON.stringify(spec, null, 2))
  }, [])

  const handleToggleStatus = useCallback(async (programId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active'
    const confirmMsg = newStatus === 'paused'
      ? 'Pausing will stop all earns and redemptions. Existing memberships are preserved. Continue?'
      : 'Resume this program? Users will be able to earn and redeem again.'
    if (!confirm(confirmMsg)) return

    setTogglingId(programId)
    try {
      const res = await fetch('/api/admin/loyalty/program/status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ programId, status: newStatus }),
      })
      if (res.ok) {
        setActivePrograms((prev) =>
          prev.map((p) => (p.id === programId ? { ...p, status: newStatus } : p))
        )
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to update status')
      }
    } catch {
      alert('Failed to update status')
    } finally {
      setTogglingId(null)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-10">
      {/* ── Pending Requests ── */}
      <section>
        <h3 className="text-white font-semibold text-lg mb-4">
          Pending Requests
          {requests.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded-full">
              {requests.length}
            </span>
          )}
        </h3>

        {requests.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-10 text-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">No pending loyalty requests. All clear.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-slate-400">
              {requests.length} pending request{requests.length !== 1 ? 's' : ''}
            </p>

      {requests.map((request) => {
        const spec = request.design_spec_json || {}
        const brand = spec.brand || {}
        const copy = spec.copy || spec
        const rules = spec.rules || spec
        const business = request.business_profiles
        const isExpanded = expandedId === request.id
        const creds = credentials[request.id] || {}
        const stampIconLabel = STAMP_ICONS[copy.stampIcon as StampIconKey]?.label || copy.stampIcon || copy.stamp_icon

        return (
          <Card key={request.id} className="bg-slate-800/50 border-slate-700 overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {business?.logo && (
                    <img src={business.logo} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-700" />
                  )}
                  <div>
                    <CardTitle className="text-white text-base">
                      {business?.business_name || 'Unknown Business'}
                    </CardTitle>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {business?.city || city} &middot; Submitted {new Date(request.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="https://www.walletpush.io/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-medium rounded-lg border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Open WalletPush
                  </a>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copySpecs(spec)}
                    className="border-slate-600 text-slate-400 hover:bg-slate-700 text-xs"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy Specs
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Card preview */}
              <LoyaltyCardPreview
                {...toLoyaltyCardPreviewProps({
                  ...copy,
                  ...rules,
                  ...brand,
                  business_name: business?.business_name,
                })}
              />

              {/* Key specs grid */}
              <div className="grid grid-cols-3 gap-3 text-sm">
                <SpecField label="Program" value={copy.programName || copy.program_name} />
                <SpecField label="Type" value={rules.type || copy.type} />
                <SpecField label="Earn Mode" value={rules.earnMode || copy.earn_mode} />
                <SpecField label="Reward" value={copy.rewardDescription || copy.reward_description} />
                <SpecField label="Threshold" value={`${rules.threshold || copy.reward_threshold}`} />
                <SpecField label="Stamp Icon" value={stampIconLabel} />
                <SpecField label="Max/Day" value={`${rules.maxEarnsPerDay || copy.max_earns_per_day}`} />
                <SpecField label="Gap" value={`${rules.minGapMinutes || copy.min_gap_minutes || 0} min`} />
                <SpecField label="Timezone" value={rules.timezone || copy.timezone} />
              </div>

              {/* Colours */}
              <div className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded border border-slate-600"
                  style={{ backgroundColor: brand.primaryColor || copy.primary_color || '#00d083' }}
                  title="Primary"
                />
                <div
                  className="w-6 h-6 rounded border border-slate-600"
                  style={{ backgroundColor: brand.backgroundColor || copy.background_color || '#0b0f14' }}
                  title="Background"
                />
                <span className="text-xs text-slate-500">
                  Primary: {brand.primaryColor || copy.primary_color} / BG: {brand.backgroundColor || copy.background_color}
                </span>
              </div>

              {/* Assets */}
              <div className="flex flex-wrap gap-4 text-xs">
                {(brand.logoUrl || copy.logo_url) ? (
                  <span className="flex items-center gap-2">
                    <a href={brand.logoUrl || copy.logo_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300">
                      <ImageIcon className="w-3 h-3" />
                      View Logo
                    </a>
                    <a
                      href={(brand.logoUrl || copy.logo_url).replace('/upload/', '/upload/fl_attachment/')}
                      className="flex items-center gap-1 text-zinc-400 hover:text-zinc-300"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </a>
                  </span>
                ) : (brand.logoDescription || copy.logo_description) ? (
                  <span className="text-amber-400">Logo desc: &quot;{brand.logoDescription || copy.logo_description}&quot;</span>
                ) : null}

                {(brand.stripImageUrl || copy.strip_image_url) ? (
                  <span className="flex items-center gap-2">
                    <a href={brand.stripImageUrl || copy.strip_image_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300">
                      <ImageIcon className="w-3 h-3" />
                      View Strip
                    </a>
                    <a
                      href={(brand.stripImageUrl || copy.strip_image_url).replace('/upload/', '/upload/fl_attachment/')}
                      className="flex items-center gap-1 text-zinc-400 hover:text-zinc-300"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </a>
                  </span>
                ) : (brand.stripImageDescription || copy.strip_image_description) ? (
                  <span className="text-amber-400">Strip desc: &quot;{brand.stripImageDescription || copy.strip_image_description}&quot;</span>
                ) : (
                  <span className="text-slate-600">No strip image</span>
                )}
              </div>

              {/* Expand toggle */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : request.id)}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {isExpanded ? 'Hide credentials' : 'Enter WalletPush credentials'}
              </button>

              {isExpanded && (
                <div className="space-y-4 pt-2 border-t border-slate-700/50">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-slate-400 text-xs">Template ID</Label>
                      <Input
                        value={creds.walletpush_template_id || ''}
                        onChange={(e) => updateCredential(request.id, 'walletpush_template_id', e.target.value)}
                        className="bg-slate-900/50 border-slate-600 text-white text-sm h-9"
                        placeholder="Enter the Template ID from WalletPush"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-400 text-xs">API Key</Label>
                      <Input
                        value={creds.walletpush_api_key || ''}
                        onChange={(e) => updateCredential(request.id, 'walletpush_api_key', e.target.value)}
                        className="bg-slate-900/50 border-slate-600 text-white text-sm h-9"
                        placeholder="Enter the API Key for this template"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-400 text-xs">Pass Type ID</Label>
                      <Input
                        value={creds.walletpush_pass_type_id || ''}
                        onChange={(e) => updateCredential(request.id, 'walletpush_pass_type_id', e.target.value)}
                        className="bg-slate-900/50 border-slate-600 text-white text-sm h-9"
                        placeholder="e.g., pass.com.walletpush.loyalty"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleActivate(request.id)}
                      disabled={activatingId === request.id}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {activatingId === request.id ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      Activate
                    </Button>

                    {rejectingId === request.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Reason for rejection"
                          className="bg-slate-900/50 border-slate-600 text-white text-sm h-9 flex-1"
                          autoFocus
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(request.id)}
                          className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                        >
                          Confirm
                        </Button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectReason('') }}
                          className="text-xs text-slate-500 hover:text-slate-400"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setRejectingId(request.id)}
                        className="border-red-500/20 text-red-400 hover:bg-red-500/10"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
          </div>
        )}
      </section>

      {/* ── Active & Paused Programs ── */}
      <section>
        <h3 className="text-white font-semibold text-lg mb-4">
          Active Programs
          {activePrograms.length > 0 && (
            <span className="ml-2 px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
              {activePrograms.length}
            </span>
          )}
        </h3>

        {isProgramsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
          </div>
        ) : activePrograms.length === 0 ? (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="py-10 text-center">
              <p className="text-zinc-500 text-sm">No active or paused loyalty programs in this city yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activePrograms.map((prog) => {
              const business = prog.business_profiles
              return (
                <Card key={prog.id} className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex gap-4 items-start">
                      {/* Left: compact card preview */}
                      <LoyaltyCardPreview
                        {...toLoyaltyCardPreviewProps({
                          ...prog,
                          business_name: business?.business_name,
                        })}
                        className="mx-0 shrink-0 !max-w-[260px]"
                      />

                      {/* Right: info + stats + actions */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between self-stretch">
                        <div className="flex items-start justify-between gap-2 mb-4">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {business?.logo && (
                              <img src={business.logo} alt="" className="w-8 h-8 rounded-lg object-cover bg-zinc-800 shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-white font-medium text-sm truncate">
                                {business?.business_name || 'Unknown Business'}
                              </p>
                              <p className="text-zinc-500 text-xs truncate">
                                {prog.program_name || 'Loyalty Program'}
                              </p>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${
                            prog.status === 'active'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {prog.status === 'active' ? 'Active' : 'Paused'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-6 gap-y-4 flex-1">
                          <div className="bg-zinc-800/40 rounded-lg px-3 py-2.5">
                            <p className="text-zinc-500 text-[11px] uppercase tracking-wide mb-1">Members</p>
                            <p className="text-white text-lg font-semibold flex items-center gap-1.5">
                              <Users className="w-4 h-4 text-emerald-500" />
                              {prog.member_count}
                            </p>
                          </div>
                          <div className="bg-zinc-800/40 rounded-lg px-3 py-2.5">
                            <p className="text-zinc-500 text-[11px] uppercase tracking-wide mb-1">Type</p>
                            <p className="text-white text-lg font-semibold capitalize">{prog.type}</p>
                          </div>
                          <div className="bg-zinc-800/40 rounded-lg px-3 py-2.5">
                            <p className="text-zinc-500 text-[11px] uppercase tracking-wide mb-1">Reward</p>
                            <p className="text-white text-sm font-semibold truncate">{prog.reward_description}</p>
                          </div>
                          <div className="bg-zinc-800/40 rounded-lg px-3 py-2.5">
                            <p className="text-zinc-500 text-[11px] uppercase tracking-wide mb-1">Threshold</p>
                            <p className="text-white text-lg font-semibold">{prog.reward_threshold} <span className="text-sm font-normal text-zinc-400">{prog.stamp_label.toLowerCase()}</span></p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 pt-3 mt-3 border-t border-zinc-800/50">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleStatus(prog.id, prog.status)}
                            disabled={togglingId === prog.id}
                            className={`text-xs ${
                              prog.status === 'active'
                                ? 'border-amber-500/30 text-amber-400 hover:bg-amber-500/10'
                                : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                            }`}
                          >
                            {togglingId === prog.id ? (
                              <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                            ) : prog.status === 'active' ? (
                              <Pause className="w-3 h-3 mr-1.5" />
                            ) : (
                              <Play className="w-3 h-3 mr-1.5" />
                            )}
                            {prog.status === 'active' ? 'Pause' : 'Resume'}
                          </Button>
                          <span className="text-zinc-600 text-xs">
                            Created {new Date(prog.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function SpecField({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div>
      <p className="text-slate-500 text-xs">{label}</p>
      <p className="text-slate-200 text-sm font-medium truncate">{value || '--'}</p>
    </div>
  )
}
