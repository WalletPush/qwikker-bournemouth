/**
 * Franchise-aware email sender.
 * Loads per-city Resend credentials from franchise_crm_configs
 * so every business notification comes from the registered admin email for that city.
 * Falls back to the global Resend client when franchise config is missing.
 */

import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/admin'
import { resend as globalResend, EMAIL_CONFIG } from './resend-client'
import type { EmailTemplate } from './email-service'

/**
 * Returns the correct base URL for a franchise city.
 * Production: https://{city}.qwikker.com
 * Dev: falls back to NEXT_PUBLIC_BASE_URL or localhost
 */
export function getFranchiseBaseUrl(city: string): string {
  if (process.env.NODE_ENV === 'production') {
    return `https://${city.toLowerCase()}.qwikker.com`
  }
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
}

interface FranchiseEmailOptions {
  city: string
  to: string | string[]
  template: EmailTemplate
  replyTo?: string
  tags?: Array<{ name: string; value: string }>
}

interface FranchiseResendConfig {
  resend_api_key: string
  resend_from_email: string
  resend_from_name: string | null
  display_name: string | null
}

const configCache = new Map<string, { config: FranchiseResendConfig | null; ts: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getFranchiseResendConfig(city: string): Promise<FranchiseResendConfig | null> {
  const cached = configCache.get(city)
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.config

  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('franchise_crm_configs')
      .select('resend_api_key, resend_from_email, resend_from_name, display_name')
      .eq('city', city)
      .single()

    if (error || !data?.resend_api_key || !data?.resend_from_email) {
      configCache.set(city, { config: null, ts: Date.now() })
      return null
    }

    const config = data as FranchiseResendConfig
    configCache.set(city, { config, ts: Date.now() })
    return config
  } catch {
    return null
  }
}

/**
 * Auto-derives the no-reply sending address from the city subdomain.
 */
export function getFranchiseFromEmail(city: string): string {
  return `no-reply@${city.toLowerCase()}.qwikker.com`
}

/**
 * Auto-derives the support/reply-to address from the city subdomain.
 * This is what users see in email body copy and what the reply-to header is set to.
 */
export function getFranchiseSupportEmail(city: string): string {
  return `hello@${city.toLowerCase()}.qwikker.com`
}

/**
 * Retry wrapper for Resend API calls.
 * Vercel serverless cold starts can cause DNS resolution failures,
 * which surface as "Unable to fetch data. The request could not be resolved."
 */
export async function sendWithRetry(
  resendInstance: Resend,
  payload: Parameters<Resend['emails']['send']>[0],
  maxRetries = 3
): Promise<{ data: { id: string } | null; error: { message: string; name: string } | null }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await resendInstance.emails.send(payload)

      if (result.error) {
        const isRetryable = result.error.name === 'application_error' &&
          result.error.message.includes('Unable to fetch data')

        if (isRetryable && attempt < maxRetries) {
          const delay = attempt * 1000
          console.warn(`⚠️ Resend attempt ${attempt}/${maxRetries} failed (DNS/network), retrying in ${delay}ms...`)
          await new Promise(r => setTimeout(r, delay))
          continue
        }

        return result
      }

      if (attempt > 1) {
        console.log(`✅ Resend succeeded on attempt ${attempt}/${maxRetries}`)
      }
      return result
    } catch (err) {
      if (attempt < maxRetries) {
        const delay = attempt * 1000
        console.warn(`⚠️ Resend attempt ${attempt}/${maxRetries} threw, retrying in ${delay}ms...`, err)
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      throw err
    }
  }

  return { data: null, error: { name: 'retry_exhausted', message: 'All retry attempts failed' } }
}

export async function sendFranchiseEmail(options: FranchiseEmailOptions): Promise<{
  success: boolean
  messageId?: string
  error?: string
}> {
  const { city, to, template, replyTo, tags = [] } = options

  const franchiseConfig = await getFranchiseResendConfig(city)

  const allTags = [
    { name: 'service', value: 'qwikker' },
    { name: 'city', value: city },
    { name: 'environment', value: process.env.NODE_ENV || 'development' },
    ...tags
  ]

  try {
    if (franchiseConfig) {
      const cityResend = new Resend(franchiseConfig.resend_api_key)
      const fromName = franchiseConfig.resend_from_name || 'QWIKKER'
      const fromEmail = getFranchiseFromEmail(city)
      const replyToEmail = replyTo || getFranchiseSupportEmail(city)

      console.log(`📧 [${city}] Sending franchise email to: ${Array.isArray(to) ? to.join(', ') : to}`)
      console.log(`📧 [${city}] From: ${fromName} <${fromEmail}>`)
      console.log(`📧 [${city}] Subject: ${template.subject}`)

      const result = await sendWithRetry(cityResend, {
        from: `${fromName} <${fromEmail}>`,
        to: Array.isArray(to) ? to : [to],
        replyTo: replyToEmail,
        subject: template.subject,
        html: template.html,
        text: template.text,
        tags: allTags
      })

      if (result.error) {
        console.error(`❌ [${city}] Franchise Resend error:`, result.error)
        return { success: false, error: result.error.message }
      }

      console.log(`✅ [${city}] Franchise email sent:`, result.data?.id)
      return { success: true, messageId: result.data?.id }
    }

    // Fallback to global Resend
    if (!globalResend) {
      console.warn(`📧 [${city}] No franchise config and global Resend not configured`)
      return { success: false, error: 'Email service not configured' }
    }

    console.log(`📧 [${city}] Falling back to global Resend for: ${Array.isArray(to) ? to.join(', ') : to}`)

    const result = await sendWithRetry(globalResend, {
      from: EMAIL_CONFIG.from,
      to: Array.isArray(to) ? to : [to],
      replyTo: replyTo || EMAIL_CONFIG.replyTo,
      subject: template.subject,
      html: template.html,
      text: template.text,
      tags: allTags
    })

    if (result.error) {
      console.error(`❌ [${city}] Global Resend error:`, result.error)
      return { success: false, error: result.error.message }
    }

    console.log(`✅ [${city}] Global email sent:`, result.data?.id)
    return { success: true, messageId: result.data?.id }
  } catch (error) {
    console.error(`❌ [${city}] Email send failed:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown email error'
    }
  }
}
