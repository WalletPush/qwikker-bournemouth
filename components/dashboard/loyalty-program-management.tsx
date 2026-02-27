'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import {
  AlertTriangle, Settings, Send, Loader2, CheckCircle2,
  ChevronDown, ChevronUp, Pencil,
} from 'lucide-react'
import type { LoyaltyProgram } from '@/lib/loyalty/loyalty-types'

interface LoyaltyProgramManagementProps {
  program: LoyaltyProgram
  businessName: string
  onProgramUpdate: (program: LoyaltyProgram) => void
}

type ManageTab = 'settings' | 'request' | 'danger'

interface SelfServiceForm {
  program_name: string
  earn_instructions: string
  redeem_instructions: string
  terms_and_conditions: string
  max_earns_per_day: number
  min_gap_minutes: number
}

export function LoyaltyProgramManagement({
  program,
  businessName,
  onProgramUpdate,
}: LoyaltyProgramManagementProps) {
  const [activeTab, setActiveTab] = useState<ManageTab | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  // Self-service form
  const [form, setForm] = useState<SelfServiceForm>({
    program_name: program.program_name || '',
    earn_instructions: program.earn_instructions || '',
    redeem_instructions: program.redeem_instructions || '',
    terms_and_conditions: program.terms_and_conditions || '',
    max_earns_per_day: program.max_earns_per_day,
    min_gap_minutes: program.min_gap_minutes,
  })

  // Edit request form
  const [editDescription, setEditDescription] = useState('')
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editSubmitted, setEditSubmitted] = useState(false)

  // Danger zone
  const [endConfirmText, setEndConfirmText] = useState('')
  const [ending, setEnding] = useState(false)
  const [dangerExpanded, setDangerExpanded] = useState(false)

  const handleSelfServiceSave = useCallback(async () => {
    setSaving(true)
    setSaveMessage(null)
    try {
      const res = await fetch('/api/loyalty/program/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSaveMessage('Settings saved')
        onProgramUpdate({ ...program, ...form })
        setTimeout(() => setSaveMessage(null), 3000)
      } else {
        setSaveMessage(data.error || 'Failed to save')
      }
    } catch {
      setSaveMessage('Connection failed')
    } finally {
      setSaving(false)
    }
  }, [form, program, onProgramUpdate])

  const handleEditRequest = useCallback(async () => {
    setEditSubmitting(true)
    try {
      const res = await fetch('/api/loyalty/request/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          changes: {},
          changeDescription: editDescription,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setEditSubmitted(true)
      } else {
        alert(data.error || 'Failed to submit request')
      }
    } catch {
      alert('Connection failed')
    } finally {
      setEditSubmitting(false)
    }
  }, [editDescription])

  const handleEndProgram = useCallback(async () => {
    setEnding(true)
    try {
      const res = await fetch('/api/loyalty/program/end', { method: 'POST' })
      const data = await res.json()
      if (res.ok && data.success) {
        onProgramUpdate({ ...program, status: 'ended' })
      } else {
        alert(data.error || 'Failed to end program')
      }
    } catch {
      alert('Connection failed')
    } finally {
      setEnding(false)
    }
  }, [program, onProgramUpdate])

  const toggleTab = (tab: ManageTab) => {
    setActiveTab(activeTab === tab ? null : tab)
  }

  return (
    <div className="space-y-3 mt-6">
      <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Program Management</p>

      {/* Quick Settings */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <button
          onClick={() => toggleTab('settings')}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-4 h-4 text-zinc-400" />
            <div>
              <p className="text-white text-sm font-medium">Quick Settings</p>
              <p className="text-zinc-500 text-xs">Edit instructions, limits, and program name</p>
            </div>
          </div>
          {activeTab === 'settings' ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )}
        </button>

        {activeTab === 'settings' && (
          <CardContent className="pt-0 pb-5 space-y-4 border-t border-zinc-800">
            <div className="space-y-2 pt-4">
              <Label className="text-zinc-300 text-xs">Program Name</Label>
              <Input
                value={form.program_name}
                onChange={(e) => setForm({ ...form, program_name: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white"
                placeholder={`${businessName} Rewards`}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300 text-xs">Earn Instructions</Label>
              <Textarea
                value={form.earn_instructions}
                onChange={(e) => setForm({ ...form, earn_instructions: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white resize-none"
                rows={2}
                placeholder="e.g. Show your phone at the till to earn a stamp"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300 text-xs">Redeem Instructions</Label>
              <Textarea
                value={form.redeem_instructions}
                onChange={(e) => setForm({ ...form, redeem_instructions: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white resize-none"
                rows={2}
                placeholder="e.g. Show your reward to a member of staff"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300 text-xs">Terms & Conditions</Label>
              <Textarea
                value={form.terms_and_conditions}
                onChange={(e) => setForm({ ...form, terms_and_conditions: e.target.value })}
                className="bg-zinc-800 border-zinc-700 text-white resize-none"
                rows={3}
                placeholder="Optional terms and conditions"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-300 text-xs">
                  Max stamps per day: <span className="text-emerald-400 font-semibold">{form.max_earns_per_day}</span>
                </Label>
                <Slider
                  value={[form.max_earns_per_day]}
                  onValueChange={([v]) => setForm({ ...form, max_earns_per_day: v })}
                  min={1}
                  max={5}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300 text-xs">
                  Min gap: <span className="text-emerald-400 font-semibold">{form.min_gap_minutes} min</span>
                </Label>
                <Slider
                  value={[form.min_gap_minutes]}
                  onValueChange={([v]) => setForm({ ...form, min_gap_minutes: v })}
                  min={0}
                  max={180}
                  step={5}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleSelfServiceSave}
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                size="sm"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Save Changes
              </Button>
              {saveMessage && (
                <p className={`text-xs ${saveMessage === 'Settings saved' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {saveMessage}
                </p>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Request Template Changes */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <button
          onClick={() => toggleTab('request')}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <Pencil className="w-4 h-4 text-zinc-400" />
            <div>
              <p className="text-white text-sm font-medium">Request Card Changes</p>
              <p className="text-zinc-500 text-xs">Change branding, images, rewards, or icons</p>
            </div>
          </div>
          {activeTab === 'request' ? (
            <ChevronUp className="w-4 h-4 text-zinc-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500" />
          )}
        </button>

        {activeTab === 'request' && (
          <CardContent className="pt-0 pb-5 border-t border-zinc-800">
            {editSubmitted ? (
              <div className="flex items-center gap-3 py-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-white text-sm font-medium">Request submitted</p>
                  <p className="text-zinc-500 text-xs">Our team will review your changes and update your wallet pass. Usually within 24 hours.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-4">
                <div className="p-3 bg-zinc-800/50 border border-zinc-700/50 rounded-lg">
                  <p className="text-zinc-400 text-xs leading-relaxed">
                    Changes to your card design, images, colours, reward threshold, or stamp icons require
                    a template update by our team. Describe what you&apos;d like to change and we&apos;ll get it done.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-zinc-300 text-xs">What would you like to change?</Label>
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white resize-none"
                    rows={4}
                    placeholder="e.g. I'd like to change the strip image to a new photo, update the card colour to #1a1a2e, and change the reward from 'free coffee' to 'free meal'..."
                  />
                </div>

                <Button
                  onClick={handleEditRequest}
                  disabled={editSubmitting || !editDescription.trim()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm"
                  size="sm"
                >
                  {editSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
                  Submit Request
                </Button>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Danger Zone */}
      <Card className="bg-zinc-900/50 border-red-900/30">
        <button
          onClick={() => {
            setDangerExpanded(!dangerExpanded)
            toggleTab('danger')
          }}
          className="w-full flex items-center justify-between px-5 py-4 text-left"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-red-400/70" />
            <div>
              <p className="text-red-400/80 text-sm font-medium">Danger Zone</p>
              <p className="text-zinc-600 text-xs">Pause or permanently end your program</p>
            </div>
          </div>
          {activeTab === 'danger' ? (
            <ChevronUp className="w-4 h-4 text-zinc-600" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-600" />
          )}
        </button>

        {activeTab === 'danger' && (
          <CardContent className="pt-0 pb-5 border-t border-zinc-800 space-y-5">
            {/* Pause (only if active) */}
            {program.status === 'active' && (
              <div className="pt-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-white text-sm font-medium">Pause Program</p>
                    <p className="text-zinc-500 text-xs mt-0.5">
                      Temporarily stop earns and redemptions. Memberships are preserved. You can resume anytime.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-amber-600/30 text-amber-500 hover:bg-amber-500/10 flex-shrink-0"
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/loyalty/program/pause', { method: 'POST' })
                        if (res.ok) {
                          onProgramUpdate({ ...program, status: 'paused' })
                        }
                      } catch {}
                    }}
                  >
                    Pause
                  </Button>
                </div>
              </div>
            )}

            {/* End Program (destructive) */}
            <div className={program.status === 'active' ? 'pt-4 border-t border-zinc-800' : 'pt-4'}>
              <p className="text-white text-sm font-medium">End Program Permanently</p>
              <p className="text-zinc-500 text-xs mt-0.5 mb-3">
                This will permanently end your loyalty program. Customers will no longer be able to earn
                or redeem stamps. Existing wallet passes will remain on their phones but will show as inactive.
                This action cannot be undone.
              </p>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-zinc-400 text-xs">
                    Type <span className="text-red-400 font-mono">END</span> to confirm
                  </Label>
                  <Input
                    value={endConfirmText}
                    onChange={(e) => setEndConfirmText(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white max-w-[200px]"
                    placeholder="END"
                  />
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={endConfirmText !== 'END' || ending}
                  onClick={handleEndProgram}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-30"
                >
                  {ending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />}
                  End Program Permanently
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
