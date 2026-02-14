import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getWalletPushCredentials } from '@/lib/utils/franchise-config'
import { WALLET_PASS_FIELDS } from '@/lib/config/wallet-pass-fields'
import { generateShortCode } from '@/lib/utils/short-code'

/**
 * Push Notification API for Business Broadcasts
 * 
 * Sends wallet pass notifications to targeted users WITHOUT updating Current_Offer.
 * Updates only Last_Message back field with short tracking links embedded.
 * 
 * Features:
 * - Short code tracking URLs (cookie-free identity)
 * - Monthly cap (20/month per business)
 * - City cooldown (60s between any pushes in city)
 * - Personalization tokens ({first_name})
 * - Crash-safe counting (truth-set from recipients)
 * - Multi-tenant safe
 * 
 * POST /api/walletpass/push-notification
 */
export async function POST(request: NextRequest) {
  try {
    // 1. PARSE REQUEST
    const { message, audience, destination } = await request.json()

    if (!message || typeof message !== 'string' || message.length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    if (message.length > 200) {
      return NextResponse.json({ 
        error: 'Message too long (max 200 characters)' 
      }, { status: 400 })
    }

    // 2. AUTHENTICATE USER (session-aware client)
    const supabaseAuth = await createClient()
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 3. GET BUSINESS PROFILE & VERIFY OWNERSHIP
    const { data: business, error: businessError } = await supabaseAuth
      .from('business_profiles')
      .select('id, business_name, slug, city, user_id')
      .eq('user_id', user.id)
      .single()

    if (businessError || !business) {
      console.error('❌ Business profile not found:', {
        userId: user.id,
        userEmail: user.email,
        businessError: businessError?.message,
        businessErrorCode: businessError?.code,
      })
      return NextResponse.json({ 
        error: 'Business profile not found' 
      }, { status: 404 })
    }

    const businessId = business.id
    const businessCity = business.city
    const businessName = business.business_name
    const businessSlug = business.slug

    if (!businessCity) {
      return NextResponse.json({ 
        error: 'Business city not configured' 
      }, { status: 400 })
    }

    // 4. TIER GATING (Spotlight only)
    // Get latest active subscription
    const { data: subscription, error: subError } = await supabaseAuth
      .from('business_subscriptions')
      .select(`
        id,
        status,
        current_period_end,
        subscription_tiers!inner(tier_name)
      `)
      .eq('business_id', businessId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Handle array response from Supabase !inner join
    const tierData: any = subscription?.subscription_tiers
    const tierName = Array.isArray(tierData) ? tierData[0]?.tier_name : tierData?.tier_name

    if (tierName !== 'spotlight') {
      return NextResponse.json({ 
        error: 'Push notifications are only available on Spotlight plan',
        tier: tierName || 'starter'
      }, { status: 403 })
    }

    console.log(`✅ Tier check passed: ${tierName}`)

    // 5. GET WALLETPUSH CREDENTIALS
    const credentials = await getWalletPushCredentials(businessCity)
    
    if (!credentials.apiKey) {
      console.error('❌ Missing WalletPush API key for city:', businessCity)
      return NextResponse.json({ 
        error: 'WalletPush credentials not configured for your city' 
      }, { status: 500 })
    }

    // 6. MONTHLY BUSINESS CAP (20/month for Spotlight)
    // FIX: Count pushes with actual sent recipients (not cached sent_count)
    const now = new Date()
    const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const startOfNextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

    // Get all push_notification IDs for this business this month
    const { data: monthlyPushes } = await supabaseAuth
      .from('push_notifications')
      .select('id')
      .eq('business_id', businessId)
      .gte('created_at', startOfMonth.toISOString())

    const pushIds = monthlyPushes?.map(p => p.id) || []

    if (pushIds.length > 0) {
      // Count how many of these pushes have at least 1 sent recipient
      const { data: sentRecipients } = await supabaseAuth
        .from('push_notification_recipients')
        .select('push_notification_id')
        .in('push_notification_id', pushIds)
        .eq('status', 'sent')

      const successfulPushIds = new Set(sentRecipients?.map(r => r.push_notification_id) || [])
      const monthlySuccessfulCount = successfulPushIds.size

      const MONTHLY_LIMIT = 20

      if (monthlySuccessfulCount >= MONTHLY_LIMIT) {
        return NextResponse.json({ 
          error: `Monthly push limit reached (${MONTHLY_LIMIT}/month for Spotlight). Resets ${startOfNextMonth.toLocaleDateString()}.`,
          limit: MONTHLY_LIMIT,
          current: monthlySuccessfulCount,
          resetAt: startOfNextMonth.toISOString()
        }, { status: 429 })
      }

      console.log(`✅ Monthly limit: ${monthlySuccessfulCount}/${MONTHLY_LIMIT} for business ${businessId}`)
    } else {
      console.log(`✅ Monthly limit: 0/20 for business ${businessId}`)
    }

    // 7. CITY COOLDOWN (max 1 push per city per 60 seconds)
    const cooldownSeconds = 60
    const cooldownWindow = new Date(Date.now() - cooldownSeconds * 1000).toISOString()

    const { data: recentCityPush } = await supabaseAuth
      .from('push_notifications')
      .select('id, created_at, business_id')
      .eq('city', businessCity)
      .gte('created_at', cooldownWindow)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (recentCityPush) {
      const lastPushTime = new Date(recentCityPush.created_at)
      const elapsedSeconds = Math.floor((Date.now() - lastPushTime.getTime()) / 1000)
      const retryAfter = cooldownSeconds - elapsedSeconds

      return NextResponse.json({ 
        error: `City cooldown active. Another business sent a push ${elapsedSeconds}s ago. Try again in ${retryAfter}s.`,
        cooldownSeconds,
        retryAfter,
        lastPushBusinessId: recentCityPush.business_id
      }, { status: 429 })
    }

    console.log(`✅ City cooldown check passed for ${businessCity}`)

    // 8. GET TARGET USERS
    // Filter by: city, active wallet pass, marketing consent
    const audienceType = audience?.type || 'all'
    let targetUsers: any[] = []

    if (audienceType === 'all') {
      const { data: users } = await supabaseAuth
        .from('app_users')
        .select('wallet_pass_id, pass_type_identifier, first_name, name, city')
        .eq('city', businessCity)
        .eq('wallet_pass_status', 'active')
        .eq('marketing_push_consent', true)
        .not('wallet_pass_id', 'is', null)

      targetUsers = users || []
    } else if (audienceType === 'claimed') {
      // Users who have claimed offers with this business
      const { data: claimers } = await supabaseAuth
        .from('offer_claims')
        .select(`
          app_users!inner(
            wallet_pass_id,
            pass_type_identifier,
            first_name,
            name,
            city,
            marketing_push_consent,
            wallet_pass_status
          )
        `)
        .eq('business_id', businessId)

      // Handle array response from Supabase
      targetUsers = (claimers || [])
        .map(c => Array.isArray(c.app_users) ? c.app_users[0] : c.app_users)
        .filter(u => 
          u && 
          u.city === businessCity &&
          u.wallet_pass_status === 'active' &&
          u.marketing_push_consent === true &&
          u.wallet_pass_id
        )

      // Dedupe by wallet_pass_id
      const seen = new Set()
      targetUsers = targetUsers.filter(u => {
        if (seen.has(u.wallet_pass_id)) return false
        seen.add(u.wallet_pass_id)
        return true
      })
    }

    if (targetUsers.length === 0) {
      return NextResponse.json({ 
        error: 'No eligible pass holders found',
        audienceType,
        city: businessCity
      }, { status: 400 })
    }

    console.log(`📊 Target users: ${targetUsers.length} eligible passes`)

    // 9. GENERATE DESTINATION URL (simple, no query params - redirect route adds wallet_pass_id)
    let destinationUrl = ''
    const destType = destination?.type || 'offers'

    if (destType === 'offers') {
      destinationUrl = `https://${businessCity}.qwikker.com/user/offers`
    } else if (destType === 'secret-menu') {
      destinationUrl = `https://${businessCity}.qwikker.com/user/secret-menu`
    } else if (destType === 'events') {
      destinationUrl = `https://${businessCity}.qwikker.com/user/events`
    } else if (destType === 'chat') {
      destinationUrl = `https://${businessCity}.qwikker.com/user/chat`
    } else if (destType === 'business') {
      // Open business modal on discover page
      destinationUrl = `https://${businessCity}.qwikker.com/user/discover?business=${businessSlug}`
    } else {
      // Default fallback
      destinationUrl = `https://${businessCity}.qwikker.com/user/dashboard`
    }

    // 10. CREATE NOTIFICATION RECORD WITH SHORT CODE
    // Use try-insert-retry pattern (not check-then-insert - avoids race conditions)
    const supabaseAdmin = createServiceRoleClient()
    const notificationType = 'promotional' // Always promotional for business dashboard

    let notification: any = null
    let notifError: any = null
    const MAX_RETRIES = 5

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const notificationShortCode = generateShortCode(8)
      
      const { data, error } = await supabaseAdmin
        .from('push_notifications')
        .insert({
          city: businessCity,
          business_id: businessId,
          created_by_user_id: user.id,
          message: message,
          personalized_template: message,
          audience_type: audienceType,
          notification_type: notificationType,
          destination_type: destType,
          destination_url: destinationUrl,
          short_code: notificationShortCode,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single()
      
      // Check for unique constraint violation (short_code collision)
      if (error?.code === '23505' && error.message?.includes('short_code')) {
        console.log(`Notification short code collision (attempt ${attempt + 1}/${MAX_RETRIES}), retrying...`)
        continue // Try again with new code
      }
      
      // Other error or success
      notification = data
      notifError = error
      break
    }

    if (notifError || !notification) {
      console.error('Failed to create notification:', notifError)
      return NextResponse.json({ 
        error: 'Failed to create notification' 
      }, { status: 500 })
    }

    const notificationId = notification.id
    const notifCode = notification.short_code

    console.log(`✅ Notification created: ${notificationId} (short_code: ${notifCode})`)

    // 11. SEND PUSH NOTIFICATIONS (full parallel processing for speed)
    let sentCount = 0
    let failedCount = 0
    const MAX_CODE_RETRIES = 5

    const baseUrl = 'https://app2.walletpush.io/api/v1/passes'

    console.log(`📤 Sending to ${targetUsers.length} users in parallel...`)

    // Process ALL users in parallel (no batching for speed)
    const allResults = await Promise.allSettled(
      targetUsers.map(async (user) => {
        // FIX: Declare IDs outside try block so catch can access them
        let recipientId: string | null = null
        let recipientCode: string | null = null
        
        try {
          // 1) PERSONALIZE MESSAGE
          // Extract first name only (first word before space)
          const firstName = user.first_name 
            ? user.first_name.split(' ')[0]
            : (user.name ? user.name.split(' ')[0] : 'there')
          
          // Prepend business name to message
          const fullMessage = `${businessName}: ${message}`
          
          const personalizedMessage = fullMessage.replace(
            /{first_name}/g, 
            firstName
          )

          // 2) INSERT RECIPIENT WITH SHORT CODE (try-insert-retry pattern)
          let recipientRow: any = null
          let recipientError: any = null
            
            for (let attempt = 0; attempt < MAX_CODE_RETRIES; attempt++) {
              recipientCode = generateShortCode(10) // Generate 10-char code
              
              const { data, error } = await supabaseAdmin
                .from('push_notification_recipients')
                .insert({
                  push_notification_id: notificationId,
                  wallet_pass_id: user.wallet_pass_id,
                  personalized_message: personalizedMessage,
                  status: 'pending', // Now allowed by CHECK constraint
                  short_code: recipientCode,
                })
                .select('id, short_code')
                .single()
              
              // Check for unique constraint violation (short_code collision)
              if (error?.code === '23505' && error.message?.includes('short_code')) {
                console.log(`Recipient short code collision (attempt ${attempt + 1}), retrying...`)
                continue // Try again with new code
              }
              
              // Success or other error
              recipientRow = data
              recipientError = error
              break
            }

            if (recipientError || !recipientRow) {
              console.error(`Failed to create recipient for ${user.wallet_pass_id}:`, recipientError)
              throw new Error('Recipient insert failed after retries')
            }

            recipientId = recipientRow.id
            recipientCode = recipientRow.short_code

            // 3) BUILD SHORT TRACKING URL (using short codes, not UUIDs)
            const trackingUrl = `https://${businessCity}.qwikker.com/n/${notifCode}?r=${recipientCode}`

            // 4) EMBED SHORT LINK IN LAST_MESSAGE (auto-tappable)
            const messageWithLink = `${personalizedMessage}\n\nTap: ${trackingUrl}`

            // 5) UPDATE WALLET PASS (ONLY Last_Message field)
            const passTypeId = user.pass_type_identifier || 'pass.com.qwikker'
            const messageUrl = `${baseUrl}/${passTypeId}/${user.wallet_pass_id}/values/${WALLET_PASS_FIELDS.LAST_MESSAGE}`

            const walletPushResponse = await fetch(messageUrl, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': credentials.apiKey!
              },
              body: JSON.stringify({ value: messageWithLink })
            })

            if (!walletPushResponse.ok) {
              const errorText = await walletPushResponse.text()
              throw new Error(`WalletPush API error: ${walletPushResponse.status} - ${errorText}`)
            }

            // 6) MARK RECIPIENT AS SENT
            // FIX: Store tracking_url separately (keep personalized_message pure)
            await supabaseAdmin
              .from('push_notification_recipients')
              .update({ 
                status: 'sent', 
                sent_at: new Date().toISOString(),
                tracking_url: trackingUrl // Store actual URL sent (for debugging/support)
                // personalized_message stays as the original personalized text (no link embedded)
              })
              .eq('id', recipientId)

            return { success: true, recipientId, recipientCode }

          } catch (error: any) {
            // FIX: recipientId is now accessible in catch block
            if (recipientId) {
              await supabaseAdmin
                .from('push_notification_recipients')
                .update({ 
                  status: 'failed', 
                  error: error.message || 'WalletPush API error',
                  sent_at: new Date().toISOString()
                })
                .eq('id', recipientId)
            }

            return { 
              success: false, 
              error: error.message,
              wallet_pass_id: user.wallet_pass_id 
            }
          }
        })
      )

    // Process results
    allResults.forEach((result) => {
      if (result.status === 'fulfilled' && result.value.success) {
        sentCount++
      } else {
        failedCount++
      }
    })

    console.log(`📊 Push notification results: ${sentCount} sent, ${failedCount} failed out of ${targetUsers.length} targets`)

    // 12. UPDATE NOTIFICATION COUNTS (truth-set from DB to handle retries/crashes)
    // FIX: Query actual recipient counts to ensure accuracy even if batch partially failed
    const { count: actualSentCount } = await supabaseAdmin
      .from('push_notification_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('push_notification_id', notificationId)
      .eq('status', 'sent')

    const { count: actualFailedCount } = await supabaseAdmin
      .from('push_notification_recipients')
      .select('*', { count: 'exact', head: true })
      .eq('push_notification_id', notificationId)
      .eq('status', 'failed')

    await supabaseAdmin
      .from('push_notifications')
      .update({
        sent_count: actualSentCount || 0,
        failed_count: actualFailedCount || 0
      })
      .eq('id', notificationId)

    console.log(`✅ Updated notification ${notificationId}: sent=${actualSentCount}, failed=${actualFailedCount}`)

    // 13. RETURN SUCCESS RESPONSE
    return NextResponse.json({
      success: true,
      notificationId,
      shortCode: notifCode,
      sentCount: actualSentCount || 0,
      failedCount: actualFailedCount || 0,
      targetCount: targetUsers.length,
      audienceType,
      destinationType: destType,
      message: 'Push notifications sent successfully'
    })

  } catch (error: any) {
    console.error('❌ Push notification error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 })
  }
}
