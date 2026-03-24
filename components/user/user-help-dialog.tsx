'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { HelpCircle, Store, Wallet, MessageSquare, CheckCircle2 } from 'lucide-react'

interface UserHelpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  walletPassId?: string
  city: string
}

const CATEGORIES = [
  { value: 'general', label: 'General question', icon: HelpCircle },
  { value: 'business_issue', label: 'Issue with a business', icon: Store },
  { value: 'pass_problem', label: 'Problem with my pass', icon: Wallet },
  { value: 'feedback', label: 'Feedback or suggestion', icon: MessageSquare },
]

export function UserHelpDialog({ open, onOpenChange, walletPassId, city }: UserHelpDialogProps) {
  const [category, setCategory] = useState('general')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    if (!message.trim() || !subject.trim()) return

    setSending(true)
    try {
      const response = await fetch('/api/user/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletPassId: walletPassId || 'anonymous',
          city,
          category,
          subject: subject.trim(),
          message: message.trim(),
        }),
      })

      if (response.ok) {
        setSent(true)
      } else {
        alert('Something went wrong. Please try again.')
      }
    } catch {
      alert('Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    setTimeout(() => {
      setCategory('general')
      setSubject('')
      setMessage('')
      setSent(false)
    }, 300)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-gradient-to-b from-slate-900 to-slate-950 border-slate-700/50 text-white sm:max-w-md p-0 overflow-hidden">
        {sent ? (
          <div className="text-center py-12 px-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#00d083]/20 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-[#00d083]" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg">Message sent</p>
              <p className="text-slate-400 text-sm mt-1">We&apos;ll look into this and get back to you as soon as we can.</p>
            </div>
            <Button
              onClick={handleClose}
              className="mt-2 bg-[#00d083] hover:bg-[#00b86f] text-black font-semibold px-8"
            >
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader className="px-6 pt-6 pb-2">
              <DialogTitle className="text-white text-lg font-semibold">How can we help?</DialogTitle>
            </DialogHeader>

            <div className="px-6 pb-6 space-y-5">
              {/* Category selector */}
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon
                  const isActive = category === cat.value
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setCategory(cat.value)}
                      className={`flex items-center gap-2.5 px-3 py-3 text-left text-sm rounded-xl border transition-all ${
                        isActive
                          ? 'bg-[#00d083]/10 border-[#00d083]/50 text-white'
                          : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                      }`}
                    >
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#00d083]' : 'text-slate-500'}`} />
                      <span className="text-xs font-medium leading-tight">{cat.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Subject</label>
                <input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your question..."
                  maxLength={120}
                  className="w-full px-3 py-2.5 text-sm rounded-xl bg-slate-800/80 border border-slate-700/50 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#00d083]/50 focus:ring-1 focus:ring-[#00d083]/20 transition-all"
                />
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-400">Message</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us more about what you need help with..."
                  className="bg-slate-800/80 border-slate-700/50 text-white placeholder:text-slate-500 min-h-[120px] rounded-xl text-sm focus:border-[#00d083]/50 focus:ring-1 focus:ring-[#00d083]/20 resize-none"
                  maxLength={1000}
                />
                <p className="text-[10px] text-slate-600 text-right">{message.length}/1000</p>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={sending || !message.trim() || !subject.trim()}
                className="w-full bg-[#00d083] hover:bg-[#00b86f] text-black font-semibold disabled:opacity-40 disabled:cursor-not-allowed rounded-xl py-2.5 text-sm"
              >
                {sending ? 'Sending...' : 'Send message'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
