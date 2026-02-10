// lib/utils/opening-hours.ts
export type OpenStatus = {
  hasHours: boolean
  todaySummary?: string
  isOpenNow?: boolean
  opensAt?: string
  closesAt?: string
  conversational?: string // "Open now until 10pm." / "Closed — opens at 11am today." etc
}

const DAY_NAMES = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'] as const

function to12hLabel(hour24: number, minute: number) {
  const ampm = hour24 >= 12 ? 'pm' : 'am'
  const h = hour24 % 12 === 0 ? 12 : hour24 % 12
  const m = minute.toString().padStart(2, '0')
  return minute === 0 ? `${h}${ampm}` : `${h}:${m}${ampm}`
}

function parseWeekdayTextLine(line: string): { dayName: string; opens: {h:number;m:number} | null; closes: {h:number;m:number} | null; raw: string } | null {
  // Expected Google-ish format: "Monday: 11:00 AM – 10:00 PM" or "Monday: Closed"
  const idx = line.indexOf(':')
  if (idx === -1) return null
  const dayName = line.slice(0, idx).trim()
  const rest = line.slice(idx + 1).trim()
  if (!dayName) return null

  const raw = rest
  if (/closed/i.test(rest)) {
    return { dayName, opens: null, closes: null, raw: 'Closed' }
  }

  // Split on dash (en dash or hyphen)
  const parts = rest.split(/–|-|—/).map(s => s.trim())
  if (parts.length < 2) return null

  const opensStr = parts[0]
  const closesStr = parts[1]

  const parseTime = (s: string): {h:number;m:number} | null => {
    // "11:00 AM" / "11 AM" / "10:30 PM"
    const m = s.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i)
    if (!m) return null
    let hh = parseInt(m[1], 10)
    const mm = m[2] ? parseInt(m[2], 10) : 0
    const ap = m[3].toUpperCase()
    if (ap === 'PM' && hh !== 12) hh += 12
    if (ap === 'AM' && hh === 12) hh = 0
    return { h: hh, m: mm }
  }

  const opens = parseTime(opensStr)
  const closes = parseTime(closesStr)
  if (!opens || !closes) return null

  return { dayName, opens, closes, raw }
}

function minutesSinceMidnight(d: Date) {
  return d.getHours() * 60 + d.getMinutes()
}

export function getOpenStatusForToday(input: any, now: Date): OpenStatus {
  try {
    if (!input) return { hasHours: false }

    // FORMAT 1: Structured object with day keys (what we actually store!)
    // { monday: { open: '08:00', close: '22:00', closed: false }, timezone: 'Europe/London', ... }
    const isDayObjectSchema = 
      input && typeof input === 'object' &&
      ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'].some(k => input[k]?.open || input[k]?.closed)
    
    if (isDayObjectSchema) {
      // Get current time in business timezone
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
          hour12: false
        }).formatToParts(now)
        
        weekdayName = parts.find(p => p.type === 'weekday')?.value || ''
        nowHour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10)
        nowMinute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10)
      } catch {
        // Timezone parsing failed - use UTC fallback
        weekdayName = DAY_NAMES[now.getDay()]
        nowHour = now.getHours()
        nowMinute = now.getMinutes()
      }
      
      const todayKey = weekdayName.toLowerCase()
      const todayData = input[todayKey]
      
      if (!todayData || typeof todayData !== 'object') return { hasHours: false }
      
      // Check if closed
      if (todayData.closed === true) {
        return {
          hasHours: true,
          todaySummary: `${weekdayName}: Closed`,
          isOpenNow: false,
          conversational: 'Closed for today.'
        }
      }
      
      const openStr = todayData.open  // e.g. "08:00"
      const closeStr = todayData.close // e.g. "22:00"
      
      if (!openStr || !closeStr) return { hasHours: false }
      
      // Parse 24-hour time "HH:MM"
      const parseHHmm = (s: string): number | null => {
        const m = s.match(/^(\d{1,2}):(\d{2})$/)
        if (!m) return null
        return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
      }
      
      const openMins = parseHHmm(openStr)
      const closeMins = parseHHmm(closeStr)
      
      if (openMins === null || closeMins === null) return { hasHours: false }
      
      const nowMins = nowHour * 60 + nowMinute
      
      const opensAtLabel = to12hLabel(Math.floor(openMins / 60), openMins % 60)
      const closesAtLabel = to12hLabel(Math.floor(closeMins / 60), closeMins % 60)
      
      const todaySummary = `${weekdayName}: ${opensAtLabel} – ${closesAtLabel}`
      
      // Fail closed if overnight (close <= open)
      if (closeMins <= openMins) return { hasHours: false }
      
      if (nowMins >= openMins && nowMins < closeMins) {
        // Check if closing soon (within 1 hour)
        const minsUntilClose = closeMins - nowMins
        const conversational = minsUntilClose <= 60
          ? `Closing soon — open until ${closesAtLabel}.`
          : `Open now until ${closesAtLabel}.`
        
        return {
          hasHours: true,
          todaySummary,
          isOpenNow: true,
          opensAt: opensAtLabel,
          closesAt: closesAtLabel,
          conversational
        }
      }
      
      if (nowMins < openMins) {
        return {
          hasHours: true,
          todaySummary,
          isOpenNow: false,
          opensAt: opensAtLabel,
          closesAt: closesAtLabel,
          conversational: `Closed right now — opens at ${opensAtLabel} today.`
        }
      }
      
      return {
        hasHours: true,
        todaySummary,
        isOpenNow: false,
        opensAt: opensAtLabel,
        closesAt: closesAtLabel,
        conversational: 'Closed for today.'
      }
    }

    // FORMAT 2: Google-style weekdayDescriptions array (fallback)
    // ["Monday: 11:00 AM – 10:00 PM", ...]
    const weekdayText: string[] | null =
      Array.isArray(input?.weekdayDescriptions) ? input.weekdayDescriptions :
      Array.isArray(input?.weekday_text) ? input.weekday_text :
      Array.isArray(input) ? input :
      null

    if (!weekdayText || weekdayText.length === 0) return { hasHours: false }

    const todayNameFull = DAY_NAMES[now.getDay()]
    const todayLine = weekdayText.find(l => l.toLowerCase().startsWith(todayNameFull.toLowerCase() + ':'))
    if (!todayLine) return { hasHours: false }

    const parsed = parseWeekdayTextLine(todayLine)
    if (!parsed) return { hasHours: false }

    if (parsed.raw === 'Closed' || (!parsed.opens && !parsed.closes)) {
      return {
        hasHours: true,
        todaySummary: `${todayNameFull}: Closed`,
        isOpenNow: false,
        conversational: 'Closed for today.'
      }
    }

    if (!parsed.opens || !parsed.closes) return { hasHours: false }

    const openMins = parsed.opens.h * 60 + parsed.opens.m
    const closeMins = parsed.closes.h * 60 + parsed.closes.m
    const nowMins = minutesSinceMidnight(now)

    const opensAtLabel = to12hLabel(parsed.opens.h, parsed.opens.m)
    const closesAtLabel = to12hLabel(parsed.closes.h, parsed.closes.m)

    const todaySummary = `${todayNameFull}: ${opensAtLabel} – ${closesAtLabel}`

    // Simple same-day window only (minimal + deterministic). If close < open (overnight), fail-closed.
    if (closeMins <= openMins) {
      return { hasHours: false }
    }

    if (nowMins >= openMins && nowMins < closeMins) {
      return {
        hasHours: true,
        todaySummary,
        isOpenNow: true,
        opensAt: opensAtLabel,
        closesAt: closesAtLabel,
        conversational: `Open now until ${closesAtLabel}.`
      }
    }

    if (nowMins < openMins) {
      return {
        hasHours: true,
        todaySummary,
        isOpenNow: false,
        opensAt: opensAtLabel,
        closesAt: closesAtLabel,
        conversational: `Closed right now — opens at ${opensAtLabel} today.`
      }
    }

    return {
      hasHours: true,
      todaySummary,
      isOpenNow: false,
      opensAt: opensAtLabel,
      closesAt: closesAtLabel,
      conversational: 'Closed for today.'
    }
  } catch {
    return { hasHours: false }
  }
}
