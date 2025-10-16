import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getFranchiseCityFromRequest } from '@/lib/utils/franchise-areas'
import { validateWebhookSignature } from '@/lib/utils/webhook-security'
import { withRateLimit, RATE_LIMIT_PRESETS } from '@/lib/utils/rate-limiting'

/**
 * SECURE USER CREATION WEBHOOK
 * 
 * Security improvements:
 * 1. Webhook signature validation
 * 2. Dynamic city detection (no hardcoded 'bournemouth')
 * 3. Franchise validation
 * 4. Rate limiting considerations
 */

// Using imported validateWebhookSignature from lib/utils/webhook-security.ts

/**
 * Detect franchise city from webhook data or request
 */
function detectCityFromWebhookData(data: Record<string, unknown>): string | null {
  // Try to get city from webhook data
  const cityFromData = data.customData?.franchise_city || 
                      data.franchise_city || 
                      data.customData?.city || 
                      data.city
  
  if (cityFromData) {
    console.log(`🏙️ City detected from webhook data: ${cityFromData}`)
    return cityFromData.toLowerCase()
  }
  
  // Try to detect from domain/subdomain in webhook data
  const domain = data.customData?.domain || data.domain
  if (domain) {
    if (domain.includes('calgary')) return 'calgary'
    if (domain.includes('london')) return 'london'
    if (domain.includes('paris')) return 'paris'
    if (domain.includes('bournemouth')) return 'bournemouth'
  }
  
  return null
}

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 SECURE user creation webhook')
    
    // SECURITY: Rate limiting
    const rateLimitResult = await withRateLimit(
      RATE_LIMIT_PRESETS.WEBHOOK_STRICT,
      'webhook_user_creation'
    )(request)
    
    if (!rateLimitResult.success) {
      console.warn(`🚫 Rate limit exceeded for webhook: ${rateLimitResult.retryAfter}s retry`)
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60',
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateLimitResult.resetTime).toISOString()
          }
        }
      )
    }
    
    // Get raw body for signature validation
    const body = await request.text()
    const data = JSON.parse(body)
    
    // SECURITY: Validate webhook signature with proper HMAC
    const signature = request.headers.get('x-webhook-signature') || 
                     request.headers.get('x-ghl-signature') ||
                     request.headers.get('authorization')
    
    const webhookSecret = process.env.GHL_WEBHOOK_SECRET
    
    if (!webhookSecret) {
      console.error('❌ Webhook secret not configured')
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
    }
    
    if (!signature) {
      console.error('❌ No webhook signature provided')
      return NextResponse.json({ error: 'Unauthorized: Missing signature' }, { status: 401 })
    }
    
    if (!validateWebhookSignature(body, signature, webhookSecret)) {
      console.error('❌ Invalid webhook signature')
      return NextResponse.json({ error: 'Unauthorized: Invalid signature' }, { status: 401 })
    }
    
    console.log('✅ Webhook signature validated with HMAC')
    console.log('Data received:', JSON.stringify(data, null, 2))
    
    // Extract basic data
    const first_name = data.customData?.first_name || data.first_name || 'Unknown'
    const last_name = data.customData?.last_name || data.last_name || 'User'
    const email = data.customData?.email || data.email || 'user@qwikker.com'
    const serialNumber = data.customData?.serialNumber || data.serialNumber
    
    if (!serialNumber) {
      console.error('❌ No serialNumber found in webhook data')
      return NextResponse.json({ error: 'No serialNumber provided' }, { status: 400 })
    }
    
    // SECURITY: Dynamic city detection (no hardcoded values)
    let city = detectCityFromWebhookData(data)
    
    // Fallback: try to detect from request headers
    if (!city) {
      try {
        city = await getFranchiseCityFromRequest()
        console.log(`🏙️ City detected from request: ${city}`)
      } catch (error) {
        console.warn('⚠️ Could not detect city from request:', error)
      }
    }
    
    // SECURITY: No fallbacks - reject if city cannot be determined
    if (!city) {
      console.error('❌ Could not determine franchise city from webhook data or request')
      return NextResponse.json({ 
        error: 'Unable to determine franchise city. Please ensure webhook includes city/domain information.' 
      }, { status: 400 })
    }
    
    console.log(`🏙️ Final city for user creation: ${city}`)
    
    // SECURITY: Validate that the detected city is a valid franchise
    const validCities = ['bournemouth', 'calgary', 'london', 'paris']
    if (!validCities.includes(city)) {
      console.error(`❌ Invalid franchise city: ${city}`)
      return NextResponse.json({ 
        error: `Invalid franchise city: ${city}` 
      }, { status: 400 })
    }
    
    const supabase = createServiceRoleClient()
    
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('app_users')
      .select('wallet_pass_id, name, city')
      .eq('wallet_pass_id', serialNumber)
      .single()
    
    if (existingUser) {
      console.log(`✅ User already exists: ${existingUser.name} (${existingUser.city})`)
      return NextResponse.json({
        success: true,
        user: existingUser,
        message: 'User already exists'
      })
    }
    
    // Create new user with detected city
    const { data: newUser, error } = await supabase
      .from('app_users')
      .insert({
        user_id: crypto.randomUUID(),
        wallet_pass_id: serialNumber,
        name: `${first_name} ${last_name}`,
        email: email,
        city: city, // Dynamic city instead of hardcoded 'bournemouth'
        tier: 'explorer',
        level: 1,
        wallet_pass_status: 'active',
        referral_code: crypto.randomUUID().split('-')[0].toUpperCase(), // Generate referral code
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error('❌ Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log(`✅ User created: ${newUser.name} in ${newUser.city} franchise`)
    
    return NextResponse.json({
      success: true,
      user: newUser,
      franchise: city
    })
    
  } catch (error) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 })
  }
}
