'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Users, TrendingUp, Gift, Trophy, AlertTriangle,
  QrCode, RotateCw, Download, Pause, Copy, Loader2,
  ChevronDown, Flag, FileDown, Printer,
} from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import type { LoyaltyProgram, BusinessLoyaltySummary } from '@/lib/loyalty/loyalty-types'
import { STAMP_ICONS } from '@/lib/loyalty/loyalty-utils'
import type { StampIconKey } from '@/lib/loyalty/loyalty-utils'

interface LoyaltyStatsDashboardProps {
  program: LoyaltyProgram
  profile: any
  onProgramUpdate?: (program: LoyaltyProgram) => void
}

type ActiveTab = 'overview' | 'members' | 'redemptions'

export function LoyaltyStatsDashboard({ program, profile, onProgramUpdate }: LoyaltyStatsDashboardProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview')
  const [summary, setSummary] = useState<BusinessLoyaltySummary | null>(null)
  const [members, setMembers] = useState<any[]>([])
  const [redemptions, setRedemptions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRotating, setIsRotating] = useState(false)
  const [isPausing, setIsPausing] = useState(false)
  const [flaggingId, setFlaggingId] = useState<string | null>(null)
  const [flagReason, setFlagReason] = useState('')

  const city = profile?.city || ''
  const joinUrl = `https://${city}.qwikker.com/loyalty/start/${program.public_id}`
  const earnUrl = `https://${city}.qwikker.com/loyalty/start/${program.public_id}?mode=earn&t=${program.counter_qr_token}`

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      try {
        const [summaryRes, membersRes, redemptionsRes] = await Promise.all([
          fetch('/api/loyalty/business-summary'),
          fetch('/api/loyalty/members'),
          fetch('/api/loyalty/redemptions?since=30d'),
        ])
        if (summaryRes.ok) {
          const data = await summaryRes.json()
          setSummary(data.summary)
        }
        if (membersRes.ok) {
          const data = await membersRes.json()
          setMembers(data.members || [])
        }
        if (redemptionsRes.ok) {
          const data = await redemptionsRes.json()
          setRedemptions(data.redemptions || [])
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const downloadQR = useCallback((canvasId: string, filename: string) => {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }, [])

  const handleRotateToken = useCallback(async () => {
    if (!confirm('This will invalidate your current Till QR code. You will need to reprint it. Continue?')) return
    setIsRotating(true)
    try {
      const res = await fetch('/api/loyalty/program/rotate-token', { method: 'POST' })
      const data = await res.json()
      if (res.ok && onProgramUpdate) {
        onProgramUpdate({ ...program, counter_qr_token: data.token })
      }
    } catch {} finally {
      setIsRotating(false)
    }
  }, [program, onProgramUpdate])

  const handlePause = useCallback(async () => {
    if (!confirm('Pausing will stop all earns and redemptions. Existing memberships are preserved. Continue?')) return
    setIsPausing(true)
    try {
      const res = await fetch('/api/loyalty/program/pause', { method: 'POST' })
      if (res.ok && onProgramUpdate) {
        onProgramUpdate({ ...program, status: 'paused' })
      }
    } catch {} finally {
      setIsPausing(false)
    }
  }, [program, onProgramUpdate])

  const handleFlag = useCallback(async (redemptionId: string) => {
    try {
      await fetch('/api/loyalty/redemption/flag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redemptionId, reason: flagReason }),
      })
      setRedemptions((prev) =>
        prev.map((r) =>
          r.id === redemptionId ? { ...r, flagged_at: new Date().toISOString(), flagged_reason: flagReason } : r
        )
      )
    } catch {} finally {
      setFlaggingId(null)
      setFlagReason('')
    }
  }, [flagReason])

  const handleCsvExport = useCallback(() => {
    window.open('/api/loyalty/members?format=csv', '_blank')
  }, [])

  const copyToClipboard = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
  }, [])

  const tabs: { id: ActiveTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'members', label: `Members${summary ? ` (${summary.activeMembers})` : ''}` },
    { id: 'redemptions', label: 'Redemptions' },
  ]

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-zinc-900/50 rounded-lg border border-zinc-800">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2.5 text-sm font-medium rounded-md transition-all ${
              activeTab === tab.id
                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/50'
                : 'text-zinc-500 hover:text-white hover:bg-zinc-800/50 border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stat Cards */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
            </div>
          ) : summary && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label="Members" value={summary.activeMembers} />
              <StatCard icon={TrendingUp} label="Visits This Month" value={summary.visitsThisMonth} />
              <StatCard icon={Gift} label="Rewards Redeemed" value={summary.rewardsRedeemedThisMonth} />
              <StatCard icon={Trophy} label="Near Reward" value={summary.membersNearReward} />
            </div>
          )}

          {/* QR Codes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-emerald-500" />
                  Join Rewards QR
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-zinc-500">
                  For window stickers, menus, table talkers, social posts. Never changes.
                </p>
                <div className="flex justify-center py-2">
                  <QRCodeCanvas
                    id="qr-join"
                    value={joinUrl}
                    size={160}
                    bgColor="#18181b"
                    fgColor="#ffffff"
                    level="M"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded flex-1 truncate">
                    {joinUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(joinUrl)}
                    className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 flex-shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                    onClick={() => downloadQR('qr-join', `${(program.program_name || 'loyalty').replace(/\s+/g, '-')}-join-qr.png`)}
                    className="w-full border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                >
                  <Download className="w-3 h-3 mr-1.5" />
                  Download QR
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-sm flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-amber-500" />
                  Earn Points QR (Till Only)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-zinc-500">
                  For the counter stand. Changes when you rotate the token.
                </p>
                <div className="flex justify-center py-2">
                  <QRCodeCanvas
                    id="qr-earn"
                    value={earnUrl}
                    size={160}
                    bgColor="#18181b"
                    fgColor="#ffffff"
                    level="M"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <code className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded flex-1 truncate">
                    {earnUrl.substring(0, 60)}...
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(earnUrl)}
                    className="border-zinc-700 text-zinc-400 hover:bg-zinc-800 flex-shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadQR('qr-earn', `${(program.program_name || 'loyalty').replace(/\s+/g, '-')}-earn-qr.png`)}
                    className="flex-1 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                  >
                    <Download className="w-3 h-3 mr-1.5" />
                    Download QR
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRotateToken}
                    disabled={isRotating}
                    className="flex-1 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                  >
                    {isRotating ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <RotateCw className="w-3 h-3 mr-1.5" />}
                    Rotate Token
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Staff Cheatsheet */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <Printer className="w-4 h-4 text-zinc-400" />
                Staff Cheatsheet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-zinc-400">
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs font-bold flex-shrink-0">1</span>
                  <span>Customer scans QR code on your counter stand</span>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs font-bold flex-shrink-0">2</span>
                  <span>They earn a stamp automatically -- nothing for you to do</span>
                </div>
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-xs font-bold flex-shrink-0">3</span>
                  <span>
                    When they&apos;ve collected {program.reward_threshold} {program.stamp_label.toLowerCase()},
                    they show you a LIVE reward screen on their phone.
                    It has a moving timer to prove it&apos;s live, not a screenshot.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePause}
              disabled={isPausing}
              className="border-zinc-700 text-zinc-400 hover:bg-zinc-800"
            >
              {isPausing ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Pause className="w-3 h-3 mr-2" />}
              Pause Program
            </Button>
          </div>
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-zinc-400">{members.length} member{members.length !== 1 ? 's' : ''}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCsvExport}
              className="border-zinc-700 text-zinc-400 hover:bg-zinc-800"
            >
              <FileDown className="w-3 h-3 mr-2" />
              Export CSV
            </Button>
          </div>

          {members.length === 0 ? (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="py-12 text-center">
                <Users className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">No members yet. Share your Join QR code to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left p-3 text-zinc-500 font-medium">Name</th>
                      <th className="text-left p-3 text-zinc-500 font-medium">Joined</th>
                      <th className="text-left p-3 text-zinc-500 font-medium">Last Active</th>
                      <th className="text-right p-3 text-zinc-500 font-medium">Earned</th>
                      <th className="text-right p-3 text-zinc-500 font-medium">Balance</th>
                      <th className="text-right p-3 text-zinc-500 font-medium">Redeemed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m: any) => (
                      <tr key={m.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                        <td className="p-3 text-zinc-200">{m.display_name}</td>
                        <td className="p-3 text-zinc-400">{m.joined_at?.slice(0, 10)}</td>
                        <td className="p-3 text-zinc-400">{m.last_active_at?.slice(0, 10)}</td>
                        <td className="p-3 text-zinc-300 text-right">{m.total_earned}</td>
                        <td className="p-3 text-emerald-400 text-right font-medium">{m.stamps_balance}</td>
                        <td className="p-3 text-zinc-300 text-right">{m.total_redeemed}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Redemptions Tab */}
      {activeTab === 'redemptions' && (
        <div className="space-y-4">
          {/* ROI Header */}
          {summary && (
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 text-center">
                <p className="text-2xl font-semibold text-white">{summary.rewardsRedeemedThisMonth}</p>
                <p className="text-xs text-zinc-500 mt-1">Rewards this month</p>
              </div>
              <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 text-center">
                <p className="text-2xl font-semibold text-white">
                  &pound;{summary.estimatedValueGivenAway.toFixed(0)}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Est. value given</p>
              </div>
              <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800 text-center">
                <p className="text-2xl font-semibold text-white">{summary.visitsThisMonth}</p>
                <p className="text-xs text-zinc-500 mt-1">Visits generated</p>
              </div>
            </div>
          )}

          {redemptions.length === 0 ? (
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardContent className="py-12 text-center">
                <Gift className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">No redemptions yet.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-zinc-900/50 border-zinc-800 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="text-left p-3 text-zinc-500 font-medium">Time</th>
                      <th className="text-left p-3 text-zinc-500 font-medium">Member</th>
                      <th className="text-left p-3 text-zinc-500 font-medium">Reward</th>
                      <th className="text-right p-3 text-zinc-500 font-medium">Deducted</th>
                      <th className="text-right p-3 text-zinc-500 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {redemptions.map((r: any) => (
                      <tr
                        key={r.id}
                        className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 ${r.flagged_at ? 'bg-amber-500/5' : ''}`}
                      >
                        <td className="p-3 text-zinc-400 whitespace-nowrap">
                          {new Date(r.consumed_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3 text-zinc-200">{r.display_name}</td>
                        <td className="p-3 text-zinc-300">{r.reward_description}</td>
                        <td className="p-3 text-zinc-400 text-right">{r.stamps_deducted}</td>
                        <td className="p-3 text-right">
                          {r.flagged_at ? (
                            <span className="text-xs text-amber-500">Flagged</span>
                          ) : (
                            flaggingId === r.id ? (
                              <div className="flex items-center gap-2 justify-end">
                                <input
                                  type="text"
                                  value={flagReason}
                                  onChange={(e) => setFlagReason(e.target.value)}
                                  placeholder="What seems wrong?"
                                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white w-40"
                                  autoFocus
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleFlag(r.id)}
                                  className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10 text-xs px-2 py-1 h-auto"
                                >
                                  Flag
                                </Button>
                                <button
                                  onClick={() => { setFlaggingId(null); setFlagReason('') }}
                                  className="text-xs text-zinc-500 hover:text-zinc-400"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setFlaggingId(r.id)}
                                className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                              >
                                <Flag className="w-3 h-3" />
                              </button>
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-emerald-500" />
        </div>
        <div>
          <p className="text-xl font-semibold text-white">{value}</p>
          <p className="text-xs text-zinc-500">{label}</p>
        </div>
      </div>
    </div>
  )
}
