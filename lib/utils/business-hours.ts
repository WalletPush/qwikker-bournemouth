/**
 * Business Hours Utility Functions
 * Handles parsing business hours and determining if a business is currently open
 * Supports both legacy text format and new structured format
 */

import { BusinessHoursStructured, DAYS_OF_WEEK } from '@/types/business-hours'

export interface ParsedHours {
  isOpen: boolean
  nextChange: string | null // Next time the status will change (e.g., "Opens at 9:00 AM" or "Closes at 10:00 PM")
  displayText: string // Human-readable status
}

/**
 * Parse business hours string and determine if currently open
 * Supports formats like:
 * - "9am - 5pm"
 * - "12pm - 10pm" 
 * - "7am - 6pm"
 * - "Mon-Fri 9AM-5PM, Sat-Sun 10AM-4PM"
 * - "24/7" or "24 hours"
 * - "Closed" or "Closed today"
 */
export function parseBusinessHours(hoursString: string | null | undefined): ParsedHours {
  if (!hoursString) {
    return {
      isOpen: false,
      nextChange: null,
      displayText: 'Hours not available'
    }
  }

  const now = new Date()
  const currentDay = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  const currentTime = now.getHours() * 60 + now.getMinutes() // Current time in minutes since midnight

  // Handle 24/7 businesses
  if (hoursString.toLowerCase().includes('24/7') || hoursString.toLowerCase().includes('24 hours')) {
    return {
      isOpen: true,
      nextChange: null,
      displayText: 'Open 24/7'
    }
  }

  // Handle closed businesses
  if (hoursString.toLowerCase().includes('closed')) {
    return {
      isOpen: false,
      nextChange: null,
      displayText: 'Closed'
    }
  }

  // Try to parse 24-hour format first (e.g., "09:00 - 23:00" or "12:00 - 03:00")
  const format24Pattern = /(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/
  const match24 = hoursString.match(format24Pattern)
  
  if (match24) {
    const [, openHourStr, openMinStr, closeHourStr, closeMinStr] = match24
    
    const openHour = parseInt(openHourStr)
    const openMin = parseInt(openMinStr)
    const closeHour = parseInt(closeHourStr)
    const closeMin = parseInt(closeMinStr)
    
    // Convert to minutes since midnight
    const openMinutes = openHour * 60 + openMin
    const closeMinutes = closeHour * 60 + closeMin
    
    // Handle overnight hours (e.g., 20:00 - 03:00)
    let isOpen = false
    if (closeMinutes < openMinutes) {
      // Overnight: open if current time >= opening OR current time < closing
      isOpen = (currentTime >= openMinutes) || (currentTime < closeMinutes)
    } else {
      // Same day: open if current time between opening and closing
      isOpen = (currentTime >= openMinutes) && (currentTime < closeMinutes)
    }
    
    // Calculate next change
    let nextChange = null
    if (isOpen) {
      const closingPeriod = closeHour >= 12 ? 'PM' : 'AM'
      const displayHour = closeHour === 0 ? 12 : (closeHour > 12 ? closeHour - 12 : closeHour)
      const displayMin = closeMin === 0 ? '' : `:${closeMin.toString().padStart(2, '0')}`
      nextChange = `Closes at ${displayHour}${displayMin} ${closingPeriod}`
    } else {
      const openingPeriod = openHour >= 12 ? 'PM' : 'AM'
      const displayHour = openHour === 0 ? 12 : (openHour > 12 ? openHour - 12 : openHour)
      const displayMin = openMin === 0 ? '' : `:${openMin.toString().padStart(2, '0')}`
      nextChange = `Opens at ${displayHour}${displayMin} ${openingPeriod}`
    }
    
    return {
      isOpen,
      nextChange,
      displayText: isOpen ? 'Open now' : 'Closed now'
    }
  }

  // Try to parse simple format like "9am - 5pm" or "12pm - 10pm"
  const simpleTimePattern = /(\d{1,2})(am|pm)\s*-\s*(\d{1,2})(am|pm)/i
  const match = hoursString.match(simpleTimePattern)

  if (match) {
    const [, openHour, openPeriod, closeHour, closePeriod] = match
    
    // Convert to 24-hour format
    let openTime = parseInt(openHour)
    if (openPeriod.toLowerCase() === 'pm' && openTime !== 12) {
      openTime += 12
    } else if (openPeriod.toLowerCase() === 'am' && openTime === 12) {
      openTime = 0
    }
    
    let closeTime = parseInt(closeHour)
    if (closePeriod.toLowerCase() === 'pm' && closeTime !== 12) {
      closeTime += 12
    } else if (closePeriod.toLowerCase() === 'am' && closeTime === 12) {
      closeTime = 0
    }
    
    // Convert to minutes
    const openMinutes = openTime * 60
    let closeMinutes = closeTime * 60
    
    // Handle overnight hours (e.g., 10pm - 2am)
    let isOpen = false
    if (closeTime < openTime) {
      // Overnight hours: open if current time is after opening OR before closing
      isOpen = (currentTime >= openMinutes) || (currentTime < closeMinutes)
    } else {
      // Same day hours: open if current time is between opening and closing
      isOpen = (currentTime >= openMinutes) && (currentTime < closeMinutes)
    }
    
    // Calculate next change
    let nextChange = null
    if (isOpen) {
      const closingHour = closeTime > 24 ? closeTime - 24 : closeTime
      const closingPeriod = closingHour >= 12 ? 'PM' : 'AM'
      const displayHour = closingHour > 12 ? closingHour - 12 : (closingHour === 0 ? 12 : closingHour)
      nextChange = `Closes at ${displayHour}:00 ${closingPeriod}`
    } else {
      const openingPeriod = openTime >= 12 ? 'PM' : 'AM'
      const displayHour = openTime > 12 ? openTime - 12 : (openTime === 0 ? 12 : openTime)
      nextChange = `Opens at ${displayHour}:00 ${openingPeriod}`
    }
    
    return {
      isOpen,
      nextChange,
      displayText: isOpen ? 'Open now' : 'Closed now'
    }
  }

  // For complex formats or unrecognized patterns, return UNKNOWN.
  // We should never claim "open" unless we're sure.
  return {
    isOpen: false, // Conservative: don't claim open unless we can parse it
    nextChange: null,
    displayText: 'Hours unavailable'
  }
}

/**
 * Format business hours for display
 * @param hoursString - Raw hours string from database
 * @param showStatus - Whether to show open/closed status
 * @returns Formatted hours string
 */
export function formatBusinessHours(hoursString: string | null | undefined, showStatus: boolean = true): string {
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
 * Parse structured business hours and determine if currently open
 * This is the new, more accurate method for structured hours data
 */
export function parseStructuredBusinessHours(structured: BusinessHoursStructured | null | undefined): ParsedHours {
  if (!structured) {
    return {
      isOpen: false,
      nextChange: null,
      displayText: 'Hours not available'
    }
  }

  const now = new Date()
  const currentDay = DAYS_OF_WEEK[now.getDay() === 0 ? 6 : now.getDay() - 1] // Convert JS day to our format
  const currentTime = now.toTimeString().slice(0, 5) // "HH:MM" format
  
  const todayHours = structured[currentDay]
  
  if (!todayHours || todayHours.closed || !todayHours.open || !todayHours.close) {
    // Business is closed today, check when it opens next
    let nextOpenDay = null
    let nextOpenTime = null
    
    // Look for next opening day (starting from tomorrow)
    for (let i = 1; i <= 7; i++) {
      const dayIndex = (DAYS_OF_WEEK.indexOf(currentDay) + i) % 7
      const checkDay = DAYS_OF_WEEK[dayIndex]
      const dayHours = structured[checkDay]
      
      if (dayHours && !dayHours.closed && dayHours.open) {
        nextOpenDay = checkDay
        nextOpenTime = dayHours.open
        break
      }
    }
    
    const nextChange = nextOpenDay && nextOpenTime 
      ? `Opens ${nextOpenDay === DAYS_OF_WEEK[(DAYS_OF_WEEK.indexOf(currentDay) + 1) % 7] ? 'tomorrow' : nextOpenDay} at ${formatTime(nextOpenTime, 'open')}`
      : null
    
    return {
      isOpen: false,
      nextChange,
      displayText: 'Closed now'
    }
  }
  
  // Check if currently within opening hours
  const isCurrentlyOpen = currentTime >= todayHours.open && currentTime <= todayHours.close
  
  if (isCurrentlyOpen) {
    return {
      isOpen: true,
      nextChange: `Closes at ${formatTime(todayHours.close, 'close')}`,
      displayText: 'Open now'
    }
  } else if (currentTime < todayHours.open) {
    // Before opening today
    return {
      isOpen: false,
      nextChange: `Opens at ${formatTime(todayHours.open, 'open')}`,
      displayText: 'Closed now'
    }
  } else {
    // After closing today, find next opening
    let nextOpenDay = null
    let nextOpenTime = null
    
    // Look for next opening day (starting from tomorrow)
    for (let i = 1; i <= 7; i++) {
      const dayIndex = (DAYS_OF_WEEK.indexOf(currentDay) + i) % 7
      const checkDay = DAYS_OF_WEEK[dayIndex]
      const dayHours = structured[checkDay]
      
      if (dayHours && !dayHours.closed && dayHours.open) {
        nextOpenDay = checkDay
        nextOpenTime = dayHours.open
        break
      }
    }
    
    const nextChange = nextOpenDay && nextOpenTime 
      ? `Opens ${nextOpenDay === DAYS_OF_WEEK[(DAYS_OF_WEEK.indexOf(currentDay) + 1) % 7] ? 'tomorrow' : nextOpenDay} at ${formatTime(nextOpenTime, 'open')}`
      : null
    
    return {
      isOpen: false,
      nextChange,
      displayText: 'Closed now'
    }
  }
}

/**
 * Format 24-hour time to 12-hour format for display
 * Includes smart heuristic: if opening time is 1-6 AM for a restaurant, assume it's actually PM
 */
function formatTime(time24: string, context?: 'open' | 'close'): string {
  let [hours, minutes] = time24.split(':').map(Number)
  
  // 🎯 SMART FIX: Many restaurants have bad data (e.g., "05:00" instead of "17:00")
  // If it's an opening time between 1 AM - 6 AM, assume it's actually PM (add 12 hours)
  if (context === 'open' && hours >= 1 && hours <= 6) {
    hours += 12
  }
  
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}

/**
 * Get business status properties for display components
 * Handles both legacy text and new structured formats
 */
export function getBusinessStatusProps(
  hoursText: string | null | undefined, 
  hoursStructured: BusinessHoursStructured | null | undefined
) {
  // Prefer structured hours if available
  if (hoursStructured && !hoursStructured.needs_conversion) {
    return parseStructuredBusinessHours(hoursStructured)
  }
  
  // Fallback to legacy text parsing
  return parseBusinessHours(hoursText)
}

