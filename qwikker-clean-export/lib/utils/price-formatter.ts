/**
 * Format price to ensure proper £ symbol display
 * Handles cases where business might have already included £ symbol
 */
export function formatPrice(price: string | number | undefined | null): string {
  if (!price) return '£0.00'
  
  const priceStr = price.toString().trim()
  
  // If price is empty or just whitespace
  if (!priceStr) return '£0.00'
  
  // If price already starts with £, return as is
  if (priceStr.startsWith('£')) {
    return priceStr
  }
  
  // If price is just a number, add £ symbol
  return `£${priceStr}`
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
