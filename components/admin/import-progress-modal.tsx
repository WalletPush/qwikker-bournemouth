'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, AlertCircle, Loader2, StopCircle } from 'lucide-react'

interface ImportProgress {
  current: number
  total: number
  imported: number
  skipped: number
  failed: number
  currentBusiness: string
  status: 'success' | 'skipped' | 'failed' | 'importing'
}

interface ImportProgressModalProps {
  isOpen: boolean
  onClose: () => void
  progress: ImportProgress | null
  onStop: () => void
  isComplete: boolean
  isCancelled: boolean
}

export function ImportProgressModal({
  isOpen,
  onClose,
  progress,
  onStop,
  isComplete,
  isCancelled
}: ImportProgressModalProps) {
  if (!progress) return null

  const percentage = (progress.current / progress.total) * 100

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]" onPointerDownOutside={(e) => {
        // Prevent closing during import
        if (!isComplete && !isCancelled) {
          e.preventDefault()
        }
      }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isComplete ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                Import Complete
              </>
            ) : isCancelled ? (
              <>
                <StopCircle className="w-5 h-5 text-orange-500" />
                Import Cancelled
              </>
            ) : (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                Importing Businesses
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {progress.current} of {progress.total} processed
              </span>
              <span className="font-semibold">{Math.round(percentage)}%</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>

          {/* Current Business */}
          {!isComplete && !isCancelled && (
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {progress.currentBusiness}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {progress.status === 'success' && 'Successfully imported'}
                    {progress.status === 'skipped' && 'Skipped'}
                    {progress.status === 'failed' && 'Failed to import'}
                    {progress.status === 'importing' && 'Importing...'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Imported */}
            <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-center gap-1 mb-1">
                <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {progress.imported}
                </span>
              </div>
              <p className="text-xs text-green-700 dark:text-green-300">Imported</p>
            </div>

            {/* Skipped */}
            <div className="text-center p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center justify-center gap-1 mb-1">
                <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {progress.skipped}
                </span>
              </div>
              <p className="text-xs text-yellow-700 dark:text-yellow-300">Skipped</p>
            </div>

            {/* Failed */}
            <div className="text-center p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
              <div className="flex items-center justify-center gap-1 mb-1">
                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {progress.failed}
                </span>
              </div>
              <p className="text-xs text-red-700 dark:text-red-300">Failed</p>
            </div>
          </div>

          {/* Completion Message */}
          {isComplete && (
            <>
              {progress.imported > 0 ? (
                <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-800 dark:text-green-200 text-center font-medium">
                    Successfully imported {progress.imported} business{progress.imported !== 1 ? 'es' : ''}
                  </p>
                  {progress.skipped > 0 && (
                    <p className="text-xs text-green-700 dark:text-green-300 text-center mt-1">
                      {progress.skipped} already existed or didn't meet criteria
                    </p>
                  )}
                  {progress.failed > 0 && (
                    <p className="text-xs text-green-700 dark:text-green-300 text-center mt-1">
                      {progress.failed} business{progress.failed !== 1 ? 'es' : ''} failed to import
                    </p>
                  )}
                </div>
              ) : progress.failed > 0 ? (
                <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-800 dark:text-red-200 text-center font-medium">
                    Import completed with errors
                  </p>
                  <p className="text-xs text-red-700 dark:text-red-300 text-center mt-1">
                    {progress.failed} business{progress.failed !== 1 ? 'es' : ''} failed to import. Check the console for details.
                  </p>
                </div>
              ) : progress.skipped > 0 ? (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 text-center font-medium">
                    Import complete
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-300 text-center mt-1">
                    All {progress.skipped} business{progress.skipped !== 1 ? 'es' : ''} were skipped (already existed or didn't meet criteria)
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-950/20 rounded-lg border border-slate-200 dark:border-slate-800">
                  <p className="text-sm text-slate-800 dark:text-slate-200 text-center font-medium">
                    Import complete
                  </p>
                  <p className="text-xs text-slate-700 dark:text-slate-300 text-center mt-1">
                    No businesses were imported
                  </p>
                </div>
              )}
            </>
          )}

          {/* Cancelled Message */}
          {isCancelled && (
            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <p className="text-sm text-orange-800 dark:text-orange-200 text-center font-medium">
                Import was stopped. Partial results have been saved.
              </p>
              <p className="text-xs text-orange-700 dark:text-orange-300 text-center mt-1">
                {progress.imported} business{progress.imported !== 1 ? 'es' : ''} were successfully imported before stopping.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2">
            {!isComplete && !isCancelled ? (
              <Button
                onClick={onStop}
                variant="destructive"
                size="lg"
              >
                <StopCircle className="w-4 h-4 mr-2" />
                Stop Import
              </Button>
            ) : (
              <Button
                onClick={onClose}
                size="lg"
                className="w-full"
              >
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

