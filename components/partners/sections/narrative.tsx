'use client'

import type { ReactNode } from 'react'
import { PARTNERS_IMG } from '@/components/partners/sections/visual-assets'
import { PartnersReveal } from '@/components/partners/sections/reveal'
import { PartnersShiftScroll } from '@/components/partners/sections/shift-scroll'
import { PartnersOwnershipLock } from '@/components/partners/sections/ownership-lock'
import { PartnersErasLock } from '@/components/partners/sections/eras-lock'
import { PartnersEarlyMovers } from '@/components/partners/sections/early-movers'
import { PartnersVision } from '@/components/partners/sections/vision-conversations'

interface NarrativePanelProps {
  id: string
  eyebrow?: string
  title: ReactNode
  image: string
  imageAlt: string
  reverse?: boolean
  /** For graphics with black backgrounds (e.g. growth curve). */
  imageContain?: boolean
  imageBlendScreen?: boolean
  /**
   * True side-by-side columns — image stays in its own container,
   * never under the copy (vs. cinematic bleed layout).
   */
  split?: boolean
  children: ReactNode
}

function NarrativePanel({
  id,
  eyebrow,
  title,
  image,
  imageAlt,
  reverse = false,
  imageContain = false,
  imageBlendScreen = false,
  split = false,
  children,
}: NarrativePanelProps) {
  const copy = (
    <PartnersReveal className="w-full">
      {eyebrow ? (
        <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--p-accent)]">
          {eyebrow}
        </p>
      ) : null}
      <h2
        className="mb-8 text-3xl font-semibold leading-[1.12] tracking-tight sm:text-4xl lg:text-[2.75rem]"
        style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
      >
        {title}
      </h2>
      <div className="space-y-6 text-base leading-relaxed text-[var(--p-muted)] sm:text-lg">
        {children}
      </div>
    </PartnersReveal>
  )

  if (split) {
    const imgClass = `h-full w-full object-center ${
      imageContain ? 'object-contain p-4 sm:p-6' : 'object-cover'
    } ${imageBlendScreen ? 'mix-blend-screen' : ''}`

    return (
      <section
        id={id}
        className="relative overflow-hidden border-t border-[var(--p-border)] bg-black"
      >
        <div
          className={`mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-14 lg:py-24 ${
            reverse ? 'lg:[&>div:first-child]:order-2' : ''
          }`}
        >
          <div className="relative aspect-[4/3] w-full overflow-hidden sm:aspect-[5/4] lg:aspect-square">
            <img src={image} alt={imageAlt} className={imgClass} loading="lazy" />
          </div>
          <div className="min-w-0 lg:py-4">{copy}</div>
        </div>
      </section>
    )
  }

  // Feather image pixels into page black — avoids a hard grey/black seam.
  const desktopMask = reverse
    ? 'linear-gradient(to left, #000 0%, #000 45%, rgba(0,0,0,0.55) 68%, transparent 100%)'
    : 'linear-gradient(to right, #000 0%, #000 45%, rgba(0,0,0,0.55) 68%, transparent 100%)'

  const imgClass = `absolute inset-0 h-full w-full object-center ${
    imageContain ? 'object-contain p-6 sm:p-10' : 'scale-105 object-cover'
  } ${imageBlendScreen ? 'mix-blend-screen' : ''}`

  return (
    <section
      id={id}
      className="relative min-h-[min(82vh,720px)] overflow-hidden border-t border-[var(--p-border)] bg-black"
    >
      {/* Desktop: image on one side, masked soft edge into copy */}
      <div
        className={`pointer-events-none absolute inset-y-0 hidden w-[72%] lg:block ${
          reverse ? 'right-0' : 'left-0'
        }`}
        style={{
          WebkitMaskImage: desktopMask,
          maskImage: desktopMask,
        }}
      >
        <img src={image} alt={imageAlt} className={imgClass} loading="lazy" />
        {!imageBlendScreen && (
          <div
            className={`absolute inset-0 ${
              reverse
                ? 'bg-[radial-gradient(ellipse_at_65%_45%,rgba(0,196,106,0.14),transparent_55%)]'
                : 'bg-[radial-gradient(ellipse_at_40%_45%,rgba(0,196,106,0.14),transparent_55%)]'
            }`}
          />
        )}
      </div>

      {/* Mobile: full-width image dissolving downward into copy */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[58%] lg:hidden"
        style={{
          WebkitMaskImage:
            'linear-gradient(to bottom, #000 0%, #000 40%, rgba(0,0,0,0.5) 70%, transparent 100%)',
          maskImage:
            'linear-gradient(to bottom, #000 0%, #000 40%, rgba(0,0,0,0.5) 70%, transparent 100%)',
        }}
      >
        <img src={image} alt="" className={imgClass} aria-hidden loading="lazy" />
      </div>

      <div
        className={`relative z-10 mx-auto flex min-h-[min(82vh,720px)] max-w-6xl items-end px-5 pb-16 pt-52 sm:px-6 sm:pb-20 sm:pt-56 lg:items-center lg:py-24 ${
          reverse ? 'lg:justify-start' : 'lg:justify-end'
        }`}
      >
        <div className="w-full max-w-xl lg:max-w-md xl:max-w-xl">{copy}</div>
      </div>
    </section>
  )
}

function StackList({ items, accentLast = false }: { items: string[]; accentLast?: boolean }) {
  return (
    <ul className="space-y-3.5 py-1">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <li
            key={item}
            className={`text-lg sm:text-xl font-semibold tracking-tight leading-snug ${
              accentLast && isLast ? 'text-[var(--p-accent)]' : 'text-white'
            }`}
            style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
          >
            {item}
          </li>
        )
      })}
    </ul>
  )
}

/** Full movement story — ownership, timing, territory. */
export function PartnersNarrative() {
  return (
    <>
      <PartnersShiftScroll />

      {/* Infrastructure — image left, copy right (same panel system as Exclusive) */}
      <NarrativePanel
        id="infrastructure"
        eyebrow="Not another agency"
        title={
          <>
            Don&apos;t build another business.
            <br />
            <span className="text-[var(--p-accent)]">Build the infrastructure.</span>
          </>
        }
        image={PARTNERS_IMG.networkGrid}
        imageAlt="Qwikker city infrastructure network connecting local businesses"
        imageBlendScreen
        split
      >
        <p>
          Imagine owning the platform that helps thousands of businesses across your city become
          discoverable in the AI era.
        </p>
        <StackList
          items={[
            'Not another marketing agency.',
            'Not another directory.',
            'Not another app.',
            'Infrastructure.',
          ]}
          accentLast
        />
        <p className="font-medium text-white">
          The operating system connecting people, places and businesses.
        </p>
      </NarrativePanel>

      <PartnersOwnershipLock />

      {/* 4 — Exclusive */}
      <NarrativePanel
        id="exclusive"
        eyebrow="Territory"
        reverse
        title={
          <>
            Exclusive means{' '}
            <span className="text-[var(--p-accent)]">exclusive.</span>
          </>
        }
        image={PARTNERS_IMG.territoryMap}
        imageAlt="Exclusive city territory marked on a night map"
      >
        <p>Every franchise controls one territory — one city, one region, one opportunity.</p>
        <p>
          As your market grows, every business, partnership and campaign strengthens an asset{' '}
          <span className="text-white font-medium">only you control</span>.
        </p>
        <p className="text-[var(--p-accent)] font-medium leading-relaxed">
          No competing Qwikker franchise opening down the road.
        </p>
      </NarrativePanel>

      <section className="relative border-t border-[var(--p-border)] bg-[#050505] px-5 py-20 sm:px-6 sm:py-28">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,196,106,0.06),transparent_55%)]" />
        <PartnersReveal className="relative mx-auto max-w-2xl text-center">
          <p
            className="text-2xl font-semibold leading-snug tracking-tight text-white sm:text-3xl"
            style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
          >
            Technology doesn&apos;t just create tools.
            <br />
            <span className="text-[var(--p-accent)]">It creates new kinds of owners.</span>
          </p>
        </PartnersReveal>
      </section>

      <PartnersErasLock />

      {/* The work — tighter; visual reinforces local ecosystem not generic office */}
      <NarrativePanel
        id="job"
        eyebrow="The work"
        reverse
        title={<>Your job isn&apos;t selling software.</>}
        image={PARTNERS_IMG.jobEcosystem}
        imageAlt="City mapped with local businesses, dining, events and services"
      >
        <p>Help businesses get ready for AI discovery. Build relationships. Grow the ecosystem.</p>
        <p className="text-white font-medium">
          As more businesses join, your city gets stronger — and harder to compete with.
        </p>
      </NarrativePanel>

      <PartnersEarlyMovers />

      {/* Scale — true split: curve owns the left, copy owns the right */}
      <section
        id="grow"
        className="relative overflow-hidden border-t border-[var(--p-border)] bg-black px-5 py-16 sm:px-6 sm:py-24"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <PartnersReveal className="relative order-1">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,196,106,0.18),transparent_60%)] blur-2xl" />
            <img
              src={PARTNERS_IMG.scaleGrowth}
              alt="Exponential growth curve"
              className="relative z-10 mx-auto w-full max-w-xl object-contain mix-blend-screen lg:max-w-none"
              loading="lazy"
            />
          </PartnersReveal>

          <PartnersReveal delayMs={80} className="order-2">
            <p className="mb-5 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--p-accent)]">
              Scale
            </p>
            <h2
              className="mb-6 text-3xl font-semibold leading-[1.1] tracking-tight text-white sm:text-4xl lg:text-[2.75rem]"
              style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
            >
              A business that can{' '}
              <span className="text-[var(--p-accent)]">grow with you.</span>
            </h2>
            <div className="space-y-5 text-base leading-relaxed text-[var(--p-muted)] sm:text-lg">
              <p>
                Start alone. Build a team. Expand into neighbouring territories. Partner with
                councils, tourism boards and major events.
              </p>
              <p className="font-medium text-white">How big you build it is your decision.</p>
            </div>
          </PartnersReveal>
        </div>
      </section>

      <PartnersVision />

      {/* Not for everyone */}

      <NarrativePanel
        id="who"
        eyebrow="Qualification"
        title={
          <>
            This isn&apos;t for{' '}
            <span className="text-[var(--p-accent)]">everyone.</span>
          </>
        }
        image={PARTNERS_IMG.summit}
        imageAlt="Territory partner overlooking a city skyline from a high-rise office at sunset"
      >
        <p>We&apos;re looking for people who see where technology is heading before everyone else does.</p>
        <ul className="space-y-3 text-white font-medium">
          <li>People who believe relationships still matter.</li>
          <li>People willing to build something meaningful in their community.</li>
          <li>People excited by AI — not intimidated by it.</li>
        </ul>
        <p
          className="text-xl sm:text-2xl font-semibold text-white pt-2"
          style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
        >
          Because the cities of tomorrow won&apos;t build themselves.
        </p>
      </NarrativePanel>
    </>
  )
}
