/**
 * Franchise CRM Configuration
 * Each franchise location has its own CRM/GHL integration settings
 */

import { FranchiseCity } from './city-detection'

export interface FranchiseCRMConfig {
  city: FranchiseCity
  displayName: string
  ghl_webhook_url: string // Main signup webhook
  ghl_update_webhook_url?: string // Optional separate update webhook
  slack_webhook_url?: string // Optional Slack notifications
  franchise_owner: {
    name: string
    email: string
    phone?: string
  }
  // Optional: Custom CRM settings
  custom_fields?: Record<string, any>
  timezone: string
}

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Load franchise CRM configuration from database
 */
export async function loadFranchiseCRMConfigFromDB(city: FranchiseCity): Promise<FranchiseCRMConfig | null> {
  try {
    const supabaseAdmin = createAdminClient()
    
    const { data, error } = await supabaseAdmin
      .from('franchise_crm_configs')
      .select('*')
      .eq('city', city)
      .eq('status', 'active')
      .single()
    
    if (error || !data) {
      console.warn(`No active CRM config found for ${city}:`, error?.message)
      return null
    }
    
    return {
      city: data.city as FranchiseCity,
      displayName: data.display_name,
      ghl_webhook_url: data.ghl_webhook_url,
      ghl_update_webhook_url: data.ghl_update_webhook_url || undefined,
      slack_webhook_url: data.slack_webhook_url || undefined,
      franchise_owner: {
        name: data.owner_name,
        email: data.owner_email,
        phone: data.owner_phone || undefined
      },
      timezone: data.timezone
    }
  } catch (error) {
    console.error(`Failed to load CRM config for ${city}:`, error)
    return null
  }
}

/**
 * Fallback franchise CRM configurations (used when database is unavailable)
 * Each franchise owner provides their own GHL webhook URLs
 */
const FALLBACK_FRANCHISE_CRM_CONFIGS: Record<FranchiseCity, FranchiseCRMConfig> = {
  bournemouth: {
    city: 'bournemouth',
    displayName: 'Bournemouth',
    ghl_webhook_url: 'https://services.leadconnectorhq.com/hooks/IkBldqzvQG4XkoSxkCq8/webhook-trigger/582275ed-27fe-4374-808b-9f8403f820e3',
    ghl_update_webhook_url: undefined, // Will use main webhook for now
    slack_webhook_url: 'https://hooks.slack.com/services/YOUR_WORKSPACE_ID/YOUR_CHANNEL_ID/YOUR_SECRET',
    franchise_owner: {
      name: 'Qwikker Bournemouth',
      email: 'bournemouth@qwikker.com',
      phone: '+44 1202 123456'
    },
    timezone: 'Europe/London'
  },
  
  calgary: {
    city: 'calgary',
    displayName: 'Calgary',
    ghl_webhook_url: 'https://services.leadconnectorhq.com/hooks/CALGARY_WEBHOOK_HERE/webhook-trigger/CALGARY_ID_HERE',
    ghl_update_webhook_url: undefined,
    slack_webhook_url: undefined, // Calgary might not use Slack
    franchise_owner: {
      name: 'Calgary Franchise Owner',
      email: 'calgary@qwikker.com'
    },
    timezone: 'America/Edmonton'
  },
  
  london: {
    city: 'london',
    displayName: 'London',
    ghl_webhook_url: 'https://services.leadconnectorhq.com/hooks/LONDON_WEBHOOK_HERE/webhook-trigger/LONDON_ID_HERE',
    ghl_update_webhook_url: undefined,
    slack_webhook_url: undefined,
    franchise_owner: {
      name: 'London Franchise Owner',
      email: 'london@qwikker.com'
    },
    timezone: 'Europe/London'
  },
  
  paris: {
    city: 'paris',
    displayName: 'Paris',
    ghl_webhook_url: 'https://services.leadconnectorhq.com/hooks/PARIS_WEBHOOK_HERE/webhook-trigger/PARIS_ID_HERE',
    ghl_update_webhook_url: undefined,
    slack_webhook_url: undefined,
    franchise_owner: {
      name: 'Paris Franchise Owner',
      email: 'paris@qwikker.com'
    },
    timezone: 'Europe/Paris'
  }
}

/**
 * Get CRM configuration for a specific franchise city (async - loads from database)
 */
export async function getFranchiseCRMConfig(city: FranchiseCity): Promise<FranchiseCRMConfig> {
  // Try to load from database first
  const dbConfig = await loadFranchiseCRMConfigFromDB(city)
  
  if (dbConfig) {
    return dbConfig
  }
  
  // Fallback to hardcoded configs
  const config = FALLBACK_FRANCHISE_CRM_CONFIGS[city]
  
  if (!config) {
    console.warn(`⚠️ No CRM config found for city: ${city}, using Bournemouth as fallback`)
    return FALLBACK_FRANCHISE_CRM_CONFIGS.bournemouth
  }
  
  return config
}

/**
 * Get CRM configuration for a specific franchise city (sync - uses fallback configs only)
 * Use this when you can't use async/await
 */
export function getFranchiseCRMConfigSync(city: FranchiseCity): FranchiseCRMConfig {
  const config = FALLBACK_FRANCHISE_CRM_CONFIGS[city]
  
  if (!config) {
    console.warn(`⚠️ No CRM config found for city: ${city}, using Bournemouth as fallback`)
    return FALLBACK_FRANCHISE_CRM_CONFIGS.bournemouth
  }
  
  return config
}

/**
 * Get all franchise cities that have CRM configurations
 */
export function getAllFranchiseCities(): FranchiseCity[] {
  return Object.keys(FRANCHISE_CRM_CONFIGS) as FranchiseCity[]
}

/**
 * Check if a city has a valid CRM configuration
 */
export function hasCRMConfig(city: FranchiseCity): boolean {
  const config = FALLBACK_FRANCHISE_CRM_CONFIGS[city]
  return !!(config && config.ghl_webhook_url && config.ghl_webhook_url !== 'PLACEHOLDER')
}

/**
 * Validate CRM configuration for a city
 */
export function validateCRMConfig(city: FranchiseCity): {
  isValid: boolean
  errors: string[]
  warnings: string[]
} {
  const config = FRANCHISE_CRM_CONFIGS[city]
  const errors: string[] = []
  const warnings: string[] = []
  
  if (!config) {
    errors.push(`No CRM configuration found for ${city}`)
    return { isValid: false, errors, warnings }
  }
  
  // Check required fields
  if (!config.ghl_webhook_url || config.ghl_webhook_url.includes('PLACEHOLDER')) {
    errors.push(`GHL webhook URL not configured for ${city}`)
  }
  
  if (!config.franchise_owner.email) {
    errors.push(`Franchise owner email not configured for ${city}`)
  }
  
  // Check optional but recommended fields
  if (!config.ghl_update_webhook_url) {
    warnings.push(`No separate update webhook configured for ${city} - will use main webhook`)
  }
  
  if (!config.slack_webhook_url) {
    warnings.push(`No Slack webhook configured for ${city}`)
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Environment variable override system
 * Allows franchise owners to set their webhooks via environment variables
 */
export function getFranchiseCRMConfigWithEnvOverrides(city: FranchiseCity): FranchiseCRMConfig {
  const baseConfig = getFranchiseCRMConfig(city)
  
  // Check for environment variable overrides
  const cityUpper = city.toUpperCase()
  
  const envOverrides: Partial<FranchiseCRMConfig> = {
    ghl_webhook_url: process.env[`${cityUpper}_GHL_WEBHOOK_URL`] || baseConfig.ghl_webhook_url,
    ghl_update_webhook_url: process.env[`${cityUpper}_GHL_UPDATE_WEBHOOK_URL`] || baseConfig.ghl_update_webhook_url,
    slack_webhook_url: process.env[`${cityUpper}_SLACK_WEBHOOK_URL`] || baseConfig.slack_webhook_url,
  }
  
  return {
    ...baseConfig,
    ...envOverrides
  }
}
