import { NextRequest, NextResponse } from 'next/server'
import { getWalletPushCredentials } from '@/lib/utils/franchise-config'
import { getWalletPushCreateUrl, getWalletPushAuthHeader, getWalletPushFieldUrl, WALLET_PASS_FIELDS } from '@/lib/config/wallet-pass-fields'

export async function POST(request: NextRequest) {
  try {
    console.log('🎫 Creating main wallet pass for user')
    
    const { firstName, lastName, email, city, marketingPushConsent, marketingEmailConsent } = await request.json()
    
    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, email' },
        { status: 400 }
      )
    }
    
    // 🎯 DYNAMIC: Get city-specific WalletPush credentials
    const credentials = await getWalletPushCredentials(city || 'bournemouth')
    const MOBILE_WALLET_APP_KEY = credentials.apiKey
    const MOBILE_WALLET_TEMPLATE_ID = credentials.templateId
    
    if (!MOBILE_WALLET_APP_KEY || !MOBILE_WALLET_TEMPLATE_ID) {
      console.error(`❌ Missing WalletPush credentials for ${city}`)
      return NextResponse.json(
        { 
          error: 'Unable to create your pass right now. Our team is setting things up. Please try again soon!',
          technicalDetails: `Missing WalletPush credentials for ${city}`,
          userFriendly: true
        },
        { status: 503 } // 503 Service Unavailable (temporary condition)
      )
    }
    
    // Create main user wallet pass
    const createUrl = getWalletPushCreateUrl(MOBILE_WALLET_TEMPLATE_ID)
    
    // Get the request host to build dynamic URLs
    const host = request.headers.get('host') || 'qwikker.com'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const baseUrl = `${protocol}://${host}`
    
    // Get city-specific subdomain for URLs
    const citySubdomain = city?.toLowerCase() || 'bournemouth'
    const cityBaseUrl = host.includes('localhost') 
      ? baseUrl // localhost:3000 for dev
      : `https://${citySubdomain}.qwikker.com` // Production subdomains
    
    // Generate unique serial number for this pass
    const serialNumber = `QWIK-${city?.toUpperCase() || 'BOURNE'}-${firstName.toUpperCase()}-${Date.now()}`
    
    const displayName = citySubdomain.charAt(0).toUpperCase() + citySubdomain.slice(1)
    
    // Send all field values upfront so the pass is fully populated on creation.
    // AI_Url/Offers_Url use placeholder wallet_pass_id that gets updated post-creation
    // with the real WalletPush serial number.
    const passData: Record<string, string> = {
      'First_Name': firstName,
      'Last_Name': lastName,
      'Email': email,
      'Current_Offer': `Welcome to Qwikker ${displayName}! Check out our amazing local offers.`,
      'AI_Url': `${cityBaseUrl}/user/chat`,
      'Offers_Url': `${cityBaseUrl}/user/offers`,
      'Last_Message': `Hey ${firstName}, Your Qwikker ${displayName} pass is now installed and ready for use. You will now be redirected to your dashboard. Access this any time from the back of your pass.`,
    }
    
    console.log('📡 Creating WalletPush pass for:', firstName, lastName)
    
    const response = await fetch(createUrl, {
      method: 'POST',
      headers: getWalletPushAuthHeader(MOBILE_WALLET_APP_KEY),
      body: JSON.stringify(passData)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('WalletPush pass creation error:', errorText)
      return NextResponse.json({ 
        success: false, 
        error: 'Unable to create your pass right now. Our team is setting things up. Please try again soon!',
        technicalDetails: `WalletPush API error: ${response.status}`,
        userFriendly: true
      }, { status: 503 }) // 503 Service Unavailable
    }
    
    const result = await response.json()
    
    // New WalletPush returns { success, serialNumber, passTypeIdentifier, apple: { downloadUrl }, google: { saveUrl } }
    // apple.downloadUrl is /api/pass-install/{serial} which is a web page with its own redirect.
    // We need the direct .pkpass download: /api/apple-pass/{serial}/download
    const rawAppleUrl = result.apple?.downloadUrl || result.url || ''
    const passUrl = rawAppleUrl.includes('/api/pass-install/')
      ? rawAppleUrl.replace('/api/pass-install/', '/api/apple-pass/') + '/download'
      : rawAppleUrl
    const passSerialNumber = result.serialNumber
    const passTypeId = result.passTypeIdentifier || 'pass.come.globalwalletpush'
    
    if (passUrl && passSerialNumber) {
      console.log('✅ Main wallet pass created:', {
        user: `${firstName} ${lastName}`,
        serialNumber: passSerialNumber,
        passUrl: passUrl,
        passTypeIdentifier: passTypeId
      })
      
      // Save/update user record with consent preferences
      try {
        const { createServiceRoleClient } = await import('@/lib/supabase/server')
        const supabase = createServiceRoleClient()
        
        // Build consent update fields
        const consentFields: Record<string, any> = {
          wallet_pass_id: passSerialNumber,
          pass_type_identifier: passTypeId,
          first_name: firstName,
          last_name: lastName,
          name: `${firstName} ${lastName}`,
          email: email.toLowerCase(),
          city: city?.toLowerCase() || 'bournemouth',
          wallet_pass_status: 'active',
          marketing_push_consent: marketingPushConsent ?? false,
          email_marketing_consent: marketingEmailConsent ?? false,
          ...(marketingPushConsent ? { marketing_push_consent_at: new Date().toISOString() } : {}),
          ...(marketingEmailConsent ? { email_marketing_consent_at: new Date().toISOString() } : {}),
        }

        // Check if user already exists (by email - they may have a different wallet_pass_id)
        const { data: existingUser } = await supabase
          .from('app_users')
          .select('id, wallet_pass_id')
          .eq('email', email.toLowerCase())
          .maybeSingle()

        let upsertError: any = null

        if (existingUser) {
          // UPDATE existing user - only touch safe fields, don't overwrite NOT NULL columns
          const { error } = await supabase
            .from('app_users')
            .update(consentFields)
            .eq('id', existingUser.id)
          upsertError = error
        } else {
          // Also check by wallet_pass_id (in case email changed)
          const { data: existingByPass } = await supabase
            .from('app_users')
            .select('id')
            .eq('wallet_pass_id', result.serialNumber)
            .maybeSingle()

          if (existingByPass) {
            const { error } = await supabase
              .from('app_users')
              .update(consentFields)
              .eq('id', existingByPass.id)
            upsertError = error
          } else {
            // Truly new user - insert with all required fields
            const { error } = await supabase
              .from('app_users')
              .insert({
                ...consentFields,
                user_id: crypto.randomUUID(),
                referral_code: `QWK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
              })
            upsertError = error
          }
        }
        
        if (upsertError) {
          console.error('⚠️ Failed to save consent to database:', upsertError)
          // Don't fail the whole request, pass was created successfully
        } else {
          console.log('✅ Saved consent preferences to database:', {
            wallet_pass_id: result.serialNumber,
            marketing_push_consent: marketingPushConsent ?? false,
            email_marketing_consent: marketingEmailConsent ?? false,
            isNewUser: !existingUser
          })
        }
      } catch (dbError) {
        console.error('⚠️ Database error saving consent:', dbError)
      }
      
      // Fire-and-forget: update pass links with personalized URLs containing wallet_pass_id
      updatePassLinksAsync(
        MOBILE_WALLET_APP_KEY, passTypeId, passSerialNumber, cityBaseUrl
      ).catch(err => console.warn('⚠️ Non-critical: pass link update failed:', err))
      
      return NextResponse.json({ 
        success: true, 
        passUrl: passUrl,
        serialNumber: passSerialNumber,
        passTypeIdentifier: passTypeId,
        message: 'Main wallet pass created successfully'
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid response from WalletPush' 
      }, { status: 500 })
    }
    
  } catch (error) {
    console.error('Error creating main wallet pass:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create main wallet pass' 
    }, { status: 500 })
  }
}

/**
 * Updates pass back-of-card links with short URLs after creation.
 * Extracts the suffix from the WalletPush serial for use as a shortlink code.
 * e.g. wp-1771886311839-g89ug8bv6 → code = g89ug8bv6
 *      /c/g89ug8bv6 → chat, /o/g89ug8bv6 → offers
 */
async function updatePassLinksAsync(
  apiKey: string,
  passTypeId: string,
  serialNumber: string,
  cityBaseUrl: string
) {
  // Extract suffix after last dash for short URL code
  const parts = serialNumber.split('-')
  const shortCode = parts[parts.length - 1] || serialNumber

  const linkUpdates = [
    {
      field: WALLET_PASS_FIELDS.AI_URL,
      value: `${cityBaseUrl}/c/${shortCode}`
    },
    {
      field: WALLET_PASS_FIELDS.OFFERS_URL,
      value: `${cityBaseUrl}/o/${shortCode}`
    },
  ]

  for (const update of linkUpdates) {
    try {
      const url = getWalletPushFieldUrl(passTypeId, serialNumber, update.field)
      const res = await fetch(url, {
        method: 'PUT',
        headers: getWalletPushAuthHeader(apiKey),
        body: JSON.stringify({ value: update.value })
      })
      if (res.ok) {
        console.log(`✅ Updated ${update.field} → ${update.value}`)
      } else {
        console.warn(`⚠️ Failed to update ${update.field}: ${res.status}`)
      }
    } catch (err) {
      console.warn(`⚠️ Error updating ${update.field}:`, err)
    }
  }
}
