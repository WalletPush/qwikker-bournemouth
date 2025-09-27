'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'

export interface FranchiseConfig {
  id: string
  city: string
  display_name: string
  subdomain: string
  
  // GHL Integration
  ghl_webhook_url: string
  ghl_update_webhook_url?: string
  
  // WalletPush Integration
  walletpush_api_key?: string
  walletpush_template_id?: string
  walletpush_endpoint_url?: string
  
  // Slack Integration
  slack_webhook_url?: string
  slack_channel?: string
  
  // Franchise Owner Details
  owner_name: string
  owner_email: string
  owner_phone?: string
  
  // System Settings
  timezone: string
  status: 'active' | 'pending_setup' | 'inactive'
  
  created_at: string
  updated_at: string
}

/**
 * Get franchise configuration for a specific city
 * This allows each franchise to have their own API keys and settings
 */
export async function getFranchiseConfig(city: string): Promise<FranchiseConfig | null> {
  try {
    const supabase = createServiceRoleClient()
    
    const { data: config, error } = await supabase
      .from('franchise_crm_configs')
      .select('*')
      .eq('city', city.toLowerCase())
      .single()
    
    if (error) {
      console.error(`Error fetching franchise config for ${city}:`, error)
      return null
    }
    
    return config as FranchiseConfig
  } catch (error) {
    console.error(`Error in getFranchiseConfig for ${city}:`, error)
    return null
  }
}

/**
 * Get all active franchise configurations
 */
export async function getAllFranchiseConfigs(): Promise<FranchiseConfig[]> {
  try {
    const supabase = createServiceRoleClient()
    
    const { data: configs, error } = await supabase
      .from('franchise_crm_configs')
      .select('*')
      .eq('status', 'active')
      .order('city')
    
    if (error) {
      console.error('Error fetching all franchise configs:', error)
      return []
    }
    
    return configs as FranchiseConfig[]
  } catch (error) {
    console.error('Error in getAllFranchiseConfigs:', error)
    return []
  }
}

/**
 * Get WalletPush credentials for a specific city
 * Returns fallback to environment variables if city config not found
 */
export async function getWalletPushCredentials(city: string) {
  const config = await getFranchiseConfig(city)
  
  return {
    apiKey: config?.walletpush_api_key || process.env.MOBILE_WALLET_APP_KEY,
    templateId: config?.walletpush_template_id || process.env.MOBILE_WALLET_TEMPLATE_ID,
    endpointUrl: config?.walletpush_endpoint_url || process.env.WALLETPUSH_HL_ENDPOINT,
    city: city,
    franchiseName: config?.display_name || city
  }
}

/**
 * Update franchise configuration (admin only)
 */
export async function updateFranchiseConfig(
  city: string, 
  updates: Partial<FranchiseConfig>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createServiceRoleClient()
    
    const { error } = await supabase
      .from('franchise_crm_configs')
      .update(updates)
      .eq('city', city.toLowerCase())
    
    if (error) {
      console.error(`Error updating franchise config for ${city}:`, error)
      return { success: false, error: error.message }
    }
    
    return { success: true }
  } catch (error) {
    console.error(`Error in updateFranchiseConfig for ${city}:`, error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
