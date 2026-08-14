'use client'

import Link from 'next/link'

interface AiCompanionCardProps {
  title?: string
  description?: string
  prompts: string[]
  walletPassId?: string
  className?: string
}

/**
 * Compact “Ask Qwikker” entry — used on Offers / Events / etc.
 * Keep it small; the chat tab is the primary surface.
 */
export function AiCompanionCard({
  title = 'Ask Qwikker',
  description,
  prompts,
  walletPassId,
  className = '',
}: AiCompanionCardProps) {
  const getNavUrl = (href: string) => {
    if (!walletPassId) return href
    return `${href}?wallet_pass_id=${walletPassId}`
  }

  const prompt = prompts[0]
  const href = prompt
    ? `${getNavUrl('/user/chat')}${walletPassId ? '&' : '?'}message=${encodeURIComponent(prompt)}`
    : getNavUrl('/user/chat')

  const subtitle = description
    ? description
    : prompt
      ? `Try “${prompt}”`
      : 'Get local picks in chat'

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950/90 px-3.5 py-3 active:bg-zinc-900 transition-colors touch-manipulation ${className}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#00d083]/15 text-[#00d083]">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-sm font-semibold text-zinc-100">{title}</span>
        <span className="block text-xs text-zinc-500 truncate mt-0.5">{subtitle}</span>
      </span>
      <svg className="w-4 h-4 text-zinc-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}
