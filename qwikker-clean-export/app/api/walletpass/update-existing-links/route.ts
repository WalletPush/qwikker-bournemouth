import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

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
    
    const city = user.city || 'bournemouth'
    const passTypeId = user.pass_type_identifier || 'pass.com.qwikker'
    const serialNumber = userWalletPassId
    const appKey = 'xIwpMeyEfuoAtvyCeLsNkQOuCYhOWahJYDHpQzlLfJbFWhptwLhArihcLcBCfpmF'
    
    const baseUrl = 'https://app2.walletpush.io/api/v1/passes'
    
    // Update all the personalized links
    const updates = [
      {
        field: 'Offers_Url',
        value: `https://${city}.qwikker.com/user/offers?wallet_pass_id=${serialNumber}`
      },
      {
        field: 'AI_Url', 
        value: `https://${city}.qwikker.com/user/chat?wallet_pass_id=${serialNumber}`
      },
      {
        field: 'Dashboard_Url',
        value: `https://${city}.qwikker.com/user/dashboard?wallet_pass_id=${serialNumber}`
      }
    ]
    
    console.log(`📡 Updating ${updates.length} fields for user: ${user.name}`)
    
    // Update each field
    for (const update of updates) {
      const updateUrl = `${baseUrl}/${passTypeId}/${serialNumber}/values/${update.field}`
      
      console.log(`🔄 Updating ${update.field}:`, update.value)
      
      const response = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': appKey
        },
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
