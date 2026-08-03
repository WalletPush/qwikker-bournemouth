/**
 * Partners Phase 1 unit tests — run with:
 *   pnpm exec tsx --test lib/partners/*.test.ts
 * or:
 *   npx --yes tsx --test lib/partners/*.test.ts
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  calculateTerritoryRevenue,
  normalizeCalculatorInput,
} from './calculator'
import { formatMoney } from './format-money'
import { computeFoundingCounts } from './founding'
import { resolveTerritoryAvailability } from './availability'
import { canTransitionClaimStatus, normalizeClaimStatus } from './claim-status'

describe('calculator', () => {
  it('computes MRR and monthly price', () => {
    const r = calculateTerritoryRevenue({
      starterCount: 10,
      featuredCount: 2,
      spotlightCount: 1,
      afterIncludedMonths: true,
    })
    assert.equal(r.monthlyRecurringRevenue, 10 * 19.99 + 2 * 49.99 + 99.99)
    assert.equal(r.monthlyPrice, 249)
    assert.equal(r.estimatedRevenueAfterMonthlyPrice, r.monthlyRecurringRevenue - 249)
  })

  it('allows negative after monthly without clamping', () => {
    const r = calculateTerritoryRevenue({
      starterCount: 0,
      featuredCount: 0,
      spotlightCount: 0,
      afterIncludedMonths: true,
    })
    assert.equal(r.estimatedRevenueAfterMonthlyPrice, -249)
  })

  it('zero monthly during first six months', () => {
    const r = calculateTerritoryRevenue({
      ...normalizeCalculatorInput({}),
      afterIncludedMonths: false,
    })
    assert.equal(r.monthlyPrice, 0)
  })
})

describe('formatMoney', () => {
  it('formats USD with Intl', () => {
    assert.match(formatMoney(19.99), /\$19\.99/)
  })
  it('formats negatives with minus sign', () => {
    const s = formatMoney(-49.1)
    assert.ok(s.includes('49.10') || s.includes('49.1'))
    assert.ok(s.startsWith('−') || s.startsWith('-'))
  })
})

describe('founding counts', () => {
  it('counts held; converted tracked separately; excludes submitted', () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    const r = computeFoundingCounts([
      { status: 'held', expires_at: future, is_founding_eligible: true, city_slug: 'bath' },
      { status: 'converted', is_founding_eligible: true, city_slug: 'bristol' },
      { status: 'submitted', is_founding_eligible: true, city_slug: 'york' },
      { status: 'email_verified', is_founding_eligible: true, city_slug: 'leeds' },
      { status: 'held', expires_at: future, is_founding_eligible: false, city_slug: 'hull' },
    ])
    assert.equal(r.securedCount, 1)
    assert.equal(r.convertedFoundingCount, 1)
    assert.equal(r.foundingOpen, true)
  })

  it('counts live owned cities toward founding secured', () => {
    const future = new Date(Date.now() + 86400000).toISOString()
    const r = computeFoundingCounts(
      [{ status: 'held', expires_at: future, is_founding_eligible: true, city_slug: 'bath' }],
      ['london', 'dubai', 'bangkok']
    )
    assert.equal(r.securedCount, 4)
    assert.equal(r.liveOwnedCount, 3)
  })

  it('converted without franchise does not inflate founding secured', () => {
    const r = computeFoundingCounts(
      [{ status: 'converted', is_founding_eligible: true, city_slug: 'london' }],
      ['london', 'dubai']
    )
    assert.equal(r.securedCount, 2)
    assert.equal(r.convertedFoundingCount, 1)
  })
})

describe('availability', () => {
  it('owned franchise beats everything', () => {
    assert.equal(
      resolveTerritoryAvailability({
        citySlug: 'london',
        franchises: [{ city: 'london', status: 'active' }],
        holds: [],
      }),
      'owned'
    )
  })

  it('active held is reserved', () => {
    assert.equal(
      resolveTerritoryAvailability({
        citySlug: 'bath',
        franchises: [],
        holds: [
          {
            city_slug: 'bath',
            status: 'held',
            expires_at: new Date(Date.now() + 86400000).toISOString(),
          },
        ],
      }),
      'reserved'
    )
  })

  it('available when empty', () => {
    assert.equal(
      resolveTerritoryAvailability({
        citySlug: 'exeter',
        franchises: [],
        holds: [],
      }),
      'available'
    )
  })

  it('HQ hub without franchise is reserved (not live)', () => {
    assert.equal(
      resolveTerritoryAvailability({
        citySlug: 'sydney',
        franchises: [],
        holds: [],
        flags: { is_hub: true, market_status: 'owned' },
      }),
      'reserved'
    )
  })

  it('tier-1 market reserved blocks claims', () => {
    assert.equal(
      resolveTerritoryAvailability({
        citySlug: 'manchester',
        franchises: [],
        holds: [],
        flags: { market_status: 'reserved' },
      }),
      'reserved'
    )
  })
})

describe('claim transitions', () => {
  it('maps legacy claimed to held', () => {
    assert.equal(normalizeClaimStatus('claimed'), 'held')
  })

  it('allows submitted → email_verified → held → converted', () => {
    assert.equal(canTransitionClaimStatus('submitted', 'email_verified'), true)
    assert.equal(canTransitionClaimStatus('email_verified', 'held'), true)
    assert.equal(canTransitionClaimStatus('held', 'converted'), true)
    assert.equal(canTransitionClaimStatus('submitted', 'rejected'), true)
    assert.equal(canTransitionClaimStatus('converted', 'held'), false)
  })
})
