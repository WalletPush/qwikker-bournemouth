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
        { 
          error: 'Unable to create your pass right now. Our team is setting things up. Please try again soon!',
          technicalDetails: `Missing WalletPush credentials for ${city}`,
          userFriendly: true
        },
        { status: 503 } // 503 Service Unavailable (temporary condition)
      )
    }
    
    // Create main user wallet pass
    const createUrl = `https://app2.walletpush.io/api/v1/templates/${MOBILE_WALLET_TEMPLATE_ID}/pass`
    
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
    
    // ✅ SIMPLE: Match old working code - just send the basics
    // WalletPush template already has all the fields configured
    const passData = {
      'First_Name': firstName,
      'Last_Name': lastName,
      'Email': email
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
        error: 'Unable to create your pass right now. Our team is setting things up. Please try again soon!',
        technicalDetails: `WalletPush API error: ${response.status}`,
        userFriendly: true
      }, { status: 503 }) // 503 Service Unavailable
    }
    
    const result = await response.json()
    
    if (result.url && result.serialNumber) {
      console.log('✅ Main wallet pass created:', {
        user: `${firstName} ${lastName}`,
        serialNumber: result.serialNumber,
        passUrl: result.url,
        passTypeIdentifier: result.passTypeIdentifier
      })
      
      // Return immediately - match old simple flow
      return NextResponse.json({ 
        success: true, 
        passUrl: result.url,
        serialNumber: result.serialNumber,
        passTypeIdentifier: result.passTypeIdentifier || 'pass.com.WalletPush',
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
