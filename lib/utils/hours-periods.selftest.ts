/**
 * Quick sanity checks for multi-period hours helpers.
 * Run: pnpm exec tsx lib/utils/hours-periods.selftest.ts
 */
import {
  getDayPeriods,
  isTimeWithinPeriods,
  getNextChangeToday,
  normalizeDayHours,
  parseTimeRangesFromDayRest,
  formatPeriodsRange,
} from './hours-periods'

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg)
}

// Legacy single range
{
  const p = getDayPeriods({ open: '09:00', close: '17:00', closed: false })
  assert(p.length === 1 && p[0].open === '09:00', 'legacy single')
  assert(isTimeWithinPeriods(p, 10 * 60).open === true, 'open mid-morning')
  assert(isTimeWithinPeriods(p, 18 * 60).open === false, 'closed after')
}

// Dual range lunch gap
{
  const day = normalizeDayHours({
    closed: false,
    periods: [
      { open: '12:00', close: '15:00' },
      { open: '17:00', close: '22:00' },
    ],
  })
  assert(day.open === '12:00' && day.close === '15:00', 'mirrors first period')
  assert(Array.isArray(day.periods) && day.periods!.length === 2, 'keeps periods')
  const p = getDayPeriods(day)
  assert(isTimeWithinPeriods(p, 13 * 60).open === true, 'open lunch')
  assert(isTimeWithinPeriods(p, 16 * 60).open === false, 'closed in gap')
  assert(isTimeWithinPeriods(p, 19 * 60).open === true, 'open dinner')
  const nextGap = getNextChangeToday(p, 16 * 60)
  assert(nextGap?.kind === 'opens' && nextGap.time === '17:00', 'next opens 17:00')
  assert(formatPeriodsRange(p).includes('·'), 'format shows both')
}

// Google multi-range rest line
{
  const normalize = (s: string) => {
    const m = s.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i)
    if (!m) {
      const m24 = s.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
      return m24 ? `${m24[1].padStart(2, '0')}:${m24[2]}` : null
    }
    let h = parseInt(m[1], 10)
    const min = m[2]
    const ap = m[3].toUpperCase()
    if (ap === 'AM') {
      if (h === 12) h = 0
    } else if (h !== 12) h += 12
    return `${String(h).padStart(2, '0')}:${min}`
  }
  const periods = parseTimeRangesFromDayRest(
    '12:00 PM – 3:00 PM, 5:00 PM – 10:00 PM',
    normalize
  )
  assert(periods.length === 2, 'parsed two google ranges')
  assert(periods[0].open === '12:00' && periods[1].close === '22:00', 'normalized')
}

// Closed day
{
  assert(getDayPeriods({ closed: true, open: '09:00', close: '17:00' }).length === 0, 'closed')
}

console.log('hours-periods.selftest: OK')
