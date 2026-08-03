'use client'

import { useEffect, useId, useState, type ReactNode } from 'react'
import {
  CALCULATOR_BOUNDS,
  CALCULATOR_PRESETS,
  calculateTerritoryRevenue,
  defaultCalculatorInput,
  type CalculatorInput,
} from '@/lib/partners/calculator'
import { formatMoney } from '@/lib/partners/format-money'
import { commercialCopy } from '@/lib/partners/commercial-copy'
import { trackPartnersEvent } from '@/lib/partners/analytics'
import { AnimatedMoney } from '@/components/partners/animated-number'

export function PartnersCalculator() {
  const [input, setInput] = useState<CalculatorInput>(defaultCalculatorInput)
  const result = calculateTerritoryRevenue(input)
  const liveId = useId()

  useEffect(() => {
    trackPartnersEvent('partners_calculator_interacted')
  }, [input.starterCount, input.featuredCount, input.spotlightCount])

  const setField = <K extends keyof CalculatorInput>(key: K, value: CalculatorInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: value }))
  }

  const after = result.estimatedRevenueAfterMonthlyPrice
  const afterLabel =
    after < 0
      ? `Estimated position after ${commercialCopy.monthlyPriceLabel.toLowerCase()}`
      : `Estimated revenue after ${commercialCopy.monthlyPriceLabel.toLowerCase()}`

  return (
    <section id="calculator" className="border-t border-[var(--p-border)] px-5 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h2
            className="mb-3 text-3xl font-semibold tracking-tight sm:text-4xl"
            style={{ fontFamily: 'var(--font-partners-display), sans-serif' }}
          >
            Income calculator
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-[var(--p-muted)]">
            Slide the business mix to see estimated monthly recurring revenue.
          </p>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[var(--p-surface)] p-6 shadow-[0_0_80px_-40px_rgba(0,196,106,0.25)] sm:p-10">
          <div className="mb-8 flex flex-wrap gap-2">
            {CALCULATOR_PRESETS.map((p) => {
              const active =
                input.starterCount === p.starterCount &&
                input.featuredCount === p.featuredCount &&
                input.spotlightCount === p.spotlightCount
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() =>
                    setInput({
                      ...input,
                      starterCount: p.starterCount,
                      featuredCount: p.featuredCount,
                      spotlightCount: p.spotlightCount,
                    })
                  }
                  className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                    active
                      ? 'border-[var(--p-accent)] bg-[var(--p-accent-dim)] text-white'
                      : 'border-[var(--p-border)] text-[var(--p-muted)] hover:border-white/20 hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>

          <div className="grid gap-10 lg:grid-cols-2">
            <div className="space-y-6">
              <SliderField
                label="Starter businesses"
                value={input.starterCount}
                min={CALCULATOR_BOUNDS.starterCount.min}
                max={CALCULATOR_BOUNDS.starterCount.max}
                onChange={(v) => setField('starterCount', v)}
              />
              <SliderField
                label="Featured businesses"
                value={input.featuredCount}
                min={CALCULATOR_BOUNDS.featuredCount.min}
                max={CALCULATOR_BOUNDS.featuredCount.max}
                onChange={(v) => setField('featuredCount', v)}
              />
              <SliderField
                label="Spotlight businesses"
                value={input.spotlightCount}
                min={CALCULATOR_BOUNDS.spotlightCount.min}
                max={CALCULATOR_BOUNDS.spotlightCount.max}
                onChange={(v) => setField('spotlightCount', v)}
              />
              <fieldset>
                <legend className="mb-2 text-sm text-[var(--p-muted)]">Period</legend>
                <div className="flex gap-2">
                  <ToggleChip
                    active={!input.afterIncludedMonths}
                    onClick={() => setField('afterIncludedMonths', false)}
                    label="First six months"
                  />
                  <ToggleChip
                    active={input.afterIncludedMonths}
                    onClick={() => setField('afterIncludedMonths', true)}
                    label="Month 7 onward"
                  />
                </div>
              </fieldset>

              <p className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-xs leading-relaxed text-[var(--p-faint)]">
                {commercialCopy.calculatorApiNote}
              </p>
            </div>

            <div
              className={`space-y-4 rounded-2xl border bg-gradient-to-b from-[rgba(0,196,106,0.12)] to-[var(--p-elevated)] p-6 transition-[border-color,box-shadow] duration-500 ${
                after >= 1500
                  ? 'border-[var(--p-accent)]/55 shadow-[0_0_48px_-16px_rgba(0,196,106,0.55)]'
                  : 'border-[var(--p-accent)]/30'
              }`}
              aria-live="polite"
              id={liveId}
            >
              <Row
                label="Monthly recurring revenue"
                value={
                  <AnimatedMoney
                    value={result.monthlyRecurringRevenue}
                    className="text-[var(--p-accent)]"
                  />
                }
                emphasize
              />
              <Row
                label={`${commercialCopy.monthlyPriceLabel} (after included period)`}
                value={
                  result.monthlyPrice ? (
                    <span>
                      −
                      <AnimatedMoney value={result.monthlyPrice} />
                    </span>
                  ) : (
                    formatMoney(0)
                  )
                }
              />
              <div className="border-t border-[var(--p-border)] pt-4">
                <p className="mb-1 text-xs text-[var(--p-faint)]">{afterLabel}</p>
                <p
                  className={`text-3xl font-semibold tracking-tight tabular-nums ${
                    after < 0 ? 'text-[var(--p-reserved)]' : 'text-[var(--p-accent)]'
                  }`}
                >
                  <AnimatedMoney value={after} signed={after !== 0} />
                </p>
                {after < 0 && (
                  <p className="mt-2 text-xs text-[var(--p-reserved)]">
                    Estimated shortfall vs {commercialCopy.monthlyPriceLabel.toLowerCase()} this
                    month
                  </p>
                )}
                {after >= 1500 && (
                  <p className="mt-2 text-xs text-[var(--p-accent)]">
                    Strong recurring base — keep exploring.
                  </p>
                )}
              </div>
              <p className="pt-2 text-xs leading-relaxed text-[var(--p-faint)]">
                {commercialCopy.calculatorDisclaimer}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CALCULATOR_PRESETS.map((p) => {
            const r = calculateTerritoryRevenue({
              starterCount: p.starterCount,
              featuredCount: p.featuredCount,
              spotlightCount: p.spotlightCount,
              afterIncludedMonths: true,
            })
            return (
              <button
                key={`card-${p.id}`}
                type="button"
                onClick={() =>
                  setInput({
                    ...input,
                    starterCount: p.starterCount,
                    featuredCount: p.featuredCount,
                    spotlightCount: p.spotlightCount,
                    afterIncludedMonths: true,
                  })
                }
                className="rounded-2xl border border-[var(--p-border)] bg-[var(--p-surface)] p-5 text-left transition-colors hover:border-[var(--p-accent)]/40"
              >
                <p className="mb-2 text-xs uppercase tracking-[0.12em] text-[var(--p-faint)]">
                  {p.label}
                </p>
                <p className="text-xl font-semibold tabular-nums text-[var(--p-accent)]">
                  {formatMoney(r.monthlyRecurringRevenue)}
                </p>
                <p className="mt-1 text-xs text-[var(--p-faint)]">Monthly recurring</p>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Row({
  label,
  value,
  emphasize,
}: {
  label: string
  value: ReactNode
  emphasize?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-[var(--p-muted)]">{label}</span>
      <span
        className={`font-medium tabular-nums ${emphasize ? 'text-white' : 'text-[var(--p-text)]'}`}
      >
        {value}
      </span>
    </div>
  )
}

function ToggleChip({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? 'border-[var(--p-accent)] bg-[var(--p-accent-dim)] text-white'
          : 'border-[var(--p-border)] text-[var(--p-muted)]'
      }`}
    >
      {label}
    </button>
  )
}

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  prefix,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  prefix?: string
  onChange: (v: number) => void
}) {
  const id = useId()
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm text-[var(--p-muted)]">
          {label}
        </label>
        <div className="flex items-center gap-1">
          {prefix && <span className="text-xs text-[var(--p-faint)]">{prefix}</span>}
          <input
            id={`${id}-num`}
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-24 rounded-md border border-[var(--p-border)] bg-[#050505] px-2 py-1 text-sm tabular-nums text-white focus:outline-none focus:ring-1 focus:ring-[var(--p-accent)]"
          />
        </div>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[var(--p-accent)]"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
      />
    </div>
  )
}
