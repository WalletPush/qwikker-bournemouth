/**
 * Franchise API Keys Utility
 * 
 * This helper manages API keys per franchise from the database.
 * Each franchise pays for and manages their own API services (Resend, OpenAI, Anthropic).
 * 
 * IMPORTANT: This has fallback to environment variables during migration period.
 * Once all franchises have filled in their keys in the database, remove the fallback.
 */

import { createAdminClient } from '@/lib/supabase/admin'

export interface FranchiseApiKeys {
  // Email Service (Resend)
  resend_api_key: string | null
  resend_from_email: string | null
  resend_from_name: string | null
  
  // AI Services
  openai_api_key: string | null
  anthropic_api_key: string | null
  
  // Already in DB
  slack_webhook_url: string | null
  walletpush_api_key: string | null
  walletpush_template_id: string | null
  ghl_webhook_url: string | null
}

/**
 * Get API keys for a specific franchise from database
 * 
 * @param city - The franchise city (e.g., 'bournemouth', 'calgary')
 * @returns FranchiseApiKeys object with all API keys
 * 
 * @example
 * const keys = await getFranchiseApiKeys('bournemouth')
 * const openai = new OpenAI({ apiKey: keys.openai_api_key })
 */
export async function getFranchiseApiKeys(city: string): Promise<FranchiseApiKeys> {
  try {
    const supabase = createAdminClient()
    
    const { data, error } = await supabase
      .from('franchise_crm_configs')
      .select(`
        resend_api_key,
        resend_from_email,
        resend_from_name,
        openai_api_key,
        anthropic_api_key,
        slack_webhook_url,
        walletpush_api_key,
        walletpush_template_id,
        ghl_webhook_url
      `)
      .eq('city', city)
      .eq('status', 'active')
      .single()
    
    if (error) {
      console.error(`❌ Error fetching API keys for ${city}:`, error)
      // FALLBACK: Use environment variables during migration
      return getFallbackApiKeys(city)
    }
    
    if (!data) {
      console.warn(`⚠️ No API keys found for ${city}, using fallback`)
      return getFallbackApiKeys(city)
    }
    
    // If database values are empty, use environment variable fallback
    const keys: FranchiseApiKeys = {
      resend_api_key: data.resend_api_key || process.env.RESEND_API_KEY || null,
      resend_from_email: data.resend_from_email || process.env.EMAIL_FROM || null,
      resend_from_name: data.resend_from_name || `${city.charAt(0).toUpperCase() + city.slice(1)} Qwikker`,
      openai_api_key: data.openai_api_key || process.env.OPENAI_API_KEY || null,
      anthropic_api_key: data.anthropic_api_key || process.env.ANTHROPIC_API_KEY || null,
      slack_webhook_url: data.slack_webhook_url || process.env[`SLACK_WEBHOOK_URL_${city.toUpperCase()}`] || process.env.NEXT_PUBLIC_SLACK_WEBHOOK_URL || null,
      walletpush_api_key: data.walletpush_api_key || process.env.MOBILE_WALLET_APP_KEY || null,
      walletpush_template_id: data.walletpush_template_id || process.env.MOBILE_WALLET_TEMPLATE_ID || null,
      ghl_webhook_url: data.ghl_webhook_url || null,
    }
    
    return keys
    
  } catch (error) {
    console.error(`❌ Failed to get API keys for ${city}:`, error)
    return getFallbackApiKeys(city)
  }
}

/**
 * Fallback to environment variables (temporary during migration)
 * 
 * IMPORTANT: Remove this once all franchises have filled in their database values!
 */
function getFallbackApiKeys(city: string): FranchiseApiKeys {
  console.warn(`⚠️ Using environment variable fallback for ${city} - fill in Setup page!`)
  
  return {
    resend_api_key: process.env.RESEND_API_KEY || null,
    resend_from_email: process.env.EMAIL_FROM || null,
    resend_from_name: process.env.EMAIL_FROM?.split('<')[0].trim() || `${city.charAt(0).toUpperCase() + city.slice(1)} Qwikker`,
    openai_api_key: process.env.OPENAI_API_KEY || null,
    anthropic_api_key: process.env.ANTHROPIC_API_KEY || null,
    slack_webhook_url: process.env[`SLACK_WEBHOOK_URL_${city.toUpperCase()}`] || process.env.NEXT_PUBLIC_SLACK_WEBHOOK_URL || null,
    walletpush_api_key: process.env.MOBILE_WALLET_APP_KEY || null,
    walletpush_template_id: process.env.MOBILE_WALLET_TEMPLATE_ID || null,
    ghl_webhook_url: null,
  }
}

/**
 * Check if a franchise has completed their API key setup
 * Useful for showing warnings in the admin dashboard
 */
export async function hasFranchiseCompletedSetup(city: string): Promise<{
  isComplete: boolean
  missingKeys: string[]
}> {
  const keys = await getFranchiseApiKeys(city)
  const missingKeys: string[] = []
  
  // Check required keys
  if (!keys.resend_api_key) missingKeys.push('Resend API Key')
  if (!keys.resend_from_email) missingKeys.push('Resend From Email')
  if (!keys.openai_api_key) missingKeys.push('OpenAI API Key')
  if (!keys.walletpush_api_key) missingKeys.push('WalletPush API Key')
  if (!keys.ghl_webhook_url) missingKeys.push('GHL Webhook URL')
  
  return {
    isComplete: missingKeys.length === 0,
    missingKeys
  }
}

