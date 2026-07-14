'use client'

import { useState, useEffect, useCallback } from 'react'

interface Counts {
  total: number
  pending: number
  notified: number
}

export function WaitlistPanel() {
  const [counts, setCounts] = useState<Counts | null>(null)
  const [loading, setLoading] = useState(true)
  const [notifying, setNotifying] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [preview, setPreview] = useState<{ subject: string; html: string; pending: number } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/waitlist')
      if (res.ok) {
        const data = await res.json()
        setCounts({ total: data.total, pending: data.pending, notified: data.notified })
      }
    } catch {
      // best-effort; leave counts null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function openPreview() {
    if (!counts?.pending) return
    setPreviewLoading(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/waitlist?preview=email')
      if (res.ok) {
        const data = await res.json()
        setPreview({ subject: data.subject, html: data.html, pending: data.pending })
      } else {
        setMessage({ type: 'error', text: 'Could not load the email preview.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error loading preview.' })
    } finally {
      setPreviewLoading(false)
    }
  }

  async function handleNotify() {
    if (notifying || !counts?.pending) return
    setNotifying(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'notify' }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setMessage({ type: 'success', text: `Sent to ${data.sent} ${data.sent === 1 ? 'person' : 'people'}.` })
      } else if (res.ok) {
        setMessage({ type: 'error', text: `Sent ${data.sent}, ${data.failed} failed. Try again to retry the rest.` })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send.' })
      }
      await load()
      setPreview(null)
    } catch {
      setMessage({ type: 'error', text: 'Network error.' })
    } finally {
      setNotifying(false)
    }
  }

  if (loading) return null
  if (!counts || counts.total === 0) return null

  return (
    <div className="mt-4 pt-4 border-t border-[#00d083]/20">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm text-slate-300">
          <span className="font-semibold text-white">{counts.total}</span> on the waitlist
          {counts.pending > 0 ? (
            <span className="text-slate-400"> · {counts.pending} not yet notified</span>
          ) : (
            <span className="text-slate-400"> · all notified</span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href="/api/admin/waitlist?export=csv"
            className="px-3 py-2 text-xs font-medium rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-500 transition-colors"
          >
            Export CSV
          </a>
          <button
            type="button"
            onClick={openPreview}
            disabled={previewLoading || counts.pending === 0}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-[#00d083] text-white transition-colors hover:bg-[#00b86f] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {previewLoading
              ? 'Loading…'
              : counts.pending > 0
                ? `Notify ${counts.pending} ${counts.pending === 1 ? 'person' : 'people'}`
                : 'Everyone notified'}
          </button>
        </div>
      </div>
      {message && (
        <p className={`mt-2 text-xs ${message.type === 'success' ? 'text-[#00d083]' : 'text-red-400'}`}>{message.text}</p>
      )}

      {/* Email preview + confirm modal */}
      {preview && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          onClick={() => !notifying && setPreview(null)}
        >
          <div
            className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-700">
              <p className="text-sm font-semibold text-white">Preview launch email</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Sending to <span className="text-white font-medium">{preview.pending}</span> {preview.pending === 1 ? 'person' : 'people'} who haven&apos;t been notified yet.
              </p>
            </div>

            <div className="px-5 py-3 border-b border-slate-800 bg-slate-950/50">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">Subject</p>
              <p className="text-sm text-slate-200 mt-0.5">{preview.subject}</p>
            </div>

            <div className="flex-1 overflow-auto bg-white">
              <iframe title="Email preview" srcDoc={preview.html} className="w-full h-[360px] border-0" />
            </div>

            <div className="px-5 py-4 border-t border-slate-700 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreview(null)}
                disabled={notifying}
                className="px-4 py-2 text-xs font-medium rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-500 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleNotify}
                disabled={notifying || preview.pending === 0}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-[#00d083] text-white transition-colors hover:bg-[#00b86f] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {notifying ? 'Sending…' : `Send to ${preview.pending} ${preview.pending === 1 ? 'person' : 'people'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
