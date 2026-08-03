'use client'

import { useEffect, useRef, useState } from 'react'
import { PartnersReveal } from '@/components/partners/sections/reveal'
import { PARTNERS_IMG } from '@/components/partners/sections/visual-assets'

const QUESTIONS = [
  'We’re only here for 48 hours. Plan the perfect weekend.',
  'My son is autistic and gets overwhelmed easily. Where should we go today?',
  'I don’t want tourist food. I want somewhere locals actually eat.',
  'Which coffee shops roast their own beans and are worth travelling for?',
  'I need somewhere I can work all day without feeling guilty for buying one coffee.',
]

/** Staggered “AI thinking” conversation prompts → infrastructure close. */
export function PartnersVision() {
  const listRef = useRef<HTMLUListElement>(null)
  const [visibleCount, setVisibleCount] = useState(0)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    const el = listRef.current
    if (!el) return

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setStarted(true)
        io.disconnect()
      },
      { threshold: 0.25 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    if (!started) return

    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced) {
      setVisibleCount(QUESTIONS.length)
      return
    }

    setVisibleCount(1)
    let i = 1
    const id = window.setInterval(() => {
      i += 1
      setVisibleCount(i)
      if (i >= QUESTIONS.length) window.clearInterval(id)
    }, 1100)

    return () => window.clearInterval(id)
  }, [started])

  return (
    <section
      id="vision"
      className="relative overflow-hidden border-t border-[var(--p-border)] bg-black px-5 py-20 sm:px-6 sm:py-28"
    >
      <div className="absolute inset-0">
        <img
          src={PARTNERS_IMG.visionWindow}
          alt=""
          className="h-full w-full object-cover opacity-25 mix-blend-screen"
          aria-hidden
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black via-black/85 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,196,106,0.08),transparent_55%)]" />
      </div>

      <div className="relative mx-auto max-w-3xl">
        <PartnersReveal className="mb-12 text-center">
          <p className="mb-4 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--p-accent)]">
            The vision
          </p>
          <h2
            className="text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-[3.15rem]"
            style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
          >
            Imagine when AI becomes the front door to every city.
          </h2>
        </PartnersReveal>

        <ul ref={listRef} className="mb-12 min-h-[12rem] space-y-3 sm:min-h-[14rem]" aria-live="polite">
          {QUESTIONS.slice(0, Math.max(visibleCount, 0)).map((q) => (
            <li
              key={q}
              className="animate-[partnersVisionIn_0.7s_ease-out] rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-left text-sm leading-relaxed text-white/90 sm:text-base"
            >
              <span className="text-[var(--p-accent)]">“</span>
              {q}
              <span className="text-[var(--p-accent)]">”</span>
            </li>
          ))}
        </ul>

        <div
          className="mx-auto max-w-2xl text-center transition-[opacity,transform] duration-700 ease-out"
          style={{
            opacity: visibleCount >= QUESTIONS.length ? 1 : 0,
            transform: visibleCount >= QUESTIONS.length ? 'none' : 'translateY(16px)',
          }}
        >
          <p
            className="mb-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl"
            style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
          >
            The questions are easy.
          </p>
          <p
            className="mb-8 text-2xl font-semibold tracking-tight text-[var(--p-muted)] sm:text-3xl"
            style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
          >
            The answers aren&apos;t.
          </p>
          <div className="mb-8 space-y-3 text-base leading-relaxed text-[var(--p-muted)] sm:text-lg">
            <p>Every recommendation came from real businesses.</p>
            <p>Every answer was shaped by local knowledge.</p>
            <p>Every experience existed because someone built the ecosystem.</p>
          </div>
          <p
            className="mb-8 text-2xl font-semibold tracking-tight text-white sm:text-3xl"
            style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
          >
            Someone taught AI what this city is.
          </p>
          <p
            className="text-2xl font-semibold tracking-tight text-[var(--p-accent)] sm:text-4xl"
            style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
          >
            Who will teach AI about yours?
          </p>
        </div>
      </div>
    </section>
  )
}
