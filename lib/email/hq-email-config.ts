import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * HQ Email Configuration
 * Used for platform-wide emails sent by HQ (franchise invites, announcements, etc.)
 */
export interface HQEmailConfig {
  provider: 'resend'
  resend_api_key: string | null
  from_email: string
  from_name: string
  reply_to: string
  enabled: boolean
}

/**
 * Get HQ email configuration from database
 * 
 * @returns HQ email configuration or null if not configured
 */
export async function getHQEmailConfig(): Promise<HQEmailConfig | null> {
  try {
    const supabase = createServiceRoleClient()
    
    const { data, error } = await supabase
      .rpc('get_hq_email_config')
    
    if (error) {
      console.error('Error fetching HQ email config:', error)
      return null
    }
    
    if (!data || Object.keys(data).length === 0) {
      console.warn('HQ email config not found in database')
      return null
    }
    
    return data as HQEmailConfig
  } catch (error) {
    console.error('Failed to get HQ email config:', error)
    return null
  }
}

/**
 * Check if HQ email is configured and ready to use
 * 
 * @returns true if HQ email is configured and enabled
 */
export async function isHQEmailConfigured(): Promise<boolean> {
  const config = await getHQEmailConfig()
  
  return !!(
    config &&
    config.enabled &&
    config.resend_api_key &&
    config.from_email
  )
}

/**
 * Update HQ email configuration
 * Requires HQ admin authentication
 * 
 * @param updates - Partial email configuration to update
 * @returns Updated configuration
 */
export async function updateHQEmailConfig(updates: Partial<HQEmailConfig>): Promise<HQEmailConfig | null> {
  try {
    const supabase = createServiceRoleClient()
    
    const { data, error } = await supabase
      .rpc('update_hq_email_config', {
        p_resend_api_key: updates.resend_api_key ?? null,
        p_from_email: updates.from_email ?? null,
        p_from_name: updates.from_name ?? null,
        p_reply_to: updates.reply_to ?? null,
        p_enabled: updates.enabled ?? null
      })
    
    if (error) {
      console.error('Error updating HQ email config:', error)
      throw new Error(`Failed to update HQ email config: ${error.message}`)
    }
    
    return data as HQEmailConfig
  } catch (error) {
    console.error('Failed to update HQ email config:', error)
    return null
  }
}

/**
 * Get HQ email configuration with fallback to environment variables
 * (For backwards compatibility during migration)
 * 
 * @returns Email configuration
 */
export async function getHQEmailConfigWithFallback(): Promise<HQEmailConfig> {
  // Try to get from database first
  const dbConfig = await getHQEmailConfig()
  
  if (dbConfig && dbConfig.enabled && dbConfig.resend_api_key) {
    return dbConfig
  }
  
  // Fallback to environment variables (legacy)
  console.warn('⚠️ Using fallback HQ email config from environment variables. Please configure in database.')
  
  return {
    provider: 'resend',
    resend_api_key: process.env.RESEND_API_KEY || null,
    from_email: process.env.HQ_FROM_EMAIL || 'hq@qwikker.com',
    from_name: process.env.HQ_FROM_NAME || 'Qwikker HQ',
    reply_to: process.env.HQ_REPLY_TO || 'support@qwikker.com',
    enabled: !!process.env.RESEND_API_KEY
  }
}
