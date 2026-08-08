'use client'

import { useState } from 'react'

interface EmailSuiteInboxSetupProps {
  city: string
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="space-y-1">
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="flex items-stretch gap-2">
        <code className="flex-1 min-w-0 rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-xs text-emerald-300 break-all">
          {value}
        </code>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value)
              setCopied(true)
              window.setTimeout(() => setCopied(false), 1600)
            } catch {
              /* ignore */
            }
          }}
          className="shrink-0 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-100 text-xs font-medium"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  )
}

/**
 * Franchise-facing guide: turn on Resend Receiving + webhooks so Inbox works.
 * Assumes send DNS (DKIM/SPF) is already verified for most partners.
 */
export function EmailSuiteInboxSetup({ city }: EmailSuiteInboxSetupProps) {
  const citySlug = city.toLowerCase()
  const domain = `${citySlug}.qwikker.com`
  const webhookUrl = `https://${domain}/api/webhooks/resend`
  const replyTo = `hello@${domain}`

  return (
    <details
      open
      className="rounded-xl border border-slate-700 bg-slate-800/40 group"
    >
      <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-slate-100 font-medium text-sm">Inbox setup guide</div>
          <p className="text-xs text-slate-400 mt-0.5">
            Enable replies into Email Suite for {domain}. Sending DNS can stay as-is.
          </p>
        </div>
        <span className="text-xs text-slate-500 group-open:hidden">Show</span>
        <span className="text-xs text-slate-500 hidden group-open:inline">Hide</span>
      </summary>

      <div className="px-4 pb-4 space-y-5 border-t border-slate-700/80 pt-4 text-sm">
        <div className="rounded-lg border border-slate-600/80 bg-slate-900/50 p-3 space-y-3">
          <div className="text-xs text-slate-400">
            Use these values for <span className="text-slate-200 font-medium">{citySlug}</span>
          </div>
          <CopyField label="Webhook URL" value={webhookUrl} />
          <CopyField label="Test Inbox address (auto reply-to)" value={replyTo} />
          <CopyField label="Cloudflare MX name" value={citySlug} />
        </div>

        <ol className="space-y-4 list-decimal list-outside pl-5 text-slate-300">
          <li className="space-y-1">
            <div className="font-medium text-slate-100">Confirm sending is already verified</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              In Resend → Domains → <span className="font-mono text-slate-300">{domain}</span>, DKIM and
              Enable Sending (SPF) should already show Verified. You do not need to recreate those
              records.
            </p>
          </li>

          <li className="space-y-1">
            <div className="font-medium text-slate-100">Turn on Receiving for the city domain</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Still on that domain page, find <span className="text-slate-300">Enable Receiving (MX)</span>{' '}
              and switch it on. Resend shows the MX record to add — copy the mail server hostname from
              that modal (it can differ by region; do not assume a fixed value).
            </p>
          </li>

          <li className="space-y-2">
            <div className="font-medium text-slate-100">Add the MX record in Cloudflare</div>
            <div className="rounded-lg border border-red-500/50 bg-red-950/40 px-3 py-3 space-y-2">
              <div className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-red-500/20 text-red-300 border border-red-500/40">
                HQ only
              </div>
              <p className="text-xs text-red-100/90 leading-relaxed">
                This step is for HQ (DNS access). Franchise partners: skip — ask HQ to add Receiving
                MX for <span className="font-mono text-red-50">{domain}</span>, then continue from
                step 4.
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Goal: mail for <span className="font-mono text-slate-100">{domain}</span> (not the
                apex). In Cloudflare → DNS → Records, add:
              </p>
              <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">
                <li>
                  Type: <span className="text-slate-100">MX</span>
                </li>
                <li>
                  Name: <span className="font-mono text-slate-100">{citySlug}</span> only — that
                  creates MX for <span className="font-mono text-slate-100">{domain}</span>. Do not
                  use <span className="font-mono">@</span> or paste the full hostname in Name.
                </li>
                <li>
                  Mail server: paste the hostname Resend showed (hostname only — no{' '}
                  <span className="font-mono">http://</span>, no trailing slash)
                </li>
                <li>
                  Priority: <span className="text-slate-100">10</span> (or whatever Resend shows)
                </li>
                <li>TTL: Auto</li>
              </ul>
              <p className="text-xs text-amber-100/90 bg-amber-500/10 border border-amber-500/25 rounded-md px-2.5 py-2 leading-relaxed">
                Mail server must be a hostname only — no <span className="font-mono">http://</span>,
                no trailing slash. Only one Receiving MX for{' '}
                <span className="font-mono">{domain}</span>. Keep the separate{' '}
                <span className="font-mono">send.{citySlug}</span> MX used for sending.
              </p>
            </div>
          </li>

          <li className="space-y-1">
            <div className="font-medium text-slate-100">Verify Receiving in Resend</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Back in Resend, click that you added the record and wait until Enable Receiving shows
              Verified (usually a few minutes). If it says conflicting MX records, remove any extra MX
              on <span className="font-mono text-slate-300">{citySlug}</span> and keep only Resend’s.
            </p>
          </li>

          <li className="space-y-1">
            <div className="font-medium text-slate-100">Create the Resend webhook</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Resend → Webhooks → Add Webhook:
            </p>
            <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4">
              <li>
                Endpoint URL: paste the webhook URL above (
                <span className="font-mono text-slate-300">…/api/webhooks/resend</span>)
              </li>
              <li>
                Enable at least:{' '}
                <span className="font-mono text-slate-300">email.received</span> (required for Inbox)
              </li>
              <li>
                Also enable for History tracking:{' '}
                <span className="font-mono text-slate-300">email.delivered</span>,{' '}
                <span className="font-mono text-slate-300">email.bounced</span>,{' '}
                <span className="font-mono text-slate-300">email.complained</span>,{' '}
                <span className="font-mono text-slate-300">email.failed</span>
              </li>
            </ul>
            <p className="text-xs text-slate-400 leading-relaxed mt-1">
              After creating, open the webhook and copy the signing secret (
              <span className="font-mono text-slate-300">whsec_…</span>).
            </p>
          </li>

          <li className="space-y-1">
            <div className="font-medium text-slate-100">Paste the secret in Qwikker</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Admin → City Configuration → Resend section →{' '}
              <span className="text-slate-300">Resend Webhook Signing Secret</span> → paste{' '}
              <span className="font-mono text-slate-300">whsec_…</span> → Save Resend settings.
              Your API key should already be there from send setup.
            </p>
          </li>

          <li className="space-y-1">
            <div className="font-medium text-slate-100">Test Inbox</div>
            <p className="text-xs text-slate-400 leading-relaxed">
              From any personal email, send a short message to{' '}
              <span className="font-mono text-slate-300">{replyTo}</span>. Within a minute it should
              appear under Email Suite → Inbox. Replies to franchise outbound mail (Reply-To{' '}
              {replyTo}) use the same path.
            </p>
          </li>
        </ol>

        <div className="text-xs text-slate-500 leading-relaxed border-t border-slate-700/80 pt-3">
          One webhook URL per city. Resend + webhook secret are usually franchise-side; Cloudflare MX
          for <span className="font-mono">{domain}</span> is HQ-only (red box above).
        </div>
      </div>
    </details>
  )
}
