// Types for structured business hours system
// This provides AI-friendly structured data instead of free text

import {
  formatPeriodsRange,
  getDayPeriods,
  isTimeWithinPeriods,
  normalizeDayHours,
  type HoursPeriod,
} from '@/lib/utils/hours-periods'

export type { HoursPeriod }

export interface DayHours {
  open: string | null // Format: "09:00" — primary / first period (compat)
  close: string | null // Format: "17:30" — primary / first period (compat)
  closed: boolean // True if business is closed this day
  notes?: string | null // Optional notes
  /**
   * Optional second (or multi) session for the day, e.g. lunch + dinner.
   * When present and non-empty, status/display use all periods.
   * Writers should also mirror periods[0] into open/close.
   * Max 2 periods for v1.
   */
  periods?: HoursPeriod[] | null
}

export interface BusinessHoursStructured {
  monday: DayHours
  tuesday: DayHours
  wednesday: DayHours
  thursday: DayHours
  friday: DayHours
  saturday: DayHours
  sunday: DayHours

  // Metadata
  timezone?: string // e.g., "Europe/London"
  last_updated?: string // ISO timestamp
  legacy_text?: string // Original text format for reference
  needs_conversion?: boolean // Flag for migrated data
}

export interface BusinessHoursFormData {
  // Common patterns
  pattern: 'weekdays_same' | 'weekdays_weekend' | 'custom'

  // Weekdays (Mon-Fri) when pattern is 'weekdays_same' or 'weekdays_weekend'
  weekdays_open?: string
  weekdays_close?: string
  weekdays_closed?: boolean
  /** Optional afternoon session for weekdays pattern */
  weekdays_open_2?: string
  weekdays_close_2?: string

  // Weekend when pattern is 'weekdays_weekend'
  saturday_open?: string
  saturday_close?: string
  saturday_closed?: boolean
  saturday_open_2?: string
  saturday_close_2?: string

  sunday_open?: string
  sunday_close?: string
  sunday_closed?: boolean
  sunday_open_2?: string
  sunday_close_2?: string

  // Individual days when pattern is 'custom'
  custom_hours?: BusinessHoursStructured

  // General
  notes?: string
}

// Helper functions
export const DAYS_OF_WEEK = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export const WEEKDAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const

export const WEEKEND = ['saturday', 'sunday'] as const

// Time slots for dropdowns (15-minute intervals)
export const TIME_SLOTS = [
  '06:00',
  '06:15',
  '06:30',
  '06:45',
  '07:00',
  '07:15',
  '07:30',
  '07:45',
  '08:00',
  '08:15',
  '08:30',
  '08:45',
  '09:00',
  '09:15',
  '09:30',
  '09:45',
  '10:00',
  '10:15',
  '10:30',
  '10:45',
  '11:00',
  '11:15',
  '11:30',
  '11:45',
  '12:00',
  '12:15',
  '12:30',
  '12:45',
  '13:00',
  '13:15',
  '13:30',
  '13:45',
  '14:00',
  '14:15',
  '14:30',
  '14:45',
  '15:00',
  '15:15',
  '15:30',
  '15:45',
  '16:00',
  '16:15',
  '16:30',
  '16:45',
  '17:00',
  '17:15',
  '17:30',
  '17:45',
  '18:00',
  '18:15',
  '18:30',
  '18:45',
  '19:00',
  '19:15',
  '19:30',
  '19:45',
  '20:00',
  '20:15',
  '20:30',
  '20:45',
  '21:00',
  '21:15',
  '21:30',
  '21:45',
  '22:00',
  '22:15',
  '22:30',
  '22:45',
  '23:00',
  '23:15',
  '23:30',
  '23:45',
]

function dayFromPrimaryAndOptionalSecond(
  closed: boolean | undefined,
  open?: string | null,
  close?: string | null,
  open2?: string | null,
  close2?: string | null
): DayHours {
  if (closed) {
    return normalizeDayHours({ closed: true }) as DayHours
  }
  const periods: HoursPeriod[] = []
  if (open && close) periods.push({ open, close })
  if (open2 && close2) periods.push({ open: open2, close: close2 })
  return normalizeDayHours({
    closed: false,
    open: periods[0]?.open ?? null,
    close: periods[0]?.close ?? null,
    periods: periods.length > 1 ? periods : undefined,
  }) as DayHours
}

/** Normalize every day so periods + open/close stay in sync before save. */
export function normalizeStructuredHours(
  structured: BusinessHoursStructured
): BusinessHoursStructured {
  const result = { ...structured, last_updated: new Date().toISOString() }
  for (const day of DAYS_OF_WEEK) {
    result[day] = normalizeDayHours(structured[day]) as DayHours
  }
  return result
}

// Convert form data to structured format
export function convertFormDataToStructured(formData: BusinessHoursFormData): BusinessHoursStructured {
  const result: BusinessHoursStructured = {
    monday: { open: null, close: null, closed: true },
    tuesday: { open: null, close: null, closed: true },
    wednesday: { open: null, close: null, closed: true },
    thursday: { open: null, close: null, closed: true },
    friday: { open: null, close: null, closed: true },
    saturday: { open: null, close: null, closed: true },
    sunday: { open: null, close: null, closed: true },
    timezone: 'Europe/London',
    last_updated: new Date().toISOString(),
  }

  if (formData.pattern === 'weekdays_same') {
    const dayHours = dayFromPrimaryAndOptionalSecond(
      formData.weekdays_closed,
      formData.weekdays_open,
      formData.weekdays_close,
      formData.weekdays_open_2,
      formData.weekdays_close_2
    )
    DAYS_OF_WEEK.forEach((day) => {
      result[day] = { ...dayHours }
    })
  } else if (formData.pattern === 'weekdays_weekend') {
    const weekdayHours = dayFromPrimaryAndOptionalSecond(
      formData.weekdays_closed,
      formData.weekdays_open,
      formData.weekdays_close,
      formData.weekdays_open_2,
      formData.weekdays_close_2
    )
    WEEKDAYS.forEach((day) => {
      result[day] = { ...weekdayHours }
    })
    result.saturday = dayFromPrimaryAndOptionalSecond(
      formData.saturday_closed,
      formData.saturday_open,
      formData.saturday_close,
      formData.saturday_open_2,
      formData.saturday_close_2
    )
    result.sunday = dayFromPrimaryAndOptionalSecond(
      formData.sunday_closed,
      formData.sunday_open,
      formData.sunday_close,
      formData.sunday_open_2,
      formData.sunday_close_2
    )
  } else if (formData.pattern === 'custom' && formData.custom_hours) {
    return normalizeStructuredHours({
      ...formData.custom_hours,
      last_updated: new Date().toISOString(),
    })
  }

  return normalizeStructuredHours(result)
}

// Convert structured format to human readable text (for AI and display)
export function convertStructuredToText(structured: BusinessHoursStructured): string {
  if (!structured) return 'Hours not set'

  const lines: string[] = []

  DAYS_OF_WEEK.forEach((day) => {
    const dayData = structured[day]
    const dayName = day.charAt(0).toUpperCase() + day.slice(1)
    const periods = getDayPeriods(dayData)

    if (dayData.closed || periods.length === 0) {
      lines.push(`${dayName}: Closed`)
    } else {
      lines.push(`${dayName}: ${formatPeriodsRange(periods)}`)
      if (dayData.notes) {
        lines.push(`  ${dayData.notes}`)
      }
    }
  })

  return lines.join('\n')
}

// Check if business is currently open (for real-time status)
export function isBusinessOpen(structured: BusinessHoursStructured): boolean {
  if (!structured) return false

  const now = new Date()
  const currentDay = DAYS_OF_WEEK[now.getDay() === 0 ? 6 : now.getDay() - 1]
  const currentTime = now.toTimeString().slice(0, 5)
  const [hh, mm] = currentTime.split(':').map(Number)
  const nowMinutes = hh * 60 + mm

  const todayHours = structured[currentDay]
  const periods = getDayPeriods(todayHours)
  if (periods.length === 0) return false

  return isTimeWithinPeriods(periods, nowMinutes).open
}
