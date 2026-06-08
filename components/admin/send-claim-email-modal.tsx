'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Sparkles, Send, AlertTriangle, Loader2 } from 'lucide-react'

interface ClaimBusiness {
  id: string
  business_name: string
  email?: string | null
}

interface SendClaimEmailModalProps {
  isOpen: boolean
  onClose: () => void
  business: ClaimBusiness
  onSent: (businessName: string) => void
  onError: (message: string) => void
}

interface PreviewState {
  to: string
  subject: string
  html: string
}

export function SendClaimEmailModal({
  isOpen,
  onClose,
  business,
  onSent,
  onError,
}: SendClaimEmailModalProps) {
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const loadPreview = useCallback(async () => {
    setIsLoadingPreview(true)
    setLoadError(null)
    setPreview(null)
    try {
      const res = await fetch('/api/admin/send-claim-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id, mode: 'preview' }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setLoadError(data.error || 'Could not build the email preview')
        return
      }
      setPreview({ to: data.to, subject: data.subject, html: data.html })
    } catch {
      setLoadError('Could not reach the server. Please try again.')
    } finally {
      setIsLoadingPreview(false)
    }
  }, [business.id])

  useEffect(() => {
    if (isOpen) loadPreview()
  }, [isOpen, loadPreview])

  const handleSend = async () => {
    setIsSending(true)
    try {
      const res = await fetch('/api/admin/send-claim-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId: business.id, mode: 'send' }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        onError(data.error || 'Failed to send claim email')
        setIsSending(false)
        return
      }
      onSent(business.business_name)
      setIsSending(false)
      onClose()
    } catch {
      onError('Could not reach the server. Please try again.')
      setIsSending(false)
    }
  }

  const handleClose = () => {
    if (!isSending) onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[640px] bg-slate-900 border-slate-700 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-[#00d083]/20 rounded-full">
              <Sparkles className="h-6 w-6 text-[#00d083]" />
            </div>
            <DialogTitle className="text-xl text-white">Send Claim Invitation</DialogTitle>
          </div>
          <DialogDescription className="text-slate-300 text-base">
            Invite this business to claim their listing. The button links straight to their
            pre-selected business in the claim flow. Sent from your city&apos;s QWIKKER address.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoadingPreview && (
            <div className="flex items-center justify-center gap-3 py-12 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Building preview…
            </div>
          )}

          {loadError && !isLoadingPreview && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-red-400">Can&apos;t send a claim invite</div>
                <p className="text-sm text-red-300 mt-1">{loadError}</p>
              </div>
            </div>
          )}

          {preview && !isLoadingPreview && (
            <>
              <div className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex gap-2">
                  <span className="text-slate-400 w-16 flex-shrink-0">To</span>
                  <span className="text-white font-medium break-all">{preview.to}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-400 w-16 flex-shrink-0">Subject</span>
                  <span className="text-white font-medium">{preview.subject}</span>
                </div>
              </div>

              <div className="rounded-lg overflow-hidden border border-slate-700 bg-[#0a0a0a]">
                <div className="px-3 py-2 bg-slate-800/80 border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
                  Email preview
                </div>
                <iframe
                  srcDoc={preview.html}
                  title="Claim email preview"
                  sandbox=""
                  className="w-full h-[360px] bg-[#0a0a0a]"
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSending}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={!preview || isLoadingPreview || isSending}
            className="bg-[#00d083] hover:bg-[#00b86f] text-black font-semibold"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Confirm &amp; Send
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
