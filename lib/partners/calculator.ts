export interface CalculatorInput {
  starterCount: number
  featuredCount: number
  spotlightCount: number
  /** When true, $249 monthly applies (month 7 onward). */
  afterIncludedMonths: boolean
}

export interface CalculatorResult {
  monthlyRecurringRevenue: number
  monthlyPrice: number
  estimatedRevenueAfterMonthlyPrice: number
}

export const CALCULATOR_PRICES = {
  starter: 19.99,
  featured: 49.99,
  spotlight: 99.99,
  monthly: 249,
} as const

export const CALCULATOR_BOUNDS = {
  starterCount: { default: 25, min: 0, max: 1000 },
  featuredCount: { default: 10, min: 0, max: 500 },
  spotlightCount: { default: 5, min: 0, max: 250 },
} as const

export interface CalculatorPreset {
  id: 'conservative' | 'realistic' | 'strong' | 'dominant'
  label: string
  starterCount: number
  featuredCount: number
  spotlightCount: number
}

export const CALCULATOR_PRESETS: CalculatorPreset[] = [
  {
    id: 'conservative',
    label: 'Conservative',
    starterCount: 10,
    featuredCount: 3,
    spotlightCount: 1,
  },
  {
    id: 'realistic',
    label: 'Realistic',
    starterCount: 25,
    featuredCount: 10,
    spotlightCount: 5,
  },
  {
    id: 'strong',
    label: 'Strong',
    starterCount: 50,
    featuredCount: 20,
    spotlightCount: 10,
  },
  {
    id: 'dominant',
    label: 'Dominant',
    starterCount: 100,
    featuredCount: 40,
    spotlightCount: 20,
  },
]

function clamp(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min
  return Math.min(max, Math.max(min, n))
}

export function normalizeCalculatorInput(input: Partial<CalculatorInput>): CalculatorInput {
  return {
    starterCount: clamp(
      Math.round(input.starterCount ?? CALCULATOR_BOUNDS.starterCount.default),
      CALCULATOR_BOUNDS.starterCount.min,
      CALCULATOR_BOUNDS.starterCount.max
    ),
    featuredCount: clamp(
      Math.round(input.featuredCount ?? CALCULATOR_BOUNDS.featuredCount.default),
      CALCULATOR_BOUNDS.featuredCount.min,
      CALCULATOR_BOUNDS.featuredCount.max
    ),
    spotlightCount: clamp(
      Math.round(input.spotlightCount ?? CALCULATOR_BOUNDS.spotlightCount.default),
      CALCULATOR_BOUNDS.spotlightCount.min,
      CALCULATOR_BOUNDS.spotlightCount.max
    ),
    afterIncludedMonths: input.afterIncludedMonths ?? true,
  }
}

export function calculateTerritoryRevenue(raw: Partial<CalculatorInput>): CalculatorResult {
  const input = normalizeCalculatorInput(raw)

  const monthlyRecurringRevenue =
    input.starterCount * CALCULATOR_PRICES.starter +
    input.featuredCount * CALCULATOR_PRICES.featured +
    input.spotlightCount * CALCULATOR_PRICES.spotlight

  const monthlyPrice = input.afterIncludedMonths ? CALCULATOR_PRICES.monthly : 0
  const estimatedRevenueAfterMonthlyPrice = monthlyRecurringRevenue - monthlyPrice

  return {
    monthlyRecurringRevenue,
    monthlyPrice,
    estimatedRevenueAfterMonthlyPrice,
  }
}

export function defaultCalculatorInput(): CalculatorInput {
  return normalizeCalculatorInput({ afterIncludedMonths: true })
}
