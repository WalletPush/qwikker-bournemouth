/**
 * Format a business-entered price for display.
 *
 * Businesses type prices freely (e.g. "From €45/day", "Free", "$20", "£10", or
 * just "45"). We must NOT blindly prepend a currency symbol, or a franchise on
 * another currency ends up with nonsense like "£From €45/day" (dennis quick-win,
 * Jul 2026). Rule: if the value already contains a currency symbol or any
 * descriptive text, show it exactly as typed. Only a BARE number gets a symbol,
 * and that symbol is configurable per franchise (defaults to £ to preserve
 * existing UK behaviour).
 */
export function formatPrice(
  price: string | number | undefined | null,
  currencySymbol: string = '£'
): string {
  if (price === null || price === undefined) return ''

  const priceStr = price.toString().trim()
  if (!priceStr) return ''

  // Already has its own currency symbol or descriptive text — respect it as-is.
  const isBareNumber = /^\d+(\.\d{1,2})?$/.test(priceStr)
  if (!isBareNumber) return priceStr

  // Bare number → normalise to 2 decimals ("4.5" -> "4.50", "12" -> "12.00")
  // and prefix the franchise currency symbol.
  return `${currencySymbol}${parseFloat(priceStr).toFixed(2)}`
}

/**
 * Should we render a price at all?
 *
 * AI-pulled / imported featured menu items usually have NO price (or a placeholder
 * zero), and rendering that as "£0.00" looks broken. This returns false for empty,
 * missing, or purely-zero values (with or without a currency symbol), while still
 * allowing legitimate text prices like "Free" or "From £10".
 */
export function hasDisplayablePrice(price: string | number | undefined | null): boolean {
  if (price === null || price === undefined) return false
  const str = price.toString().trim()
  if (!str) return false
  // Purely zero, optionally with a leading currency symbol: £0, $0.00, €0,00, 0
  if (/^[£$€]?\s*0+([.,]0+)?\s*$/.test(str)) return false
  return true
}

/**
 * Clean price string for database storage (remove £ symbol)
 */
export function cleanPrice(price: string): string {
  return price.replace(/^£/, '').trim()
}

/**
 * Validate if price is in correct format
 */
export function isValidPrice(price: string): boolean {
  const cleanedPrice = cleanPrice(price)
  return /^\d+(\.\d{1,2})?$/.test(cleanedPrice)
}
