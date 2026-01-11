// Client-safe currency utilities (no server imports)
// Can be imported in both client and server components

/**
 * Format currency amount using Intl.NumberFormat
 * @param amount - The numeric amount to format
 * @param currencyCode - ISO 4217 currency code (e.g., 'GBP', 'USD', 'CAD')
 * @param locale - Optional locale (defaults to 'en-GB' for GBP, 'en-US' for USD, etc.)
 */
export function formatCurrency(
  amount: number | string,
  currencyCode: string,
  locale?: string
): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  // Auto-determine locale from currency if not provided
  if (!locale) {
    locale = getLocaleForCurrency(currencyCode)
  }
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount)
}

/**
 * Get appropriate locale for a currency code
 */
function getLocaleForCurrency(currencyCode: string): string {
  const localeMap: Record<string, string> = {
    GBP: 'en-GB',
    USD: 'en-US',
    EUR: 'en-GB', // Use British English for Euro formatting
    CAD: 'en-CA',
    AUD: 'en-AU',
    AED: 'ar-AE',
  }
  
  return localeMap[currencyCode] || 'en-GB'
}

/**
 * Get currency symbol for a currency code
 * Useful for displaying in UI elements like icons/badges
 */
export function getCurrencySymbol(currencyCode: string): string {
  const symbolMap: Record<string, string> = {
    GBP: '£',
    USD: '$',
    EUR: '€',
    CAD: '$',
    AUD: '$',
    AED: 'د.إ',
  }
  
  return symbolMap[currencyCode] || currencyCode
}

