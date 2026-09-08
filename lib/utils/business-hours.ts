/**
 * Business Hours Utility Functions
 * Handles parsing business hours and determining if a business is currently open
 * Supports both legacy text format and new structured format (incl. multi-period days)
 */

import { BusinessHoursStructured, DAYS_OF_WEEK } from '@/types/business-hours'
import {
  getDayFirstOpen,
  getDayPeriods,
  getNextChangeToday,
  isTimeWithinPeriods,
  parseHhMmToMinutes,
} from '@/lib/utils/hours-periods'

export interface ParsedHours {
  isOpen: boolean
  nextChange: string | null
  displayText: string
}

/**
 * Parse business hours string and determine if currently open
 */
export function parseBusinessHours(hoursString: string | null | undefined): ParsedHours {
  if (!hoursString) {
    return {
      isOpen: false,
      nextChange: null,
      displayText: 'Hours not available',
    }
  }

  const now = new Date()
  const currentTime = now.getHours() * 60 + now.getMinutes()

  if (hoursString.toLowerCase().includes('24/7') || hoursString.toLowerCase().includes('24 hours')) {
    return {
      isOpen: true,
      nextChange: null,
      displayText: 'Open 24/7',
    }
  }

  if (hoursString.toLowerCase().includes('closed')) {
    return {
      isOpen: false,
      nextChange: null,
      displayText: 'Closed',
    }
  }

  // All 24h ranges in the string (supports "12:00 - 15:00 | 17:00 - 22:00")
  const format24Pattern = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/g
  const matches24 = [...hoursString.matchAll(format24Pattern)]

  if (matches24.length > 0) {
    let isOpen = false
    let activeClose: { h: number; m: number } | null = null
    let nextOpen: { h: number; m: number } | null = null

    for (const match24 of matches24) {
      const openHour = parseInt(match24[1], 10)
      const openMin = parseInt(match24[2], 10)
      const closeHour = parseInt(match24[3], 10)
      const closeMin = parseInt(match24[4], 10)
      const openMinutes = openHour * 60 + openMin
      const closeMinutes = closeHour * 60 + closeMin

      let inWindow = false
      if (closeMinutes < openMinutes) {
        inWindow = currentTime >= openMinutes || currentTime < closeMinutes
      } else {
        inWindow = currentTime >= openMinutes && currentTime < closeMinutes
      }

      if (inWindow) {
        isOpen = true
        activeClose = { h: closeHour, m: closeMin }
        break
      }
      if (currentTime < openMinutes) {
        if (!nextOpen || openMinutes < nextOpen.h * 60 + nextOpen.m) {
          nextOpen = { h: openHour, m: openMin }
        }
      }
    }

    let nextChange = null
    if (isOpen && activeClose) {
      const closingPeriod = activeClose.h >= 12 ? 'PM' : 'AM'
      const displayHour =
        activeClose.h === 0 ? 12 : activeClose.h > 12 ? activeClose.h - 12 : activeClose.h
      const displayMin =
        activeClose.m === 0 ? '' : `:${activeClose.m.toString().padStart(2, '0')}`
      nextChange = `Closes at ${displayHour}${displayMin} ${closingPeriod}`
    } else if (nextOpen) {
      const openingPeriod = nextOpen.h >= 12 ? 'PM' : 'AM'
      const displayHour = nextOpen.h === 0 ? 12 : nextOpen.h > 12 ? nextOpen.h - 12 : nextOpen.h
      const displayMin = nextOpen.m === 0 ? '' : `:${nextOpen.m.toString().padStart(2, '0')}`
      nextChange = `Opens at ${displayHour}${displayMin} ${openingPeriod}`
    }

    return {
      isOpen,
      nextChange,
      displayText: isOpen ? 'Open now' : 'Closed now',
    }
  }

  const simpleTimePattern = /(\d{1,2})(am|pm)\s*-\s*(\d{1,2})(am|pm)/i
  const match = hoursString.match(simpleTimePattern)

  if (match) {
    const [, openHour, openPeriod, closeHour, closePeriod] = match

    let openTime = parseInt(openHour, 10)
    if (openPeriod.toLowerCase() === 'pm' && openTime !== 12) {
      openTime += 12
    } else if (openPeriod.toLowerCase() === 'am' && openTime === 12) {
      openTime = 0
    }

    let closeTime = parseInt(closeHour, 10)
    if (closePeriod.toLowerCase() === 'pm' && closeTime !== 12) {
      closeTime += 12
    } else if (closePeriod.toLowerCase() === 'am' && closeTime === 12) {
      closeTime = 0
    }

    const openMinutes = openTime * 60
    const closeMinutes = closeTime * 60

    let isOpen = false
    if (closeTime < openTime) {
      isOpen = currentTime >= openMinutes || currentTime < closeMinutes
    } else {
      isOpen = currentTime >= openMinutes && currentTime < closeMinutes
    }

    let nextChange = null
    if (isOpen) {
      const closingHour = closeTime > 24 ? closeTime - 24 : closeTime
      const closingPeriod = closingHour >= 12 ? 'PM' : 'AM'
      const displayHour =
        closingHour > 12 ? closingHour - 12 : closingHour === 0 ? 12 : closingHour
      nextChange = `Closes at ${displayHour}:00 ${closingPeriod}`
    } else {
      const openingPeriod = openTime >= 12 ? 'PM' : 'AM'
      const displayHour = openTime > 12 ? openTime - 12 : openTime === 0 ? 12 : openTime
      nextChange = `Opens at ${displayHour}:00 ${openingPeriod}`
    }

    return {
      isOpen,
      nextChange,
      displayText: isOpen ? 'Open now' : 'Closed now',
    }
  }

  return {
    isOpen: false,
    nextChange: null,
    displayText: 'Hours unavailable',
  }
}

export function formatBusinessHours(
  hoursString: string | null | undefined,
  showStatus: boolean = true
): string {
  if (!hoursString) {
    return 'Hours not available'
  }

  const parsed = parseBusinessHours(hoursString)

  if (showStatus && parsed.nextChange) {
    return `${hoursString} • ${parsed.displayText}`
  }

  return hoursString
}

/**
 * Parse structured business hours (single open/close or periods[]).
 */
export function parseStructuredBusinessHours(
  structured: BusinessHoursStructured | null | undefined
): ParsedHours {
  if (!structured) {
    return {
      isOpen: false,
      nextChange: null,
      displayText: 'Hours not available',
    }
  }

  const now = new Date()
  const currentDay = DAYS_OF_WEEK[now.getDay() === 0 ? 6 : now.getDay() - 1]
  const currentTime = now.toTimeString().slice(0, 5)
  const nowMinutes = parseHhMmToMinutes(currentTime) ?? 0

  const todayHours = structured[currentDay]
  const periods = getDayPeriods(todayHours)

  const findNextOpenAfterToday = (): {
    day: (typeof DAYS_OF_WEEK)[number]
    time: string
  } | null => {
    for (let i = 1; i <= 7; i++) {
      const dayIndex = (DAYS_OF_WEEK.indexOf(currentDay) + i) % 7
      const checkDay = DAYS_OF_WEEK[dayIndex]
      const firstOpen = getDayFirstOpen(structured[checkDay])
      if (firstOpen) {
        return { day: checkDay, time: firstOpen }
      }
    }
    return null
  }

  if (!todayHours || todayHours.closed || periods.length === 0) {
    const next = findNextOpenAfterToday()
    const tomorrowKey = DAYS_OF_WEEK[(DAYS_OF_WEEK.indexOf(currentDay) + 1) % 7]
    const nextChange = next
      ? `Opens ${next.day === tomorrowKey ? 'tomorrow' : next.day} at ${formatTime(next.time, 'open')}`
      : null

    return {
      isOpen: false,
      nextChange,
      displayText: 'Closed now',
    }
  }

  const { open: isCurrentlyOpen } = isTimeWithinPeriods(periods, nowMinutes)
  const nextToday = getNextChangeToday(periods, nowMinutes)

  if (isCurrentlyOpen && nextToday?.kind === 'closes') {
    return {
      isOpen: true,
      nextChange: `Closes at ${formatTime(nextToday.time, 'close')}`,
      displayText: 'Open now',
    }
  }

  if (!isCurrentlyOpen && nextToday?.kind === 'opens') {
    return {
      isOpen: false,
      nextChange: `Opens at ${formatTime(nextToday.time, 'open')}`,
      displayText: 'Closed now',
    }
  }

  const next = findNextOpenAfterToday()
  const tomorrowKey = DAYS_OF_WEEK[(DAYS_OF_WEEK.indexOf(currentDay) + 1) % 7]
  const nextChange = next
    ? `Opens ${next.day === tomorrowKey ? 'tomorrow' : next.day} at ${formatTime(next.time, 'open')}`
    : null

  return {
    isOpen: false,
    nextChange,
    displayText: 'Closed now',
  }
}

function formatTime(time24: string, context?: 'open' | 'close'): string {
  let [hours, minutes] = time24.split(':').map(Number)

  if (context === 'open' && hours >= 1 && hours <= 6) {
    hours += 12
  }

  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

export function getBusinessStatusProps(
  hoursText: string | null | undefined,
  hoursStructured: BusinessHoursStructured | null | undefined
) {
  if (hoursStructured && !hoursStructured.needs_conversion) {
    return parseStructuredBusinessHours(hoursStructured)
  }

  return parseBusinessHours(hoursText)
}
