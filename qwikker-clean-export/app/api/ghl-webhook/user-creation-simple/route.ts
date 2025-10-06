import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🎫 SIMPLE user creation webhook')
    
    const data = await request.json()
    console.log('Data received:', JSON.stringify(data, null, 2))
    
    // Extract basic data
    const first_name = data.customData?.first_name || data.first_name || 'Unknown'
    const last_name = data.customData?.last_name || data.last_name || 'User'
    const email = data.customData?.email || data.email || 'user@qwikker.com'
    const serialNumber = data.customData?.serialNumber || data.serialNumber
    
    if (!serialNumber) {
      console.error('No serialNumber found')
      return NextResponse.json({ error: 'No serialNumber' }, { status: 400 })
    }
    
    const supabase = createServiceRoleClient()
    
    // Simple user creation with minimal data
    const { data: newUser, error } = await supabase
      .from('app_users')
      .insert({
        user_id: crypto.randomUUID(),
        wallet_pass_id: serialNumber,
        name: `${first_name} ${last_name}`,
        email: email,
        city: 'bournemouth',
        tier: 'explorer',
        level: 1,
        wallet_pass_status: 'active',
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    console.log('✅ User created:', newUser.name)
    
    return NextResponse.json({
      success: true,
      user: newUser
    })
    
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
