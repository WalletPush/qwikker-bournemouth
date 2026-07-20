'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sparkles, CheckCircle2, Mail } from 'lucide-react'
import type { JourneyStep } from './journey-steps'

/**
 * "Start a campaign": a friendly launcher that drops the admin into one focused job
 * with sensible defaults, instead of facing every control at once. It just sets the
 * journey step + filters on the main screen — no separate data model.
 */
const FOCUS_OPTIONS: Array<{
  key: JourneyStep
  title: string
  desc: string
  icon: typeof Sparkles
}> = [
  {
    key: 'confirm',
    title: 'Confirm listings that look great',
    desc: 'Jump to the drafts our AI is confident about so you can publish them live fast.',
    icon: CheckCircle2,
  },
  {
    key: 'invite',
    title: 'Send claim invites',
    desc: 'Focus on live listings that already have an email on file, ready to invite.',
    icon: Mail,
  },
  {
    key: 'enrich',
    title: 'Enrich imported businesses',
    desc: 'Generate AI content for businesses that don\u2019t have a draft yet.',
    icon: Sparkles,
  },
]

export function CampaignLauncher({
  categories,
  onStart,
  onClose,
}: {
  categories: string[]
  onStart: (opts: { focus: JourneyStep; category: string }) => void
  onClose: () => void
}) {
  const [focus, setFocus] = useState<JourneyStep>('confirm')
  const [category, setCategory] = useState('all')

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#00d083]" />
            Start a campaign
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm font-medium text-slate-300 mb-2">What do you want to focus on?</p>
            <div className="space-y-2">
              {FOCUS_OPTIONS.map((o) => {
                const Icon = o.icon
                const active = focus === o.key
                return (
                  <button
                    key={o.key}
                    onClick={() => setFocus(o.key)}
                    className={`w-full flex items-start gap-3 rounded-lg border px-3 py-3 text-left transition-colors ${
                      active
                        ? 'border-[#00d083]/60 bg-[#00d083]/[0.08]'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mt-0.5 shrink-0 ${active ? 'text-[#00d083]' : 'text-slate-400'}`} />
                    <div>
                      <div className="text-sm font-semibold text-slate-100">{o.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{o.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-300">Category (optional)</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded px-2 py-2"
            >
              <option value="all">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => onStart({ focus, category })}
            className="bg-[#00d083] hover:bg-[#00b06e] text-slate-900 font-semibold"
          >
            Start
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
