// Currency utilities for multi-franchise support

import { createServiceRoleClient } from '@/lib/supabase/server'

// Hardcoded fallback mapping
const CITY_CURRENCY_FALLBACK: Record<string, string> = {
  bournemouth: 'GBP',
  london: 'GBP',
  calgary: 'CAD',
}

/**
 * Get currency code for a franchise city
 * Fetches from franchise_crm_configs
 */
export async function getCurrencyForCity(city: string): Promise<string> {
  const supabase = createServiceRoleClient()
  
  try {
    const { data, error } = await supabase
      .from('franchise_crm_configs')
      .select('currency')
      .eq('city', city.toLowerCase())
      .single()
    
    if (data?.currency) {
      return data.currency
    }
  } catch (error) {
    console.warn(`Failed to fetch currency for ${city}, using fallback`)
  }
  
  // Fallback to hardcoded mapping
  return CITY_CURRENCY_FALLBACK[city.toLowerCase()] || 'GBP'
}

/**
 * Get currency symbol for a franchise city
 * Fetches from franchise_crm_configs.currency_symbol if available
 */
export async function getCurrencySymbolForCity(city: string): Promise<string> {
  const supabase = createServiceRoleClient()
  
  try {
    const { data, error } = await supabase
      .from('franchise_crm_configs')
      .select('currency, currency_symbol')
      .eq('city', city.toLowerCase())
      .single()
    
    if (data?.currency_symbol) {
      return data.currency_symbol
    }
    
    // Fallback to deriving from currency code
    if (data?.currency) {
      return getCurrencySymbol(data.currency)
    }
  } catch (error) {
    console.warn(`Failed to fetch currency symbol for ${city}, using fallback`)
  }
  
  // Fallback to GBP symbol
  return '£'
}

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

