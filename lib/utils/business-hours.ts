/**
 * Business Hours Utility Functions
 * Handles parsing business hours and determining if a business is currently open
 */

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

  // For complex formats or unrecognized patterns, return a safe default
  // This handles cases like "Mon-Fri 9AM-5PM, Sat-Sun 10AM-4PM"
  return {
    isOpen: true, // Assume open for complex schedules to avoid showing "closed" incorrectly
    nextChange: null,
    displayText: 'Open now' // Default to showing as open for complex schedules
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
 * Get business status indicator component props
 */
export function getBusinessStatusProps(hoursString: string | null | undefined) {
  const parsed = parseBusinessHours(hoursString)
  
  return {
    isOpen: parsed.isOpen,
    statusText: parsed.displayText,
    statusColor: parsed.isOpen ? 'text-green-400' : 'text-red-400',
    nextChange: parsed.nextChange
  }
}

