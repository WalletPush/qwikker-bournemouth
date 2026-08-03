'use client'

import { useEffect, useState } from 'react'
import { commercialCopy } from '@/lib/partners/commercial-copy'

const LOGO_URL =
  'https://res.cloudinary.com/dsh32kke7/image/upload/f_png,q_auto,w_320/v1768348190/Qwikker_Logo_web_lbql19.svg'

const LINKS = [
  { href: '#opportunity', label: 'Opportunity' },
  { href: '#shift', label: 'The Shift' },
  { href: '#exclusive', label: 'Territory' },
  { href: '#pricing', label: 'Pricing' },
  { href: '#calculator', label: 'Calculator' },
  { href: '#faq', label: 'FAQ' },
]

export function PartnersNav({ onReserve }: { onReserve: () => void }) {
  const [compact, setCompact] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      setCompact(window.scrollY > 40)
      const doc = document.documentElement
      const max = doc.scrollHeight - window.innerHeight
      setProgress(max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 border-b border-[var(--p-border)] bg-[#050505]/85 backdrop-blur-xl transition-[height] duration-300 ${
        compact ? 'h-14' : 'h-16'
      }`}
    >
      <div
        className="absolute left-0 top-0 h-[2px] bg-[var(--p-accent)] transition-[width] duration-150"
        style={{ width: `${progress}%` }}
        aria-hidden
      />
      <div className="mx-auto max-w-6xl h-full flex items-center justify-between gap-4 px-5 sm:px-6">
        <a href="/" className="shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--p-accent)]">
          <img src={LOGO_URL} alt="QWIKKER" className="h-7" />
        </a>
        <nav className="hidden lg:flex items-center gap-6" aria-label="Partners">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-[var(--p-muted)] hover:text-white transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--p-accent)] rounded"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <button
          type="button"
          onClick={onReserve}
          className="rounded-lg bg-[var(--p-accent)] px-4 py-2 text-sm font-semibold text-[#050505] hover:brightness-110 active:scale-[0.98] transition-[filter,transform] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Reserve Your Territory
        </button>
      </div>
      <p className="sr-only">{commercialCopy.framing}</p>
    </header>
  )
}
