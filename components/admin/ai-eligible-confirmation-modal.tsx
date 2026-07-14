'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface AiEligibleConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  selectedCount: number
  isLoading: boolean
  /** 'enable' grants Tier 3 AI eligibility, 'disable' revokes it. Defaults to 'enable'. */
  mode?: 'enable' | 'disable'
}

export function AiEligibleConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  selectedCount,
  isLoading,
  mode = 'enable'
}: AiEligibleConfirmationModalProps) {
  const isDisable = mode === 'disable'
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border-slate-700 text-slate-100 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">
            {isDisable ? 'Remove AI eligibility' : 'Make AI eligible'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-slate-300 text-sm leading-relaxed">
            {isDisable
              ? 'Are you sure you want to remove AI eligibility from these listings?'
              : 'Are you sure you want to make these listings AI eligible?'}
          </p>
          
          <p className="text-slate-300 text-sm leading-relaxed">
            {isDisable
              ? 'They will stop appearing as Tier 3 fallback mentions in AI chat and Atlas search. This does NOT hide them from Discover or the home feed — they stay visible there.'
              : 'Selected businesses will become eligible for Tier 3 fallback discovery in chat, using basic information and (if enabled) review snippets. This does not change how they appear in Discover.'}
          </p>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
            <p className="text-sm text-slate-400">
              <span className="font-medium text-slate-200">{selectedCount}</span> businesses selected
            </p>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="bg-transparent border-slate-600 text-slate-300 hover:bg-slate-800/40"
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={onConfirm}
            disabled={isLoading}
            className={isDisable
              ? 'bg-transparent border-red-500/60 text-red-300 hover:bg-red-500/10 hover:border-red-400'
              : 'bg-transparent border-slate-500 text-slate-200 hover:bg-slate-800/60 hover:border-slate-400'}
          >
            {isLoading ? 'Updating…' : (isDisable ? 'Remove eligibility' : 'Confirm')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
