/**
 * Utility functions for formatting business hours for display
 * Supports single open/close and optional periods[] (morning + afternoon).
 */

import {
  dayHasOpenWindows,
  formatPeriodsRange,
  getDayPeriods,
  getNextChangeToday,
  isTimeWithinPeriods,
} from '@/lib/utils/hours-periods'

interface StructuredHours {
  [day: string]: {
    open?: string | null
    close?: string | null
    closed?: boolean
    periods?: Array<{ open: string; close: string }> | null
  }
}

/**
 * Smart time formatter with restaurant heuristic
 */
function formatTimeWithSmartFix(time24: string | null | undefined, context: 'open' | 'close'): string {
  if (!time24 || typeof time24 !== 'string') {
    return context === 'open' ? 'Opening time TBD' : 'Closing time TBD'
  }

  let [hours, minutes] = time24.split(':').map(Number)

  if (context === 'open' && hours >= 1 && hours <= 6) {
    hours += 12
  }

  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  const minutesStr = minutes === 0 ? '' : `:${minutes.toString().padStart(2, '0')}`
  return `${hours12}${minutesStr} ${period}`
}

function formatDayHoursLine(hours: StructuredHours[string]): string | null {
  const periods = getDayPeriods(hours)
  if (hours.closed || periods.length === 0) {
    return hours.closed ? 'Closed' : null
  }
  return formatPeriodsRange(periods, formatTimeWithSmartFix)
}

export function formatBusinessHours(
  business_hours?: string | null,
  business_hours_structured?: StructuredHours | null,
  showFullSchedule: boolean = false
): string {
  if (showFullSchedule && business_hours_structured && typeof business_hours_structured === 'object') {
    return formatFullWeeklySchedule(business_hours_structured)
  }

  if (business_hours_structured && typeof business_hours_structured === 'object') {
    return formatStructuredHours(business_hours_structured)
  }

  if (business_hours && business_hours.trim() !== '') {
    return business_hours
  }

  return 'Hours not available'
}

function formatFullWeeklySchedule(structuredHours: StructuredHours): string {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const dayNames = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ]

  const schedule = days.map((day, index) => {
    const hours = structuredHours[day]
    const dayName = dayNames[index]

    if (!hours || typeof hours !== 'object') {
      return `${dayName}: Hours not available`
    }

    const line = formatDayHoursLine(hours)
    if (line === 'Closed' || hours.closed) {
      return `${dayName}: Closed`
    }
    if (line) {
      return `${dayName}: ${line}`
    }
    return `${dayName}: Hours not available`
  })

  return schedule.join('\n')
}

function formatStructuredHours(structuredHours: StructuredHours): string {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  const today = new Date().getDay()
  const todayKey = days[(today + 6) % 7]

  const todayHours = structuredHours[todayKey]
  if (todayHours && typeof todayHours === 'object') {
    if (todayHours.closed || !dayHasOpenWindows(todayHours)) {
      return 'Closed today'
    }
    const line = formatDayHoursLine(todayHours)
    if (line) return line
  }

  for (const day of days) {
    const hours = structuredHours[day]
    if (hours && typeof hours === 'object' && dayHasOpenWindows(hours)) {
      const dayIndex = days.indexOf(day)
      const dayName = dayNames[dayIndex]
      const line = formatDayHoursLine(hours)
      if (line) return `${dayName}: ${line}`
    }
  }

  return 'Hours not available'
}

export function getFullWeeklyScheduleArray(
  structuredHours: StructuredHours | null | undefined
): Array<{ day: string; hours: string }> {
  if (!structuredHours || typeof structuredHours !== 'object') {
    return []
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const dayNames = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
  ]

  return days.map((day, index) => {
    const hours = structuredHours[day]
    const dayName = dayNames[index]

    if (!hours || typeof hours !== 'object') {
      return { day: dayName, hours: 'Not available' }
    }

    if (hours.closed || !dayHasOpenWindows(hours)) {
      return { day: dayName, hours: 'Closed' }
    }

    const line = formatDayHoursLine(hours)
    return { day: dayName, hours: line || 'Not available' }
  })
}

export function getBusinessStatus(
  business_hours?: string | null,
  business_hours_structured?: StructuredHours | null
): {
  isOpen: boolean
  statusText: string
  nextChange?: string
} {
  if (business_hours_structured && typeof business_hours_structured === 'object') {
    return getStatusFromStructuredHours(business_hours_structured)
  }

  return {
    isOpen: false,
    statusText: 'Hours available',
    nextChange: undefined,
  }
}

function getStatusFromStructuredHours(structuredHours: StructuredHours) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const now = new Date()
  const today = now.getDay()
  const todayKey = days[(today + 6) % 7]

  const todayHours = structuredHours[todayKey]
  const periods = getDayPeriods(todayHours)

  if (!todayHours || todayHours.closed || periods.length === 0) {
    return {
      isOpen: false,
      statusText: 'Closed',
      nextChange: undefined,
    }
  }

  const currentTime = now.getHours() * 60 + now.getMinutes()
  const { open: isOpen } = isTimeWithinPeriods(periods, currentTime)
  const next = getNextChangeToday(periods, currentTime)

  if (isOpen && next?.kind === 'closes') {
    return {
      isOpen: true,
      statusText: 'Open',
      nextChange: `Closes at ${next.time}`,
    }
  }

  if (!isOpen && next?.kind === 'opens') {
    return {
      isOpen: false,
      statusText: 'Closed',
      nextChange: `Opens at ${next.time}`,
    }
  }

  return {
    isOpen: false,
    statusText: 'Closed',
    nextChange: undefined,
  }
}
