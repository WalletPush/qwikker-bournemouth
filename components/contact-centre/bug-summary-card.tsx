'use client'

import {
  Shield, ShieldAlert, ShieldX, Skull,
  ChevronDown, ChevronUp, ExternalLink,
  Bug, Image as ImageIcon, Activity
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────
interface BugMetadata {
  severity?: string
  stepsToReproduce?: string
  expectedBehavior?: string
  actualBehavior?: string
  attachments?: Array<{ type: string; url: string; name?: string }>
  diagnostics?: Record<string, unknown>
  activityTrail?: Array<{
    ts: string
    type: string
    path: string
    target?: string
  }>
}

interface BugSummaryCardProps {
  metadata: BugMetadata
  /** Whether to show diagnostics/trail (admin-only sections) */
  showDiagnostics?: boolean
  /** Whether the card starts expanded */
  defaultExpanded?: boolean
}

// ─── Severity config ─────────────────────────────────────────────
const SEVERITY_CONFIG: Record<string, {
  label: string
  icon: typeof Shield
  color: string
  bg: string
}> = {
  low: { label: 'Low', icon: Shield, color: 'text-slate-400', bg: 'bg-slate-500/10' },
  medium: { label: 'Medium', icon: ShieldAlert, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  high: { label: 'High', icon: ShieldX, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  critical: { label: 'Critical', icon: Skull, color: 'text-red-400', bg: 'bg-red-500/10' },
}

// ─── Component ───────────────────────────────────────────────────
import { useState } from 'react'

export function BugSummaryCard({
  metadata,
  showDiagnostics = false,
  defaultExpanded = false,
}: BugSummaryCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)

  const sev = SEVERITY_CONFIG[metadata.severity || 'medium'] || SEVERITY_CONFIG.medium
  const SevIcon = sev.icon
  const hasSteps = !!metadata.stepsToReproduce
  const hasExpected = !!metadata.expectedBehavior
  const hasActual = !!metadata.actualBehavior
  const hasAttachments = metadata.attachments && metadata.attachments.length > 0
  const hasDiagnostics = showDiagnostics && metadata.diagnostics && Object.keys(metadata.diagnostics).length > 0
  const hasTrail = showDiagnostics && metadata.activityTrail && metadata.activityTrail.length > 0

  return (
    <div className={`rounded-lg border ${sev.bg} border-current/10 overflow-hidden`}>
      {/* Header -- always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Bug className={`w-4 h-4 ${sev.color}`} />
          <span className="text-sm font-semibold text-white">Bug Report</span>
          <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${sev.bg} ${sev.color}`}>
            <SevIcon className="w-3 h-3" />
            {sev.label}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>

      {/* Body -- collapsible */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-700/50">
          {/* Steps to Reproduce */}
          {hasSteps && (
            <div className="pt-3">
              <p className="text-xs font-medium text-slate-400 mb-1">Steps to Reproduce</p>
              <pre className="text-sm text-slate-200 whitespace-pre-wrap bg-slate-800/50 rounded p-2 font-sans">
                {metadata.stepsToReproduce}
              </pre>
            </div>
          )}

          {/* Expected vs Actual */}
          {(hasExpected || hasActual) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {hasExpected && (
                <div>
                  <p className="text-xs font-medium text-green-400 mb-1">Expected</p>
                  <p className="text-sm text-slate-200 bg-green-500/5 rounded p-2">
                    {metadata.expectedBehavior}
                  </p>
                </div>
              )}
              {hasActual && (
                <div>
                  <p className="text-xs font-medium text-red-400 mb-1">Actual</p>
                  <p className="text-sm text-slate-200 bg-red-500/5 rounded p-2">
                    {metadata.actualBehavior}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Attachments */}
          {hasAttachments && (
            <div className="pt-1">
              <p className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                Attachments ({metadata.attachments!.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {metadata.attachments!.map((att, i) => (
                  <a
                    key={i}
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs text-slate-300 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {att.name || `Attachment ${i + 1}`}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Diagnostics (admin only) */}
          {hasDiagnostics && (
            <div className="pt-1">
              <p className="text-xs font-medium text-slate-400 mb-2">Diagnostics</p>
              <div className="bg-slate-900/50 rounded p-3 text-xs text-slate-400 font-mono space-y-1 max-h-40 overflow-y-auto">
                {Object.entries(metadata.diagnostics!).map(([key, val]) => (
                  <div key={key} className="flex gap-2">
                    <span className="text-slate-500 flex-shrink-0">{key}:</span>
                    <span className="text-slate-300 break-all">{String(val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Activity Trail (admin only) */}
          {hasTrail && (
            <div className="pt-1">
              <p className="text-xs font-medium text-slate-400 mb-2 flex items-center gap-1">
                <Activity className="w-3 h-3" />
                Activity Trail ({metadata.activityTrail!.length} events)
              </p>
              <div className="bg-slate-900/50 rounded p-3 text-xs font-mono space-y-1 max-h-48 overflow-y-auto">
                {metadata.activityTrail!.map((evt, i) => (
                  <div key={i} className="flex items-center gap-2 text-slate-400">
                    <span className="text-slate-600 flex-shrink-0 w-16">
                      {new Date(evt.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className={`px-1 rounded text-[10px] font-medium ${
                      evt.type === 'click' ? 'bg-blue-500/20 text-blue-400' :
                      evt.type === 'navigation' ? 'bg-purple-500/20 text-purple-400' :
                      evt.type === 'api_error' ? 'bg-red-500/20 text-red-400' :
                      'bg-slate-700 text-slate-400'
                    }`}>
                      {evt.type}
                    </span>
                    <span className="text-slate-300 truncate">{evt.path}</span>
                    {evt.target && (
                      <span className="text-slate-500 truncate">({evt.target})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
