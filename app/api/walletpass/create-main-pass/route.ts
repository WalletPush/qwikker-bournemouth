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
      
      // ✅ DYNAMIC: City-specific subdomain URLs
      'Offers_Url': `${cityBaseUrl}/user/offers?wallet_pass_id=${serialNumber}`,
      'AI_Url': `${cityBaseUrl}/s/${serialNumber.slice(-8)}/chat`,
      'Dashboard_Url': `${cityBaseUrl}/s/${serialNumber.slice(-8)}`,
      
      // Barcode for user identification (Dynamic subdomain)
      'barcode_value': `${cityBaseUrl}/s/${serialNumber.slice(-8)}`,
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
      
      // 🔗 Create bulletproof shortlinks for the pass back-of-card links
      try {
        // Create shortlinks for all three link types
        const shortlinkPromises = ['dashboard', 'offers', 'chat'].map(async (linkType) => {
          const response = await fetch(`${baseUrl}/api/shortlinks/ghl-create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wallet_pass_id: result.serialNumber,
              city: city || 'bournemouth',
              link_type: linkType
            })
          })
          
          if (response.ok) {
            const data = await response.json()
            return { linkType, shortUrl: data.message } // GHL format returns shortlink in 'message'
          }
          return null
        })

        const shortlinks = (await Promise.all(shortlinkPromises)).filter(Boolean)
        
        if (shortlinks.length > 0) {
          // Update the pass with bulletproof shortlinks
          const updateUrl = `https://app2.walletpush.io/api/v1/templates/${MOBILE_WALLET_TEMPLATE_ID}/passes/${result.serialNumber}`
          
          const updateData = {}
          shortlinks.forEach(({ linkType, shortUrl }) => {
            switch (linkType) {
              case 'dashboard':
                updateData['Dashboard_Url'] = shortUrl
                break
              case 'offers':
                updateData['Offers_Url'] = shortUrl
                break
              case 'chat':
                updateData['AI_Url'] = shortUrl
                break
            }
          })
          
          const updateResponse = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
              'Authorization': MOBILE_WALLET_APP_KEY,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData)
          })
          
          if (updateResponse.ok) {
            console.log('✅ Pass updated with bulletproof shortlinks:', updateData)
          } else {
            console.warn('⚠️ Failed to update pass with shortlinks, using fallback URLs')
            // Fallback to direct URLs if shortlinks fail
            await updatePassWithDirectUrls()
          }
        } else {
          console.warn('⚠️ No shortlinks created, using fallback URLs')
          await updatePassWithDirectUrls()
        }
      } catch (shortlinkError) {
        console.warn('⚠️ Shortlink creation failed, using fallback URLs:', shortlinkError)
        await updatePassWithDirectUrls()
      }

      // Fallback function for direct URLs
      async function updatePassWithDirectUrls() {
        const updateUrl = `https://app2.walletpush.io/api/v1/templates/${MOBILE_WALLET_TEMPLATE_ID}/passes/${result.serialNumber}`
        const updateData = {
          'Offers_Url': `https://${city || 'bournemouth'}.qwikker.com/user/offers?wallet_pass_id=${result.serialNumber}`,
          'AI_Url': `https://${city || 'bournemouth'}.qwikker.com/user/chat?wallet_pass_id=${result.serialNumber}`,
          'Dashboard_Url': `https://${city || 'bournemouth'}.qwikker.com/user/dashboard?wallet_pass_id=${result.serialNumber}`
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
          console.log('✅ Pass updated with direct URLs as fallback')
        }
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
