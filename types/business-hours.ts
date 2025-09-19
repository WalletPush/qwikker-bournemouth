// Types for structured business hours system
// This provides AI-friendly structured data instead of free text

export interface DayHours {
  open: string | null;  // Format: "09:00"
  close: string | null; // Format: "17:30" 
  closed: boolean;      // True if business is closed this day
  notes?: string | null; // Optional notes like "Lunch break 12-1pm"
}

export interface BusinessHoursStructured {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
  
  // Metadata
  timezone?: string;           // e.g., "Europe/London"
  last_updated?: string;       // ISO timestamp
  legacy_text?: string;        // Original text format for reference
  needs_conversion?: boolean;  // Flag for migrated data
}

export interface BusinessHoursFormData {
  // Common patterns
  pattern: 'weekdays_same' | 'weekdays_weekend' | 'custom';
  
  // Weekdays (Mon-Fri) when pattern is 'weekdays_same' or 'weekdays_weekend'
  weekdays_open?: string;
  weekdays_close?: string;
  weekdays_closed?: boolean;
  
  // Weekend when pattern is 'weekdays_weekend'
  saturday_open?: string;
  saturday_close?: string;
  saturday_closed?: boolean;
  
  sunday_open?: string;
  sunday_close?: string;
  sunday_closed?: boolean;
  
  // Individual days when pattern is 'custom'
  custom_hours?: BusinessHoursStructured;
  
  // General
  notes?: string;
}

// Helper functions
export const DAYS_OF_WEEK = [
  'monday', 'tuesday', 'wednesday', 'thursday', 
  'friday', 'saturday', 'sunday'
] as const;

export const WEEKDAYS = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday'
] as const;

export const WEEKEND = ['saturday', 'sunday'] as const;

// Time slots for dropdowns (15-minute intervals)
export const TIME_SLOTS = [
  '06:00', '06:15', '06:30', '06:45',
  '07:00', '07:15', '07:30', '07:45',
  '08:00', '08:15', '08:30', '08:45',
  '09:00', '09:15', '09:30', '09:45',
  '10:00', '10:15', '10:30', '10:45',
  '11:00', '11:15', '11:30', '11:45',
  '12:00', '12:15', '12:30', '12:45',
  '13:00', '13:15', '13:30', '13:45',
  '14:00', '14:15', '14:30', '14:45',
  '15:00', '15:15', '15:30', '15:45',
  '16:00', '16:15', '16:30', '16:45',
  '17:00', '17:15', '17:30', '17:45',
  '18:00', '18:15', '18:30', '18:45',
  '19:00', '19:15', '19:30', '19:45',
  '20:00', '20:15', '20:30', '20:45',
  '21:00', '21:15', '21:30', '21:45',
  '22:00', '22:15', '22:30', '22:45',
  '23:00', '23:15', '23:30', '23:45'
];

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
    last_updated: new Date().toISOString()
  };

  if (formData.pattern === 'weekdays_same') {
    // Same hours Monday-Sunday
    const dayHours: DayHours = {
      open: formData.weekdays_closed ? null : formData.weekdays_open || null,
      close: formData.weekdays_closed ? null : formData.weekdays_close || null,
      closed: formData.weekdays_closed || false
    };
    
    DAYS_OF_WEEK.forEach(day => {
      result[day] = { ...dayHours };
    });
  } 
  else if (formData.pattern === 'weekdays_weekend') {
    // Weekdays same, weekend different
    const weekdayHours: DayHours = {
      open: formData.weekdays_closed ? null : formData.weekdays_open || null,
      close: formData.weekdays_closed ? null : formData.weekdays_close || null,
      closed: formData.weekdays_closed || false
    };
    
    WEEKDAYS.forEach(day => {
      result[day] = { ...weekdayHours };
    });
    
    result.saturday = {
      open: formData.saturday_closed ? null : formData.saturday_open || null,
      close: formData.saturday_closed ? null : formData.saturday_close || null,
      closed: formData.saturday_closed || false
    };
    
    result.sunday = {
      open: formData.sunday_closed ? null : formData.sunday_open || null,
      close: formData.sunday_closed ? null : formData.sunday_close || null,
      closed: formData.sunday_closed || false
    };
  }
  else if (formData.pattern === 'custom' && formData.custom_hours) {
    return { ...formData.custom_hours, last_updated: new Date().toISOString() };
  }

  return result;
}

// Convert structured format to human readable text (for AI and display)
export function convertStructuredToText(structured: BusinessHoursStructured): string {
  if (!structured) return 'Hours not set';
  
  const lines: string[] = [];
  
  DAYS_OF_WEEK.forEach(day => {
    const dayData = structured[day];
    const dayName = day.charAt(0).toUpperCase() + day.slice(1);
    
    if (dayData.closed) {
      lines.push(`${dayName}: Closed`);
    } else if (dayData.open && dayData.close) {
      lines.push(`${dayName}: ${dayData.open} - ${dayData.close}`);
      if (dayData.notes) {
        lines.push(`  ${dayData.notes}`);
      }
    } else {
      lines.push(`${dayName}: Hours not set`);
    }
  });
  
  return lines.join('\n');
}

// Check if business is currently open (for real-time status)
export function isBusinessOpen(structured: BusinessHoursStructured): boolean {
  if (!structured) return false;
  
  const now = new Date();
  const currentDay = DAYS_OF_WEEK[now.getDay() === 0 ? 6 : now.getDay() - 1]; // Convert JS day to our format
  const currentTime = now.toTimeString().slice(0, 5); // "HH:MM" format
  
  const todayHours = structured[currentDay];
  if (!todayHours || todayHours.closed || !todayHours.open || !todayHours.close) {
    return false;
  }
  
  return currentTime >= todayHours.open && currentTime <= todayHours.close;
}
