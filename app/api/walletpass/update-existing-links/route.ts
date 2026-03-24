import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getWalletPushCredentials } from '@/lib/utils/franchise-config'
import { getWalletPushFieldUrl, getWalletPushAuthHeader, WALLET_PASS_FIELDS } from '@/lib/config/wallet-pass-fields'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Updating existing wallet pass links with personalized URLs')
    
    const { userWalletPassId } = await request.json()
    
    if (!userWalletPassId) {
      return NextResponse.json({ error: 'Missing userWalletPassId' }, { status: 400 })
    }
    
    // Get user's data
    const supabase = createServiceRoleClient()
    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('city, name, first_name, last_name, pass_type_identifier')
      .eq('wallet_pass_id', userWalletPassId)
      .single()
    
    if (userError || !user) {
      console.error('❌ User not found:', userError)
      return NextResponse.json({ 
        error: 'User not found' 
      }, { status: 404 })
    }
    
    const { getRequestCityFallback } = await import('@/lib/utils/city-detection')
    const requestCity = await getRequestCityFallback(request)
    const city = user.city || requestCity
    const passTypeId = user.pass_type_identifier || 'pass.come.globalwalletpush'
    const serialNumber = userWalletPassId
    
    const credentials = await getWalletPushCredentials(city)
    const walletpushDashboardUrl = credentials.dashboardUrl
    if (!credentials.apiKey) {
      console.error(`❌ Missing WalletPush API key for ${city}`)
      return NextResponse.json({ error: 'WalletPush credentials not configured' }, { status: 500 })
    }
    
    const updates = [
      {
        field: WALLET_PASS_FIELDS.OFFERS_URL,
        value: `https://${city}.qwikker.com/user/offers?wallet_pass_id=${serialNumber}`
      },
      {
        field: WALLET_PASS_FIELDS.AI_URL, 
        value: `https://${city}.qwikker.com/user/chat?wallet_pass_id=${serialNumber}`
      },
      {
        field: WALLET_PASS_FIELDS.DASHBOARD_URL,
        value: `https://${city}.qwikker.com/user/dashboard?wallet_pass_id=${serialNumber}`
      }
    ]
    
    console.log(`📡 Updating ${updates.length} fields for user: ${user.name}`)
    
    for (const update of updates) {
      const updateUrl = getWalletPushFieldUrl(passTypeId, serialNumber, update.field, walletpushDashboardUrl)
      
      console.log(`🔄 Updating ${update.field}:`, update.value)
      
      const response = await fetch(updateUrl, {
        method: 'PUT',
        headers: getWalletPushAuthHeader(credentials.apiKey),
        body: JSON.stringify({ value: update.value })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Failed to update ${update.field}:`, response.status, errorText)
        // Continue with other updates even if one fails
      } else {
        console.log(`✅ Updated ${update.field} successfully`)
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Pass links updated successfully',
      user: user.name,
      city: city,
      updatedFields: updates.length
    })
    
  } catch (error) {
    console.error('❌ Update pass links error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
