import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Missing email' },
        { status: 400 }
      )
    }
    
    const supabase = createServiceRoleClient()
    
    // Check if user exists with wallet pass ID
    const { data: user, error } = await supabase
      .from('app_users')
      .select('id, wallet_pass_id, name, email, wallet_pass_status')
      .eq('email', email)
      .eq('wallet_pass_status', 'active')
      .single()
    
    if (error || !user || !user.wallet_pass_id) {
      console.log('❌ Pass not ready for:', email)
      return NextResponse.json({
        success: true,
        passReady: false,
        message: 'Wallet pass still being created'
      })
    }
    
    console.log('✅ Pass ready for:', user.name, 'Pass ID:', user.wallet_pass_id)
    
    return NextResponse.json({
      success: true,
      passReady: true,
      wallet_pass_id: user.wallet_pass_id,
      name: user.name,
      message: 'Wallet pass is ready'
    })
    
  } catch (error) {
    console.error('❌ Check pass ready error:', error)
    return NextResponse.json(
      { success: false, message: 'Failed to check pass status' },
      { status: 500 }
    )
  }
}
