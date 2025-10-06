import { NextRequest, NextResponse } from 'next/server'
import { getWalletPushCredentials } from '@/lib/utils/franchise-config'

export async function POST(request: NextRequest) {
  try {
    console.log('🎫 Creating main wallet pass for user')
    
    const { firstName, lastName, email, city } = await request.json()
    
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
        { error: `Missing WalletPush credentials for ${city}` },
        { status: 500 }
      )
    }
    
    // Create main user wallet pass
    const createUrl = `https://app2.walletpush.io/api/v1/templates/${MOBILE_WALLET_TEMPLATE_ID}/passes`
    
    // Generate unique serial number for this pass
    const serialNumber = `QWIK-${city?.toUpperCase() || 'BOURNE'}-${firstName.toUpperCase()}-${Date.now()}`
    
    const passData = {
      // Dynamic fields that can be updated later
      'First_Name': firstName,
      'Last_Name': lastName,
      'Email': email,
      'City': city || 'Bournemouth',
      'Current_Offer': 'Welcome to Qwikker! Check out our amazing local offers.',
      'Last_Message': 'Thanks for joining Qwikker!',
      'Offers_Claimed': '0',
      'Secret_Menus_Unlocked': '0',
      
      // Static fields
      'Organization_Name': 'Qwikker',
      'Pass_Type': 'Loyalty Card',
      
      // CRITICAL: Personalized back-of-pass links (FIXED - includes wallet_pass_id)
      'Offers_Url': `https://${city || 'bournemouth'}.qwikker.com/user/offers?wallet_pass_id=${serialNumber}`,
      'AI_Url': `https://${city || 'bournemouth'}.qwikker.com/user/chat?wallet_pass_id=${serialNumber}`,
      'Dashboard_Url': `https://${city || 'bournemouth'}.qwikker.com/user/dashboard?wallet_pass_id=${serialNumber}`,
      
      // Barcode for user identification (FIXED - links to personalized dashboard)
      'barcode_value': `https://${city || 'bournemouth'}.qwikker.com/user/dashboard?wallet_pass_id=${serialNumber}`,
      'barcode_format': 'PKBarcodeFormatQR',
      'barcode_message': 'Scan to access your personalized Qwikker dashboard'
    }
    
    console.log('📡 Creating WalletPush pass for:', firstName, lastName)
    
    const response = await fetch(createUrl, {
      method: 'POST',
      headers: {
        'Authorization': MOBILE_WALLET_APP_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(passData)
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('WalletPush pass creation error:', errorText)
      return NextResponse.json({ 
        success: false, 
        error: `Failed to create wallet pass: ${response.status}` 
      }, { status: 500 })
    }
    
    const result = await response.json()
    
    if (result.url && result.serialNumber) {
      console.log('✅ Main wallet pass created:', {
        user: `${firstName} ${lastName}`,
        serialNumber: result.serialNumber,
        passUrl: result.url
      })
      
      // Create short URLs for the pass back links
      try {
        const { createShortUrl } = await import('@/lib/actions/short-url-actions')
        
        // Use city-specific URLs for personalized experience
        const cityDomain = city ? `${city}.qwikker.com` : 'bournemouth.qwikker.com'
        
        const offersShortUrl = await createShortUrl({
          targetUrl: `https://${cityDomain}/user/offers?user_id=${result.serialNumber}`,
          userId: result.serialNumber,
          urlType: 'offers'
        })
        
        const chatShortUrl = await createShortUrl({
          targetUrl: `https://${cityDomain}/user/chat?user_id=${result.serialNumber}`,
          userId: result.serialNumber,
          urlType: 'chat'
        })
        
        // Add dashboard link (ready for future implementation)
        const dashboardShortUrl = await createShortUrl({
          targetUrl: `https://${cityDomain}/user/dashboard?user_id=${result.serialNumber}`,
          userId: result.serialNumber,
          urlType: 'dashboard'
        })
        
        if (offersShortUrl.success && chatShortUrl.success && dashboardShortUrl.success) {
          // Update the pass with the actual short URLs
          const updateUrl = `https://app2.walletpush.io/api/v1/templates/${MOBILE_WALLET_TEMPLATE_ID}/passes/${result.serialNumber}`
          
          const updateData = {
            'Offers_Url': offersShortUrl.shortUrl,
            'AI_Url': chatShortUrl.shortUrl,
            'Dashboard_Url': dashboardShortUrl.shortUrl // New dashboard link
          }
          
          const updateResponse = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
              'Authorization': MOBILE_WALLET_APP_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
          })
          
          if (updateResponse.ok) {
            console.log('✅ Pass updated with short URLs:', {
              offers: offersShortUrl.shortUrl,
              chat: chatShortUrl.shortUrl
            })
          } else {
            console.warn('⚠️ Failed to update pass with short URLs, but pass was created')
          }
        }
      } catch (shortUrlError) {
        console.warn('⚠️ Failed to create short URLs:', shortUrlError)
        // Don't fail the entire operation if short URLs fail
      }
      
      return NextResponse.json({ 
        success: true, 
        passUrl: result.url,
        serialNumber: result.serialNumber,
        barcodeValue: passData.barcode_value,
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
