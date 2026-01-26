/**
 * Utility functions for formatting business hours for display
 */

interface StructuredHours {
  [day: string]: {
    open: string
    close: string
    closed: boolean
  }
}

/**
 * Smart time formatter with restaurant heuristic
 * Converts 24-hour time to 12-hour format with AM/PM
 * If opening time is 1-6 AM, assumes it's actually PM (restaurants don't open at 5 AM!)
 */
function formatTimeWithSmartFix(time24: string | null | undefined, context: 'open' | 'close'): string {
  // Safety check: return fallback if time is missing
  if (!time24 || typeof time24 !== 'string') {
    return context === 'open' ? 'Opening time TBD' : 'Closing time TBD'
  }
  
  let [hours, minutes] = time24.split(':').map(Number)
  
  // 🎯 SMART FIX: Many restaurants have bad data (e.g., "05:00" instead of "17:00")
  // If it's an opening time between 1 AM - 6 AM, assume it's actually PM (add 12 hours)
  if (context === 'open' && hours >= 1 && hours <= 6) {
    hours += 12
  }
  
  const period = hours >= 12 ? 'PM' : 'AM'
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours
  const minutesStr = minutes === 0 ? '' : `:${minutes.toString().padStart(2, '0')}`
  return `${hours12}${minutesStr} ${period}`
}

/**
 * Format business hours for user-facing display
 * Handles both old text format and new structured format
 * @param business_hours - Old text format hours
 * @param business_hours_structured - New structured format hours
 * @param showFullSchedule - If true, shows complete weekly schedule; if false, shows current day only
 */
export function formatBusinessHours(
  business_hours?: string | null,
  business_hours_structured?: StructuredHours | null,
  showFullSchedule: boolean = false
): string {
  // If full schedule is requested and we have structured hours, use them
  if (showFullSchedule && business_hours_structured && typeof business_hours_structured === 'object') {
    return formatFullWeeklySchedule(business_hours_structured)
  }

  // If we have structured hours, format them appropriately
  if (business_hours_structured && typeof business_hours_structured === 'object') {
    return formatStructuredHours(business_hours_structured)
  }

  // Fallback to old format text if structured hours not available
  if (business_hours && business_hours.trim() !== '') {
    return business_hours
  }

  // Final fallback
  return 'Hours not available'
}

/**
 * Format complete weekly schedule for hero cards/detailed views
 */
function formatFullWeeklySchedule(structuredHours: StructuredHours): string {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  
  const schedule = days.map((day, index) => {
    const hours = structuredHours[day]
    const dayName = dayNames[index]
    
    if (!hours || typeof hours !== 'object') {
      return `${dayName}: Hours not available`
    }
    
    if (hours.closed) {
      return `${dayName}: Closed`
    } else if (hours.open && hours.close) {
      // Apply smart formatting: "05:00" → "5:00 PM", "21:30" → "9:30 PM"
      const openFormatted = formatTimeWithSmartFix(hours.open, 'open')
      const closeFormatted = formatTimeWithSmartFix(hours.close, 'close')
      return `${dayName}: ${openFormatted} - ${closeFormatted}`
    } else {
      return `${dayName}: Hours not available`
    }
  })
  
  return schedule.join('\n')
}

/**
 * Format structured hours into a readable string
 * Returns the current day's hours or a summary
 */
function formatStructuredHours(structuredHours: StructuredHours): string {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  
  // Get current day
  const today = new Date().getDay() // 0 = Sunday, 1 = Monday, etc.
  const todayKey = days[(today + 6) % 7] // Convert to Monday = 0 format
  
  // Check if today's hours exist
  const todayHours = structuredHours[todayKey]
  if (todayHours && typeof todayHours === 'object') {
    if (todayHours.closed) {
      return 'Closed today'
    } else if (todayHours.open && todayHours.close) {
      const openFormatted = formatTimeWithSmartFix(todayHours.open, 'open')
      const closeFormatted = formatTimeWithSmartFix(todayHours.close, 'close')
      return `${openFormatted} - ${closeFormatted}`
    }
  }

  // Fallback: show first available day's hours
  for (const day of days) {
    const hours = structuredHours[day]
    if (hours && typeof hours === 'object' && !hours.closed && hours.open && hours.close) {
      const dayIndex = days.indexOf(day)
      const dayName = dayNames[dayIndex]
      const openFormatted = formatTimeWithSmartFix(hours.open, 'open')
      const closeFormatted = formatTimeWithSmartFix(hours.close, 'close')
      return `${dayName}: ${openFormatted} - ${closeFormatted}`
    }
  }

  return 'Hours not available'
}

/**
 * Get current business status (Open/Closed) based on hours
 */
export function getBusinessStatus(
  business_hours?: string | null,
  business_hours_structured?: StructuredHours | null
): {
  isOpen: boolean
  statusText: string
  nextChange?: string
} {
  // For structured hours, we can calculate if open/closed
  if (business_hours_structured && typeof business_hours_structured === 'object') {
    return getStatusFromStructuredHours(business_hours_structured)
  }

  // For text hours, we can't reliably determine status
  return {
    isOpen: false,
    statusText: 'Hours available',
    nextChange: undefined
  }
}

function getStatusFromStructuredHours(structuredHours: StructuredHours) {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const now = new Date()
  const today = now.getDay() // 0 = Sunday, 1 = Monday, etc.
  const todayKey = days[(today + 6) % 7] // Convert to Monday = 0 format
  
  const todayHours = structuredHours[todayKey]
  
  if (!todayHours || todayHours.closed) {
    return {
      isOpen: false,
      statusText: 'Closed',
      nextChange: undefined
    }
  }

  // Parse current time and business hours
  const currentTime = now.getHours() * 60 + now.getMinutes()
  const [openHour, openMin] = todayHours.open.split(':').map(Number)
  const [closeHour, closeMin] = todayHours.close.split(':').map(Number)
  
  const openTime = openHour * 60 + openMin
  const closeTime = closeHour * 60 + closeMin
  
  if (currentTime >= openTime && currentTime < closeTime) {
    return {
      isOpen: true,
      statusText: 'Open',
      nextChange: `Closes at ${todayHours.close}`
    }
  } else if (currentTime < openTime) {
    return {
      isOpen: false,
      statusText: 'Closed',
      nextChange: `Opens at ${todayHours.open}`
    }
  } else {
    return {
      isOpen: false,
      statusText: 'Closed',
      nextChange: undefined
    }
  }
}
