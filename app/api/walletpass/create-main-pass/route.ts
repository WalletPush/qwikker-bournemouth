import { NextRequest, NextResponse } from 'next/server'

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
    
    const MOBILE_WALLET_APP_KEY = process.env.MOBILE_WALLET_APP_KEY
    const MOBILE_WALLET_TEMPLATE_ID = process.env.MOBILE_WALLET_TEMPLATE_ID
    
    if (!MOBILE_WALLET_APP_KEY || !MOBILE_WALLET_TEMPLATE_ID) {
      console.error('❌ Missing WalletPush credentials')
      return NextResponse.json(
        { error: 'Missing WalletPush credentials' },
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
      
      // CRITICAL: Personalized back-of-pass links with SHORT URLs (like old system)
      'Offers_Url': 'https://go.qwikker.com/offers', // Will be updated after pass creation
      'AI_Url': 'https://go.qwikker.com/chat', // Will be updated after pass creation
      
      // Barcode for user identification
      'barcode_value': serialNumber,
      'barcode_format': 'PKBarcodeFormatQR',
      'barcode_message': 'Scan to access your Qwikker dashboard'
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
        
        const offersShortUrl = await createShortUrl({
          targetUrl: `https://qwikkerdashboard-theta.vercel.app/user/offers?user_id=${result.serialNumber}`,
          userId: result.serialNumber,
          urlType: 'offers'
        })
        
        const chatShortUrl = await createShortUrl({
          targetUrl: `https://qwikkerdashboard-theta.vercel.app/user/chat?user_id=${result.serialNumber}`,
          userId: result.serialNumber,
          urlType: 'chat'
        })
        
        if (offersShortUrl.success && chatShortUrl.success) {
          // Update the pass with the actual short URLs
          const updateUrl = `https://app2.walletpush.io/api/v1/templates/${MOBILE_WALLET_TEMPLATE_ID}/passes/${result.serialNumber}`
          
          const updateData = {
            'Offers_Url': offersShortUrl.shortUrl,
            'AI_Url': chatShortUrl.shortUrl
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
