'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, XCircle, Loader2, StopCircle, Sparkles } from 'lucide-react'

export interface EnrichProgress {
  current: number
  total: number
  done: number
  failed: number
  currentBusiness: string
}

interface EnrichProgressModalProps {
  isOpen: boolean
  onClose: () => void
  progress: EnrichProgress | null
  isComplete: boolean
  isCancelled: boolean
  onCancel: () => void
  onGoToConfirm: () => void
}

/**
 * Post-import "Enriching..." modal. Runs after a successful import when the admin
 * opted into rich content: the client walks the just-imported businesses one at a
 * time (see import-client), and this shows live per-business progress. Any drafts
 * already generated are saved even if cancelled.
 */
export function EnrichProgressModal({
  isOpen,
  onClose,
  progress,
  isComplete,
  isCancelled,
  onCancel,
  onGoToConfirm,
}: EnrichProgressModalProps) {
  if (!progress) return null

  const finished = isComplete || isCancelled
  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && finished) onClose() }}>
      <DialogContent
        className="sm:max-w-[560px]"
        onPointerDownOutside={(e) => {
          if (!finished) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (!finished) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isComplete ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Enrichment complete
              </>
            ) : isCancelled ? (
              <>
                <StopCircle className="w-5 h-5 text-orange-500" />
                Enrichment stopped
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
                Generating rich content
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {progress.current} of {progress.total} processed
              </span>
              <span className="font-semibold">{Math.round(percentage)}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>

          {!finished && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Enriching {progress.currentBusiness}</p>
                  <p className="text-xs text-muted-foreground">
                    Reading their website + Google reviews and drafting content...
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">{progress.done}</span>
              </div>
              <p className="text-xs text-green-700 dark:text-green-300">Enriched</p>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center justify-center gap-1 mb-1">
                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">{progress.failed}</span>
              </div>
              <p className="text-xs text-red-700 dark:text-red-300">Failed</p>
            </div>
          </div>

          {finished && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200 text-center font-medium">
                {progress.done} listing{progress.done !== 1 ? 's' : ''} drafted.
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300 text-center mt-1">
                Rich content stays hidden from customers until you confirm it in the Acquisition Engine.
                {progress.failed > 0 && ` ${progress.failed} failed — you can retry those from the Acquisition Engine.`}
              </p>
            </div>
          )}

          <div className="space-y-2">
            {!finished ? (
              <Button onClick={onCancel} variant="outline" size="lg" className="w-full">
                <StopCircle className="w-4 h-4 mr-2" />
                Stop enriching
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                {progress.done > 0 && (
                  <Button onClick={onGoToConfirm} size="lg" className="flex-1 bg-green-600 hover:bg-green-700">
                    Go to Acquisition Engine to confirm
                  </Button>
                )}
                <Button onClick={onClose} variant="outline" size="lg" className="flex-1">
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
