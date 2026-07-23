'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { CheckCircle2, XCircle, Loader2, StopCircle, Sparkles, Check, Minus, AlertTriangle, FileSpreadsheet, FileJson } from 'lucide-react'
import {
  exportEnrichmentAsCSV,
  exportEnrichmentAsJSON,
  downloadFile,
  buildExportFilename,
  type EnrichedExportBusiness,
  type ExportMetadata,
} from '@/lib/utils/export-businesses'

/** One inline result chip, e.g. "✓ Website scanned" / "– No menu found". */
function StepTick({ ok, okLabel, noLabel, warnWhenNo }: { ok: boolean; okLabel: string; noLabel: string; warnWhenNo?: boolean }) {
  if (!ok && !noLabel) return null
  if (ok) {
    return (
      <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
        <Check className="w-3 h-3" />
        {okLabel}
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1 ${warnWhenNo ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
      {warnWhenNo ? <AlertTriangle className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
      {noLabel}
    </span>
  )
}

/** Outcome of a single business enrichment — powers the live "what it found" checklist. */
export interface EnrichStepResult {
  name: string
  usedWebsite: boolean
  menuCount: number
  emailFound: boolean
  reviewsUsed: number
  /** Contact channels discovered (whatsapp = explicit, verified link only). */
  whatsappFound?: boolean
  phoneFound?: boolean
  instagramFound?: boolean
  facebookFound?: boolean
  failed?: boolean
}

export interface EnrichProgress {
  current: number
  total: number
  done: number
  failed: number
  currentBusiness: string
  /** Completed businesses (most recent last) with what enrichment found for each. */
  results?: EnrichStepResult[]
}

interface EnrichProgressModalProps {
  isOpen: boolean
  onClose: () => void
  progress: EnrichProgress | null
  isComplete: boolean
  isCancelled: boolean
  onCancel: () => void
  onGoToConfirm: () => void
  /** Full enrichment records for the comprehensive post-enrichment export. */
  exportData?: EnrichedExportBusiness[]
  completedAt?: string | null
  city?: string
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
  exportData = [],
  completedAt,
  city = 'city',
}: EnrichProgressModalProps) {
  const [hasExported, setHasExported] = useState(false)
  const [pendingAction, setPendingAction] = useState<null | 'close' | 'confirm'>(null)

  const finished = isComplete || isCancelled

  // Reset the "downloaded?" flag whenever a fresh run begins so the guard fires
  // again for the new export.
  useEffect(() => {
    if (isOpen && !finished) setHasExported(false)
  }, [isOpen, finished])
  const percentage = progress ? (progress.total > 0 ? (progress.current / progress.total) * 100 : 0) : 0
  const canExport = finished && exportData.length > 0 && !!completedAt
  const meta: ExportMetadata | undefined = completedAt
    ? { city, status: isCancelled ? 'cancelled' : 'complete', completedAt }
    : undefined

  function handleDownloadCSV() {
    if (!completedAt) return
    downloadFile(
      exportEnrichmentAsCSV(exportData, completedAt, meta),
      buildExportFilename(city, completedAt, 'csv', isCancelled, 'enrichment'),
      'text/csv;charset=utf-8;'
    )
    setHasExported(true)
  }

  function handleDownloadJSON() {
    if (!completedAt) return
    downloadFile(
      exportEnrichmentAsJSON(exportData, completedAt, meta),
      buildExportFilename(city, completedAt, 'json', isCancelled, 'enrichment'),
      'application/json'
    )
    setHasExported(true)
  }

  // Guard leaving the modal (close OR go-to-confirm) while an unsaved "mega"
  // export is available — this data is only offered here.
  function guardedRun(action: 'close' | 'confirm') {
    if (canExport && !hasExported) {
      setPendingAction(action)
      return
    }
    action === 'confirm' ? onGoToConfirm() : onClose()
  }

  if (!progress) return null

  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && finished) guardedRun('close') }}>
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
                    Scanning website · reading Google reviews · finding menu &amp; contact · drafting content…
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Live per-business results — what enrichment actually found */}
          {progress.results && progress.results.length > 0 && (
            <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800">
              {progress.results.slice().reverse().map((r, idx) => (
                <div key={`${r.name}-${idx}`} className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {r.failed ? (
                      <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate">{r.name}</span>
                  </div>
                  {r.failed ? (
                    <p className="text-xs text-red-500 pl-5">Couldn&apos;t enrich — retry in the Acquisition Engine</p>
                  ) : (
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 pl-5 mt-0.5 text-xs">
                      <StepTick ok={r.usedWebsite} okLabel="Website scanned" noLabel="No website" />
                      <StepTick ok={r.menuCount > 0} okLabel={`${r.menuCount} menu/service item${r.menuCount !== 1 ? 's' : ''}`} noLabel="No menu found" />
                      <StepTick ok={r.emailFound} okLabel="Email found" noLabel="No email found" warnWhenNo />
                      {/* Contact channels — shown only when found, to keep it clean */}
                      {r.whatsappFound && <StepTick ok okLabel="WhatsApp found" noLabel="" />}
                      {r.phoneFound && <StepTick ok okLabel="Phone found" noLabel="" />}
                      {r.instagramFound && <StepTick ok okLabel="Instagram found" noLabel="" />}
                      {r.facebookFound && <StepTick ok okLabel="Facebook found" noLabel="" />}
                      {r.reviewsUsed > 0 && <StepTick ok okLabel={`${r.reviewsUsed} reviews read`} noLabel="" />}
                    </div>
                  )}
                </div>
              ))}
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

          {/* Comprehensive "mega" export — everything enrichment produced:
              rich listing, suggested offers, contact + socials, individual QR
              scan URLs and the demo link. Only offered here, so we guard leaving. */}
          {finished && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center">
                {canExport
                  ? `Export the full enrichment for ${exportData.length} business${exportData.length !== 1 ? 'es' : ''} — rich content, offers, contact, socials, QR URLs & demo link${isCancelled ? ' (partial — run was stopped)' : ''}`
                  : 'Nothing enriched — nothing to export'}
              </p>
              <div className="flex gap-2">
                <Button onClick={handleDownloadCSV} disabled={!canExport} variant="outline" size="sm" className="flex-1">
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Download CSV
                </Button>
                <Button onClick={handleDownloadJSON} disabled={!canExport} variant="outline" size="sm" className="flex-1">
                  <FileJson className="w-4 h-4 mr-2" />
                  Download JSON
                </Button>
              </div>
              {canExport && !hasExported && (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  This rich export is only available here — download it before you leave.
                </p>
              )}
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
                  <Button onClick={() => guardedRun('confirm')} size="lg" className="flex-1 bg-green-600 hover:bg-green-700">
                    Go to Acquisition Engine to confirm
                  </Button>
                )}
                <Button onClick={() => guardedRun('close')} variant="outline" size="lg" className="flex-1">
                  Close
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Leave-without-export confirmation */}
    <Dialog open={pendingAction !== null} onOpenChange={(open) => { if (!open) setPendingAction(null) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>You haven&apos;t downloaded the export yet</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          The full enrichment export ({exportData.length} business{exportData.length !== 1 ? 'es' : ''}) — with rich
          content, suggested offers, contact details, socials, individual QR code URLs and the demo link — is only
          available here. Once you leave it&apos;s gone. Continue anyway?
        </p>
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => setPendingAction(null)}>
            Go back &amp; export
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              const action = pendingAction
              setPendingAction(null)
              if (action === 'confirm') onGoToConfirm()
              else onClose()
            }}
          >
            Continue without exporting
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    </>
  )
}
