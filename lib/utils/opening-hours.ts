// lib/utils/opening-hours.ts
import {
  formatPeriodsRange,
  getDayPeriods,
  getNextChangeToday,
  isTimeWithinPeriods,
  parseHhMmToMinutes,
  parseTimeRangesFromDayRest,
} from '@/lib/utils/hours-periods'

export type OpenStatus = {
  hasHours: boolean
  todaySummary?: string
  isOpenNow?: boolean
  opensAt?: string
  closesAt?: string
  conversational?: string
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

function to12hLabel(hour24: number, minute: number) {
  const ampm = hour24 >= 12 ? 'pm' : 'am'
  const h = hour24 % 12 === 0 ? 12 : hour24 % 12
  const m = minute.toString().padStart(2, '0')
  return minute === 0 ? `${h}${ampm}` : `${h}:${m}${ampm}`
}

function hhmmTo12hLabel(hhmm: string): string {
  const mins = parseHhMmToMinutes(hhmm)
  if (mins === null) return hhmm
  return to12hLabel(Math.floor(mins / 60), mins % 60)
}

function normalizeAmPmTo24h(s: string): string | null {
  const m24 = s.trim().match(/^([01]?\d|2[0-3]):([0-5]\d)$/)
  if (m24) {
    return `${m24[1].padStart(2, '0')}:${m24[2]}`
  }
  const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i)
  if (!m) return null
  let hh = parseInt(m[1], 10)
  const mm = m[2] ? parseInt(m[2], 10) : 0
  const ap = m[3].toUpperCase()
  if (ap === 'PM' && hh !== 12) hh += 12
  if (ap === 'AM' && hh === 12) hh = 0
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

function minutesSinceMidnight(d: Date) {
  return d.getHours() * 60 + d.getMinutes()
}

function statusFromPeriods(
  weekdayName: string,
  periods: { open: string; close: string }[],
  nowMins: number
): OpenStatus {
  if (periods.length === 0) {
    return {
      hasHours: true,
      todaySummary: `${weekdayName}: Closed`,
      isOpenNow: false,
      conversational: 'Closed for today.',
    }
  }

  const labelFmt = (t: string) => hhmmTo12hLabel(t)
  const todaySummary = `${weekdayName}: ${formatPeriodsRange(periods, (t) => labelFmt(t))}`
  const opensAtLabel = labelFmt(periods[0].open)
  const lastClose = periods[periods.length - 1].close
  const closesAtLabel = labelFmt(lastClose)

  const { open: isOpenNow, activePeriod } = isTimeWithinPeriods(periods, nowMins)
  const next = getNextChangeToday(periods, nowMins)

  if (isOpenNow && activePeriod) {
    const until = labelFmt(activePeriod.close)
    const closeMins = parseHhMmToMinutes(activePeriod.close) ?? 0
    const minsUntilClose = closeMins - nowMins
    const conversational =
      minsUntilClose <= 60 && minsUntilClose > 0
        ? `Closing soon — open until ${until}.`
        : `Open now until ${until}.`

    return {
      hasHours: true,
      todaySummary,
      isOpenNow: true,
      opensAt: opensAtLabel,
      closesAt: until,
      conversational,
    }
  }

  if (next?.kind === 'opens') {
    const opens = labelFmt(next.time)
    return {
      hasHours: true,
      todaySummary,
      isOpenNow: false,
      opensAt: opens,
      closesAt: closesAtLabel,
      conversational: `Closed right now — opens at ${opens} today.`,
    }
  }

  return {
    hasHours: true,
    todaySummary,
    isOpenNow: false,
    opensAt: opensAtLabel,
    closesAt: closesAtLabel,
    conversational: 'Closed for today.',
  }
}

export function getOpenStatusForToday(input: any, now: Date): OpenStatus {
  try {
    if (!input) return { hasHours: false }

    // FORMAT 1: Structured object with day keys
    const isDayObjectSchema =
      input &&
      typeof input === 'object' &&
      ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].some(
        (k) => input[k]?.open || input[k]?.closed || (input[k]?.periods && input[k].periods.length)
      )

    if (isDayObjectSchema) {
      const tz = input.timezone || 'Europe/London'

      let weekdayName: string
      let nowHour: number
      let nowMinute: number

      try {
        const parts = new Intl.DateTimeFormat('en-GB', {
          timeZone: tz,
          weekday: 'long',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).formatToParts(now)

        weekdayName = parts.find((p) => p.type === 'weekday')?.value || ''
        nowHour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10)
        nowMinute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10)
      } catch {
        weekdayName = DAY_NAMES[now.getDay()]
        nowHour = now.getHours()
        nowMinute = now.getMinutes()
      }

      const todayKey = weekdayName.toLowerCase()
      const todayData = input[todayKey]

      if (!todayData || typeof todayData !== 'object') return { hasHours: false }

      if (todayData.closed === true) {
        return {
          hasHours: true,
          todaySummary: `${weekdayName}: Closed`,
          isOpenNow: false,
          conversational: 'Closed for today.',
        }
      }

      const periods = getDayPeriods(todayData)
      if (periods.length === 0) return { hasHours: false }

      return statusFromPeriods(weekdayName, periods, nowHour * 60 + nowMinute)
    }

    // FORMAT 2: Google-style weekdayDescriptions array
    const weekdayText: string[] | null = Array.isArray(input?.weekdayDescriptions)
      ? input.weekdayDescriptions
      : Array.isArray(input?.weekday_text)
        ? input.weekday_text
        : Array.isArray(input)
          ? input
          : null

    if (!weekdayText || weekdayText.length === 0) return { hasHours: false }

    const todayNameFull = DAY_NAMES[now.getDay()]
    const todayLine = weekdayText.find((l) =>
      l.toLowerCase().startsWith(todayNameFull.toLowerCase() + ':')
    )
    if (!todayLine) return { hasHours: false }

    const idx = todayLine.indexOf(':')
    const rest = todayLine.slice(idx + 1).trim()
    if (/closed/i.test(rest)) {
      return {
        hasHours: true,
        todaySummary: `${todayNameFull}: Closed`,
        isOpenNow: false,
        conversational: 'Closed for today.',
      }
    }

    const periods = parseTimeRangesFromDayRest(rest, normalizeAmPmTo24h)
    if (periods.length === 0) return { hasHours: false }

    return statusFromPeriods(todayNameFull, periods, minutesSinceMidnight(now))
  } catch {
    return { hasHours: false }
  }
}
