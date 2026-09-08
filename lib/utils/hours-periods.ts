/**
 * Shared opening-hours period helpers.
 * Supports legacy single open/close and optional periods[] (max 2 for v1).
 * Always prefer periods when present; mirror first period into open/close on write.
 */

export interface HoursPeriod {
  open: string // "HH:MM" 24h
  close: string
}

/** Minimal day shape — works with DayHours and loose JSON from DB. */
export interface DayHoursLike {
  open?: string | null
  close?: string | null
  closed?: boolean
  notes?: string | null
  periods?: HoursPeriod[] | null
}

const HHMM = /^([01]?\d|2[0-3]):([0-5]\d)$/

export function isValidHhMm(value: string | null | undefined): value is string {
  return typeof value === 'string' && HHMM.test(value.trim())
}

export function parseHhMmToMinutes(value: string | null | undefined): number | null {
  if (!isValidHhMm(value)) return null
  const m = value.trim().match(HHMM)!
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
}

/**
 * Ordered open windows for a day.
 * Closed day → []. Missing times → [].
 * periods[] wins when it has valid entries; else falls back to open/close.
 */
export function getDayPeriods(day: DayHoursLike | null | undefined): HoursPeriod[] {
  if (!day || day.closed === true) return []

  if (Array.isArray(day.periods) && day.periods.length > 0) {
    const fromPeriods = day.periods
      .filter((p): p is HoursPeriod => Boolean(p && isValidHhMm(p.open) && isValidHhMm(p.close)))
      .slice(0, 2)
    if (fromPeriods.length > 0) return fromPeriods
  }

  if (isValidHhMm(day.open) && isValidHhMm(day.close)) {
    return [{ open: day.open.trim(), close: day.close.trim() }]
  }

  return []
}

/** True if day has at least one usable open window. */
export function dayHasOpenWindows(day: DayHoursLike | null | undefined): boolean {
  return getDayPeriods(day).length > 0
}

/** First opening time of the day (for "opens at" / next day). */
export function getDayFirstOpen(day: DayHoursLike | null | undefined): string | null {
  const periods = getDayPeriods(day)
  return periods[0]?.open ?? null
}

/** Format periods as "09:00 - 17:00" or "12:00 - 15:00 · 17:00 - 22:00". */
export function formatPeriodsRange(
  periods: HoursPeriod[],
  formatTime?: (hhmm: string, context: 'open' | 'close') => string
): string {
  if (periods.length === 0) return ''
  const fmt = formatTime || ((t: string) => t)
  return periods
    .map((p) => `${fmt(p.open, 'open')} - ${fmt(p.close, 'close')}`)
    .join(' · ')
}

/**
 * Whether now (HH:MM or minutes-since-midnight) falls inside any period.
 * Overnight within a single period (close <= open) uses OR logic.
 */
export function isTimeWithinPeriods(
  periods: HoursPeriod[],
  nowMinutes: number
): { open: boolean; activePeriod: HoursPeriod | null } {
  for (const period of periods) {
    const openMins = parseHhMmToMinutes(period.open)
    const closeMins = parseHhMmToMinutes(period.close)
    if (openMins === null || closeMins === null) continue

    if (closeMins <= openMins) {
      // Overnight single window
      if (nowMinutes >= openMins || nowMinutes < closeMins) {
        return { open: true, activePeriod: period }
      }
    } else if (nowMinutes >= openMins && nowMinutes < closeMins) {
      return { open: true, activePeriod: period }
    }
  }
  return { open: false, activePeriod: null }
}

/**
 * Next status change within today, or null if none left today.
 * - If open: closes at end of active period
 * - If closed: next period open later today
 */
export function getNextChangeToday(
  periods: HoursPeriod[],
  nowMinutes: number
): { kind: 'closes' | 'opens'; time: string } | null {
  const { open, activePeriod } = isTimeWithinPeriods(periods, nowMinutes)
  if (open && activePeriod) {
    return { kind: 'closes', time: activePeriod.close }
  }

  for (const period of periods) {
    const openMins = parseHhMmToMinutes(period.open)
    const closeMins = parseHhMmToMinutes(period.close)
    if (openMins === null || closeMins === null) continue
    if (closeMins <= openMins) continue // overnight handled separately
    if (nowMinutes < openMins) {
      return { kind: 'opens', time: period.open }
    }
  }
  return null
}

/**
 * Normalize a day for persistence: periods (0–2) + mirrored open/close.
 * Empty / closed → closed day with null open/close and no periods.
 */
export function normalizeDayHours(day: DayHoursLike | null | undefined): {
  open: string | null
  close: string | null
  closed: boolean
  notes?: string | null
  periods?: HoursPeriod[]
} {
  const notes = day?.notes ?? null
  if (!day || day.closed === true) {
    return { open: null, close: null, closed: true, notes }
  }

  const periods = getDayPeriods({ ...day, closed: false })
  if (periods.length === 0) {
    return { open: null, close: null, closed: true, notes }
  }

  const normalized: {
    open: string | null
    close: string | null
    closed: boolean
    notes?: string | null
    periods?: HoursPeriod[]
  } = {
    open: periods[0].open,
    close: periods[0].close,
    closed: false,
    notes,
  }

  if (periods.length > 1) {
    normalized.periods = periods
  }

  return normalized
}

/**
 * Split a Google-style rest-of-line into periods.
 * Handles: "11:00 AM – 10:00 PM", "12:00 – 15:00, 17:00 – 22:00", "12:00-15:00 | 17:00-22:00"
 */
export function parseTimeRangesFromDayRest(
  rest: string,
  normalizeTo24h: (raw: string) => string | null
): HoursPeriod[] {
  const cleaned = rest.trim()
  if (!cleaned || /closed/i.test(cleaned)) return []

  // Split into candidate ranges on | , or & (not on dash — dashes are inside a range)
  const chunks = cleaned
    .split(/\s*[|&,/]\s*/)
    .map((s) => s.trim())
    .filter(Boolean)

  const periods: HoursPeriod[] = []
  for (const chunk of chunks) {
    const parts = chunk.split(/\s*[–—\-]\s*|\s+to\s+/i).map((s) => s.trim())
    if (parts.length < 2) continue
    const open = normalizeTo24h(parts[0])
    const close = normalizeTo24h(parts[1])
    if (open && close) periods.push({ open, close })
    if (periods.length >= 2) break
  }
  return periods
}
